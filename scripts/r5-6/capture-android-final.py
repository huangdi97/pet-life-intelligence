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
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = ROOT / "artifacts" / "r5-6-final" / "android"
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
    "companion": "pli.companion.identity",
    "me": "pli.me.owner",
}


class CaptureError(RuntimeError):
    pass


def run(cmd: list[str], *, check: bool = True, text: bool = True) -> subprocess.CompletedProcess:
    result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=text)
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
        return self.cmd("shell", *args, check=check).stdout.strip()

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

    def dump_xml(self, path: Path) -> str:
        remote = "/sdcard/pli_final_ui.xml"
        last_raw = ""
        for _ in range(4):
            self.shell("uiautomator", "dump", remote, check=False)
            raw = self.shell("cat", remote, check=False)
            last_raw = raw
            if raw and self._dismiss_host_system_dialog(raw):
                continue
            if raw:
                path.write_text(raw, encoding="utf-8")
                return raw
            time.sleep(1)
        path.write_text(last_raw, encoding="utf-8")
        raise CaptureError(f"unable to obtain unobscured UIAutomator XML: {path}")

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
        raise CaptureError(f"required high-fidelity RUNTIME 3D manifest unavailable{suffix}{seen}")

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
        return (
            manifest.get("ready") is True
            and manifest.get("manifestOrigin") == "RUNTIME"
            and manifest.get("representation") == "high-fidelity-glb-twin"
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
    time.sleep(5)
    xml = android.dump_xml(directory / "ui.xml")
    expected_root = SURFACE_ROOT_IDS.get(screen)
    if expected_root and expected_root not in xml:
        raise CaptureError(
            f"wrong Android surface after demo navigation: requested={screen}; "
            f"expected_ui_id={expected_root}"
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
        time.sleep(1)
    android.screenshot(directory / f"{screen}.png")
    extractor = ROOT / "scripts" / "blind-ui" / "android_extract.py"
    run([os.environ.get("PYTHON", "python3"), str(extractor), str(directory)])


def capture_review_views(
    android: Android,
    directory: Path,
    prefix: str,
    expected_pet_id: str,
) -> None:
    android.clear_runtime_manifest()
    android.start_link("pli-demo://nav?screen=twinreview")
    time.sleep(5)
    xml = android.dump_xml(directory / "ui.xml")
    if "pli.twinreview.camera-controls" not in xml:
        raise CaptureError("Twin Review camera controls are not present on the captured review surface")
    expected = {"front": 0.0, "side": 1.5707963267948966, "back": 3.141592653589793}
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
        save_manifest(directory / f"3d_view_{view}.json", manifest)
        android.screenshot(directory / f"{prefix}_{view}.png")
        xml = android.dump_xml(directory / "ui.xml")


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
    android.start_link(f"pli-demo://nav?screen=today&pet={primary_id}")
    time.sleep(6)
    primary_select_dir = out / "_primary-select"
    primary_select_dir.mkdir(parents=True, exist_ok=True)
    android.dump_xml(primary_select_dir / "ui.xml")
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

    # Switch to the secondary cat through the same DEMO-ONLY current-pet
    # deep link. The pet id is resolved from the seeded API at runtime; no
    # owner pet display name is hard-coded in production source.
    secondary_today = out / "secondary-sanity"
    secondary_today.mkdir(parents=True, exist_ok=True)
    android.clear_runtime_manifest()
    android.start_link(f"pli-demo://nav?screen=today&pet={secondary_id}")
    time.sleep(6)
    secondary_today_xml = android.dump_xml(secondary_today / "ui.xml")
    if "pli.today.living-stage" not in secondary_today_xml:
        raise CaptureError("secondary pet sanity capture is not on Today")
    secondary_manifest = android.read_runtime_manifest(
        expected_pet_id=secondary_id,
        expected_stage_role="today",
    )
    save_manifest(secondary_today / "3d.json", secondary_manifest)
    time.sleep(1)
    android.screenshot(secondary_today / "secondary_today.png")

    secondary_review = out / "secondary-review"
    secondary_review.mkdir(parents=True, exist_ok=True)
    android.clear_runtime_manifest()
    android.start_link("pli-demo://nav?screen=twinreview")
    time.sleep(5)
    secondary_review_xml = android.dump_xml(secondary_review / "ui.xml")
    if "pli.twinreview.camera-controls" not in secondary_review_xml:
        raise CaptureError("secondary Twin Review capture is missing first-screen camera controls")
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
