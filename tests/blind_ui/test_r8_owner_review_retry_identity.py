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
    # R8Y tightened the old pet+Case-only assertion: source validity and the
    # exact immutable evidence set must ALSO match before any durable clear.
    helper = code.split("function caseMatchesFrozenSources(", 1)[1].split(
        "export function LifeChangeReviewPanel", 1
    )[0]
    assert "detail.source_valid === true" in helper
    assert "detail.pet_id === petId" in helper
    assert "detail.case_id === caseId" in helper
    assert "sourceIds.size > 0" in helper
    assert "detail.evidence_event_ids.length === sourceIds.size" in helper
    assert "detail.evidence_event_ids.every((id) => sourceIds.has(id))" in helper
    review_flow = code.split("const review = async", 1)[1].split(
        "const inspectEvidence = async", 1
    )[0]
    assert "if (!caseMatchesFrozenSources(details, requestedPetId, requestedCaseId, requestedSources))" in review_flow
    assert "if (!caseMatchesFrozenSources(updated, requestedPetId, requestedCaseId, requestedSources))" in review_flow
    assert review_flow.index("caseMatchesFrozenSources(details,") < review_flow.index(
        "await saveOwnerIntent("
    )
    assert review_flow.index("caseMatchesFrozenSources(updated,") < review_flow.index(
        "const cleared = await clearOwnerIntentIfUnchanged({"
    )
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
    assert "if (!visibleIntents.length && !visibleWarning) return null;" in recovery
    assert "const visibleIntents = intents.filter((entry) => entry.petId === petId);" in recovery
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
    assert "await reloadForPet(requestedPet, generation);" in recovery
    assert "不会自动替你决定或补发" in recovery
    assert "原决定仍安全保留" in recovery
    assert "if (loadingCaseId || activeOwnerAction.current) return;" in recovery


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
    assert "const snapshot = snapshotIntent(intent);" in store
    assert "function snapshotIntent(intent: SavedOwnerIntent): SavedOwnerIntent" in store
    assert "const checked = validateRows([intent])[0];" in store
    assert "await serialized(async () => {" in store
    assert "saved.payload.idempotency_key !== snapshot.payload.idempotency_key" in store
    assert "saved.payload.expected_latest_review_id !== snapshot.payload.expected_latest_review_id" in store
    assert "saved.decision !== snapshot.decision" in store
    assert "const removed = await clearOwnerIntentIfUnchanged(intent);" in recovery
    assert "if (!removed) {" in recovery
    assert "await reloadForPet(requestedPet, generation);" in recovery
    assert "原决定可能已在服务器生效" in recovery
    assert "不撤销服务器上的记录" in recovery
    assert 'testID={`pli.r8.pending-review-recovery.discard-warning.${intent.caseId}`}' in recovery
    assert 'inlineDiscardWarning: { width: "100%"' in recovery


def test_r8k_secure_store_rejects_overwriting_a_different_unconfirmed_owner_choice() -> None:
    store = (ROOT / "apps/mobile/src/storage/pendingOwnerReview.ts").read_text()
    recovery = (ROOT / "apps/mobile/src/components/life/PendingOwnerReviewRecovery.tsx").read_text()
    assert "const previous = existing.find((x) =>" in store
    assert "const snapshot = snapshotIntent(intent);" in store
    assert "const checked = validateRows([intent])[0];" in store
    assert "previous.decision !== snapshot.decision" in store
    assert "previous.payload.idempotency_key !== snapshot.payload.idempotency_key" in store
    assert "previous.payload.expected_latest_review_id !== snapshot.payload.expected_latest_review_id" in store
    assert 'throw new Error("R8_UNCONFIRMED_INTENT_CONFLICT")' in store
    assert "if (existing.length >= MAX_PENDING)" in store
    assert "JSON.stringify([...existing, snapshot])" in store
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
    # R8P still refreshes the same pet's durable intent list after exact
    # acknowledgement, but may render it ONLY if the active-pet generation
    # has not changed during the SecureStore read.
    assert "await reloadForPet(requestedPet, generation);" in success_flow
    assert "const rows = await listOwnerIntentsForPet(requestedPet);" in recovery
    assert "if (stillOnPet(requestedPet, generation)) setIntents(rows);" in recovery
    assert success_flow.index("const cleared = await clearOwnerIntentIfUnchanged(intent);") < success_flow.index(
        "await reloadForPet(requestedPet, generation);"
    )
    assert "await clearOwnerIntent(petId, intent.caseId, intent.sourceIdsKey)" not in success_flow
    assert success_flow.index("row.review_id === accepted.review_id") < success_flow.index(
        "const cleared = await clearOwnerIntentIfUnchanged(intent);"
    )
    assert "新决定未被清除" in success_flow


