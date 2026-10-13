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


def test_r8i_android_pending_owner_intent_survives_restart_and_is_account_scoped() -> None:
    panel = (ROOT / "apps/mobile/src/components/life/LifeChangeReviewPanel.tsx").read_text()
    store = (ROOT / "apps/mobile/src/storage/pendingOwnerReview.ts").read_text()
    session = (ROOT / "apps/mobile/src/storage/session.ts").read_text()
    assert 'import * as SecureStore from "expo-secure-store"' in store
    assert 'const KEY = "pli_r8_unconfirmed_owner_review_v1"' in store
    assert "x.petId === petId && x.caseId === caseId && x.sourceIdsKey === sourceIdsKey" in store
    assert "x.petId === petId && x.caseId === caseId && x.sourceIdsKey === sourceIdsKey" in store
    assert "await saveOwnerIntent({ petId, caseId: record.case_id, sourceIdsKey, decision, payload });" in panel
    assert panel.index("await saveOwnerIntent(") < panel.index("const accepted = await api.post")
    assert "const saved = await restoreOwnerIntent(petId, matched.case_id, sourceIdsKey);" in panel
    assert "不会自动重试" in panel
    assert panel.index("entry.review_id === accepted.review_id") < panel.index("await clearOwnerIntent(")
    assert "clearAllOwnerIntents()" in session
    assert "if (current !== token)" in session
    assert "if (current !== id)" in session
    assert "disabled={loading || restoring}" in panel
