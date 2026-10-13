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


def test_r8j_unconfirmed_owner_review_recovery_survives_loss_of_notable_card() -> None:
    today = (ROOT / "apps/mobile/src/screens/TodayScreen.tsx").read_text()
    recovery = (ROOT / "apps/mobile/src/components/life/PendingOwnerReviewRecovery.tsx").read_text()
    store = (ROOT / "apps/mobile/src/storage/pendingOwnerReview.ts").read_text()
    assert "listOwnerIntentsForPet(petId)" in recovery
    assert "entry.petId === petId" in store
    assert "PendingOwnerReviewRecovery" in today
    assert "refreshKey={refreshCounter}" in today
    assert "hideSourceIdsKey" not in recovery
    assert "if (!intents.length && !warning) return null;" in recovery
    assert "onPress={() => void recover(intent)}" in recovery
    assert recovery.index("const detail = await api.get<CaseDetail>(path)") < recovery.index(
        "const accepted = await api.post<ReviewAck>"
    )
    assert "fromServer !== intent.sourceIdsKey" in recovery
    assert "${path}/reviews" in recovery
    assert "intent.payload" in recovery
    assert "row.review_id === accepted.review_id && row.decision === intent.decision" in recovery
    assert recovery.index("row.review_id === accepted.review_id") < recovery.index("await clearOwnerIntent(")
    assert "不会自动替你决定或补发" in recovery
    assert "原决定仍安全保留" in recovery
    assert "if (loadingCaseId) return;" in recovery


def test_r8k_orphaned_owner_review_intent_has_only_explicit_twostep_local_exit() -> None:
    """An invalid Case can leave an unaccepted intent stranded after HTTP 409.

    The UI must allow owner-controlled local cleanup without changing remote
    append-only Review history or silently dropping a possibly accepted choice.
    """
    recovery = (ROOT / "apps/mobile/src/components/life/PendingOwnerReviewRecovery.tsx").read_text()
    assert "const [discardCandidate, setDiscardCandidate]" in recovery
    assert "if (discardCandidate !== intentKey)" in recovery
    assert "setDiscardCandidate(intentKey)" in recovery
    assert "await clearOwnerIntent(petId, intent.caseId, intent.sourceIdsKey)" in recovery
    assert recovery.index("if (discardCandidate !== intentKey)") < recovery.index(
        "await clearOwnerIntent(petId, intent.caseId, intent.sourceIdsKey)"
    )
    assert "不再在本机提醒" in recovery
    assert "确认仅清除本机提醒" in recovery
    assert "取消清理" in recovery
    assert "不会撤销服务器上可能已保存的主人决定" in recovery
    assert "服务器历史决定没有被修改" in recovery
    assert 'onPress={() => void discardLocalReminder(intent)}' in recovery
    assert "NEVER POST/DELETE a server Review here" in recovery
    assert "clearAllOwnerIntents()" not in recovery


def test_r8k_confirmed_local_optout_does_not_erase_a_newer_decision_for_same_case() -> None:
    store = (ROOT / "apps/mobile/src/storage/pendingOwnerReview.ts").read_text()
    recovery = (ROOT / "apps/mobile/src/components/life/PendingOwnerReviewRecovery.tsx").read_text()
    assert "export async function clearOwnerIntentIfUnchanged(intent: SavedOwnerIntent)" in store
    assert "await serialized(async () => {" in store
    assert "saved.payload.idempotency_key !== intent.payload.idempotency_key" in store
    assert "saved.payload.expected_latest_review_id !== intent.payload.expected_latest_review_id" in store
    assert "saved.decision !== intent.decision" in store
    assert "const removed = await clearOwnerIntentIfUnchanged(intent);" in recovery
    assert "if (!removed) {" in recovery
    assert "setIntents(await listOwnerIntentsForPet(petId));" in recovery
    assert "原决定可能已在服务器生效" in recovery
    assert "不撤销服务器上的记录" in recovery
    assert 'testID={`pli.r8.pending-review-recovery.discard-warning.${intent.caseId}`}' in recovery
    assert 'inlineDiscardWarning: { width: "100%"' in recovery


def test_r8k_secure_store_rejects_overwriting_a_different_unconfirmed_owner_choice() -> None:
    store = (ROOT / "apps/mobile/src/storage/pendingOwnerReview.ts").read_text()
    recovery = (ROOT / "apps/mobile/src/components/life/PendingOwnerReviewRecovery.tsx").read_text()
    assert "const previous = existing.find((x) =>" in store
    assert "previous.decision !== intent.decision" in store
    assert "previous.payload.idempotency_key !== intent.payload.idempotency_key" in store
    assert "previous.payload.expected_latest_review_id !== intent.payload.expected_latest_review_id" in store
    assert 'throw new Error("R8_UNCONFIRMED_INTENT_CONFLICT")' in store
    assert "if (existing.length >= MAX_PENDING)" in store
    assert "JSON.stringify([...existing, intent])" in store
    assert "setDiscardCandidate(null);" in recovery
    assert recovery.index("setDiscardCandidate(null);", recovery.index("const recover = async")) < recovery.index(
        "setLoadingCaseId(intent.caseId);", recovery.index("const recover = async")
    )
