"""R8BI/R8BJ: original Case comparison and Review follow-up are not interchangeable."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_review_source_scope_and_role_integrity_are_independent_of_parent_case():
    backend = read("services/api/app/api/routes/life_change_sources.py")
    history = read("services/api/app/services/life_change_history.py")
    detail = read("services/api/app/api/routes/life_changes.py")
    assert 'payload["role"] = normalized_roles.get(event.id)' in backend
    assert '"FOLLOW_UP_OBSERVATION" if review_id is not None' in backend
    assert "role_integrity_valid = None" in backend
    assert "return history.safe_review_source_ids(review.related_event_ids)" in backend
    assert '"related_evidence_shape_valid": ids_valid' in detail
    assert "len(set(valid_ids)) == len(items)" in history
    assert "len(items) <= 12" in history


def test_all_owner_clients_warn_on_corrupt_review_without_forging_absence():
    note = "历史后续来源格式异常，部分原始事件标识无法核对。"
    for path in (
        "apps/mobile/src/screens/LifeChangeCaseScreen.tsx",
        "apps/web/app/pets/[id]/history/[caseId]/page.tsx",
        "apps/mini/src/pages/observations/detail/index.tsx",
    ):
        ui = read(path)
        assert "related_evidence_shape_valid?: boolean" in ui
        assert "related_evidence_shape_valid === false" in ui
        assert note in ui
        assert "related_event_ids.map" in ui


def test_android_review_drilldown_has_real_role_and_pet_scope_guards():
    screen = read("apps/mobile/src/screens/LifeChangeCaseScreen.tsx")
    followup = read("apps/mobile/src/components/life/FollowUpSourceEvidence.tsx")
    transport = read("apps/mobile/src/components/life/caseHistoryApi.ts")
    assert "<FollowUpSourceEvidence" in screen
    assert "reviewId={review.review_id}" in screen
    assert "expectedSourceIds={review.related_event_ids}" in screen
    assert "listCaseSources(petId, caseId, offset, PAGE_SIZE, reviewId)" in followup
    assert 'result.scope !== "FOLLOW_UP_REVIEW"' in followup
    assert 'item.role_source !== "FOLLOW_UP_OBSERVATION"' in followup
    assert "const allowed = new Set(expectedSourceIds.map(canonicalCaseSourceId))" in followup
    assert 'role !== null' in followup
    assert "activeScope.current !== requestedScope" in followup
    assert "generation.current !== epoch" in followup
    assert "ownerEvidenceLocalTime(source.occurred_at)" in followup
    assert "ownerEvidenceLocalTime(source.recorded_at)" in followup
    assert "ownerEvidenceValue({ ...source, retracted_at: null })" in followup
    assert "不代表后续干预产生了效果" in followup
    assert "result.has_more ? result.next_offset : null" in followup
    assert '"SOURCE_SCOPE_MISMATCH"' in transport
    assert "page.review_id !== (reviewId ?? null)" in transport
    assert "不会倒填历史角色或推断宠物已恢复" in followup
