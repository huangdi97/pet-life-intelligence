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
import os
import re
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
    ("today", True),
    ("timeline", False),
    ("pet", True),
    ("lifeview", True),
    ("twinreview", True),
    ("health", False),
    ("assistant", False),
    ("me", False),
)


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
        self.cmd(
            "shell",
            "am",
            "start",
            "-W",
            "-a",
            "android.intent.action.VIEW",
            "-d",
            uri,
            f"{self.package}/.MainActivity",
        )

    def screenshot(self, path: Path) -> None:
        result = self.cmd("exec-out", "screencap", "-p", text=False)
        data = result.stdout
        if len(data) < 1024 or not data.startswith(b"\x89PNG\r\n\x1a\n"):
            raise CaptureError(f"invalid Android screenshot: {path}")
        path.write_bytes(data)

    def dump_xml(self, path: Path) -> str:
        remote = "/sdcard/pli_final_ui.xml"
        self.shell("uiautomator", "dump", remote)
        raw = self.shell("cat", remote)
        path.write_text(raw, encoding="utf-8")
        return raw

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
            match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", node.attrib.get("bounds", ""))
            if not match:
                continue
            x1, y1, x2, y2 = map(int, match.groups())
            self.shell("input", "tap", str((x1 + x2) // 2), str((y1 + y2) // 2))
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

    def read_runtime_manifest(self, retries: int = 10) -> dict:
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
                if self._is_product_manifest(manifest):
                    return manifest

            xml_manifest = self._manifest_from_xml()
            if xml_manifest is not None and self._is_product_manifest(xml_manifest):
                return xml_manifest
            time.sleep(2)
        raise CaptureError("required high-fidelity RUNTIME 3D manifest unavailable")

    @staticmethod
    def _is_product_manifest(manifest: dict) -> bool:
        return (
            manifest.get("ready") is True
            and manifest.get("manifestOrigin") == "RUNTIME"
            and manifest.get("representation") == "high-fidelity-glb-twin"
            and manifest.get("fallbackUsed") is not True
        )


def api_json(url: str, *, method: str = "GET", body: dict | None = None, headers: dict[str, str] | None = None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    request_headers = {"content-type": "application/json", **(headers or {})}
    req = urllib.request.Request(url, data=data, headers=request_headers, method=method)
    with urllib.request.urlopen(req, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


def resolve_secondary_pet_label(api_url: str, login_email: str) -> str:
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
    cats = [p for p in pets if str(p.get("species", "")).lower() == "cat"]
    if len(cats) != 1 or not cats[0].get("name"):
        raise CaptureError("final Android evidence requires exactly one seeded cat secondary pet")
    return str(cats[0]["name"])


def git(*args: str) -> str:
    return run(["git", *args]).stdout.strip()


def save_manifest(path: Path, manifest: dict) -> None:
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def capture_surface(android: Android, out: Path, screen: str, needs_manifest: bool) -> None:
    directory = out / screen
    directory.mkdir(parents=True, exist_ok=True)
    android.start_link(f"pli-demo://nav?screen={screen}")
    time.sleep(5)
    android.dump_xml(directory / "ui.xml")
    android.screenshot(directory / f"{screen}.png")
    if needs_manifest:
        save_manifest(directory / "3d.json", android.read_runtime_manifest())
    extractor = ROOT / "scripts" / "blind-ui" / "android_extract.py"
    run([os.environ.get("PYTHON", "python3"), str(extractor), str(directory)])


def capture_review_views(android: Android, directory: Path, prefix: str) -> None:
    android.start_link("pli-demo://nav?screen=twinreview")
    time.sleep(5)
    xml = android.dump_xml(directory / "ui.xml")
    expected = {"front": 0.0, "side": 1.5707963267948966, "back": 3.141592653589793}
    for view, yaw in expected.items():
        android.tap(xml, f"pli.twinreview.view.{view}", "id")
        time.sleep(2)
        manifest = android.read_runtime_manifest()
        actual = float((manifest.get("camera") or {}).get("yaw", 999.0))
        wrapped_error = abs(__import__("math").atan2(__import__("math").sin(actual - yaw), __import__("math").cos(actual - yaw)))
        if wrapped_error > 0.08:
            raise CaptureError(f"Android review camera mismatch: {view}, expected={yaw}, actual={actual}")
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
    secondary_label = resolve_secondary_pet_label(args.api_url, args.login_email)

    android.start_link(f"pli-demo://login?email={args.login_email}")
    time.sleep(6)

    for screen, manifest in SURFACES:
        capture_surface(android, out, screen, manifest)

    review_dir = out / "twinreview"
    capture_review_views(android, review_dir, "twin")

    # Switch through the real Today multi-pet control; no pet name is baked
    # into source. The API resolves the current seeded cat display label.
    secondary_today = out / "secondary-sanity"
    secondary_today.mkdir(parents=True, exist_ok=True)
    android.start_link("pli-demo://nav?screen=today")
    time.sleep(4)
    xml = android.dump_xml(secondary_today / "ui.xml")
    android.tap(xml, secondary_label, "text")
    time.sleep(6)
    android.dump_xml(secondary_today / "ui.xml")
    android.screenshot(secondary_today / "secondary_today.png")
    secondary_manifest = android.read_runtime_manifest()
    save_manifest(secondary_today / "3d.json", secondary_manifest)

    secondary_review = out / "secondary-review"
    secondary_review.mkdir(parents=True, exist_ok=True)
    android.start_link("pli-demo://nav?screen=twinreview")
    time.sleep(5)
    android.dump_xml(secondary_review / "ui.xml")
    android.screenshot(secondary_review / "secondary_twinreview.png")
    save_manifest(secondary_review / "3d.json", android.read_runtime_manifest())
    capture_review_views(android, secondary_review, "secondary")

    capture_manifest = {
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "source_head": git("rev-parse", "HEAD"),
        "source_branch": git("branch", "--show-current"),
        "serial": args.serial,
        "package": args.package,
        "build_kind": "DEMO_EVIDENCE_BUILD",
        "vision_model_used": False,
        "required_secondary_pet": True,
    }
    save_manifest(out / "capture-manifest.json", capture_manifest)
    print(f"R5.6 Android final evidence complete -> {out}")


if __name__ == "__main__":
    main()