def test_r8q_securestore_reader_is_in_same_serialized_queue_and_ci_executes_race() -> None:
    """The source contract supplements (does not replace) executable Node race tests."""
    store = (ROOT / "apps/mobile/src/storage/pendingOwnerReview.ts").read_text()
    workflow = (ROOT / ".github/workflows/ci.yml").read_text()
    script = (ROOT / "apps/mobile/scripts/test-owner-intent-store.cjs").read_text()
    assert "function serialized<T>(work: () => Promise<T>): Promise<T>" in store
    assert "return serialized(async () =>" in store
    assert "await queue;\n  return (await read())" not in store
    assert 'Owner Review SecureStore concurrency (real async IO simulation)' in workflow
    assert "pnpm --dir apps/mobile test:owner-intent-store" in workflow
    assert "CAS deletion overtook in-flight SecureStore read" in script
    assert "await exports.saveOwnerIntent(another)" in script
    assert "R8_UNCONFIRMED_INTENT_CONFLICT" in script


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


def test_r8p_recovery_async_is_scoped_before_each_remote_side_effect() -> None:
    recovery = (ROOT / "apps/mobile/src/components/life/PendingOwnerReviewRecovery.tsx").read_text()
    flow = recovery.split("const recover = async", 1)[1].split("const discardLocalReminder = async", 1)[0]
    assert "const activeRecoveryPet = useRef(petId);" in recovery
    assert "activeRecoveryPet.current = petId;" in recovery
    assert "return () => { alive = false; recoveryGeneration.current += 1; };" in recovery
    assert "if (intent.petId !== petId) return;" in flow
    assert "const stillCurrent = () => stillOnPet(requestedPet, generation);" in flow
    assert "const saved = await restoreOwnerIntent(petId, intent.caseId, intent.sourceIdsKey);" in flow
    assert "saved.payload.idempotency_key !== intent.payload.idempotency_key" in flow
    assert "saved.payload.expected_latest_review_id !== intent.payload.expected_latest_review_id" in flow
    assert flow.index("if (!stillCurrent()) return;", flow.index("const saved = await restoreOwnerIntent")) < flow.index(
        "const accepted = await api.post<ReviewAck>"
    )
    assert "if (!stillCurrent()) return;" in flow.split("const accepted = await api.post<ReviewAck>", 1)[1]
    assert "if (!stillCurrent()) return;" in flow.split("const confirmed = await api.get<CaseDetail>", 1)[1]
    assert "if (!stillCurrent()) return;" in flow.split("const cleared = await clearOwnerIntentIfUnchanged(intent)", 1)[1]
    assert "if (stillCurrent()) setLoadingCaseId(null)" in flow
    assert "const visibleWarning = warningPetId === petId ? warning : null;" in recovery


def test_r8p_discard_is_not_applied_to_a_different_active_pet() -> None:
    recovery = (ROOT / "apps/mobile/src/components/life/PendingOwnerReviewRecovery.tsx").read_text()
    discard = recovery.split("const discardLocalReminder = async", 1)[1].split(
        "  // Hide prior-pet rows", 1
    )[0]
    assert "if (intent.petId !== petId) return;" in discard
    assert "const stillCurrent = () => stillOnPet(requestedPet, generation);" in discard
    assert discard.index("if (!stillCurrent()) return;") < discard.index(
        "const removed = await clearOwnerIntentIfUnchanged(intent);"
    )
    assert "if (!stillCurrent()) return;" in discard.split(
        "const removed = await clearOwnerIntentIfUnchanged(intent);", 1
    )[1]
    assert "if (stillCurrent()) setLoadingCaseId(null)" in discard
    assert "const visibleIntents = intents.filter((entry) => entry.petId === petId);" in recovery

