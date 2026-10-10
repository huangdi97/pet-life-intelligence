"""Regression: Android evidence capture survives a transient empty UIAutomator dump.

The hosted R5.6 evidence job failed with
`CaptureError: unable to obtain unobscured UIAutomator XML: .../_primary-select/ui.xml`
while the app itself was healthy: the emulator stopped answering, every dump
attempt left a 0-byte hierarchy file, and the failure left no diagnostic trail
(`ui.xml` was empty and nothing recorded the `uiautomator` output).

These tests pin the recovery contract that was added after that failure:

1. an empty dump on one target path must fall back to the second target path;
2. a genuinely unobtainable hierarchy must still raise, but must now persist the
   real tool output so the next failure is diagnosable;
3. an unresponsive device must be detected and waited for, instead of silently
   burning the whole retry budget.

No gate is relaxed: the callers still require the exact expected UI root id and
the rigged RUNTIME 3D manifest.
"""
from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "pli_android_capture", ROOT / "scripts" / "r5-6" / "capture-android-final.py"
)
assert SPEC is not None and SPEC.loader is not None
capture = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = capture
SPEC.loader.exec_module(capture)

VALID_XML = (
    "<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>"
    "<hierarchy rotation=\"0\">"
    "<node index=\"0\" text=\"\" resource-id=\"pli.today.living-stage\" "
    "class=\"android.view.ViewGroup\" bounds=\"[0,0][1080,400]\" />"
    "</hierarchy>"
)


def _completed(args: tuple[str, ...], stdout: str = "", returncode: int = 0):
    return subprocess.CompletedProcess(list(args), returncode=returncode, stdout=stdout, stderr="")


class ScriptedAndroid(capture.Android):
    """Android whose adb replies are scripted; no emulator is involved."""

    def __init__(self, *, dumps: dict[str, str], responsive: bool = True) -> None:
        super().__init__("adb", "emulator-5554", "com.pli.mobile")
        self.dumps = dumps
        self.responsive = responsive
        self.commands: list[tuple[str, ...]] = []

    def cmd(self, *args: str, check: bool = True, text: bool = True):  # noqa: ANN201, ARG002
        self.commands.append(args)
        if args[:3] == ("shell", "uiautomator", "dump"):
            remote = args[3]
            if remote in self.dumps:
                return _completed(args, stdout=f"UI hierchary dumped to: {remote}\n")
            return _completed(args, stdout="ERROR: could not get idle state.\n")
        if args[:2] == ("shell", "cat"):
            return _completed(args, stdout=self.dumps.get(args[2], ""))
        if args[:3] == ("shell", "echo", "pli-alive"):
            return _completed(args, stdout="pli-alive\n" if self.responsive else "")
        if args[:1] == ("wait-for-device",):
            return _completed(args, stdout="")
        return _completed(args, stdout="")


def test_empty_primary_dump_falls_back_to_second_target(tmp_path: Path) -> None:
    android = ScriptedAndroid(dumps={"/data/local/tmp/pli_final_ui.xml": VALID_XML})
    xml = android.dump_xml(tmp_path / "ui.xml")
    assert "pli.today.living-stage" in xml
    assert (tmp_path / "ui.xml").read_text(encoding="utf-8") == VALID_XML
    # The primary target was attempted first and is not silently skipped.
    assert ("shell", "uiautomator", "dump", "/sdcard/pli_final_ui.xml") in android.commands


def test_unobtainable_hierarchy_still_raises_and_records_tool_output(tmp_path: Path) -> None:
    android = ScriptedAndroid(dumps={})
    with pytest.raises(capture.CaptureError) as excinfo:
        android.dump_xml(tmp_path / "ui.xml", attempts=2)
    message = str(excinfo.value)
    assert "unable to obtain unobscured UIAutomator XML" in message
    assert "attempts=2" in message
    diagnostics = (tmp_path / "dump-diagnostics.txt").read_text(encoding="utf-8")
    assert "hierarchy=empty" in diagnostics
    assert "could not get idle state" in diagnostics
    # The failing artifact stays an empty hierarchy file (never a stale snapshot).
    assert (tmp_path / "ui.xml").read_text(encoding="utf-8") == ""


def test_unresponsive_device_is_detected_and_waited_for(tmp_path: Path) -> None:
    android = ScriptedAndroid(dumps={}, responsive=False)
    with pytest.raises(capture.CaptureError):
        android.dump_xml(tmp_path / "ui.xml", attempts=2)
    assert ("wait-for-device",) in android.commands
    diagnostics = (tmp_path / "dump-diagnostics.txt").read_text(encoding="utf-8")
    assert "device=unresponsive" in diagnostics


def test_is_responsive_probes_with_echo() -> None:
    assert ScriptedAndroid(dumps={}).is_responsive() is True
    assert ScriptedAndroid(dumps={}, responsive=False).is_responsive() is False


def test_command_timeout_is_bounded_and_reported() -> None:
    with pytest.raises(capture.CaptureError) as excinfo:
        capture.run([sys.executable, "-c", "import time; time.sleep(5)"], timeout=1)
    assert "timed out after 1s" in str(excinfo.value)

    result = capture.run(
        [sys.executable, "-c", "import time; time.sleep(5)"], check=False, timeout=1
    )
    assert result.returncode == 124


def test_text_output_is_decoded_as_utf8_regardless_of_host_locale() -> None:
    """A GBK Windows console used to abort the whole capture.

    `subprocess.run(..., text=True)` decoded adb's UTF-8 payload with the host
    locale, so a Chinese Windows host raised UnicodeDecodeError and returned a
    ``None`` stdout. Decoding is now pinned to UTF-8 with replacement.
    """
    payload = "UI hierchary dumped to: /sdcard/豆豆界面.xml"
    program = f"import sys; sys.stdout.buffer.write({payload.encode('utf-8')!r})"
    result = capture.run([sys.executable, "-c", program])
    assert result.stdout.strip() == payload


def test_shell_tolerates_missing_stdout() -> None:
    android = ScriptedAndroid(dumps={})
    original = android.cmd

    def null_stdout(*args: str, check: bool = True, text: bool = True):
        result = original(*args, check=check, text=text)
        result.stdout = None
        return result

    android.cmd = null_stdout  # type: ignore[method-assign]
    assert android.shell("cat", "/sdcard/pli_final_ui.xml", check=False) == ""
