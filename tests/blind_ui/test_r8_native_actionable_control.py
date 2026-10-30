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


def test_hosted_r8_source_gate_requires_real_more_tap_for_more_than_eight_events():
    source = SCRIPT.read_text(encoding="utf-8")
    assert "for days_back in range(5, 0, -1) for _ in range(2)" in source
    assert 'ui_has_actionable_control(source_ui, "pli.r8.owner-review.sources.more")' in source
    assert 'android.tap(source_ui, "pli.r8.owner-review.sources.more", "id")' in source
    assert "if len(planted_ids) <= 8 or source_pagination_taps < 1:" in source
    assert '"native_observed_source_ids": sorted(observed_source_ids)' in source
    assert "if any(event_id not in observed_source_ids for event_id in planted_ids):" in source


def test_r8ab_native_source_gate_checks_real_factual_content_per_id():
    capture = SCRIPT.read_text(encoding="utf-8")
    assert "expected_minutes[event_id] = minutes" in capture
    assert "observed_factual_source_ids: set[str] = set()" in capture
    assert 'f"记录时长 {minutes} 分钟" in row' in capture
    assert '"发生 " in row and "录入 " in row' in capture
    assert "event_id in row" in capture
    assert '"native_observed_factual_source_ids": sorted(observed_factual_source_ids)' in capture
    assert "if any(event_id not in observed_factual_source_ids for event_id in planted_ids):" in capture


def test_r8af_native_source_roles_require_actual_same_node_evidence():
    capture = SCRIPT.read_text(encoding="utf-8")
    assert 'expected_role_by_event_id[event_id] = (' in capture
    assert '"当日依据" if days_back == 0 else "同期参考"' in capture
    assert 'observed_comparison_role_ids: set[str] = set()' in capture
    assert 'if expected_role_by_event_id[event_id] in row:' in capture
    assert 'observed_comparison_role_ids.add(event_id)' in capture
    assert 'if any(event_id not in observed_comparison_role_ids for event_id in planted_ids):' in capture
    assert '"native_observed_comparison_role_ids": sorted(observed_comparison_role_ids)' in capture
    assert '"expected_role_by_event_id": expected_role_by_event_id' in capture
    assert 'and "发生 " in row and "录入 " in row' in capture
