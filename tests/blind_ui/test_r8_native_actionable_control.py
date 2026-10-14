"""R8Z: exact native enabled-state regression from hosted Android failure.

The original e3/243f Case view exposed pli.r8.owner-review.sources with a
resource-id but enabled=false. The old capture tapped it anyway and scrolled
away before any evidence could appear. No API response may satisfy a native
UI action gate by itself.
"""
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "r5-6" / "capture-android-final.py"


def _capture_module():
    spec = importlib.util.spec_from_file_location("pli_capture_owner_action", SCRIPT)
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _node(*, enabled: bool, clickable: bool, resource_id: str) -> str:
    return (
        '<hierarchy><node resource-id="' + resource_id +
        '" enabled="' + str(enabled).lower() +
        '" clickable="' + str(clickable).lower() + '"/></hierarchy>'
    )


def test_source_pressable_visible_but_disabled_is_not_an_owner_tap():
    capture = _capture_module()
    key = "pli.r8.owner-review.sources"
    # Exact case XML from 243f failure used enabled=false / clickable=true.
    assert not capture.ui_has_actionable_control(
        _node(enabled=False, clickable=True, resource_id=key), key,
    )
    assert not capture.ui_has_actionable_control(
        _node(enabled=True, clickable=False, resource_id=key), key,
    )
    assert capture.ui_has_actionable_control(
        _node(enabled=True, clickable=True, resource_id=key), key,
    )
    assert not capture.ui_has_actionable_control(
        _node(enabled=True, clickable=True, resource_id="pli.today.primary-action"), key,
    )


def test_capture_waits_for_actionable_native_review_and_keeps_full_source_gate():
    source = SCRIPT.read_text(encoding="utf-8")
    ui = (ROOT / "apps/mobile/src/components/life/LifeChangeReviewPanel.tsx").read_text(encoding="utf-8")
    assert 'find_control("pli.r8.owner-review.sources", "case-ui.xml", require_enabled=True)' in source
    assert 'find_control("pli.r8.owner-review.evidence", "source-ui.xml", attempts=30)' in source
    assert 'if any(event_id not in observed_source_ids for event_id in planted_ids):' in source
    assert 'testID="pli.r8.owner-review.evidence-error"' in ui
    assert "正在读取原始记录…" in ui
