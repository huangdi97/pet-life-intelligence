"""R8I Android evidence: manifest-ready is NOT a visible WebGL first frame."""
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CAPTURE_PATH = ROOT / "scripts" / "r5-6" / "capture-android-final.py"


def _capture_module():
    spec = importlib.util.spec_from_file_location("pli_android_runtime_capture", CAPTURE_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_first_paint_gate_reads_real_xml_overlay_state() -> None:
    gate = _capture_module().first_paint_gate_state
    with_fallback = (
        '<hierarchy><node resource-id="pli.today.living-stage" />'
        '<node resource-id="pli.today.pet-boot-fallback" /></hierarchy>'
    )
    no_fallback = '<hierarchy><node resource-id="pli.today.living-stage" /></hierarchy>'
    wrong_pet_surface = '<hierarchy><node resource-id="pli.pet.hero-stage" /></hierarchy>'
    assert gate(with_fallback, "pli.today.living-stage") == (
        True, ["pli.today.pet-boot-fallback"],
    )
    assert gate(no_fallback, "pli.today.living-stage") == (True, [])
    assert gate(wrong_pet_surface, "pli.today.living-stage") == (False, [])
    companion = (
        '<hierarchy><node resource-id="pli.companion.living-stage" />'
        '<node resource-id="pli.pet.pet-boot-fallback" /></hierarchy>'
    )
    assert gate(companion, "pli.companion.living-stage") == (
        True, ["pli.pet.pet-boot-fallback"],
    )


def test_capture_must_wait_for_fallback_to_end_after_runtime_manifest() -> None:
    script = CAPTURE_PATH.read_text(encoding="utf-8")
    manifest = script.index("android.read_runtime_manifest(", script.index("def capture_surface("))
    settled = script.index("await_owner_3d_first_paint(", manifest)
    screenshot = script.index('android.screenshot(directory / f"{screen}.png")', settled)
    assert manifest < settled < screenshot
    assert "stable_overlay_free_ui_dumps" in script
    assert '"pixel_level_3d_acceptance": "NOT_ASSERTED"' in script
    assert "first-paint-pending.png" in script
    assert "first-paint-failed.png" in script
    assert '"status": "BLOCKED_BY_FIRST_PAINT"' in script