def test_r8r_quicklog_does_not_reuse_pet_a_media_or_review_for_pet_b() -> None:
    """Source contract: async photo/save/review completions must stay on original pet."""
    code = (ROOT / "apps/mobile/src/screens/QuickLogScreen.tsx").read_text()
    assert "const livePetScope = useRef<" in code
    assert "livePetScope.current.petId !== (current?.id ?? null)" in code
    assert "const saveScope = livePetScope.current;" in code
    assert "activeSaveScope.current === saveScope" in code
    assert "const stillOnOriginalPet = () => livePetScope.current === saveScope" in code
    assert "if (livePetScope.current !== pickerScope) return;" in code
    assert "if (result.canceled || livePetScope.current !== pickerScope) return;" in code
    assert "if (!stillOnOriginalPet()) return;" in code
    assert "if (linkedCase && linkedPetId === savePetId)" in code
    assert "detail.pet_id !== savePetId || detail.case_id !== linkedCase" in code
    assert "idempotency_key: `r8-observation-${savedEventId}`" in code
    assert "accepted.pet_id !== savePetId" in code
    assert "accepted.case_id !== linkedCase" in code
    assert "if (stillOnOriginalPet()) setError(humanizeError(e));" in code
    assert "if (stillOnOriginalPet()) setSaving(false);" in code
    assert "setMediaFiles([]);" in code




def test_r8s_recovery_panel_synchronously_serializes_owner_actions() -> None:
    """Two taps before React state commits must not post twice or race a discard."""
    code = (ROOT / "apps/mobile/src/components/life/PendingOwnerReviewRecovery.tsx").read_text()
    assert "const activeOwnerAction = useRef<string | null>(null);" in code
    assert code.count("if (loadingCaseId || activeOwnerAction.current) return;") == 2
    assert 'activeOwnerAction.current = actionKey;' in code
    assert code.count("if (activeOwnerAction.current === actionKey) activeOwnerAction.current = null;") == 2
    assert 'const actionKey = `recover:${petId}:${intent.caseId}`;' in code
    assert 'const actionKey = `discard:${petId}:${intent.caseId}`;' in code
    assert "if (discardCandidate !== intentKey)" in code
    assert "const accepted = await api.post<ReviewAck>" in code
    assert "const removed = await clearOwnerIntentIfUnchanged(intent);" in code


def test_r8t_actual_owner_recovery_handler_executable_gate_runs_in_mobile_ci() -> None:
    """The synchronous lock must be exercised with delayed I/O, not only scanned."""
    root = Path(__file__).resolve().parents[2]
    node = (root / "apps/mobile/scripts/test-owner-review-recovery.cjs").read_text()
    ci = (root / ".github/workflows/ci.yml").read_text()
    mobile = (root / "apps/mobile/package.json").read_text()
    assert 'PendingOwnerReviewRecovery.tsx' in node
    assert 'screen.slice(start, end)' in node
    assert 'ts.transpileModule(source' in node
    assert 'test:owner-review-recovery' in ci
    assert 'pnpm --dir apps/mobile test:owner-review-recovery' in ci
    assert 'node scripts/test-owner-review-recovery.cjs' in mobile
    assert 'rapid double tap must not issue second GET' in node
    assert 'A→B during GET cannot POST old intent' in node
    assert 'A→B during POST cannot confirm stale pet' in node
    assert 'lost acknowledgement must preserve durable owner intent' in node
    assert 'two-step opt-out must never create server Review' in node
    assert 'newer owner instruction must survive CAS' in node
    assert 'screen.slice(guardStart, guardEnd)' in node
    assert 'h.changeBackToA()' in node
    assert 'Old A response cannot resume after A→B→A before effect cleanup' in node
    production = (root / 'apps/mobile/src/components/life/PendingOwnerReviewRecovery.tsx').read_text()
    assert 'if (activeRecoveryPet.current !== petId) {' in production
    assert 'const effectGeneration = recoveryGeneration.current;' in production
    assert 'stillOnPet(petId, effectGeneration)' in production



def test_r8w_secure_owner_intents_fail_before_oversized_native_keychain_write() -> None:
    store = (ROOT / "apps/mobile/src/storage/pendingOwnerReview.ts").read_text()
    script = (ROOT / "apps/mobile/scripts/test-owner-intent-store.cjs").read_text()
    assert "const MAX_SECURESTORE_BYTES = 1900;" in store
    assert "const MAX_EVIDENCE_KEY_CHARS = 1200;" in store
    assert "const PRINTABLE_TOKEN =" in store
    assert "encoded.length > MAX_SECURESTORE_BYTES" in store
    assert 'throw new Error("R8_SECURE_INTENT_STORAGE_LIMIT")' in store
    assert store.index("encoded.length > MAX_SECURESTORE_BYTES") < store.index(
        "SecureStore.setItemAsync(KEY, encoded)"
    )
    assert 'idempotency_key: "         "' in script
    assert 'sourceIdsKey: "s".repeat(1201)' in script
    assert "const beforeCapacity = data.get(storeKey);" in script
    assert "assert.equal(data.get(storeKey), beforeCapacity," in script
    assert "await exports.clearAllOwnerIntents();" in script


