"""Android R8 owner-review retries retain the exact prior human instruction.

This is a source contract, not a claim of on-device pixel acceptance. The
server-side HTTP tests verify idempotency and payload mismatch conflicts.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_owner_review_android_retries_keep_original_decision_and_optimistic_token() -> None:
    code = (ROOT / "apps/mobile/src/components/life/LifeChangeReviewPanel.tsx").read_text()
    assert "useRef<PendingReviewIntent | null>(null)" in code
    assert "const pending = pendingReview.current;" in code
    assert "pending.caseId !== record.case_id || pending.decision !== decision" in code
    assert 'idempotency_key: `r8-${decision}-${last?.review_id ?? "initial"}`' in code
    assert "pendingReview.current = { caseId: record.case_id, decision, payload }" in code
    assert "pendingReview.current = null;" in code
    assert "const updated = await api.get<LifeCaseDetail>" in code
    assert "if (updated.pet_id !== petId || updated.case_id !== record.case_id)" in code
    assert "e instanceof ApiError" in code


def test_r8_android_does_not_clear_ambiguous_intent_before_exact_review_is_seen() -> None:
    """Case identity alone cannot certify the specific owner Review was stored."""
    code = (ROOT / "apps/mobile/src/components/life/LifeChangeReviewPanel.tsx").read_text()
    assert "type ReviewAcknowledgement = {" in code
    assert "const accepted = await api.post<ReviewAcknowledgement>(" in code
    assert "accepted.pet_id !== petId" in code
    assert "accepted.case_id !== record.case_id" in code
    assert "accepted.decision !== decision" in code
    assert "entry.review_id === accepted.review_id && entry.decision === decision" in code
    assert 'throw new Error("REVIEW_CONFIRMATION_PENDING")' in code
    assert "主人决定尚未在最新记录中确认" in code
    assert code.index("entry.review_id === accepted.review_id") < code.index("pendingReview.current = null;", code.index("const accepted = await api.post"))
