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


def ui_control_description(xml: str, resource_id: str) -> str:
    """Read a control's accessibility description (RN exposes the label here)."""
    try:
        root = ET.fromstring(xml)
    except ET.ParseError:
        return ""
    for node in root.iter("node"):
        if node.attrib.get("resource-id") == resource_id:
            return node.attrib.get("content-desc", "")
    return ""


def ui_control_text(xml: str, resource_id: str) -> str:
    """Read a control's text attribute (derived status labels live here)."""
    try:
        root = ET.fromstring(xml)
    except ET.ParseError:
        return ""
    for node in root.iter("node"):
        if node.attrib.get("resource-id") == resource_id:
            return node.attrib.get("text", "")
    return ""


def ui_control_label(xml: str, resource_id: str) -> str:
    """Join a control's own and descendant text (RN containers merge labels)."""
    try:
        root = ET.fromstring(xml)
    except ET.ParseError:
        return ""
    for node in root.iter("node"):
        if node.attrib.get("resource-id") != resource_id:
            continue
        parts = [node.attrib.get("text", ""), node.attrib.get("content-desc", "")]
        parts += [child.attrib.get("text", "") for child in node.iter("node")]
        return " · ".join(part for part in parts if part)
    return ""


def ui_control_center(xml: str, resource_id: str) -> tuple[int, int] | None:
    """Return the real tap centre, or None for a degenerate/absent rectangle."""
    try:
        root = ET.fromstring(xml)
    except ET.ParseError:
        return None
    for node in root.iter("node"):
        if node.attrib.get("resource-id") != resource_id:
            continue
        match = re.match(
            r"\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]",
            node.attrib.get("bounds", ""),
        )
        if not match:
            return None
        left, top, right, bottom = (int(value) for value in match.groups())
        if right <= left or bottom <= top + 24:
            return None
        return (left + right) // 2, (top + bottom) // 2
    return None


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
    # R8D: the Review route mounts after the life stage. A late life manifest
    # can land after clear(); let the Review stage emit its OWN ready manifest
    # before commanding a camera. Best-effort only: the per-view gate below is
    # still the sole acceptance authority.
    try:
        android.read_runtime_manifest(
            retries=10,
            expected_pet_id=expected_pet_id,
            expected_stage_role="review",
            expected_pose="Stand",
        )
    except CaptureError:
        pass
    expected = {"front": 0.0, "side": 1.5707963267948966, "back": 3.141592653589793}
    previous_frame: Path | None = None
    for view, yaw in expected.items():
        button = f"pli.twinreview.view.{view}"
        manifest = None
        for attempt in range(2):
            android.clear_runtime_manifest()
            android.tap(xml, button, "id")
            try:
                # Do not freeze a fixed sleep + first readable manifest: the RN
                # bridge is asynchronous and the previous camera manifest can
                # still be on disk. Poll until the SAME pet, Review stage, and
                # commanded yaw agree.
                manifest = android.read_runtime_manifest(
                    retries=15,
                    expected_pet_id=expected_pet_id,
                    expected_yaw=yaw,
                    expected_stage_role="review",
                    expected_pose="Stand",
                )
                break
            except CaptureError:
                if attempt == 1:
                    raise
                # R8D: a stale life-stage manifest can survive the first mount.
                # Remount the Review route once, then command the same view.
                android.start_link(f"pli-demo://nav?screen=twinreview&pet={expected_pet_id}")
                xml = ""
                for poll in range(12):
                    time.sleep(1 if poll else 3)
                    xml = android.dump_xml(directory / "ui.xml")
                    if all(control in xml for control in required_controls):
                        break
                if not all(control in xml for control in required_controls):
                    raise
                # Give the remounted Review stage the same readiness grace
                # before re-commanding the camera; still best-effort.
                try:
                    android.read_runtime_manifest(
                        retries=8,
                        expected_pet_id=expected_pet_id,
                        expected_stage_role="review",
                        expected_pose="Stand",
                    )
                except CaptureError:
                    pass
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
) -> str:
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
    expected_minutes: dict[str, int] = {}
    expected_role_by_event_id: dict[str, str] = {}
    # Five historical days, each with TWO real 45-minute observations, plus
    # today's 20-minute observation. A real >8-source Case is required to
    # exercise native owner-controlled pagination rather than only the first 8.
    fixtures = tuple(
        (days_back, 45) for days_back in range(5, 0, -1) for _ in range(2)
    ) + ((0, 20),)
    for days_back, minutes in fixtures:
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
        event_id = str(created["event_id"])
        planted_ids.append(event_id)
        expected_minutes[event_id] = minutes
        expected_role_by_event_id[event_id] = (
            "当日依据" if days_back == 0 else "同期参考"
        )
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
                if any(node.attrib.get("resource-id") == "pli.r8.owner-review.evidence-error"
                       for node in nodes):
                    raise CaptureError(
                        "R8 real native evidence API returned an error; "
                        "do not replace missing rows with the Case API's event IDs"
                    )
                sources_visible = [
                    node for node in nodes
                    if node.attrib.get("resource-id") == "pli.r8.owner-review.sources"
                ]
                if sources_visible:
                    # While expanded evidence GET is in flight the source
                    # Pressable is present/disabled. Moving the scroll then
                    # hides it and cannot make the network operation faster.
                    if any(node.attrib.get("enabled") == "false"
                           for node in sources_visible) or attempt < 4:
                        continue
                    # Once it is enabled, its list may be below the fold.
                    # Use a SMALL upward swipe to reveal rows, not the old
                    # 1100px blind sweep that lost the entire owner card.
                    android.shell("input", "swipe", "765", "1480", "765", "1030", "260")
                    continue
                # If the whole owner panel is already above the viewport,
                # scroll content down towards it and resume exact native
                # evidence-ID inspection, never substitute a server response.
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

    def tap_control_safely(
        name: str, filename: str, *, scroll_direction: str = "down",
        attempts: int = 12,
    ) -> str:
        """Tap only inside a safe vertical band (not the status/bottom bars).

        RN can keep a control in the tree with degenerate bounds or under the
        fixed tab bar; coordinate taps then hit the wrong surface. This still
        requires the exact native control to be enabled and visible.
        """
        for _ in range(attempts):
            ui = find_control(
                name, filename, require_enabled=True,
                scroll_direction=scroll_direction,
            )
            center = ui_control_center(ui, name)
            if center is not None and 320 <= center[1] <= 1680:
                android.tap(ui, name, "id")
                return ui
            if center is not None and center[1] > 1680:
                android.shell("input", "swipe", "765", "1750", "765", "1050", "300")
            else:
                android.shell("input", "swipe", "765", "700", "765", "1500", "300")
            time.sleep(0.45)
        raise CaptureError(f"R8 native control never reached a safe tap band: {name}")

    def tap_when_render_stable(
        name: str, filename: str, *, wait_first: int = 5, attempts: int = 18,
    ) -> None:
        """Wait out the async source re-render, then tap in a safe band.

        Opening a Case's source page clears and reloads its rows. Scrolling
        while the target is momentarily absent hides it permanently; wait
        first, and afterwards only reveal more of the list with small steps.
        """
        for attempt in range(attempts):
            ui = android.dump_xml(directory / filename)
            center = ui_control_center(ui, name)
            if center is not None and 320 <= center[1] <= 1680:
                android.tap(ui, name, "id")
                return
            if attempt < wait_first:
                time.sleep(0.7)
                continue
            if center is not None and center[1] > 1680:
                android.shell("input", "swipe", "765", "1750", "765", "1050", "300")
            elif center is not None:
                android.shell("input", "swipe", "765", "700", "765", "1500", "300")
            else:
                android.shell("input", "swipe", "765", "1600", "765", "1120", "260")
            time.sleep(0.5)
        raise CaptureError(f"R8 native control never rendered stably: {name}")

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
    # R8AG: actual native owner evidence must use the server's IMMUTABLE
    # at-creation source-role map. The phone must not invent the category from
    # its own timezone or recalculate an older Case with a changed algorithm.
    frozen_roles = case.get("evidence_role_by_event_id")
    if (
        case.get("evidence_role_source") != "FROZEN_AT_CREATION"
        or not isinstance(frozen_roles, dict)
        or set(frozen_roles) != set(case_source_ids)
        or any(role not in {"CURRENT", "HISTORICAL"} for role in frozen_roles.values())
    ):
        raise CaptureError("R8AG real Case did not persist a complete server-frozen source-role map")
    expected_frozen_roles = {
        event_id: "CURRENT" if role == "当日依据" else "HISTORICAL"
        for event_id, role in expected_role_by_event_id.items()
    }
    for event_id, expected_role in expected_frozen_roles.items():
        if frozen_roles.get(event_id) != expected_role:
            raise CaptureError(
                "R8AG frozen Case source role disagrees with actual planted owner facts: "
                f"event_id={event_id} expected={expected_role} got={frozen_roles.get(event_id)}"
            )

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
    # Native evidence must expose the recorded numeric value and BOTH time
    # dimensions in the same accessible row as the immutable event ID.
    # Backend-only values are insufficient for this Android visual-data gate.
    observed_factual_source_ids: set[str] = set()
    observed_comparison_role_ids: set[str] = set()
    source_pagination_taps = 0
    for attempt in range(36):
        nodes = list(ET.fromstring(source_ui).iter("node"))
        accessible = " ".join(
            f'{n.attrib.get("text", "")} {n.attrib.get("content-desc", "")} {n.attrib.get("resource-id", "")}'
            for n in nodes
        )
        observed_source_ids.update(
            event_id for event_id in planted_ids if event_id in accessible
        )
        for node in nodes:
            row = " ".join((
                node.attrib.get("text", ""),
                node.attrib.get("content-desc", ""),
                node.attrib.get("resource-id", ""),
            ))
            for event_id, minutes in expected_minutes.items():
                if (
                    event_id in row and f"记录时长 {minutes} 分钟" in row
                    and "发生 " in row and "录入 " in row
                ):
                    observed_factual_source_ids.add(event_id)
                    if expected_role_by_event_id[event_id] in row:
                        observed_comparison_role_ids.add(event_id)
        if (
            all(event_id in observed_source_ids for event_id in planted_ids)
            and all(event_id in observed_factual_source_ids for event_id in planted_ids)
            and all(event_id in observed_comparison_role_ids for event_id in planted_ids)
        ):
            break
        if ui_has_actionable_control(source_ui, "pli.r8.owner-review.sources.more"):
            # The owner genuinely taps the NEXT batch on Android; never infer
            # a source was visible from the backend Case or helper function.
            android.tap(source_ui, "pli.r8.owner-review.sources.more", "id")
            source_pagination_taps += 1
            time.sleep(1)
            source_ui = android.dump_xml(directory / f"source-page-{source_pagination_taps}.xml")
            continue
        # When the pagination button is visible but temporarily disabled,
        # allow its existing GET to finish instead of scrolling it away.
        if 'resource-id="pli.r8.owner-review.sources.more"' in source_ui:
            time.sleep(0.8)
            source_ui = android.dump_xml(directory / f"source-wait-{attempt + 1}.xml")
            continue
        android.shell("input", "swipe", "765", "1850", "765", "1120", "320")
        time.sleep(0.7)
        source_ui = android.dump_xml(directory / f"source-scroll-{attempt + 1}.xml")
    # Source rows are React Native accessibility nodes with viewport-dependent
    # exposure. The initial scroll progresses DOWN to reach the pagination
    # control, so a first/current observation near the TOP can be seen only as
    # an ID in an earlier XML while its full row is not captured in one node.
    # Scan BACK toward the top, preserving the exact same per-row factual and
    # immutable-ID checks. Do not treat Case API values as native evidence.
    missing_full_rows = set(planted_ids) - observed_factual_source_ids
    if missing_full_rows:
        for reverse_attempt in range(24):
            android.shell("input", "swipe", "765", "720", "765", "1580", "320")
            time.sleep(0.45)
            source_ui = android.dump_xml(
                directory / f"source-reverse-{reverse_attempt + 1}.xml"
            )
            for node in ET.fromstring(source_ui).iter("node"):
                row = " ".join((
                    node.attrib.get("text", ""),
                    node.attrib.get("content-desc", ""),
                    node.attrib.get("resource-id", ""),
                ))
                for event_id in tuple(missing_full_rows):
                    minutes = expected_minutes[event_id]
                    if (
                        event_id in row
                        and f"记录时长 {minutes} 分钟" in row
                        and "发生 " in row and "录入 " in row
                    ):
                        observed_source_ids.add(event_id)
                        observed_factual_source_ids.add(event_id)
                        if expected_role_by_event_id[event_id] in row:
                            observed_comparison_role_ids.add(event_id)
                        missing_full_rows.discard(event_id)
            if not missing_full_rows:
                break
    if len(planted_ids) <= 8 or source_pagination_taps < 1:
        raise CaptureError(
            "R8 Android fixture did not tap a real native >8-source pagination action"
        )
    if any(event_id not in observed_source_ids for event_id in planted_ids):
        raise CaptureError(
            "R8 native raw-source list did not expose every real full event identity "
            f"after scrolling; observed={len(observed_source_ids)}/{len(planted_ids)}"
        )
    if any(event_id not in observed_factual_source_ids for event_id in planted_ids):
        raise CaptureError(
            "R8AB native source rows lack actual recorded minutes or distinct "
            "occurred/recorded labels next to immutable IDs; "
            f"observed={len(observed_factual_source_ids)}/{len(planted_ids)}"
        )
    if any(event_id not in observed_comparison_role_ids for event_id in planted_ids):
        raise CaptureError(
            "R8AF owner source cards must show the REAL expected comparison "
            "role in the SAME native accessible node as source ID and minutes; "
            f"observed={len(observed_comparison_role_ids)}/{len(planted_ids)}"
        )
    android.screenshot(directory / "raw-sources.png")

    # Source inspection is user-controlled; close the long panel before making
    # a decision so the confirmation remains on-screen, not silently below fold.
    # The toggle can sit above the viewport (degenerate bounds) or, after
    # scrolling a >8-row list, be covered by the fixed bottom tab bar — a
    # coordinate tap then opens Timeline instead. Move it into a safe middle
    # band, then toggle until the native evidence node is genuinely gone.
    collapsed = False
    for _ in range(14):
        collapse_ui = find_control(
            "pli.r8.owner-review.sources", "source-collapse-ui.xml",
            require_enabled=True, scroll_direction="down",
        )
        center = ui_control_center(collapse_ui, "pli.r8.owner-review.sources")
        if center is None or not (320 <= center[1] <= 1680):
            if center is not None and center[1] > 1680:
                android.shell("input", "swipe", "765", "1750", "765", "1050", "300")
            else:
                android.shell("input", "swipe", "765", "700", "765", "1500", "300")
            time.sleep(0.45)
            continue
        android.tap(collapse_ui, "pli.r8.owner-review.sources", "id")
        for _ in range(6):
            time.sleep(0.5)
            closed = android.dump_xml(directory / "source-collapsed-ui.xml")
            if "pli.r8.owner-review.evidence" not in closed:
                collapsed = True
                break
        if collapsed:
            break
    if not collapsed:
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
    # R8BJ is explicitly a *numeric-value* provenance gate. QuickLog's walk
    # duration is optional for ordinary owner use. The native fixture must
    # ENTER a real measured amount, not save an empty walk then demand a
    # nonexistent value in the historical Review. Never inject a fake backend
    # observation or silently force duration on every owner's QuickLog.
    followup_minutes = 17
    tap_control_safely(
        "pli.quicklog.minutes", "quicklog-minutes-input.xml",
        scroll_direction="down", attempts=16,
    )
    android.shell("input", "text", str(followup_minutes))
    time.sleep(0.5)
    minutes_ui = android.dump_xml(directory / "quicklog-minutes-entered.xml")
    typed_minutes = ui_control_text(minutes_ui, "pli.quicklog.minutes").strip()
    if typed_minutes != str(followup_minutes):
        raise CaptureError(
            "R8BJ actual Android numeric QuickLog input differs from "
            f"entered minutes: {typed_minutes!r}"
        )
    ime = android.shell("dumpsys input_method", check=False)
    if "mInputShown=true" in ime:
        android.shell("input", "keyevent", "4")
        time.sleep(0.6)
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
    if (source.get("payload") or {}).get("duration_minutes") != followup_minutes:
        raise CaptureError(
            "R8BJ Android numeric field did not persist in the linked, real "
            f"LifeEvent: expected {followup_minutes} actual={source.get('payload')}"
        )
    save_manifest(directory / "api-truth.json", {
        "pet_id": pet_id,
        "metric": "walk_minutes_per_day",
        "initial_event_ids": planted_ids,
        "baseline": baseline.get("baselines", {}).get("walk_minutes_per_day"),
        "case_id": case_id,
        "case_source_event_ids": case_source_ids,
        "native_source_pagination_taps": source_pagination_taps,
        "all_planted_sources_observed_in_native_xml": True,
        "native_observed_source_ids": sorted(observed_source_ids),
        "native_observed_factual_source_ids": sorted(observed_factual_source_ids),
        "native_observed_comparison_role_ids": sorted(observed_comparison_role_ids),
        "expected_role_by_event_id": expected_role_by_event_id,
        "case_frozen_role_by_event_id": frozen_roles,
        "case_role_source": case["evidence_role_source"],
        "native_roles_match_frozen_server_evidence": True,
        "expected_recorded_minutes_by_event_id": expected_minutes,
        "review_decisions": decisions,
        "newly_recorded_followup_event_id": followup_event_ids[0],
        "native_entered_followup_minutes": followup_minutes,
        "saved_followup_minutes_verified_from_api": True,
        "all_actions_from_real_android_ui": True,
        "human_visual_acceptance": "PENDING",
        "vision_model_used": False,
    })

    # R8AI: a genuine owner's reviewed Case is durable even after the CURRENT
    # comparison normalizes. Add a real recorded walk to make today's same-
    # clock total comparable; do not fabricate a new state or weaken the Case.
    before_normalization = api_json(
        f"{root}/pets/{pet_id}/abnormal-day-hint",
        headers=owner_header,
    )
    old_walk = next(
        (row for row in before_normalization.get("explanations", [])
         if row.get("metric") == "walk_minutes_per_day"), None,
    )
    if not old_walk or old_walk.get("same_time_baseline") is None:
        raise CaptureError("R8AI fixture lacks an actual personal same-clock comparison")
    gap_minutes = int(round(
        float(old_walk["same_time_baseline"]) - float(old_walk["current_value"])
    ))
    if not 0 <= gap_minutes <= 1440:
        raise CaptureError(f"R8AI cannot normalize via valid recorded walk: {gap_minutes}")
    normalization_event_id = None
    if gap_minutes > 0:
        normalization = api_json(
            f"{root}/pets/{pet_id}/events",
            method="POST", headers=owner_header,
            body={
                "event_type": "daily.walk",
                "payload": {"duration_minutes": gap_minutes},
                "occurred_at": datetime.now(product_tz).isoformat(),
                "allow_duplicate": True,
            },
        )
        normalization_event_id = normalization.get("event_id")
        if not normalization_event_id or normalization.get("pet_id") != pet_id:
            raise CaptureError("R8AI normalization did not persist a real pet-scoped observation")
    after_normalization = api_json(
        f"{root}/pets/{pet_id}/abnormal-day-hint",
        headers=owner_header,
    )
    normalized_walk = next(
        (row for row in after_normalization.get("explanations", [])
         if row.get("metric") == "walk_minutes_per_day"), None,
    )
    if not normalized_walk or normalized_walk.get("notable"):
        raise CaptureError(
            "R8AI current walk comparison did not normalize with real recorded facts: "
            f"{normalized_walk}"
        )
    journal_cases = api_json(
        f"{root}/pets/{pet_id}/life-change-cases", headers=owner_header,
    ).get("cases", [])
    journal_case = next(
        (row for row in journal_cases if row.get("case_id") == case_id),
        None,
    )
    if (
        not journal_case or not journal_case.get("source_valid")
        or journal_case.get("follow_up_source_valid") is not True
    ):
        raise CaptureError("R8AI original Case or real follow-up vanished after normalization")

    # The owner must still SEE the Case on real Android Today after the live
    # prompt stops qualifying. A backend Case list alone is insufficient.
    android.start_link(f"pli-demo://nav?screen=today&pet={pet_id}")
    history_node = f"pli.r8.owner-history.case.{case_id}"
    journal_xml = find_control(history_node, "case-journal-ui.xml", attempts=30)
    if history_node not in journal_xml or case_id not in journal_xml:
        raise CaptureError("R8AI persistent Case not accessible in the real Android journal")
    if "已关联真实后续观察" not in journal_xml:
        raise CaptureError("R8AI native Case row does not preserve effective follow-up truth")
    android.screenshot(directory / "durable-case-after-normalization.png")
    save_manifest(directory / "case-journal-truth.json", {
        "pet_id": pet_id,
        "case_id": case_id,
        "current_walk_notable": normalized_walk["notable"],
        "current_walk_value": normalized_walk["current_value"],
        "same_time_baseline": normalized_walk["same_time_baseline"],
        "normalization_event_id": normalization_event_id,
        "persistent_case_source_valid": journal_case["source_valid"],
        "persistent_case_follow_up_source_valid": journal_case["follow_up_source_valid"],
        "case_visible_in_real_native_xml": True,
        "journal_screenshot": "durable-case-after-normalization.png",
        "no_vision_model": True,
        "human_visual_acceptance": "PENDING",
    })

    # R8AJ: a saved Case must OPEN its actual immutable review/source history
    # through a real Android tap, not merely remain an unclickable Today card.
    if not ui_has_actionable_control(journal_xml, history_node):
        raise CaptureError("R8AJ historical Case is visible but not a clickable native owner action")
    android.tap(journal_xml, history_node, "id")
    detail_xml = ""
    for _ in range(24):
        time.sleep(1)
        detail_xml = android.dump_xml(directory / "case-detail-firstfold.xml")
        if 'pli.r8.case-detail.identity' in detail_xml:
            break
    if 'pli.r8.case-detail.identity' not in detail_xml:
        raise CaptureError("R8AJ native Case-detail route did not mount after real Case tap")
    if "已关联真实后续观察" not in detail_xml:
        raise CaptureError("R8AJ native historical Case does not show the saved follow-up status")
    android.screenshot(directory / "owner-case-detail-firstfold.png")

    # R8AK: the detail now offers explicit owner continuation and an entry to
    # the complete history. Sources are revealed on request, so real evidence
    # must actually open them instead of assuming every row is painted.
    actions_xml = detail_xml
    for _ in range(10):
        if "pli.r8.case-detail.review-actions" in actions_xml:
            break
        android.shell("input", "swipe", "780", "1690", "780", "840", "290")
        time.sleep(0.4)
        actions_xml = android.dump_xml(directory / "case-detail-actions.xml")
    if "pli.r8.case-detail.review-actions" not in actions_xml:
        raise CaptureError("R8AK native Case detail does not expose owner continue-review actions")
    if "pli.r8.case-detail.history" not in actions_xml:
        raise CaptureError("R8AK native Case detail has no complete-history entry")
    # RN ScrollView content can expose the section node before its buttons are
    # laid out; require the actual tappable action, not just the container.
    for _ in range(8):
        if ui_has_actionable_control(actions_xml, "pli.r8.case-detail.review.correct_source"):
            break
        android.shell("input", "swipe", "780", "1690", "780", "840", "220")
        time.sleep(0.4)
        actions_xml = android.dump_xml(directory / "case-detail-actions.xml")
    if not ui_has_actionable_control(actions_xml, "pli.r8.case-detail.review.correct_source"):
        raise CaptureError("R8AK owner continue-review action is not actually tappable")

    detail_api = api_json(
        f"{root}/pets/{pet_id}/life-change-cases/{case_id}",
        headers=owner_header,
    )
    expected_reviews = [str(r["review_id"]) for r in detail_api.get("reviews", [])]

    # Continually review the SAME old Case: an append-only human decision, not
    # a new Case. The server CAS token and owner role still apply.
    android.tap(actions_xml, "pli.r8.case-detail.review.correct_source", "id")
    continued_api = detail_api
    for _ in range(12):
        time.sleep(0.8)
        continued_api = api_json(
            f"{root}/pets/{pet_id}/life-change-cases/{case_id}",
            headers=owner_header,
        )
        if len(continued_api.get("reviews", [])) == len(expected_reviews) + 1:
            break
    if len(continued_api.get("reviews", [])) != len(expected_reviews) + 1:
        raise CaptureError("R8AK continuing an old Case did not append exactly one immutable review")
    if continued_api["reviews"][-1].get("decision") != "CORRECT_SOURCE":
        raise CaptureError("R8AK continued review decision was not preserved as the owner sent it")
    expected_reviews = [str(r["review_id"]) for r in continued_api.get("reviews", [])]
    save_manifest(directory / "case-continue-review-truth.json", {
        "pet_id": pet_id,
        "case_id": case_id,
        "review_ids": expected_reviews,
        "continued_decision": continued_api["reviews"][-1].get("decision"),
        "appended_exactly_one_review": True,
        "same_case_id_retained": continued_api.get("case_id") == case_id,
        "no_vision_model": True,
    })

    # A testID in the hierarchy alone is NOT proof of a successful touch.
    # On long Case pages a Pressable can be offscreen/under the tab bar; an
    # unsafely tapped toggle previously produced zero source API requests,
    # yet the harness continued to demand all 13 source rows from native XML.
    source_toggle = "pli.r8.case-detail.sources.open"
    tap_control_safely(
        source_toggle, "case-detail-open-source-action.xml",
        scroll_direction="up", attempts=20,
    )
    opened_sources = False
    for step in range(32):
        time.sleep(0.6 if step else 1.2)
        current_xml = android.dump_xml(directory / f"case-detail-open-{step:02d}.xml")
        if "pli.r8.case-detail.sources.error" in current_xml:
            raise CaptureError(
                "R8AK native Case source GET failed: inspect exact API and UI XML; "
                "never substitute frozen Case IDs for an unreadable source list"
            )
        if (
            "pli.r8.case-detail.sources.progress" in current_xml
            or any(f"pli.r8.case-detail.source.{event_id}" in current_xml
                   for event_id in case_source_ids)
        ):
            opened_sources = True
            break
        if step in (8, 18) and ui_has_actionable_control(current_xml, source_toggle):
            label = ui_control_description(current_xml, source_toggle)
            if "查看来源" in label:
                tap_control_safely(
                    source_toggle, f"case-detail-open-retry-{step}.xml",
                    scroll_direction="up", attempts=12,
                )
                continue
        # The toggle might have opened successfully near the bottom of the
        # viewport; a small downward-content swipe reveals the real progress.
        if step > 3 and step % 4 == 0:
            android.shell("input", "swipe", "780", "1630", "780", "1090", "280")
    if not opened_sources:
        raise CaptureError(
            "R8AK real Android source panel never exposed its progress or "
            "any authorized source row after a safe, enabled native tap"
        )
    if detail_api.get("pet_id") != pet_id or detail_api.get("case_id") != case_id:
        raise CaptureError("R8AJ detail API returned a different pet or Case")
    if len(expected_reviews) < 2:
        raise CaptureError("R8AJ Case detail lacks append-only human review history")
    expected_source_ids = set(continued_api.get("evidence_event_ids", []))
    if not expected_source_ids or expected_source_ids != set(case_source_ids):
        raise CaptureError("R8AJ detail has no original immutable Case source-set equality")
    # The Case grew while this screen stayed mounted: after appending the
    # third immutable Review and opening the long source panel, the viewport is
    # intentionally no longer at the top. Scanning only downward would certify
    # sources but miss an older Review that is still rendered above the current
    # scroll position. Rewind the CURRENT, post-review Case to its real top
    # first; this keeps the gate strict while proving every Review and source
    # identity from one current UI state.
    top_xml = ""
    for step in range(18):
        top_xml = android.dump_xml(directory / f"case-detail-top-{step:02d}.xml")
        if "pli.r8.case-detail.identity" in top_xml:
            break
        android.shell("input", "swipe", "780", "760", "780", "1880", "260")
        time.sleep(0.3)
    if "pli.r8.case-detail.identity" not in top_xml:
        raise CaptureError(
            "R8AJ native Case detail could not return to the current journal top "
            "before full review/source identity traversal"
        )

    observed_reviews: set[str] = set()
    observed_sources: set[str] = set()
    for step in range(40):
        current_xml = android.dump_xml(directory / f"case-detail-scroll-{step:02d}.xml")
        observed_reviews.update(
            review_id for review_id in expected_reviews
            if f"pli.r8.case-detail.review.{review_id}" in current_xml
        )
        observed_sources.update(
            event_id for event_id in expected_source_ids
            if f"pli.r8.case-detail.source.{event_id}" in current_xml
        )
        if len(observed_reviews) == len(expected_reviews) and observed_sources == expected_source_ids:
            break
        # R8AK source detail is paged: reveal the remaining authorized sources
        # instead of silently treating the first page as the whole evidence.
        if ui_has_actionable_control(current_xml, "pli.r8.case-detail.sources.more"):
            android.tap(current_xml, "pli.r8.case-detail.sources.more", "id")
            time.sleep(1.2)
            continue
        android.shell("input", "swipe", "780", "1690", "780", "840", "290")
        time.sleep(0.4)
    if len(observed_reviews) != len(expected_reviews) or observed_sources != expected_source_ids:
        raise CaptureError(
            "R8AJ native Case detail did not expose EVERY real review/source identity: "
            f"reviews={len(observed_reviews)}/{len(expected_reviews)}, "
            f"sources={len(observed_sources)}/{len(expected_source_ids)}"
        )
    android.screenshot(directory / "owner-case-detail-evidence.png")
    save_manifest(directory / "case-detail-truth.json", {
        "pet_id": pet_id,
        "case_id": case_id,
        "source_event_ids": sorted(expected_source_ids),
        "review_ids": expected_reviews,
        "native_revealed_source_ids": sorted(observed_sources),
        "native_revealed_review_ids": sorted(observed_reviews),
        "case_detail_opened_by_real_android_tap": True,
        "all_case_ids_verified_in_native_xml": True,
        "no_vision_model": True,
        "human_visual_acceptance": "PENDING",
    })

    # R8BJ: an actual Review's follow-up event must be inspectable on the
    # real Android screen. It is NOT part of the original Case's frozen
    # CURRENT/HISTORICAL comparison; never borrow those roles.
    followup_review = next(
        (row for row in final_case["reviews"]
         if row.get("decision") == "RECORD_OBSERVATION"),
        None,
    )
    if followup_review is None:
        raise CaptureError("R8BJ fixture has no saved real follow-up Review")
    followup_review_id = str(followup_review["review_id"])
    followup_source_page = api_json(
        f"{root}/pets/{pet_id}/life-change-cases/{case_id}/sources?"
        + urlencode({"review_id": followup_review_id}),
        headers=owner_header,
    )
    expected_followup_id = followup_event_ids[0]
    if (
        followup_source_page.get("scope") != "FOLLOW_UP_REVIEW"
        or followup_source_page.get("review_id") != followup_review_id
        or followup_source_page.get("evidence_shape_valid") is not True
        or followup_source_page.get("evidence_role_shape_valid") is not None
        or [row.get("event_id") for row in followup_source_page.get("sources", [])]
        != [expected_followup_id]
        or any(row.get("role") is not None or row.get("role_source") != "FOLLOW_UP_OBSERVATION"
               for row in followup_source_page["sources"])
    ):
        raise CaptureError("R8BJ follow-up is not a real independent Review source")
    native_toggle = f"pli.r8.followup-evidence.open.{followup_review_id}"
    tap_control_safely(
        native_toggle, "followup-source-toggle-ui.xml",
        scroll_direction="down", attempts=16,
    )
    native_source_id = f"pli.r8.followup-evidence.source.{expected_followup_id}"
    followup_xml = find_control(
        native_source_id, "followup-source-observation-ui.xml",
        attempts=22, scroll_direction="up",
    )
    if native_source_id not in followup_xml or expected_followup_id not in followup_xml:
        raise CaptureError("R8BJ actual Android follow-up did not display the authorized source ID")
    if (f"记录时长 {followup_minutes} 分钟" not in followup_xml
            or "后续观察" not in followup_xml
            or "发生 " not in followup_xml
            or "录入 " not in followup_xml):
        raise CaptureError(
            "R8BJ Android follow-up did not expose the exact numeric "
            "owner-entered value and both event time dimensions"
        )
    android.screenshot(directory / "followup-source-detail-native.png")
    save_manifest(directory / "followup-source-detail-truth.json", {
        "pet_id": pet_id,
        "case_id": case_id,
        "review_id": followup_review_id,
        "source_event_id": expected_followup_id,
        "native_entered_followup_minutes": followup_minutes,
        "raw_value_verified_in_android_xml": True,
        "source_role": None,
        "source_role_origin": "FOLLOW_UP_OBSERVATION",
        "api_scope": followup_source_page["scope"],
        "real_android_source_detail_seen": True,
        "source_has_actual_occurred_and_recorded_time": bool(
            followup_source_page["sources"][0].get("occurred_at")
            and followup_source_page["sources"][0].get("recorded_at")
        ),
        "no_vision_model": True,
        "human_visual_acceptance": "PENDING",
    })

    # R8AK: the complete owner Case history must be reachable from the detail
    # and must list the same immutable Case, not only the recent Today slice.
    top_xml = ""
    for _ in range(14):
        top_xml = android.dump_xml(directory / "case-detail-top.xml")
        if "pli.r8.case-detail.history" in top_xml:
            break
        android.shell("input", "swipe", "780", "700", "780", "1750", "260")
        time.sleep(0.3)
    if "pli.r8.case-detail.history" not in top_xml:
        raise CaptureError("R8AK complete-history entry was lost after evidence scrolling")
    android.tap(top_xml, "pli.r8.case-detail.history", "id")
    history_xml = ""
    for _ in range(24):
        time.sleep(0.8)
        history_xml = android.dump_xml(directory / "case-history-list.xml")
        if "pli.r8.history" in history_xml:
            break
    if "pli.r8.history" not in history_xml:
        raise CaptureError("R8AK complete Case history did not mount from the detail entry")
    if case_id not in history_xml:
        raise CaptureError("R8AK complete Case history does not list the real Case it was opened from")
    if "pli.r8.history.filter.all" not in history_xml:
        raise CaptureError("R8AK history lacks owner-visible metric search filters")
    android.screenshot(directory / "owner-case-history-list.png")
    save_manifest(directory / "case-history-truth.json", {
        "pet_id": pet_id,
        "case_id": case_id,
        "history_opened_from_detail": True,
        "real_case_listed_in_complete_history": True,
        "metric_filter_controls_present": True,
        "screenshot": "owner-case-history-list.png",
        "no_vision_model": True,
        "human_visual_acceptance": "PENDING",
    })
    # R8AZ: exact immutable Case must disappear when switching to INVALID
    # before its source is withdrawn, and reappear when switching to VALID.
    # This is real Android UIAutomator + real server truth, not fabricated data
    # or a visual-model inference. It proves settled filter correctness; the
    # synchronous first-render race is covered separately by the source guard.
    case_row_id = f"pli.r8.history.case.{case_id}"
    valid_history = api_json(
        f"{root}/pets/{pet_id}/life-change-cases?validity=VALID",
        headers=owner_header,
    )
    invalid_history = api_json(
        f"{root}/pets/{pet_id}/life-change-cases?validity=INVALID",
        headers=owner_header,
    )
    if case_id not in {item.get("case_id") for item in valid_history.get("cases", [])}:
        raise CaptureError("R8AZ owner Case is not server-valid before its source withdrawal")
    if case_id in {item.get("case_id") for item in invalid_history.get("cases", [])}:
        raise CaptureError("R8AZ owner Case is incorrectly server-invalid before withdrawal")
    if "pli.r8.history.validity.INVALID" not in history_xml:
        raise CaptureError("R8AZ real Android history has no INVALID filter control")
    android.tap(history_xml, "pli.r8.history.validity.INVALID", "id")
    # Capture the earliest UIAutomator-accessible state before the 0.7-second
    # settle polling, rather than only the eventual successful frame.
    # This is NOT a synchronized frame-boundary or injected network-delay test.
    invalid_transition_xml = android.dump_xml(
        directory / "case-history-r8az-invalid-transition.xml"
    )
    android.screenshot(directory / "case-history-r8az-invalid-transition.png")
    invalid_transition_stale_case = case_row_id in invalid_transition_xml
    invalid_ui = ""
    for _ in range(24):
        time.sleep(0.7)
        invalid_ui = android.dump_xml(directory / "case-history-r8az-invalid.xml")
        if (
            "pli.r8.history.validity.INVALID" in invalid_ui
            and "pli.r8.history.loading" not in invalid_ui
            and "pli.r8.history.error" not in invalid_ui
            and case_row_id not in invalid_ui
        ):
            break
    else:
        raise CaptureError("R8AZ old valid Case persisted on settled INVALID native history")
    android.screenshot(directory / "case-history-r8az-invalid.png")
    android.tap(invalid_ui, "pli.r8.history.validity.VALID", "id")
    valid_transition_xml = android.dump_xml(
        directory / "case-history-r8az-valid-transition.xml"
    )
    android.screenshot(directory / "case-history-r8az-valid-transition.png")
    valid_transition_case_visible = case_row_id in valid_transition_xml
    valid_ui = ""
    for _ in range(24):
        time.sleep(0.7)
        valid_ui = android.dump_xml(directory / "case-history-r8az-valid.xml")
        if (
            case_row_id in valid_ui
            and "pli.r8.history.loading" not in valid_ui
            and "pli.r8.history.error" not in valid_ui
        ):
            break
    else:
        raise CaptureError("R8AZ owner Case did not reappear in real VALID history")
    android.screenshot(directory / "case-history-r8az-valid.png")
    save_manifest(directory / "case-history-r8az-filter-truth.json", {
        "pet_id": pet_id,
        "case_id": case_id,
        "server_valid_before_source_withdrawal": True,
        "server_invalid_before_source_withdrawal": False,
        "native_invalid_excluded_case": True,
        "native_valid_restored_case": True,
        "settled_filter_switch_runtime": "PASS",
        "first_frame_async_race_runtime": "NOT_MEASURED_BY_THIS_TEST",
        "first_available_invalid_transition_stale_case": invalid_transition_stale_case,
        "first_available_valid_transition_case_visible": valid_transition_case_visible,
        "first_available_ui_is_actual_first_composited_frame": False,
        "first_available_ui_has_injected_network_latency": False,
        "invalid_transition_screenshot": "case-history-r8az-invalid-transition.png",
        "valid_transition_screenshot": "case-history-r8az-valid-transition.png",
        "invalid_screenshot": "case-history-r8az-invalid.png",
        "valid_screenshot": "case-history-r8az-valid.png",
        "no_vision_model": True,
        "human_visual_acceptance": "PENDING",
    })
    android.shell("input", "keyevent", "4")
    time.sleep(1.0)

    # R8AO: the owner retracts an ORIGINAL source from the native Case detail.
    # Deliberately the LAST mutation of this Case: it invalidates the
    # comparison, while every append-only Review must remain.
    time.sleep(1.2)
    # Normalize the detail scroll to the hero first: returning from history
    # keeps a deep source-list position, and the retract control may be above
    # or below that point. From a known top we can search downward reliably.
    for _ in range(10):
        android.shell("input", "swipe", "765", "700", "765", "1650", "260")
        time.sleep(0.15)
    returned = android.dump_xml(directory / "case-detail-returned.xml")
    # Returning from history preserves the detail's scroll position, so the
    # first-fold identity can legitimately be above the viewport. The fixed
    # header control is the stable proof that the same detail route is back.
    if "pli.r8.case-detail.history" not in returned:
        raise CaptureError("R8AO did not return to the Case detail after history")
    toggle_ui = find_control(
        "pli.r8.case-detail.sources.open", "case-detail-open-sources.xml",
        require_enabled=True, scroll_direction="up",
    )
    toggle_desc = ui_control_description(toggle_ui, "pli.r8.case-detail.sources.open")
    if "收起" not in toggle_desc:
        if "查看" not in toggle_desc:
            raise CaptureError(
                f"R8AO source toggle state is unreadable: {toggle_desc!r}"
            )
        tap_control_safely(
            "pli.r8.case-detail.sources.open", "case-detail-open-sources.xml",
            scroll_direction="up",
        )
        # The toggle label alone is ambiguous at the viewport edge; require the
        # actual expanded evidence container before searching for a source row.
        for _ in range(20):
            time.sleep(0.5)
            opened = android.dump_xml(directory / "case-detail-sources-opened.xml")
            if "pli.r8.case-detail.evidence" in opened:
                break
        else:
            raise CaptureError("R8AO source panel did not stay open on the Case detail")
    retracted_event_id = planted_ids[-1]
    reviews_before_retraction = len(expected_reviews)
    tap_when_render_stable(
        f"pli.r8.case-detail.source.retract.{retracted_event_id}",
        "case-detail-retract-arm.xml",
    )
    time.sleep(0.6)
    tap_when_render_stable(
        f"pli.r8.case-detail.source.retract-yes.{retracted_event_id}",
        "case-detail-retract-confirm.xml", wait_first=3,
    )
    # The status lives in the hero; the detail keeps its deep scroll position,
    # so bring the header/hero back into view before reading the native state.
    for _ in range(6):
        android.shell("input", "swipe", "765", "750", "765", "1650", "260")
        time.sleep(0.2)
    retracted_status = ""
    for _ in range(24):
        time.sleep(0.8)
        retracted_ui = android.dump_xml(directory / "case-detail-retracted.xml")
        retracted_status = ""
        try:
            for node in ET.fromstring(retracted_ui).iter("node"):
                if node.attrib.get("resource-id") == "pli.r8.case-detail.status":
                    retracted_status = node.attrib.get("text", "")
        except ET.ParseError:
            retracted_status = ""
        if "原始记录已变更" in retracted_status:
            break
    if "原始记录已变更" not in retracted_status:
        raise CaptureError(
            "R8AO native Case status did not become invalidated after owner retraction"
        )
    retraction_api = api_json(
        f"{root}/pets/{pet_id}/life-change-cases/{case_id}", headers=owner_header,
    )
    if (
        retraction_api.get("source_valid") is not False
        or retraction_api.get("state") != "INVALIDATED"
    ):
        raise CaptureError("R8AO server did not derive an INVALIDATED Case after retraction")
    if len(retraction_api.get("reviews", [])) != reviews_before_retraction:
        raise CaptureError("R8AO owner retraction removed or rewrote append-only Reviews")
    android.screenshot(directory / "owner-case-source-retracted.png")
    save_manifest(directory / "case-source-retraction-truth.json", {
        "pet_id": pet_id,
        "case_id": case_id,
        "retracted_event_id": retracted_event_id,
        "native_status": retracted_status,
        "retracted_by_real_android_tap": True,
        "server_source_valid": retraction_api.get("source_valid"),
        "server_state": retraction_api.get("state"),
        "reviews_before": reviews_before_retraction,
        "reviews_after": len(retraction_api.get("reviews", [])),
        "reviews_preserved": True,
        "screenshot": "owner-case-source-retracted.png",
        "no_vision_model": True,
        "human_visual_acceptance": "PENDING",
    })

    # R8AT: the SAME invalidated Case must be discoverable through the real
    # owner-facing validity filter, not only by opening its detail directly.
    top_ui = android.dump_xml(directory / "case-history-open.xml")
    header = ui_control_center(top_ui, "pli.r8.case-detail.history")
    # Fixed header controls sit above the scroll-safe band; 120 still excludes
    # the system status bar while allowing the pinned detail header.
    if header is None or not 120 <= header[1] <= 1680:
        raise CaptureError("R8AT Case detail history header is not tappable")
    android.tap(top_ui, "pli.r8.case-detail.history", "id")
    history_ui = ""
    for _ in range(24):
        time.sleep(0.8)
        history_ui = android.dump_xml(directory / "case-history-filter-ui.xml")
        if "pli.r8.history.validity.INVALID" in history_ui:
            break
    if "pli.r8.history.validity.INVALID" not in history_ui:
        raise CaptureError("R8AT Android history validity controls did not mount")
    android.tap(history_ui, "pli.r8.history.validity.INVALID", "id")
    filtered_ui = ""
    case_row = f"pli.r8.history.case.{case_id}"
    for _ in range(24):
        time.sleep(0.8)
        filtered_ui = android.dump_xml(directory / "case-history-invalid-filter.xml")
        if case_row in filtered_ui:
            break
    if case_row not in filtered_ui:
        raise CaptureError("R8AT invalidated Case is absent from the real Android INVALID filter")
    filtered_api = api_json(
        f"{root}/pets/{pet_id}/life-change-cases?validity=INVALID",
        headers=owner_header,
    )
    filtered_ids = {str(row["case_id"]) for row in filtered_api.get("cases", [])}
    if case_id not in filtered_ids:
        raise CaptureError("R8AT server INVALID filter does not contain the retracted Case")
    android.screenshot(directory / "owner-history-invalid-filter.png")
    save_manifest(directory / "case-validity-filter-truth.json", {
        "pet_id": pet_id,
        "case_id": case_id,
        "filter": "INVALID",
        "native_case_row_visible": True,
        "server_filter_total": filtered_api.get("total"),
        "server_filter_contains_case": True,
        "screenshot": "owner-history-invalid-filter.png",
        "no_vision_model": True,
        "human_visual_acceptance": "PENDING",
    })
    return case_id