def test_r8x_owner_recovery_rejects_source_invalidation_before_and_after_post() -> None:
    recovery = (ROOT / "apps/mobile/src/components/life/PendingOwnerReviewRecovery.tsx").read_text()
    fault = (ROOT / "apps/mobile/scripts/test-owner-review-recovery.cjs").read_text()
    assert "detail.source_valid !== true" in recovery
    assert "confirmed.source_valid !== true" in recovery
    assert '[...confirmed.evidence_event_ids].sort().join("|") !== intent.sourceIdsKey' in recovery
    assert recovery.index("detail.source_valid !== true") < recovery.index(
        "const accepted = await api.post<ReviewAck>"
    )
    assert recovery.index("confirmed.source_valid !== true") < recovery.index(
        "const cleared = await clearOwnerIntentIfUnchanged(intent);"
    )
    assert 'sourceInvalid = false, invalidateAfterPost = false' in fault
    assert "changeEvidenceAfterPost = false" in fault
    assert 'setup({sourceInvalid:true})' in fault
    assert 'setup({invalidateAfterPost:true})' in fault
    assert 'setup({changeEvidenceAfterPost:true})' in fault
    assert "invalidated original evidence must never trigger a new owner Review" in fault
    assert "source invalidated after POST cannot delete ambiguous original owner intent" in fault


def test_r8z_primary_review_executes_actual_handler_under_source_faults() -> None:
    script = (ROOT / "apps/mobile/scripts/test-owner-review-primary.cjs").read_text()
    ci = (ROOT / ".github/workflows/ci.yml").read_text()
    package = (ROOT / "apps/mobile/package.json").read_text()
    panel = (ROOT / "apps/mobile/src/components/life/LifeChangeReviewPanel.tsx").read_text()
    assert 'LifeChangeReviewPanel.tsx' in script
    assert 'ts.transpileModule' in script
    assert 'screen.slice(start, end)' in script
    assert 'test:owner-review-primary' in ci
    assert 'pnpm --dir apps/mobile test:owner-review-primary' in ci
    assert 'node scripts/test-owner-review-primary.cjs' in package
    assert 'if (!caseMatchesFrozenSources(retryCase, requestedPetId, requestedCaseId, requestedSources))' in panel
    assert panel.index('caseMatchesFrozenSources(retryCase,') < panel.index(
        'const accepted = await api.post<ReviewAcknowledgement>'
    )
    assert 'invalid source before first POST must stop' in script
    assert 'source invalidated after POST must retain encrypted intent' in script
    assert 'unconfirmed retry must revalidate source before POST' in script
    assert 'changed source fingerprint on retry must never POST' in script
    assert 'owner switching pet during source GET cannot POST' in script
    assert 'lost ack retry must retain identical idempotency key' in script


def test_r8z_primary_owner_review_has_synchronous_scope_lock_and_aba_guard() -> None:
    panel = (ROOT / "apps/mobile/src/components/life/LifeChangeReviewPanel.tsx").read_text()
    test = (ROOT / "apps/mobile/scripts/test-owner-review-primary.cjs").read_text()
    assert "const activeReviewAction = useRef<{ scope: string } | null>(null);" in panel
    assert "const renderedReviewScope = useRef(ownerReviewScope);" in panel
    assert "if (renderedReviewScope.current !== ownerReviewScope)" in panel
    guard = panel.split("if (renderedReviewScope.current !== ownerReviewScope)", 1)[1].split(
        "activeChangeScope.current =", 1
    )[0]
    assert "requestGeneration.current += 1;" in guard
    assert "activeReviewAction.current = null;" in guard
    review = panel.split("const review = async", 1)[1].split(
        "const inspectEvidence = async", 1
    )[0]
    assert "if (activeReviewAction.current) return;" in review
    assert "activeReviewAction.current = actionToken;" in review
    assert review.index("activeReviewAction.current = actionToken;") < review.index(
        "const details = await api.get<LifeCaseDetail>"
    )
    assert "if (activeReviewAction.current === actionToken) activeReviewAction.current = null;" in review
    assert "rapid double tap must issue only one GET" in test
    assert "rapid double tap must not issue a duplicate owner Review POST" in test
