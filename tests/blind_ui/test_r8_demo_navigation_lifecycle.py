"""Demo-navigation gate: no repeated Android 3D WebView remount after ready.

This is a SOURCE guard only. Actual runtime 3D manifest, 2-pet identity and
three distinct camera views remain mandatory in Android emulator capture.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_demo_root_navigation_commits_once_when_ready():
    app = read("apps/mobile/App.tsx")
    nav = read("apps/mobile/src/demoNav.ts")
    assert "if (navigateToDemoScreen(screen, date)) return;" in app
    assert "if (generation !== demoNavGeneration) return;" in app
    assert "setTimeout(() => attemptNavigation(attempt + 1), 400);" in app
    assert "for (let i = 0; i < 10; i++)" not in app
    assert "if (!navigationRef.isReady()) return false;" in nav
    assert nav.count("return true;") == 2  # tab reset and stack reset


def test_runtime_manifest_for_both_demo_pets_is_still_mandatory():
    script = read("scripts/r5-6/capture-android-final.py")
    assert 'expected_stage_role="today"' in script
    assert "secondary_manifest = android.read_runtime_manifest(" in script
    assert "expected_pet_id=secondary_id" in script
    assert "capture_review_views(android, secondary_review, " in script
    assert "required rigged RUNTIME 3D manifest unavailable" in script


def test_review_stage_waits_for_its_own_manifest_before_camera_commands():
    script = read("scripts/r5-6/capture-android-final.py")
    block = script.split("def capture_review_views", 1)[1].split(
        "def capture_r7_life_replay", 1,
    )[0]
    # The pre-warm must happen before the first per-view camera tap.
    prewarm = block.index('expected_stage_role="review"')
    first_tap = block.index("android.tap(xml, button")
    assert prewarm < first_tap
    # Exactly one remount retry, then the original assertions still decide.
    assert "for attempt in range(2)" in block
    assert "Remount the Review route once" in block
    # A failed pre-warm must never be accepted as a 3D proof.
    assert "except CaptureError:\n        pass" in block
    assert "read_runtime_manifest(\n                    retries=15," in block
