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


def test_multipet_return_is_in_real_android_evidence():
    script = read("scripts/r5-6/capture-android-final.py")
    assert "primary_case_id = capture_r8_owner_review(" in script
    assert "capture_multipet_return(" in script
    block = script.split("def capture_multipet_return", 1)[1].split("def main", 1)[0]
    assert "multipet-a-b-a-truth.json" in block
    # A→B→A must prove identity, the immutable primary Case and the primary 3D.
    assert 'ui_control_label(ui, "pli.today.identity")' in block
    assert "identity_includes_primary_name" in block
    # The shared switcher may legitimately list other pets; isolation is scoped
    # content + manifest petId, not the absence of any other name.
    assert "identity_contains_shared_switcher" in block
    assert "primary Case disappeared" in block
    assert 'expected_stage_role="today"' in block
    assert '"primary_case_visible_after_return": True' in block


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
