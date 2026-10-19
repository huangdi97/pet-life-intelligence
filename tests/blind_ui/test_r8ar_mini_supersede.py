"""R8AR: Mini correction appends a supersede; it never edits the old record."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_mini_correction_is_owner_only_numeric_and_append_only():
    detail = read("apps/mini/src/pages/observations/detail/index.tsx")

    assert "detail.owner_can_review && source.valid" in detail
    assert "if (!detail?.owner_can_review || correcting) return;" in detail
    assert "/events/${source.event_id}/supersede" in detail
    assert "r8-mini-correction-${source.event_id}-${value}" in detail
    assert "payload: { duration_minutes: value }" in detail
    # Meal records are not one editable number; the UI must not invent one.
    assert 'detail.metric !== "meal_count_per_day"' in detail
    assert "发生时间与原始记录保持不变" in detail
    # No local rewrite: drop stale rows and reload the server-derived Case.
    assert "setSources([]);" in detail
    assert "请重新核对档案" in detail
    assert "load();" in detail


def test_mini_correction_never_claims_recovery_or_success_when_unconfirmed():
    detail = read("apps/mini/src/pages/observations/detail/index.tsx")
    block = detail.split("const submitCorrection", 1)[1].split("const startFollowUp", 1)[0]
    assert "修正未确认" in block
    assert "康复" not in block
    assert "健康正常" not in block
