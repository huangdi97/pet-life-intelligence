#!/usr/bin/env python3
"""Cross-platform R5.6 Android runtime evidence capture.

Designed for GitHub-hosted Linux emulators and local macOS/Linux agents.
The existing PowerShell wrapper remains the Windows-first path.

No vision model is used. Evidence comes from:
- real emulator screenshots (adb screencap);
- UIAutomator accessibility XML;
- the embedded WebView runtime 3D manifest;
- real Twin Review camera controls.

The script starts from a clean repo-local output directory and fails if any
required high-fidelity runtime manifest is missing/fallback.
"""
from __future__ import annotations

import argparse
import html
import json
import math
import os
import re
import shlex
import shutil
import subprocess
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from datetime import time as clock_time
from pathlib import Path
from urllib.parse import urlencode
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = ROOT / "artifacts" / "r5-6-final" / "android"
OWNER_ERROR_FREE_SURFACES = {"today", "timeline", "pet", "lifeview", "health", "me"}
SURFACES = (
    ("today", True, "today"),
    ("timeline", False, None),
    ("pet", True, "pet"),
    ("lifeview", True, "life"),
    ("twinreview", True, "review"),
    ("health", False, None),
    ("assistant", False, None),
    ("companion", True, "companion"),
    ("me", False, None),
)

SURFACE_ROOT_IDS = {
    "today": "pli.today.living-stage",
    "timeline": "pli.timeline.identity",
    "pet": "pli.pet.hero-stage",
    "lifeview": "pli.lifeview.identity",
    "twinreview": "pli.twinreview.identity",
    "health": "pli.health.identity",
    "assistant": "pli.assistant.identity",
    "companion": "pli.companion.living-stage",
    "me": "pli.me.owner",
}


class CaptureError(RuntimeError):
    pass


def ui_has_actionable_control(xml: str, resource_id: str) -> bool:
    """An exposed but disabled React Native Pressable is not a valid tap.

    Native UIAutomator reports both the resource-id and enabled/clickable
    states. The latter are required before an evidence-affecting owner tap.
    """
    return any(
        node.attrib.get("resource-id") == resource_id
        and node.attrib.get("enabled") == "true"
        and node.attrib.get("clickable") == "true"
        for node in ET.fromstring(xml).iter("node")
    )


# Hosted emulators have been observed to stop answering adb while the job keeps
# waiting forever (the failing run left a truncated logcat buffer next to empty
# UIAutomator dumps). A bounded per-command budget keeps such a stall
# diagnosable instead of blocking until the runner's 6h limit. This is a
# liveness bound ONLY: every product gate below still requires the exact
# expected UI root and the rigged RUNTIME 3D manifest.
ADB_TIMEOUT_SECONDS = 60


def run(
    cmd: list[str],
    *,
    check: bool = True,
    text: bool = True,
    timeout: float = ADB_TIMEOUT_SECONDS,
) -> subprocess.CompletedProcess:
    run_kwargs: dict[str, object] = {
        "cwd": ROOT,
        "capture_output": True,
        "text": text,
        "timeout": timeout,
    }
    if text:
        # Never let the host locale choose how adb output is decoded: on a
        # Chinese Windows console (GBK) UIAutomator's UTF-8 payload raised
        # UnicodeDecodeError and aborted the whole capture.
        run_kwargs["encoding"] = "utf-8"
        run_kwargs["errors"] = "replace"
    try:
        result = subprocess.run(cmd, **run_kwargs)  # type: ignore[arg-type]
    except subprocess.TimeoutExpired as exc:
        empty = "" if text else b""
        if check:
            raise CaptureError(f"command timed out after {timeout}s: {' '.join(cmd)}") from exc
        return subprocess.CompletedProcess(cmd, returncode=124, stdout=empty, stderr=empty)
    if check and result.returncode != 0:
        stderr = result.stderr if text else result.stderr.decode("utf-8", "replace")
        stdout = result.stdout if text else result.stdout.decode("utf-8", "replace")
        raise CaptureError(f"command failed ({result.returncode}): {' '.join(cmd)}\n{stderr or stdout}")
    return result


