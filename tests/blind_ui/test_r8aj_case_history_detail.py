"""R8AJ: the persistent Today Case journal must open its immutable source/review history."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_today_case_journal_opens_real_case_without_a_sixth_tab():
    nav = read("apps/mobile/src/navigation.tsx")
    today = read("apps/mobile/src/screens/TodayScreen.tsx")
    journal = read("apps/mobile/src/components/life/OwnerChangeHistory.tsx")
    assert 'LifeChangeCase: { petId: string; caseId: string };' in nav
    assert '<Stack.Screen name="LifeChangeCase" component={LifeChangeCaseScreen}' in nav
    assert 'onOpenCase={(caseId) => stackNav.navigate("LifeChangeCase", { petId, caseId })}' in today
    assert 'onPress={() => onOpenCase(c.case_id)}' in journal
    assert 'testID={`pli.r8.owner-history.case.${c.case_id}`}' in journal
    assert 'name="Me" component={MeScreen}' in nav


def test_detail_is_pet_scoped_and_not_a_stale_async_cross_pet_view():
    screen = read("apps/mobile/src/screens/LifeChangeCaseScreen.tsx")
    assert 'const matchedPet = petId === requestedPetId;' in screen
    assert 'if (renderScope.current !== scope)' in screen
    assert 'generation.current += 1;' in screen
    assert 'snapshot.generation === generation.current' in screen
    assert 'data.pet_id !== requestedPetId || data.case_id !== caseId' in screen
    assert 'testID="pli.r8.case-detail.pet-mismatch"' in screen
    assert '/life-change-cases/${caseId}' in screen


def test_detail_retains_reviews_exact_sources_and_server_note_redaction():
    screen = read("apps/mobile/src/screens/LifeChangeCaseScreen.tsx")
    sources = read("apps/mobile/src/components/life/CaseSourceList.tsx")
    api = read("services/api/app/api/routes/life_changes.py")
    assert 'detail.reviews.map((review)' in screen
    assert 'review.related_sources_valid' in screen
    assert 'review.related_event_ids.map((id)' in screen
    # R8AK moved the per-source rendering into a focused component; the same
    # frozen-role contract must survive the move and receive the server map.
    assert 'detail.evidence_role_source' in screen
    assert 'roleSource === "FROZEN_AT_CREATION"' in sources
    assert 'frozenRoles[source.event_id]' in sources
    assert 'testID={`pli.r8.case-detail.source.${source.event_id}`}' in sources
    assert 'review.note?.trim()' in screen
    assert 'row.note if owner_view else ""' in api
    assert 'caseHistoryStatus(detail)' in screen
    assert 'testID="pli.r8.case-detail.case-id"' in screen


def test_case_detail_can_continue_an_old_case_without_a_new_case():
    screen = read("apps/mobile/src/screens/LifeChangeCaseScreen.tsx")
    actions = read("apps/mobile/src/components/life/CaseReviewActions.tsx")
    api = read("services/api/app/api/routes/life_changes.py")
    assert '<CaseReviewActions' in screen
    assert 'ownerCanReview={detail.owner_can_review === true}' in screen
    assert 'latestReviewId={detail.latest_review_id ?? null}' in screen
    assert 'onRecord={recordObservation}' in screen
    assert 'lifeChangeCaseId: detail.case_id' in screen
    assert 'testID="pli.r8.case-detail.review.record"' in actions
    assert 'continueCaseReview(petId, caseId, decision, latestReviewId)' in actions
    assert 'testID="pli.r8.case-detail.review.status"' in actions
    # A reload after the decision must keep the same-scope journal mounted so
    # the owner actually sees the confirmation instead of a blank reload.
    assert 'before && before.scope === scope ? before : null' in screen
    assert '"owner_can_review": owner_view and case_current' in api
    assert '"latest_review_id": str(reviews[-1].id) if reviews else None' in api


def test_owner_history_is_paged_searchable_and_pet_scoped():
    nav = read("apps/mobile/src/navigation.tsx")
    history = read("apps/mobile/src/screens/LifeChangeHistoryScreen.tsx")
    today = read("apps/mobile/src/components/life/OwnerChangeHistory.tsx")
    client = read("apps/mobile/src/components/life/caseHistoryApi.ts")
    api = read("services/api/app/api/routes/life_changes.py")
    assert 'LifeChangeHistory: { petId: string };' in nav
    assert '<Stack.Screen name="LifeChangeHistory"' in nav
    # Never a sixth tab: the history reader lives in the existing root stack.
    assert 'createBottomTabNavigator<TabParamList>' in nav
    assert 'onOpenHistory={() => stackNav.navigate("LifeChangeHistory", { petId })}' in read(
        "apps/mobile/src/screens/TodayScreen.tsx"
    )
    assert 'testID="pli.r8.owner-history.all"' in today
    assert 'params.set("cursor", query.cursor)' in client
    assert 'testID={`pli.r8.history.filter.${item.key ?? "all"}`}' in history
    assert 'testID="pli.r8.history.more"' in history
    assert 'testID="pli.r8.history.pet-mismatch"' in history
    assert 'page.cases.some((item) => item.pet_id !== petId)' in client
    assert '"next_cursor": next_cursor' in api
    assert '"total": total' in api


def test_case_sources_endpoint_reauthorizes_every_event():
    source_api = read("services/api/app/api/routes/life_change_sources.py")
    assert 'require_capability(\n        db, pet, user.id, enums.Capability.DAILY_READ,' in source_api
    assert 'MEDICAL_EVENT_TYPES' in source_api
    assert 'PermissionDenied("Medical event requires medical:read.")' in source_api
    assert '"missing_event_ids"' in source_api
    assert 'LifeChangeCase.pet_id == pet_id' in source_api
    assert '"LEGACY_DATE_DERIVED"' in source_api