def capture_r8_correction(
    android: Android, out: Path, *, api_url: str, owner_id: str, login_email: str,
) -> None:
    """R8AS: real owner correction of one recorded source (append-only supersede).

    Uses its OWN pet + Case so the immutable-invalidation proof is independent
    from the retraction Case captured above (a corrected Case can no longer be
    retracted, and vice versa).
    """
    root = api_url.rstrip("/")
    headers = {"X-Dev-User-Id": owner_id}
    directory = out / "r8-owner-correction"
    directory.mkdir(parents=True, exist_ok=True)

    def tap_ready(name: str, filename: str, *, wait_first: int = 6, attempts: int = 24) -> None:
        for attempt in range(attempts):
            ui = android.dump_xml(directory / filename)
            center = ui_control_center(ui, name)
            if center is not None and 320 <= center[1] <= 1680:
                android.tap(ui, name, "id")
                return
            if attempt < wait_first:
                time.sleep(0.8)
                continue
            if center is not None and center[1] > 1680:
                android.shell("input", "swipe", "765", "1750", "765", "1050", "300")
            elif center is not None:
                android.shell("input", "swipe", "765", "700", "765", "1500", "300")
            else:
                android.shell("input", "swipe", "765", "1600", "765", "1120", "260")
            time.sleep(0.45)
        raise CaptureError(f"R8AS native control never rendered stably: {name}")

    pet = api_json(
        f"{root}/api/v1/pets", method="POST",
        body={"name": f"R8AS Correction {int(time.time())}", "species": "dog"},
        headers=headers,
    )
    pet_id = str(pet["id"])
    occurred = datetime.now(timezone.utc) - timedelta(minutes=2)
    for days in (1, 2, 3):
        api_json(
            f"{root}/api/v1/pets/{pet_id}/events", method="POST",
            body={
                "event_type": "daily.walk",
                "payload": {"duration_minutes": 90},
                "occurred_at": (occurred - timedelta(days=days)).isoformat(),
            },
            headers=headers,
        )
    current = api_json(
        f"{root}/api/v1/pets/{pet_id}/events", method="POST",
        body={
            "event_type": "daily.walk",
            "payload": {"duration_minutes": 20},
            "occurred_at": occurred.isoformat(),
        },
        headers=headers,
    )
    current_id = str(current["event_id"])
    api_json(
        f"{root}/api/v1/pets/{pet_id}/baseline/recompute?window_days=14",
        method="POST", body={}, headers=headers,
    )
    case = api_json(
        f"{root}/api/v1/pets/{pet_id}/life-change-cases", method="POST",
        body={"metric": "walk_minutes_per_day"}, headers=headers,
    )
    case_id = str(case["case_id"])

    # A pet created after the app's last pets fetch needs a demo login refresh
    # before the Today journal can resolve it; then deep-link to its Today.
    android.start_link(f"pli-demo://login?email={login_email}")
    time.sleep(6)
    android.start_link(f"pli-demo://nav?screen=today&pet={pet_id}")
    card = f"pli.r8.owner-history.case.{case_id}"
    journal = ""
    for attempt in range(16):
        time.sleep(0.8)
        journal = android.dump_xml(directory / "correction-today.xml")
        if card in journal:
            break
        # The journal is persistent owner memory below the Today hero/anchors;
        # UIAutomator only exposes visible nodes, so reveal it by scrolling.
        if attempt >= 2:
            android.shell("input", "swipe", "765", "1650", "765", "950", "300")
            time.sleep(0.4)
    if card not in journal:
        raise CaptureError("R8AS corrected-pet Case is absent from real Android Today journal")
    tap_ready(card, "correction-today-tap.xml")

    detail_ui = ""
    for _ in range(24):
        time.sleep(0.8)
        detail_ui = android.dump_xml(directory / "correction-detail.xml")
        if "pli.r8.case-detail.history" in detail_ui:
            break
    if "pli.r8.case-detail.history" not in detail_ui:
        raise CaptureError("R8AS Case detail did not mount for the correction fixture")
    # The evidence toggle sits below the hero/reviews; waiting only for its
    # first-fold presence falsely reports a missing detail. Scroll to it.
    tap_ready(
        "pli.r8.case-detail.sources.open", "correction-open-sources.xml",
        wait_first=2, attempts=30,
    )
    for _ in range(20):
        time.sleep(0.5)
        opened = android.dump_xml(directory / "correction-sources-open.xml")
        if "pli.r8.case-detail.evidence" in opened:
            break
    else:
        raise CaptureError("R8AS source panel did not open")

    tap_ready(
        f"pli.r8.case-detail.source.correct.{current_id}",
        "correction-arm.xml",
    )
    tap_ready(
        f"pli.r8.case-detail.source.correct-input.{current_id}",
        "correction-input.xml", wait_first=3,
    )
    # The field is prefilled with the recorded value; clear it before typing so
    # the correction is exactly 35, never an appended "2035".
    for _ in range(6):
        android.shell("input", "keyevent", "67")
    android.shell("input", "text", "35")
    time.sleep(0.5)
    ime = android.shell("dumpsys input_method", check=False)
    if "mInputShown=true" in ime:
        android.shell("input", "keyevent", "4")  # back closes only the keyboard
        time.sleep(0.8)
    typed_ui = android.dump_xml(directory / "correction-input-value.xml")
    typed = ui_control_text(
        typed_ui, f"pli.r8.case-detail.source.correct-input.{current_id}",
    )
    if typed.strip() != "35":
        raise CaptureError(f"R8AS correction field did not accept 35 (saw {typed!r})")
    tap_ready(
        f"pli.r8.case-detail.source.correct-submit.{current_id}",
        "correction-submit.xml", wait_first=3,
    )

    corrected: dict = {}
    for _ in range(24):
        time.sleep(0.8)
        corrected = api_json(
            f"{root}/api/v1/pets/{pet_id}/life-change-cases/{case_id}",
            headers=headers,
        )
        if corrected.get("source_valid") is False and corrected.get("state") == "INVALIDATED":
            break
    if corrected.get("source_valid") is not False or corrected.get("state") != "INVALIDATED":
        android.screenshot(directory / "correction-not-applied.png")
        android.dump_xml(directory / "correction-not-applied.xml")
        raise CaptureError(
            "R8AS correction did not invalidate the Case on the server; "
            f"observed source_valid={corrected.get('source_valid')} state={corrected.get('state')}"
        )

    # The status lives in the hero, above the preserved source scroll.
    for _ in range(10):
        android.shell("input", "swipe", "765", "700", "765", "1650", "260")
        time.sleep(0.15)
    status_ui = android.dump_xml(directory / "correction-invalidated.xml")
    native_status = ui_control_text(status_ui, "pli.r8.case-detail.status")
    if "原始记录已变更" not in native_status:
        raise CaptureError("R8AS native Case status did not become invalidated after correction")

    original = api_json(f"{root}/api/v1/events/{current_id}", headers=headers)
    if original.get("payload", {}).get("duration_minutes") != 20:
        raise CaptureError("R8AS correction rewrote the original recorded payload")
    sources = api_json(
        f"{root}/api/v1/pets/{pet_id}/life-change-cases/{case_id}/sources?limit=20",
        headers=headers,
    )
    row = next(
        (item for item in sources.get("sources", []) if item.get("event_id") == current_id),
        None,
    )
    if not row or row.get("valid") is not False or not row.get("superseded_by_event_id"):
        raise CaptureError("R8AS source projection does not expose the successor correction")

    android.screenshot(directory / "owner-case-source-corrected.png")
    save_manifest(directory / "case-source-correction-truth.json", {
        "pet_id": pet_id,
        "case_id": case_id,
        "corrected_event_id": current_id,
        "superseded_by_event_id": row["superseded_by_event_id"],
        "native_status": native_status,
        "corrected_by_real_android_tap": True,
        "server_source_valid": corrected.get("source_valid"),
        "server_state": corrected.get("state"),
        "original_payload_duration_minutes": original.get("payload", {}).get("duration_minutes"),
        "original_row_unchanged": True,
        "screenshot": "owner-case-source-corrected.png",
        "no_vision_model": True,
        "human_visual_acceptance": "PENDING",
    })


