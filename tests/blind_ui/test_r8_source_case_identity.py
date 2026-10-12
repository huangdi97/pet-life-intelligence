"""R8E: owner Review Case reuse must use immutable source event identities.

Two days can have identical 20min/90min values while their raw events are
different. A Case is a frozen evidence snapshot, not a numeric UI widget.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_today_passes_both_current_and_historical_evidence_ids():
    today = read("apps/mobile/src/screens/TodayScreen.tsx")
    assert "historical_event_ids?: string[]" in today
    assert "...(notableChange.current_event_ids ?? [])" in today
    assert "...(notableChange.historical_event_ids ?? [])" in today
    assert '.sort().join("|")' in today


def test_review_panel_cannot_reuse_old_case_with_equal_numbers_but_other_events():
    panel = read("apps/mobile/src/components/life/LifeChangeReviewPanel.tsx")
    assert "const sourceIdsKey = [" in panel
    assert "const sourceIds = new Set(sourceIdsKey.split" in panel
    assert "c.pet_id === petId" in panel
    assert "c.evidence_event_ids.length === sourceIds.size" in panel
    assert "c.evidence_event_ids.every((id) => sourceIds.has(id))" in panel
    assert "sourceIds.size > 0" in panel
    assert "sourceIdsKey]" in panel
