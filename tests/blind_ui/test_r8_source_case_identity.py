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


def test_owner_review_marks_withdrawn_followup_source_without_erasing_history():
    panel = read("apps/mobile/src/components/life/LifeChangeReviewPanel.tsx")
    backend = read("services/api/app/api/routes/life_changes.py")
    assert 'follow_up_source_valid?: boolean | null' in panel
    assert 'record.state === "FOLLOW_UP_EVIDENCE_INVALIDATED"' in panel
    assert 'testID="pli.r8.owner-review.followup-invalid"' in panel
    assert "之前的主人反馈仍已保存" in panel
    assert "FOLLOW_UP_EVIDENCE_INVALIDATED" in backend
    assert "related_sources_valid" in backend
    assert "follow_up_source_valid" in backend


def test_today_refetches_source_scoped_owner_review_after_quicklog_return():
    """The feedback loop must not depend on restarting Today or changing pets."""
    today = read("apps/mobile/src/screens/TodayScreen.tsx")
    quicklog = read("apps/mobile/src/screens/QuickLogScreen.tsx")
    assert 'import { useFocusEffect, useNavigation }' in today
    assert "const hasHadFocus = useRef(false)" in today
    assert "useFocusEffect(useCallback(() => {" in today
    assert "setRefreshCounter((counter) => counter + 1)" in today
    assert "petId, refreshCounter]" in today
    assert 'navigation.goBack()' in quicklog
    assert "linkedCase" in quicklog and "RECORD_OBSERVATION" in quicklog


def test_r8y_primary_owner_review_validates_frozen_evidence_before_post_and_cas():
    """Recovery checks alone cannot secure the normal human tap path."""
    panel = read("apps/mobile/src/components/life/LifeChangeReviewPanel.tsx")
    action = panel.split("const review = async", 1)[1].split("const inspectEvidence = async", 1)[0]
    helper = panel.split("function caseMatchesFrozenSources(", 1)[1].split("export function", 1)[0]
    assert "detail.source_valid === true" in helper
    assert "detail.evidence_event_ids.length === sourceIds.size" in helper
    assert "detail.evidence_event_ids.every((id) => sourceIds.has(id))" in helper
    assert "caseMatchesFrozenSources(details, requestedPetId, requestedCaseId, requestedSources)" in action
    assert "caseMatchesFrozenSources(updated, requestedPetId, requestedCaseId, requestedSources)" in action
    assert action.index("caseMatchesFrozenSources(details") < action.index("await saveOwnerIntent(")
    assert action.index("caseMatchesFrozenSources(updated") < action.index("const cleared = await clearOwnerIntentIfUnchanged({")
    assert 'throw new Error("CASE_SOURCE_INVALIDATED_AFTER_REVIEW")' in action
    assert "本机原决定仍保留" in action


def test_r8ag_frozen_server_case_roles_override_android_local_reconstruction() -> None:
    server = read("services/api/app/api/routes/life_changes.py")
    panel = read("apps/mobile/src/components/life/LifeChangeReviewPanel.tsx")
    helper = read("apps/mobile/src/components/life/ownerEvidence.ts")
    model = read("services/api/app/models/life_changes.py")
    assert 'evidence_role_by_event_id=roles' in server
    assert 'roles = _freeze_evidence_roles(selected)' in server
    assert '"FROZEN_AT_CREATION" if case.evidence_role_by_event_id is not None' in server
    assert "evidence_role_by_event_id: Mapped[dict | None]" in model
    assert "ownerEvidenceCaseRole(e.event_id, e.occurred_at, record.computed_at, record.evidence_role_by_event_id)" in panel
    assert "record.evidence_role_by_event_id" in panel
    assert 'testID="pli.r8.owner-review.source-role-policy"' in panel
    assert 'if (frozenRoles != null)' in helper
    assert 'return "日期待核实";' in helper


def test_r8ag_real_android_requires_complete_persisted_case_roles() -> None:
    capture = read("scripts/r5-6/capture-android-final.py")
    assert 'case.get("evidence_role_source") != "FROZEN_AT_CREATION"' in capture
    assert "set(frozen_roles) != set(case_source_ids)" in capture
    assert "expected_frozen_roles" in capture
    assert "R8AG frozen Case source role disagrees" in capture
    assert '"native_roles_match_frozen_server_evidence": True' in capture
    # R8AF native XML proof is still mandatory, not replaced by API checks.
    assert "event_id not in observed_comparison_role_ids for event_id in planted_ids" in capture
