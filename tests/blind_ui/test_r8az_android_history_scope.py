"""R8AZ Android owner history: first-frame and delayed network isolation."""
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "apps/mobile/src/screens/LifeChangeHistoryScreen.tsx"


def test_history_first_frame_masks_previous_pet_and_filter():
    source = SRC.read_text(encoding="utf-8")
    assert "const scopeKey = JSON.stringify([petId, requestedPetId, metric, query.trim(), validity]);" in source
    assert "const scopeReady = matchedPet && resultScopeKey === scopeKey;" in source
    assert "const visibleRows = scopeReady ? rows : [];" in source
    assert "const visibleTotal = scopeReady ? total : null;" in source
    assert "const visibleError = scopeReady ? error : null;" in source
    assert "{visibleRows.map((item)" in source
    assert "{visibleHasMore && !visibleLoading ? (" in source
    assert "{visibleTotal != null ? " in source


def test_history_stale_request_cannot_append_across_scope_or_unmount():
    source = SRC.read_text(encoding="utf-8")
    assert "const generation = useRef(0);" in source
    assert "const moreInFlight = useRef(false);" in source
    assert "const epoch = append ? generation.current : ++generation.current;" in source
    assert "if (!matchedPet || (append && (!nextCursor || moreInFlight.current))) return;" in source
    assert "if (epoch !== generation.current) return;" in source
    assert "generation.current += 1;" in source
    assert "moreInFlight.current = false;" in source
    assert "setResultScopeKey(null);" in source
    assert "setResultScopeKey(scopeKey);" in source
    assert "onPress={() => void load(visibleCursor, true)}" in source
    assert "HISTORY_PET_MISMATCH" in source


def test_history_reading_source_remains_server_authoritative():
    source = SRC.read_text(encoding="utf-8")
    api = (SRC.parents[4] / "apps/mobile/src/components/life/caseHistoryApi.ts").read_text(encoding="utf-8")
    assert "listCaseHistory(requestedPetId" in source
    assert 'if (page.cases.some((item) => item.pet_id !== petId))' in api
    assert "throw new Error(\"HISTORY_PET_MISMATCH\");" in api
    assert "if (!matchedPet) return;" in source


def test_r8az_real_android_history_filter_switch_has_truth_not_fake_first_frame_claims():
    source = (SRC.parents[4] / "scripts/r5-6/capture-android-final.py").read_text(encoding="utf-8")
    assert 'case-history-r8az-invalid.xml' in source
    assert 'case-history-r8az-valid.xml' in source
    assert 'case-history-r8az-filter-truth.json' in source
    assert 'android.tap(history_xml, "pli.r8.history.validity.INVALID", "id")' in source
    assert 'android.tap(invalid_ui, "pli.r8.history.validity.VALID", "id")' in source
    assert '"native_invalid_excluded_case": True' in source
    assert '"native_valid_restored_case": True' in source
    assert '"first_frame_async_race_runtime": "NOT_MEASURED_BY_THIS_TEST"' in source