class Android:
    def __init__(self, adb: str, serial: str, package: str) -> None:
        self.adb = adb
        self.serial = serial
        self.package = package

    def cmd(self, *args: str, check: bool = True, text: bool = True) -> subprocess.CompletedProcess:
        return run([self.adb, "-s", self.serial, *args], check=check, text=text)

    def shell(self, *args: str, check: bool = True) -> str:
        # ``stdout`` can be None when a child produced no decodable output.
        return (self.cmd("shell", *args, check=check).stdout or "").strip()

    def start_link(self, uri: str) -> None:
        # adb shell concatenates remote command arguments and lets /system/bin/sh
        # parse them. Query separators such as '&' would otherwise background
        # the am command and turn the Activity component into a second shell
        # command. Quote both values for the remote shell.
        self.cmd(
            "shell",
            "am",
            "start",
            "-W",
            "-a",
            "android.intent.action.VIEW",
            "-d",
            shlex.quote(uri),
            shlex.quote(f"{self.package}/.MainActivity"),
        )

    def clear_runtime_manifest(self) -> None:
        # A persisted manifest belongs to the WebView instance that wrote it.
        # Delete it before every 3D navigation/camera command so a successful
        # previous surface can never certify a still-loading current surface.
        self.cmd(
            "shell",
            "run-as",
            self.package,
            "rm",
            "-f",
            "files/pli_manifest.json",
            check=False,
        )
        self.cmd(
            "shell",
            "rm",
            "-f",
            f"/data/data/{self.package}/files/pli_manifest.json",
            check=False,
        )

    def screenshot(self, path: Path) -> None:
        result = self.cmd("exec-out", "screencap", "-p", text=False)
        data = result.stdout
        if len(data) < 1024 or not data.startswith(b"\x89PNG\r\n\x1a\n"):
            raise CaptureError(f"invalid Android screenshot: {path}")
        path.write_bytes(data)

    @staticmethod
    def _bounds_center(node: ET.Element) -> tuple[int, int] | None:
        match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", node.attrib.get("bounds", ""))
        if not match:
            return None
        x1, y1, x2, y2 = map(int, match.groups())
        return ((x1 + x2) // 2, (y1 + y2) // 2)

    def _dismiss_host_system_dialog(self, raw: str) -> bool:
        """Dismiss emulator-host launcher/SystemUI ANRs, never PLI app crashes.

        GitHub-hosted Pixel emulators can surface a launcher ANR over an
        otherwise healthy foreground app. That overlay hides all React Native
        accessibility ids and used to make the final evidence job fail with
        a misleading "target not found". Only known host-shell dialogs are
        auto-dismissed; a PLI crash/ANR remains visible and therefore fails.
        """
        try:
            root = ET.fromstring(raw)
        except ET.ParseError:
            return False

        text_blob = " ".join(
            node.attrib.get("text", "")
            for node in root.iter("node")
            if node.attrib.get("text")
        )
        host_dialog = (
            "Pixel Launcher isn't responding" in text_blob
            or "System UI isn't responding" in text_blob
            or "Process system isn't responding" in text_blob
        )
        if not host_dialog:
            return False

        # Prefer "Wait" so the host shell can recover without changing app
        # state. Fall back to Back if this emulator image exposes no button id.
        for node in root.iter("node"):
            if node.attrib.get("resource-id") == "android:id/aerr_wait":
                center = self._bounds_center(node)
                if center:
                    self.shell("input", "tap", str(center[0]), str(center[1]), check=False)
                    time.sleep(1)
                    return True
        self.shell("input", "keyevent", "4", check=False)
        time.sleep(1)
        return True

    # A stalled hosted emulator can leave the hierarchy file empty on every dump
    # attempt while the app itself stays healthy (the failing hosted run left a
    # truncated logcat buffer next to a 0-byte ui.xml). Two independent dump
    # targets plus a device liveness probe separate that stall from a real
    # navigation failure; the caller still enforces the exact expected UI root.
    DUMP_REMOTE_PATHS = ("/sdcard/pli_final_ui.xml", "/data/local/tmp/pli_final_ui.xml")

    def is_responsive(self) -> bool:
        result = self.cmd("shell", "echo", "pli-alive", check=False)
        return result.returncode == 0 and result.stdout.strip() == "pli-alive"

    def _dump_once(self, remote: str) -> tuple[str, str]:
        result = self.cmd("shell", "uiautomator", "dump", remote, check=False)
        tool_output = " ".join(
            part.strip()
            for part in (result.stdout or "", result.stderr or "")
            if part and part.strip()
        )
        raw = "" if result.returncode != 0 else self.shell("cat", remote, check=False)
        return tool_output, raw

    def dump_xml(self, path: Path, attempts: int = 5) -> str:
        diagnostics: list[str] = []
        for attempt in range(attempts):
            for remote in self.DUMP_REMOTE_PATHS:
                tool_output, raw = self._dump_once(remote)
                if raw and self._dismiss_host_system_dialog(raw):
                    diagnostics.append(f"attempt={attempt} remote={remote} host_dialog=dismissed")
                    continue
                if raw:
                    path.write_text(raw, encoding="utf-8")
                    return raw
                diagnostics.append(
                    f"attempt={attempt} remote={remote} tool={tool_output!r} hierarchy=empty"
                )
            if not self.is_responsive():
                diagnostics.append(f"attempt={attempt} device=unresponsive")
                self.cmd("wait-for-device", check=False)
            time.sleep(1)
        path.write_text("", encoding="utf-8")
        (path.parent / "dump-diagnostics.txt").write_text(
            "\n".join(diagnostics[-20:]) + "\n", encoding="utf-8"
        )
        raise CaptureError(
            "unable to obtain unobscured UIAutomator XML: "
            f"{path}; attempts={attempts}; diagnostics={diagnostics[-3:]}"
        )

    def tap(self, xml: str, needle: str, attr: str) -> None:
        try:
            root = ET.fromstring(xml)
        except ET.ParseError as exc:
            raise CaptureError(f"invalid UIAutomator XML: {exc}") from exc
        key = {"id": "resource-id", "desc": "content-desc", "text": "text"}.get(attr)
        if key is None:
            raise CaptureError(f"unsupported tap attribute: {attr}")
        for node in root.iter("node"):
            value = node.attrib.get(key, "")
            if needle not in value:
                continue
            center = self._bounds_center(node)
            if not center:
                continue
            self.shell("input", "tap", str(center[0]), str(center[1]))
            return
        raise CaptureError(f"UI target not found: {needle} ({attr})")

    def _manifest_from_xml(self) -> dict | None:
        remote = "/sdcard/pli_manifest_title.xml"
        self.shell("uiautomator", "dump", remote, check=False)
        raw = self.shell("cat", remote, check=False)
        if not raw:
            return None
        try:
            root = ET.fromstring(raw)
            values: list[str] = []
            for node in root.iter("node"):
                values.extend(node.attrib.values())
            for value in values:
                decoded = html.unescape(value)
                idx = decoded.find("PLI_MANIFEST:")
                if idx < 0:
                    continue
                payload = decoded[idx + len("PLI_MANIFEST:") :].strip()
                if payload.startswith("{"):
                    candidate = json.loads(payload)
                    if isinstance(candidate, dict):
                        return candidate
        except Exception:
            return None
        return None

    def read_runtime_manifest(
        self,
        retries: int = 10,
        expected_pet_id: str | None = None,
        expected_yaw: float | None = None,
        expected_stage_role: str | None = None,
        expected_pose: str | None = None,
    ) -> dict:
        last_manifest: dict | None = None
        for _ in range(retries):
            candidates: list[str] = []
            # Debug/demo builds: run-as is the most reliable app-private path.
            result = self.cmd(
                "shell",
                "run-as",
                self.package,
                "cat",
                "files/pli_manifest.json",
                check=False,
            )
            if result.returncode == 0 and result.stdout.strip().startswith("{"):
                candidates.append(result.stdout.strip())

            # Compatibility path for rooted/emulator images.
            result = self.cmd(
                "shell",
                "cat",
                f"/data/data/{self.package}/files/pli_manifest.json",
                check=False,
            )
            if result.returncode == 0 and result.stdout.strip().startswith("{"):
                candidates.append(result.stdout.strip())

            for raw in candidates:
                try:
                    manifest = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                last_manifest = manifest
                if self._manifest_matches(
                    manifest,
                    expected_pet_id=expected_pet_id,
                    expected_yaw=expected_yaw,
                    expected_stage_role=expected_stage_role,
                    expected_pose=expected_pose,
                ):
                    return manifest

            xml_manifest = self._manifest_from_xml()
            if xml_manifest is not None:
                last_manifest = xml_manifest
            if (
                xml_manifest is not None
                and self._manifest_matches(
                    xml_manifest,
                    expected_pet_id=expected_pet_id,
                    expected_yaw=expected_yaw,
                    expected_stage_role=expected_stage_role,
                    expected_pose=expected_pose,
                )
            ):
                return xml_manifest
            time.sleep(2)
        suffix = f" for pet {expected_pet_id}" if expected_pet_id else ""
        if expected_yaw is not None:
            suffix += f", yaw≈{expected_yaw:.3f}"
        if expected_stage_role is not None:
            suffix += f", stageRole={expected_stage_role}"
        if expected_pose is not None:
            suffix += f", pose={expected_pose}"
        # Report only public metadata. Never print owner media or auth tokens.
        seen = ""
        if last_manifest is not None:
            keys = ("ready", "manifestOrigin", "representation", "generic", "fallbackUsed", "petId", "stageRole", "sourceMediaCount")
            seen = "; observed=" + json.dumps(
                {key: last_manifest.get(key) for key in keys},
                ensure_ascii=False,
                sort_keys=True,
            )
        raise CaptureError(f"required rigged RUNTIME 3D manifest unavailable{suffix}{seen}")

    def peek_runtime_manifest(self) -> dict | None:
        """Read the persisted runtime manifest without failing when it is absent.

        Used by the demo pet-selection loops. The demo deep link switches the
        active pet asynchronously and the WebView stage republishes its manifest
        afterwards, so a manifest for the *previous* pet must not be mistaken for
        the requested one (observed on a repeated local run where the emulator
        still held the secondary pet's stage).
        """
        for args in (
            ("run-as", self.package, "cat", "files/pli_manifest.json"),
            ("cat", f"/data/data/{self.package}/files/pli_manifest.json"),
        ):
            result = self.cmd("shell", *args, check=False)
            payload = (result.stdout or "").strip()
            if result.returncode != 0 or not payload.startswith("{"):
                continue
            try:
                manifest = json.loads(payload)
            except json.JSONDecodeError:
                continue
            if isinstance(manifest, dict):
                return manifest
        return None

    @classmethod
    def _manifest_matches(
        cls,
        manifest: dict,
        *,
        expected_pet_id: str | None,
        expected_yaw: float | None,
        expected_stage_role: str | None,
        expected_pose: str | None,
    ) -> bool:
        if not cls._is_product_manifest(manifest):
            return False
        if expected_pet_id is not None and str(manifest.get("petId") or "") != expected_pet_id:
            return False
        if expected_stage_role is not None and str(manifest.get("stageRole") or "") != expected_stage_role:
            return False
        if expected_pose is not None:
            if str(manifest.get("pose") or "") != expected_pose:
                return False
            if str(manifest.get("canonicalPose") or "") != expected_pose:
                return False
        if expected_yaw is not None:
            try:
                actual = float((manifest.get("camera") or {}).get("yaw"))
            except (TypeError, ValueError):
                return False
            error = abs(math.atan2(math.sin(actual - expected_yaw), math.cos(actual - expected_yaw)))
            if error > 0.08:
                return False
        return True

    @staticmethod
    def _is_product_manifest(manifest: dict) -> bool:
        tier = manifest.get("visualFidelityTier")
        try:
            source_media_count = int(manifest.get("sourceMediaCount") or 0)
        except (TypeError, ValueError):
            return False
        identity_evidence = manifest.get("individualIdentityEvidence") is True
        fidelity_consistent = (
            (tier == "STYLIZED_REFERENCE" and source_media_count == 0 and not identity_evidence)
            or (tier == "OWNER_MEDIA_REFERENCED" and source_media_count > 0 and identity_evidence)
        )
        return (
            manifest.get("ready") is True
            and manifest.get("manifestOrigin") == "RUNTIME"
            and manifest.get("representation") == "rigged-glb-twin"
            and manifest.get("technicalRepresentationQuality") == "RIGGED_PBR_SKINNED"
            and fidelity_consistent
            and manifest.get("generic") is not True
            and manifest.get("fallbackUsed") is not True
        )


def api_json(url: str, *, method: str = "GET", body: dict | None = None, headers: dict[str, str] | None = None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    request_headers = {"content-type": "application/json", **(headers or {})}
    req = urllib.request.Request(url, data=data, headers=request_headers, method=method)
    with urllib.request.urlopen(req, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


def resolve_demo_pets(api_url: str, login_email: str) -> tuple[dict, dict]:
    auth = api_json(
        f"{api_url.rstrip('/')}/api/v1/auth/dev/login",
        method="POST",
        body={"email": login_email},
    )
    user_id = auth.get("user_id")
    if not user_id:
        raise CaptureError("dev login returned no user_id")
    pets = api_json(
        f"{api_url.rstrip('/')}/api/v1/pets",
        headers={"X-Dev-User-Id": str(user_id)},
    )
    dogs = [p for p in pets if str(p.get("species", "")).lower() == "dog"]
    cats = [p for p in pets if str(p.get("species", "")).lower() == "cat"]
    if len(dogs) != 1 or len(cats) != 1:
        raise CaptureError("final Android evidence requires exactly one seeded dog and one seeded cat")
    for pet in (dogs[0], cats[0]):
        if not pet.get("id") or not pet.get("name"):
            raise CaptureError("seeded evidence pet is missing id/name")
    return dogs[0], cats[0]


def git(*args: str) -> str:
    return run(["git", *args]).stdout.strip()


def source_identity() -> tuple[str, str]:
    if os.environ.get("PLI_SOURCE_HEAD"):
        return (
            os.environ["PLI_SOURCE_HEAD"],
            os.environ.get("PLI_SOURCE_BRANCH", ""),
        )
    event_path = os.environ.get("GITHUB_EVENT_PATH")
    if event_path:
        try:
            event = json.loads(Path(event_path).read_text(encoding="utf-8"))
            pull_request = event.get("pull_request") or {}
            head = pull_request.get("head") or {}
            if head.get("sha"):
                return str(head["sha"]), str(head.get("ref") or "")
        except Exception:
            pass
    return git("rev-parse", "HEAD"), git("branch", "--show-current")


def save_manifest(path: Path, manifest: dict) -> None:
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")



def first_paint_gate_state(xml: str, expected_root: str) -> tuple[bool, list[str]]:
    """Inspect REAL Android accessibility hierarchy, not WebView metadata.

    A 3D runtime manifest can be ready before React Native removes the honest
    pet illustration that occludes the actual WebGL canvas. Only a completely
    absent fallback overlay can certify the end of that first-paint transition.
    """
    root = ET.fromstring(xml)
    resource_ids = [
        node.attrib.get("resource-id", "")
        for node in root.iter("node")
    ]
    fallback_ids = [
        rid for rid in resource_ids
        if rid.startswith("pli.") and rid.endswith(".pet-boot-fallback")
    ]
    return expected_root in resource_ids, fallback_ids


def await_owner_3d_first_paint(
    android: Android,
    directory: Path,
    *,
    screen: str,
    expected_root: str,
    attempts: int = 14,
) -> None:
    """Require a mounted owner surface and two consecutive overlay-free dumps.

    On failure keep the exact UI, early screenshot and observation trace.
    Do NOT treat a ready manifest, a fixed sleep or a generic species icon
    as evidence that the 3D subject was visible in the final screenshot.
    """
    trace: list[dict[str, object]] = []
    clear_streak = 0
    photographed_overlay = False
    for attempt in range(attempts):
        xml = android.dump_xml(directory / "ui.xml")
        right_root, fallback_ids = first_paint_gate_state(xml, expected_root)
        trace.append({
            "poll": attempt + 1,
            "expected_surface_visible": right_root,
            "blocking_fallback_ids": fallback_ids,
        })
        if fallback_ids and not photographed_overlay:
            # Keep one raw screenshot instead of silently discarding evidence
            # of the interim placeholder that caused a false green Today shot.
            android.screenshot(directory / "first-paint-pending.png")
            photographed_overlay = True
        clear_streak = clear_streak + 1 if right_root and not fallback_ids else 0
        if clear_streak >= 2:
            save_manifest(directory / "first-paint-gate.json", {
                "screen": screen,
                "status": "RN_FALLBACK_CLEARED",
                "ready_runtime_manifest_already_verified": True,
                "stable_overlay_free_ui_dumps": clear_streak,
                "trace": trace,
                "vision_model_used": False,
                "pixel_level_3d_acceptance": "NOT_ASSERTED",
            })
            return
        time.sleep(1)
    save_manifest(directory / "first-paint-gate.json", {
        "screen": screen,
        "status": "BLOCKED_BY_FIRST_PAINT",
        "ready_runtime_manifest_already_verified": True,
        "trace": trace,
        "vision_model_used": False,
    })
    android.screenshot(directory / "first-paint-failed.png")
    raise CaptureError(
        "RUNTIME 3D manifest ready but owner stage still blocked by first-paint "
        f"fallback or wrong root: {screen}, polls={len(trace)}; "
        f"last={trace[-1]}"
    )


def capture_surface(
    android: Android,
    out: Path,
    screen: str,
    needs_manifest: bool,
    expected_stage_role: str | None,
    expected_pet_id: str | None = None,
) -> None:
    directory = out / screen
    directory.mkdir(parents=True, exist_ok=True)
    if needs_manifest:
        android.clear_runtime_manifest()
    android.start_link(f"pli-demo://nav?screen={screen}")
    expected_root = SURFACE_ROOT_IDS.get(screen)
    # Life View additionally requires its primary mode rail inside the first
    # viewport. That rail mounts asynchronously after the identity root, so the
    # SAME bounded poll has to cover it: a single snapshot rejected a healthy
    # Life View and failed the whole evidence job (run 38095816809). The rail is
    # still mandatory and still has to be at least 44px visible after the poll.
    requires_modebar = screen == "lifeview"
    xml = ""
    # Navigation and RN layout completion are asynchronous on hosted emulators.
    # Poll for the EXACT requested root instead of blessing whichever page
    # happens to be visible after one arbitrary sleep.
    attempts = 12 if (expected_root or requires_modebar) else 1
    for attempt in range(attempts):
        time.sleep(1 if attempt else 3)
        xml = android.dump_xml(directory / "ui.xml")
        if expected_root and expected_root not in xml:
            continue
        if requires_modebar and "pli.lifeview.modebar" not in xml:
            continue
        break
    if expected_root and expected_root not in xml:
        observed_ids = sorted(
            set(re.findall(r'resource-id="(pli\.[^"]+)"', xml))
        )[:12]
        raise CaptureError(
            f"wrong Android surface after demo navigation: requested={screen}; "
            f"expected_ui_id={expected_root}; observed_ui_ids={observed_ids}"
        )
    if screen in OWNER_ERROR_FREE_SURFACES:
        # Dedicated negative-state tests cover error/not-found behavior. A
        # primary owner screen must not pass evidence while embedding a 404.
        for forbidden in ("页面不存在", "出错了：未找到", "出错了：页面不存在"):
            if forbidden in xml:
                raise CaptureError(
                    f"broken owner state leaked into Android surface {screen}: {forbidden}"
                )
    if screen == "lifeview":
        root = ET.fromstring(xml)
        modebar = next(
            (
                node
                for node in root.iter("node")
                if "pli.lifeview.modebar" in node.attrib.get("resource-id", "")
            ),
            None,
        )
        if modebar is None:
            observed_ids = sorted(set(re.findall(r'resource-id="(pli\.[^"]+)"', xml)))[:12]
            raise CaptureError(
                "Life View primary mode rail is missing from the real Android viewport; "
                f"observed_ui_ids={observed_ids}"
            )
        bounds = modebar.attrib.get("bounds", "")
        match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bounds)
        visible_height = (int(match.group(4)) - int(match.group(2))) if match else 0
        if visible_height < 44:
            raise CaptureError(
                f"Life View primary mode rail is clipped in the first viewport: visible_height={visible_height}px"
            )
    if needs_manifest:
        # Prove the high-fidelity runtime is ready before freezing the visual
        # frame. This prevents a screenshot of an earlier procedural/loading
        # state from being paired with a later successful manifest.
        save_manifest(
            directory / "3d.json",
            android.read_runtime_manifest(
                expected_pet_id=expected_pet_id,
                expected_stage_role=expected_stage_role,
                expected_pose="Stand" if expected_stage_role == "review" else None,
            ),
        )
        # A ready WebView manifest does not certify visible 3D: the first
        # screenshot of 9c42fa58 still contained pli.today.pet-boot-fallback.
        # Wait for real RN overlay removal, with exact surface identity and a
        # bounded failure artifact; never approve the interim species glyph.
        if screen in {"today", "pet", "lifeview", "companion"}:
            await_owner_3d_first_paint(
                android, directory, screen=screen,
                expected_root=expected_root or SURFACE_ROOT_IDS[screen],
            )
    android.screenshot(directory / f"{screen}.png")
    extractor = ROOT / "scripts" / "blind-ui" / "android_extract.py"
    run([os.environ.get("PYTHON", "python3"), str(extractor), str(directory)])


def capture_distinct_view_frame(
    android: Android,
    path: Path,
    previous: Path | None,
    *,
    attempts: int = 6,
) -> None:
    """Freeze a Twin Review frame that actually differs from the previous view.

    The runtime manifest proves the commanded camera yaw, but the WebGL frame can
    still be the previous one when the screenshot lands (observed on run
    38102813215: the side and back PNGs were byte-identical while their manifests
    reported different yaws). Re-capture within a bounded budget until the frame
    changes; if it never does, the caller still fails - the three-view claim must
    never rest on a highlight alone.
    """
    baseline = previous.read_bytes() if previous is not None and previous.exists() else None
    for attempt in range(attempts):
        android.screenshot(path)
        current = path.read_bytes()
        if baseline is None or current != baseline:
            return
        if attempt + 1 < attempts:
            time.sleep(1)
    raise CaptureError(
        f"Twin Review view frame never changed from the previous view after {attempts} captures: {path}"
    )


def capture_review_views(
    android: Android,
    directory: Path,
    prefix: str,
    expected_pet_id: str,
) -> None:
    android.clear_runtime_manifest()
    android.start_link(f"pli-demo://nav?screen=twinreview&pet={expected_pet_id}")

    # This function runs *after* the surface sweep, whose last screen is Me.
    # A fixed sleep can therefore freeze the previous tab while React
    # Navigation is still applying the stack reset. Poll the exact Review
    # controls, just like capture_surface() polls its exact surface root.
    xml = ""
    required_controls = (
        "pli.twinreview.camera-controls",
        "pli.twinreview.view.front",
        "pli.twinreview.view.side",
        "pli.twinreview.view.back",
    )
    for attempt in range(12):
        time.sleep(1 if attempt else 3)
        xml = android.dump_xml(directory / "ui.xml")
        if all(control in xml for control in required_controls):
            break
    missing = [control for control in required_controls if control not in xml]
    if missing:
        observed_ids = sorted(
            set(re.findall(r'resource-id="(pli\\.[^"]+)"', xml))
        )[:12]
        raise CaptureError(
            "Twin Review controls unavailable after deterministic navigation: "
            f"missing={missing}; observed_ui_ids={observed_ids}"
        )
    expected = {"front": 0.0, "side": 1.5707963267948966, "back": 3.141592653589793}
    previous_frame: Path | None = None
    for view, yaw in expected.items():
        android.clear_runtime_manifest()
        android.tap(xml, f"pli.twinreview.view.{view}", "id")
        # Do not freeze a fixed sleep + first readable manifest: the RN bridge
        # is asynchronous and the previous camera manifest can still be on
        # disk. Poll until the SAME pet, Review stage, and commanded yaw agree.
        manifest = android.read_runtime_manifest(
            retries=15,
            expected_pet_id=expected_pet_id,
            expected_yaw=yaw,
            expected_stage_role="review",
            expected_pose="Stand",
        )
        # Product presence gate: a loaded GLB is not visually acceptable when
        # the selected inspection angle shrinks into a small object. Narrow
        # front/back silhouettes may be area-limited, so accept either a
        # substantial viewport area OR a tall, readable silhouette.
        area_ratio = float(manifest.get("projectedAreaRatio") or 0)
        height_ratio = float(manifest.get("projectedPetHeightRatio") or 0)
        if area_ratio < 0.20 and height_ratio < 0.68:
            raise CaptureError(
                f"Twin Review pet too small at {view}: area={area_ratio:.3f}, height={height_ratio:.3f}"
            )
        save_manifest(directory / f"3d_view_{view}.json", manifest)
        frame = directory / f"{prefix}_{view}.png"
        capture_distinct_view_frame(android, frame, previous_frame)
        previous_frame = frame
        xml = android.dump_xml(directory / "ui.xml")


def capture_r7_life_replay(
    android: Android,
    out: Path,
    *,
    api_url: str,
    owner_id: str,
    pet_id: str,
) -> None:
    """Observe BOTH historical perspectives through the real Android UI.

    A backfilled event is a true, persisted demo record with a historical
    occurred_at and a current recorded_at. The API proves that it must appear
    under verified-now but cannot appear under as-known-then. ADB clicks the
    real selector, then freezes each distinct response and accessibility tree.
    No fake DOM, no screenshot synthesis and NO vision models.
    """
    local_day_raw = android.shell("date", "+%Y-%m-%d")
    offset_raw = android.shell("date", "+%z")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", local_day_raw):
        raise CaptureError(f"invalid Android local date: {local_day_raw!r}")
    if not re.fullmatch(r"[+-]\d{4}", offset_raw):
        raise CaptureError(f"invalid Android timezone offset: {offset_raw!r}")
    hours = int(offset_raw[1:3])
    minutes = int(offset_raw[3:])
    offset_seconds = (hours * 60 + minutes) * 60 * (1 if offset_raw[0] == "+" else -1)
    owner_zone = timezone(timedelta(seconds=offset_seconds))
    historical_day = datetime.strptime(local_day_raw, "%Y-%m-%d").date() - timedelta(days=3)
    recorded_day = historical_day.isoformat()
    occurred_at = datetime.combine(historical_day, clock_time(hour=12), tzinfo=owner_zone)
    owner_header = {"X-Dev-User-Id": owner_id}
    api = api_url.rstrip("/") + "/api/v1"
    created = api_json(
        f"{api}/pets/{pet_id}/events",
        method="POST",
        headers=owner_header,
        body={
            "event_type": "daily.walk",
            "payload": {"duration_minutes": 17},
            "occurred_at": occurred_at.isoformat(),
            "allow_duplicate": True,
        },
    )
    event_id = created.get("event_id")
    if not event_id or created.get("pet_id") != pet_id:
        raise CaptureError("R7 backfill fixture did not persist for the selected pet")
    day_start = datetime.combine(historical_day, clock_time.min, tzinfo=owner_zone)
    next_start = day_start + timedelta(days=1)
    def replay_query(perspective: str) -> dict:
        qs = urlencode({
            "date": recorded_day,
            "perspective": perspective,
            "day_start_at": day_start.isoformat(),
            "day_end_at": next_start.isoformat(),
        })
        return api_json(f"{api}/pets/{pet_id}/life-replay?{qs}", headers=owner_header)

    current = replay_query("verified_now")
    then = replay_query("as_known_then")
    current_ids = [row["event_id"] for row in current.get("events", [])]
    prior_ids = [row["event_id"] for row in then.get("events", [])]
    if event_id not in current_ids or event_id in prior_ids:
        raise CaptureError(
            "R7 API bitemporal truth failed for a real late-recorded LifeEvent: "
            f"event={event_id} verified={event_id in current_ids} as_known={event_id in prior_ids}"
        )
    if current.get("time_policy") != "CLIENT_EXPLICIT_LOCAL_DAY_BOUNDS":
        raise CaptureError("R7 replay did not respect explicit owner-local calendar bounds")

    evidence = out / "r7-life-replay"
    evidence.mkdir(parents=True, exist_ok=True)
    save_manifest(evidence / "api-truth.json", {
        "pet_id": pet_id,
        "day": recorded_day,
        "timezone_offset": offset_raw,
        "backfilled_event_id": event_id,
        "created_at": created.get("recorded_at"),
        "occurred_at": created.get("occurred_at"),
        "verified_now_event_ids": current_ids,
        "as_known_then_event_ids": prior_ids,
        "time_policy": current.get("time_policy"),
        "vision_model_used": False,
    })

    android.start_link(f"pli-demo://nav?screen=lifeview&pet={pet_id}&date={recorded_day}")
    # The editor's real portrait precedes the advanced history controls.
    # Scroll the native owner screen; a demo deep link only sets a valid
    # route date, never changes returned facts or selected UI perspective.
    ready_xml = ""
    for attempt in range(18):
        time.sleep(1 if attempt else 3)
        ready_xml = android.dump_xml(evidence / "verified-ui.xml")
        if "pli.lifeview.replay.verified_now" in ready_xml:
            break
        android.shell("input", "swipe", "960", "1820", "960", "650", "420")
    if "pli.lifeview.replay.verified_now" not in ready_xml:
        raise CaptureError("R7 Android historical date controls are not reachable by real vertical swipes")

    def screen_text(xml: str) -> str:
        root = ET.fromstring(xml)
        return " ".join(node.attrib.get("text", "") for node in root.iter("node"))

    verified_note = "截至目前的记录"
    prior_note = "仅回放当时已记录的事实"
    verified_xml = ready_xml
    for _ in range(15):
        if verified_note in screen_text(verified_xml):
            break
        time.sleep(1)
        verified_xml = android.dump_xml(evidence / "verified-ui.xml")
    if verified_note not in screen_text(verified_xml):
        raise CaptureError("R7 Android verified_now response did not render, or wrong pet/date is visible")
    android.screenshot(evidence / "verified-now.png")

    android.tap(verified_xml, "pli.lifeview.replay.as_known_then", "id")
    known_xml = ""
    for _ in range(20):
        time.sleep(1)
        known_xml = android.dump_xml(evidence / "as-known-ui.xml")
        if prior_note in screen_text(known_xml):
            break
    if prior_note not in screen_text(known_xml):
        raise CaptureError("R7 Android as_known_then response did not render after UIAutomator tap")
    if "pli.lifeview.replay.perspective" not in known_xml:
        raise CaptureError("R7 perspective controls vanished during switch")
    android.screenshot(evidence / "as-known-then.png")
    save_manifest(evidence / "capture-summary.json", {
        "pet_id": pet_id,
        "historical_day": recorded_day,
        "source_event_id": event_id,
        "verified_now_note": verified_note,
        "as_known_then_note": prior_note,
        "both_real_android_states_observed": True,
        "vision_model_used": False,
        "human_visual_acceptance": "PENDING",
    })


def capture_r8_owner_review(
    android: Android,
    out: Path,
    *,
    api_url: str,
    owner_id: str,
    pet_id: str,
) -> None:
    """Prove owner action through real Android taps and persisted event IDs.

    Seed a real, recorded-only same-clock pattern. A human-facing Case is
    created only after tapping the React Native button. A follow-up Review
    must reference the *new* QuickLog event, not any AI-generated summary.
    """
    root = api_url.rstrip("/") + "/api/v1"
    owner_header = {"X-Dev-User-Id": owner_id}
    product_tz = timezone(timedelta(hours=8))
    current_clock = datetime.now(product_tz) - timedelta(seconds=2)
    planted_ids: list[str] = []
    for days_back, minutes in ((3, 90), (2, 90), (1, 90), (0, 20)):
        observed_at = current_clock - timedelta(days=days_back)
        created = api_json(
            f"{root}/pets/{pet_id}/events",
            method="POST",
            headers=owner_header,
            body={
                "event_type": "daily.walk",
                "payload": {"duration_minutes": minutes},
                "occurred_at": observed_at.isoformat(),
                "allow_duplicate": True,
            },
        )
        if created.get("pet_id") != pet_id or not created.get("event_id"):
            raise CaptureError("R8 fixture failed to create a real pet-scoped LifeEvent")
        planted_ids.append(str(created["event_id"]))
    baseline = api_json(
        f"{root}/pets/{pet_id}/baseline/recompute?window_days=14",
        method="POST", headers=owner_header, body={},
    )
    hint = api_json(
        f"{root}/pets/{pet_id}/abnormal-day-hint",
        headers=owner_header,
    )
    walk = next(
        (x for x in hint.get("explanations", [])
         if x.get("metric") == "walk_minutes_per_day"), None,
    )
    if (
        walk is None or not walk.get("notable")
        or not walk.get("current_recorded")
        or int(walk.get("sample_count") or 0) < 3
    ):
        raise CaptureError(
            "R8 recorded-only owner observation did not satisfy a real "
            f"same-clock reviewable criterion: {walk}"
        )
    directory = out / "r8-owner-review"
    directory.mkdir(parents=True, exist_ok=True)

    def find_control(
        name: str, filename: str, *, attempts: int = 21,
        require_enabled: bool = False, scroll_direction: str = "up",
    ) -> str:
        """Only return an actually actionable native target when tapping.

        Hosted RN may expose an existing Pressable with enabled=false while
        a Case POST / evidence GET is still settling. A disabled button is
        NOT proof that the tap was possible. Never swipe it away while
        waiting for the in-flight request to release the UI.
        """
        latest = ""
        saw_disabled = False
        for attempt in range(attempts):
            time.sleep(0.8 if attempt else 1.8)
            latest = android.dump_xml(directory / filename)
            nodes = list(ET.fromstring(latest).iter("node"))
            matched = [node for node in nodes
                       if node.attrib.get("resource-id", "") == name]
            if matched:
                if not require_enabled or ui_has_actionable_control(latest, name):
                    return latest
                saw_disabled = True
                # Let React Native commit the end of the pending POST/GET
                # without unmounting the still-visible Case source control.
                continue
            if name == "pli.r8.owner-review.evidence":
                # After expanding source rows their header can end up ABOVE
                # the viewport. Move content down to the Case, not further
                # below it. Never turn API data alone into native evidence.
                android.shell("input", "swipe", "765", "650", "765", "1460", "310")
            elif scroll_direction == "down":
                android.shell("input", "swipe", "765", "650", "765", "1460", "310")
            else:
                # A tall pet Living Stage can put the card below first fold.
                android.shell("input", "swipe", "960", "1750", "960", "650", "360")
        raise CaptureError(
            f"R8 native target not actionable: {name}; saw_disabled={saw_disabled}; "
            f"observed_ids={sorted(set(re.findall(r'resource-id=\"(pli\\.[^\"]+)\"', latest)))[:16]}"
        )

    android.start_link(f"pli-demo://nav?screen=today&pet={pet_id}")
    invitation = find_control("pli.r8.owner-review.create", "invitation-ui.xml", require_enabled=True)
    android.screenshot(directory / "invitation.png")
    android.tap(invitation, "pli.r8.owner-review.create", "id")

    case_ui = find_control("pli.r8.owner-review.sources", "case-ui.xml")
    android.screenshot(directory / "source-backed-case.png")
    cases = api_json(
        f"{root}/pets/{pet_id}/life-change-cases",
        headers=owner_header,
    ).get("cases", [])
    case = next(
        (c for c in cases if c.get("metric") == "walk_minutes_per_day"
         and c.get("source_valid") and planted_ids[-1] in c.get("evidence_event_ids", [])),
        None,
    )
    if not case:
        raise CaptureError("R8 native Case tap did not persist a source-backed owner case")
    case_id = str(case["case_id"])
    case_source_ids = case.get("evidence_event_ids", [])
    if not all(event_id in case_source_ids for event_id in planted_ids):
        raise CaptureError("R8 case failed to cite every real planted event")

    # R8Z failing native capture exposed this exact Pressable with
    # enabled=false immediately after Case creation. The old script tapped
    # the disabled view and then scrolled the evidence panel off screen.
    case_ui = find_control("pli.r8.owner-review.sources", "case-ui.xml", require_enabled=True)
    android.tap(case_ui, "pli.r8.owner-review.sources", "id")
    source_ui = find_control("pli.r8.owner-review.evidence", "source-ui.xml", attempts=30)
    android.screenshot(directory / "raw-sources-initial.png")
    # React Native/Android exposes only VISIBLE children of a long source
    # panel. A fixed first-fold dump misses the fourth source even when the
    # panel is genuinely expanded. Swipe through it and require EVERY seeded
    # event's FULL immutable ID in the real UIAutomator resource-id or
    # accessibility description; do not substitute API data for native proof.
    observed_source_ids: set[str] = set()
    for attempt in range(16):
        nodes = ET.fromstring(source_ui).iter("node")
        accessible = " ".join(
            f'{n.attrib.get("text", "")} {n.attrib.get("content-desc", "")} {n.attrib.get("resource-id", "")}'
            for n in nodes
        )
        observed_source_ids.update(
            event_id for event_id in planted_ids if event_id in accessible
        )
        if all(event_id in observed_source_ids for event_id in planted_ids):
            break
        android.shell("input", "swipe", "765", "1850", "765", "1120", "320")
        time.sleep(0.7)
        source_ui = android.dump_xml(directory / f"source-scroll-{attempt + 1}.xml")
    if any(event_id not in observed_source_ids for event_id in planted_ids):
        raise CaptureError(
            "R8 native raw-source list did not expose every real full event identity "
            f"after scrolling; observed={len(observed_source_ids)}/{len(planted_ids)}"
        )
    android.screenshot(directory / "raw-sources.png")

    # Source inspection is user-controlled; close the long panel before making
    # a decision so the confirmation remains on-screen, not silently below fold.
    collapse_ui = find_control("pli.r8.owner-review.sources", "source-collapse-ui.xml", require_enabled=True, scroll_direction="down")
    android.tap(collapse_ui, "pli.r8.owner-review.sources", "id")
    for _ in range(12):
        time.sleep(0.6)
        closed = android.dump_xml(directory / "source-collapsed-ui.xml")
        if "pli.r8.owner-review.evidence" not in closed:
            break
    else:
        raise CaptureError("R8 source list did not collapse before owner decision")

    later_ui = find_control("pli.r8.owner-review.later", "later-ui.xml", require_enabled=True, scroll_direction="down")
    android.tap(later_ui, "pli.r8.owner-review.later", "id")
    after_later = ""
    for _ in range(22):
        time.sleep(0.8)
        after_later = android.dump_xml(directory / "later-ui.xml")
        if (
            'resource-id="pli.r8.owner-review.decision-status"' in after_later
            and "已记录稍后观察" in after_later
        ):
            break
        # Android may keep the card anchored below the viewport after a scroll.
        android.shell("input", "swipe", "840", "1740", "840", "1050", "250")
    if (
        'resource-id="pli.r8.owner-review.decision-status"' not in after_later
        or "已记录稍后观察" not in after_later
    ):
        raise CaptureError(
            "R8 native owner decision confirmation is not visible after tap; "
            "a successful API POST alone does not satisfy the Android UI gate"
        )
    after_case = api_json(
        f"{root}/pets/{pet_id}/life-change-cases/{case_id}",
        headers=owner_header,
    )
    after_decisions = [r.get("decision") for r in after_case.get("reviews", [])]
    if after_decisions != ["FOLLOW_UP_LATER"]:
        raise CaptureError(
            "R8 native owner FOLLOW_UP_LATER did not persist exactly one review: "
            f"{after_decisions}"
        )
    android.screenshot(directory / "owner-decision.png")

    record_ui = find_control("pli.r8.owner-review.record", "record-ui.xml", require_enabled=True, scroll_direction="down")
    android.tap(record_ui, "pli.r8.owner-review.record", "id")
    save_ui = find_control("pli.quicklog.save", "quicklog-ui.xml", require_enabled=True)
    android.screenshot(directory / "owner-observation-form.png")
    android.tap(save_ui, "pli.quicklog.save", "id")
    linked_ui = ""
    for _ in range(20):
        time.sleep(1)
        linked_ui = android.dump_xml(directory / "linked-ui.xml")
        if "这条真实记录已关联到主人核对" in linked_ui:
            break
    if "这条真实记录已关联到主人核对" not in linked_ui:
        raise CaptureError("R8 native QuickLog event was not confirmed as a real linked Review")
    android.screenshot(directory / "linked-follow-up.png")

    final_case = api_json(
        f"{root}/pets/{pet_id}/life-change-cases/{case_id}",
        headers=owner_header,
    )
    decisions = [r.get("decision") for r in final_case.get("reviews", [])]
    if decisions != ["FOLLOW_UP_LATER", "RECORD_OBSERVATION"]:
        raise CaptureError(f"R8 owner review history differs from native taps: {decisions}")
    followup_event_ids = final_case["reviews"][-1].get("related_event_ids", [])
    if len(followup_event_ids) != 1 or followup_event_ids[0] in case_source_ids:
        raise CaptureError("R8 follow-up did not cite a distinct newly saved LifeEvent")
    source = api_json(
        f"{root}/events/{followup_event_ids[0]}", headers=owner_header,
    )
    if source.get("pet_id") != pet_id or source.get("event_type") != "daily.walk":
        raise CaptureError("R8 linked follow-up is not this pet's real walking event")
    save_manifest(directory / "api-truth.json", {
        "pet_id": pet_id,
        "metric": "walk_minutes_per_day",
        "initial_event_ids": planted_ids,
        "baseline": baseline.get("baselines", {}).get("walk_minutes_per_day"),
        "case_id": case_id,
        "case_source_event_ids": case_source_ids,
        "review_decisions": decisions,
        "newly_recorded_followup_event_id": followup_event_ids[0],
        "all_actions_from_real_android_ui": True,
        "human_visual_acceptance": "PENDING",
        "vision_model_used": False,
    })


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(DEFAULT_OUT.relative_to(ROOT)))
    parser.add_argument("--adb", default="adb")
    parser.add_argument("--serial", default="emulator-5554")
    parser.add_argument("--package", default="com.pli.mobile")
    parser.add_argument("--login-email", default="owner@pli.demo")
    parser.add_argument("--api-url", default="http://localhost:8800")
    args = parser.parse_args()

    out = (ROOT / args.out).resolve()
    try:
        out.relative_to(ROOT)
    except ValueError as exc:
        raise CaptureError(f"output must remain inside current repository: {out}") from exc
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir(parents=True, exist_ok=True)

    android = Android(args.adb, args.serial, args.package)
    primary_pet, secondary_pet = resolve_demo_pets(args.api_url, args.login_email)
    primary_id = str(primary_pet["id"])
    secondary_id = str(secondary_pet["id"])

    android.start_link(f"pli-demo://login?email={args.login_email}")
    time.sleep(6)

    # Explicitly select the primary dog through a DEMO-ONLY deep link. This
    # avoids depending on UIAutomator exposing React Native testID as a
    # resource-id on every emulator image while still exercising the real
    # PetsContext selection + persisted current-pet state.
    android.clear_runtime_manifest()
    primary_select_dir = out / "_primary-select"
    primary_select_dir.mkdir(parents=True, exist_ok=True)
    primary_select_xml = ""
    # Hosted emulators can spend several seconds in RN view creation / GC after
    # the first owner surface mounts. A single fixed sleep used to classify an
    # otherwise healthy blank accessibility snapshot as navigation failure.
    # Re-issue the SAME deterministic deep link while polling for the exact
    # Today root. This does not relax any product gate: the required root and
    # later rigged-RUNTIME manifest still must both be present.
    for attempt in range(18):
        if attempt in (0, 5, 10, 15):
            android.start_link(f"pli-demo://nav?screen=today&pet={primary_id}")
        time.sleep(1 if attempt else 3)
        primary_select_xml = android.dump_xml(primary_select_dir / "ui.xml")
        if "演示数据暂时没有连接成功" in primary_select_xml or "重试演示登录" in primary_select_xml:
            raise CaptureError(
                "demo owner session failed before Today/3D mounted; check evidence API reachability/authentication"
            )
        if "pli.today.living-stage" in primary_select_xml:
            # Same asynchronous boundary as for the secondary pet: only accept
            # the surface once the runtime manifest belongs to the requested pet
            # (or has not been published yet, which read_runtime_manifest then
            # waits for).
            peeked = android.peek_runtime_manifest()
            if peeked is None or str(peeked.get("petId") or "") == primary_id:
                break
    if "pli.today.living-stage" not in primary_select_xml:
        observed_ids = sorted(
            set(re.findall(r'resource-id="(pli\\.[^"]+)"', primary_select_xml))
        )[:12]
        raise CaptureError(
            "primary pet selection did not reach Today before 3D verification after deterministic retries; "
            f"observed_ui_ids={observed_ids}"
        )
    primary_manifest = android.read_runtime_manifest(
        expected_pet_id=primary_id,
        expected_stage_role="today",
    )
    save_manifest(primary_select_dir / "3d.json", primary_manifest)

    for screen, manifest, stage_role in SURFACES:
        capture_surface(
            android,
            out,
            screen,
            manifest,
            stage_role,
            primary_id if manifest else None,
        )

    review_dir = out / "twinreview"
    capture_review_views(android, review_dir, "twin", primary_id)

    # R7: keep a real late-recorded event + API truth + two screenshots from
    # actual touch interaction, not source-only acceptance.
    owner_auth = api_json(
        f"{args.api_url.rstrip('/')}/api/v1/auth/dev/login",
        method="POST",
        body={"email": args.login_email},
    )
    capture_r7_life_replay(
        android, out, api_url=args.api_url,
        owner_id=str(owner_auth["user_id"]), pet_id=primary_id,
    )
    # R8: record, owner-acknowledge and follow-up on an actual Android screen.
    # Source event IDs + audit responses accompany the real screenshots.
    capture_r8_owner_review(
        android, out, api_url=args.api_url,
        owner_id=str(owner_auth["user_id"]), pet_id=primary_id,
    )

    # Switch to the secondary cat through the same DEMO-ONLY current-pet
    # deep link. The pet id is resolved from the seeded API at runtime; no
    # owner pet display name is hard-coded in production source.
    secondary_today = out / "secondary-sanity"
    secondary_today.mkdir(parents=True, exist_ok=True)
    android.clear_runtime_manifest()
    secondary_today_xml = ""
    # Pet selection and root reset are two asynchronous boundaries on the
    # hosted emulator. Re-issue the SAME deterministic deep link while polling
    # the exact Today root; never accept a stale prior surface.
    for attempt in range(12):
        if attempt in (0, 4, 8):
            android.start_link(f"pli-demo://nav?screen=today&pet={secondary_id}")
        time.sleep(1 if attempt else 3)
        secondary_today_xml = android.dump_xml(secondary_today / "ui.xml")
        if "pli.today.living-stage" in secondary_today_xml:
            # The deep link switches the active pet asynchronously and the
            # WebView stage republishes its manifest after that switch, so a
            # stale manifest for the previous pet must not be accepted here.
            peeked = android.peek_runtime_manifest()
            if peeked is None or str(peeked.get("petId") or "") == secondary_id:
                break
    if "pli.today.living-stage" not in secondary_today_xml:
        observed_ids = sorted(
            set(re.findall(r'resource-id="(pli\\.[^"]+)"', secondary_today_xml))
        )[:12]
        raise CaptureError(
            "secondary pet sanity capture is not on Today after deterministic retries; "
            f"observed_ui_ids={observed_ids}"
        )
    # This is a TRUE bootstrap gate: the secondary RN identity and WebView
    # node alone are not sufficient. Preserve a diagnostic before waiting for
    # the actual rigged pet-scoped RUNTIME manifest, including bounded native
    # WebView restart (not a forged or previous-pet manifest).
    android.screenshot(secondary_today / "secondary_today_before_manifest.png")
    secondary_manifest = android.read_runtime_manifest(
        retries=55,
        expected_pet_id=secondary_id,
        expected_stage_role="today",
    )
    save_manifest(secondary_today / "3d.json", secondary_manifest)
    time.sleep(1)
    android.screenshot(secondary_today / "secondary_today.png")

    secondary_review = out / "secondary-review"
    secondary_review.mkdir(parents=True, exist_ok=True)
    android.clear_runtime_manifest()
    android.start_link(f"pli-demo://nav?screen=twinreview&pet={secondary_id}")
    secondary_review_xml = ""
    required_secondary_controls = (
        "pli.twinreview.camera-controls",
        "pli.twinreview.view.front",
        "pli.twinreview.view.side",
        "pli.twinreview.view.back",
    )
    for attempt in range(12):
        time.sleep(1 if attempt else 3)
        secondary_review_xml = android.dump_xml(secondary_review / "ui.xml")
        if all(control in secondary_review_xml for control in required_secondary_controls):
            break
    missing_secondary = [
        control for control in required_secondary_controls if control not in secondary_review_xml
    ]
    if missing_secondary:
        observed_ids = sorted(
            set(re.findall(r'resource-id="(pli\\.[^"]+)"', secondary_review_xml))
        )[:12]
        raise CaptureError(
            "secondary Twin Review did not reach the requested pet/review surface: "
            f"missing={missing_secondary}; observed_ui_ids={observed_ids}"
        )
    save_manifest(
        secondary_review / "3d.json",
        android.read_runtime_manifest(
            expected_pet_id=secondary_id,
            expected_stage_role="review",
            expected_pose="Stand",
        ),
    )
    time.sleep(1)
    android.screenshot(secondary_review / "secondary_twinreview.png")
    capture_review_views(android, secondary_review, "secondary", secondary_id)

    source_head, source_branch = source_identity()
    capture_manifest = {
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "source_head": source_head,
        "source_branch": source_branch,
        "checkout_head": git("rev-parse", "HEAD"),
        "serial": args.serial,
        "package": args.package,
        "build_kind": "DEMO_EVIDENCE_BUILD",
        "vision_model_used": False,
        "required_secondary_pet": True,
        "primary_pet_id": primary_id,
        "secondary_pet_id": secondary_id,
    }
    save_manifest(out / "capture-manifest.json", capture_manifest)
    print(f"R5.6 Android final evidence complete -> {out}")


if __name__ == "__main__":
    main()
