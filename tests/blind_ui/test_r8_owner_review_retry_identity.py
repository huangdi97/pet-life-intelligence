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
    assert "const cleared = await clearOwnerIntentIfUnchanged({" in code
    assert "if (!cleared) {" in code
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
    assert code.index("entry.review_id === accepted.review_id") < code.index(
        "const cleared = await clearOwnerIntentIfUnchanged({",
        code.index("const accepted = await api.post")
    )


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
    assert panel.index("entry.review_id === accepted.review_id") < panel.index(
        "const cleared = await clearOwnerIntentIfUnchanged({"
    )
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
    assert recovery.index("row.review_id === accepted.review_id") < recovery.index(
        "const cleared = await clearOwnerIntentIfUnchanged(intent);"
    )
    assert "if (!cleared) {" in recovery
    assert "setIntents(await listOwnerIntentsForPet(petId));" in recovery
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
    # This TWO-STEP gate applies to the user-initiated local opt-out,
    # not the different path that clears an exactly acknowledged server Review.
    discard_flow = recovery.split("const discardLocalReminder = async", 1)[1].split(
        "  // A matching evidence fingerprint", 1
    )[0]
    assert "const removed = await clearOwnerIntentIfUnchanged(intent);" in discard_flow
    assert discard_flow.index("if (discardCandidate !== intentKey)") < discard_flow.index(
        "const removed = await clearOwnerIntentIfUnchanged(intent);"
    )
    assert "if (!removed) {" in discard_flow
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


def test_r8_owner_review_recovery_ack_can_only_clear_same_immutable_intent() -> None:
    recovery = (ROOT / "apps/mobile/src/components/life/PendingOwnerReviewRecovery.tsx").read_text()
    success_flow = recovery.split("const recover = async", 1)[1].split(
        "  const discardLocalReminder = async", 1
    )[0]
    assert "const cleared = await clearOwnerIntentIfUnchanged(intent);" in success_flow
    assert "if (!cleared) {" in success_flow
    assert "setIntents(await listOwnerIntentsForPet(petId));" in success_flow
    assert "await clearOwnerIntent(petId, intent.caseId, intent.sourceIdsKey)" not in success_flow
    assert success_flow.index("row.review_id === accepted.review_id") < success_flow.index(
        "const cleared = await clearOwnerIntentIfUnchanged(intent);"
    )
    assert "新决定未被清除" in success_flow


def test_r8m_primary_owner_review_never_drops_uncertain_request_on_http_conflict() -> None:
    panel = (ROOT / "apps/mobile/src/components/life/LifeChangeReviewPanel.tsx").read_text()
    post = panel.split("const review = async", 1)[1].split("const inspectEvidence = async", 1)[0]
    assert "await clearOwnerIntent(petId, record.case_id, sourceIdsKey)" not in post
    assert "const cleared = await clearOwnerIntentIfUnchanged({" in post
    assert "if (!cleared) {" in post
    assert "新决定没有被清除" in post
    assert "409, 422" in post
    assert "原决定仍在本机待核对" in post
    assert "R8_UNCONFIRMED_INTENT_CONFLICT" in post
    assert post.index("entry.review_id === accepted.review_id") < post.index(
        "const cleared = await clearOwnerIntentIfUnchanged({"
    )


def test_r8n_owner_evidence_async_result_cannot_cross_pet_or_case() -> None:
    """Slow event-source GETs are not allowed to paint another selected pet."""
    panel = (ROOT / "apps/mobile/src/components/life/LifeChangeReviewPanel.tsx").read_text()
    section = panel.split("const inspectEvidence = async", 1)[1].split("  return (", 1)[0]
    assert "const requestGeneration = useRef(0)" in panel
    assert "requestGeneration.current += 1" in panel
    assert "const requestedPetId = petId" in section
    assert "const requestedCaseId = record.case_id" in section
    assert "activeOwnerScope.current.petId === requestedPetId" in section
    assert "activeOwnerScope.current.caseId === requestedCaseId" in section
    assert "if (!stillCurrent()) return;" in section
    assert "if (stillCurrent()) setEvidenceError(humanizeError(e))" in section
    assert "if (stillCurrent()) setLoading(false)" in section


def test_r8o_life_change_case_create_is_guarded_by_live_pet_and_frozen_source() -> None:
    panel = (ROOT / "apps/mobile/src/components/life/LifeChangeReviewPanel.tsx").read_text()
    create = panel.split("const create = async", 1)[1].split("const review = async", 1)[0]
    assert "const activeChangeScope = useRef({ petId, metric: change.metric, sourceIdsKey });" in panel
    assert "activeChangeScope.current = { petId, metric: change.metric, sourceIdsKey };" in panel
    assert "const generation = requestGeneration.current" in create
    assert "const stillCurrent = () =>" in create
    assert "activeChangeScope.current.sourceIdsKey === requestedSources" in create
    assert create.index("if (!stillCurrent()) return;") < create.index("setRecord(saved)")
    assert 'throw new Error("CASE_SOURCE_SCOPE_MISMATCH")' in create
    assert "if (stillCurrent()) setMessage(humanizeError(e))" in create
    assert "if (stillCurrent()) setLoading(false)" in create


def test_r8o_async_review_post_never_paints_new_pet_or_erases_its_intent() -> None:
    panel = (ROOT / "apps/mobile/src/components/life/LifeChangeReviewPanel.tsx").read_text()
    review = panel.split("const review = async", 1)[1].split("const inspectEvidence = async", 1)[0]
    assert "activeOwnerScope.current.caseId === requestedCaseId" in review
    assert "activeChangeScope.current.petId === requestedPetId" in review
    assert "activeChangeScope.current.sourceIdsKey === requestedSources" in review
    assert "const accepted = await api.post<ReviewAcknowledgement>" in review
    assert review.index("if (!stillCurrent()) return;", review.index("await saveOwnerIntent(")) < review.index(
        "const accepted = await api.post<ReviewAcknowledgement>"
    )
    assert "if (!stillCurrent()) return;" in review.split("const accepted = await api.post<ReviewAcknowledgement>", 1)[1]
    assert review.index("if (!stillCurrent()) return;", review.index("const updated = await api.get<LifeCaseDetail>")) < review.index(
        "setRecord(updated)"
    )
    assert review.index("if (!stillCurrent()) return;", review.index("const updated = await api.get<LifeCaseDetail>")) < review.index(
        "const cleared = await clearOwnerIntentIfUnchanged({"
    )
    assert "if (!stillCurrent()) return;" in review.split("const cleared = await clearOwnerIntentIfUnchanged({", 1)[1]
    assert "if (stillCurrent()) setLoading(false)" in review
    assert "if (!stillCurrent()) return;" in review.split("} catch (e: unknown)", 1)[1]