def capture_multipet_return(
    android: Android, out: Path, *,
    primary_id: str, secondary_id: str, primary_name: str, secondary_name: str,
    case_id: str,
) -> None:
    """A→B→A through real Android: A must replace B without any B leakage."""
    directory = out / "multipet-return"
    directory.mkdir(parents=True, exist_ok=True)

    android.start_link(f"pli-demo://nav?screen=today&pet={primary_id}")
    ui = ""
    for _ in range(24):
        time.sleep(0.8)
        ui = android.dump_xml(directory / "today-primary-return.xml")
        if "pli.today.identity" in ui:
            break
    if "pli.today.identity" not in ui:
        raise CaptureError("A→B→A: Today for the primary pet did not remount")
    identity = ui_control_label(ui, "pli.today.identity")
    if primary_name not in identity:
        raise CaptureError(f"A→B→A: primary identity missing its name (saw {identity!r})")
    # The identity container also exposes the multi-pet switcher, which
    # legitimately lists every household pet. Isolation is proven below by the
    # pet-scoped journal Case and the Today 3D manifest petId instead.

    # The immutable primary Case must come back with A's journal, not B's.
    card = f"pli.r8.owner-history.case.{case_id}"
    for _ in range(16):
        if card in ui:
            break
        android.shell("input", "swipe", "765", "1650", "765", "950", "300")
        time.sleep(0.5)
        ui = android.dump_xml(directory / "today-primary-journal.xml")
    if card not in ui:
        raise CaptureError("A→B→A: primary Case disappeared after returning from B")

    manifest = android.read_runtime_manifest(
        retries=25, expected_pet_id=primary_id, expected_stage_role="today",
    )
    if manifest.get("petId") != primary_id:
        raise CaptureError("A→B→A: Today 3D manifest belongs to another pet")

    android.screenshot(directory / "multipet-return-today.png")
    save_manifest(directory / "multipet-a-b-a-truth.json", {
        "primary_pet_id": primary_id,
        "secondary_pet_id": secondary_id,
        "primary_name": primary_name,
        "secondary_name": secondary_name,
        "primary_identity_label": identity,
        "identity_includes_primary_name": True,
        "identity_contains_shared_switcher": secondary_name in identity,
        "primary_case_id": case_id,
        "primary_case_visible_after_return": True,
        "today_stage_role": manifest.get("stageRole"),
        "today_manifest_pet_id": manifest.get("petId"),
        "screenshot": "multipet-return-today.png",
        "no_vision_model": True,
        "human_visual_acceptance": "PENDING",
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
    primary_case_id = capture_r8_owner_review(
        android, out, api_url=args.api_url,
        owner_id=str(owner_auth["user_id"]), pet_id=primary_id,
    )
    # R8AS: independent pet/Case so correction invalidation cannot collide with
    # the retraction proof above.
    capture_r8_correction(
        android, out, api_url=args.api_url,
        owner_id=str(owner_auth["user_id"]), login_email=args.login_email,
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

    # A→B→A: return to the primary pet and prove its identity, journal Case and
    # 3D manifest fully replace the secondary surface (no B leakage).
    capture_multipet_return(
        android, out,
        primary_id=primary_id, secondary_id=secondary_id,
        primary_name=str(primary_pet["name"]),
        secondary_name=str(secondary_pet["name"]),
        case_id=primary_case_id,
    )

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
