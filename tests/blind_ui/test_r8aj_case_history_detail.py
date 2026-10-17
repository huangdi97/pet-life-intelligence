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
    api = read("services/api/app/api/routes/life_changes.py")
    assert 'detail.reviews.map((review)' in screen
    assert 'review.related_sources_valid' in screen
    assert 'review.related_event_ids.map((id)' in screen
    assert 'detail.evidence_role_source === "FROZEN_AT_CREATION"' in screen
    assert 'detail.evidence_role_by_event_id?.[id]' in screen
    assert 'testID={`pli.r8.case-detail.source.${id}`}' in screen
    assert 'review.note?.trim()' in screen
    assert 'row.note if owner_view else ""' in api
    assert 'caseHistoryStatus(detail)' in screen
    assert 'testID="pli.r8.case-detail.case-id"' in screen
