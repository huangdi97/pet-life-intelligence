"""R8AT: history validity filter is SQL-bounded and consistent across clients."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_validity_filter_uses_the_same_derived_source_validity_as_detail():
    history = read("services/api/app/services/life_change_history.py")
    route = read("services/api/app/api/routes/life_changes.py")

    assert "jsonb_array_elements_text" in history
    assert "e.retracted_at IS NOT NULL" in history
    assert "s.supersedes_event_id = e.id" in history
    assert 'validity == "VALID"' in history
    assert 'validity == "INVALID"' in history
    # The keyset order must not be replaced by an offset/derived sort.
    assert "LifeChangeCase.created_at.desc()" in route
    assert 'Literal["VALID", "INVALID"]' in route
    assert "validity=validity" in route


def test_three_clients_send_the_validity_filter():
    web = read("apps/web/app/pets/[id]/history/page.tsx")
    assert 'search.set("validity", validity)' in web
    assert "pli.r8.web-history.validity." in web
    assert "[petId, metric, query, validity, reloadToken]" in web

    mobile_api = read("apps/mobile/src/components/life/caseHistoryApi.ts")
    assert 'params.set("validity", query.validity)' in mobile_api
    mobile = read("apps/mobile/src/screens/LifeChangeHistoryScreen.tsx")
    assert "pli.r8.history.validity." in mobile
    assert "limit: PAGE, cursor: nextCursor, metric, q: query, validity" in mobile

    mini = read("apps/mini/src/pages/observations/index.tsx")
    assert "validity=${validity}" in mini
    assert "pli.r8.mini-history.validity." in mini
    assert "[metric, petId, validity, scopeKey]" in mini


def test_filter_does_not_claim_recovery_or_rewrite_history():
    web = read("apps/web/app/pets/[id]/history/page.tsx")
    # Filtering is a view; the immutable Case references are never edited.
    assert "康复" not in web
    assert "已恢复" not in web
    assert "INVALIDATED" not in web.split("VALIDITY_FILTERS", 1)[1].split("interface Page", 1)[0]


def test_history_error_is_recoverable_without_fabricating_rows():
    web = read("apps/web/app/pets/[id]/history/page.tsx")
    assert 'data-testid="pli.r8.web-history.retry"' in web
    assert "setReloadToken((token) => token + 1)" in web
    assert "[petId, metric, query, validity, reloadToken]" in web

    spec = read("tests/e2e-browser/specs/r8-offline-recovery.spec.ts")
    assert 'route.abort("failed")' in spec
    assert "pli.r8.web-history.retry" in spec
    assert 'toHaveCount(0)' in spec  # no rows invented while offline


def test_validity_filter_has_a_real_android_gate():
    script = read("scripts/r5-6/capture-android-final.py")
    block = script.split("# R8AT:", 1)[1].split("def capture_r8_correction", 1)[0]
    assert 'android.tap(history_ui, "pli.r8.history.validity.INVALID", "id")' in block
    assert 'case-history-invalid-filter.xml' in block
    assert "case-validity-filter-truth.json" in block
    assert "?validity=INVALID" in block
    assert '"native_case_row_visible": True' in block
    assert '"server_filter_contains_case": True' in block


def test_mini_history_rejects_old_pet_and_filter_paginated_responses():
    """Delayed Mini network replies cannot reappear after a new validity scope."""
    mini = read("apps/mini/src/pages/observations/index.tsx")
    assert "const scopeEpoch = useRef(0);" in mini
    assert "const moreInFlight = useRef(false);" in mini
    assert "const epoch = append ? scopeEpoch.current : ++scopeEpoch.current;" in mini
    assert "if (scopeEpoch.current !== epoch) return;" in mini
    assert "if (petId) load(null, false);" in mini
    assert "scopeEpoch.current += 1;" in mini
    assert "[metric, petId, validity, scopeKey]" in mini
    assert "item.pet_id === petId" in mini


def test_history_presentation_is_sync_scoped_before_async_clear():
    """A switched pet/filter must never paint cached rows in the first frame."""
    web = read("apps/web/app/pets/[id]/history/page.tsx")
    mini = read("apps/mini/src/pages/observations/index.tsx")
    assert 'const scopeKey = JSON.stringify([petId, metric, validity, query.trim(), reloadToken]);' in web
    assert 'const visibleRows = scopeReady ? rows : [];' in web
    assert 'const visibleCursor = scopeReady ? cursor : null;' in web
    assert 'visibleRows.map((item)' in web
    assert 'visibleHasMore ? (' in web
    assert 'const scopeKey = JSON.stringify([petId, metric, validity]);' in mini
    assert 'const visibleRows = scopeReady ? rows : [];' in mini
    assert 'visibleRows.map((row)' in mini
    assert 'visibleHasMore ? (' in mini
    assert "setResultScopeKey(scopeKey)" in mini
    assert web.index("const [reloadToken, setReloadToken]") < web.index("const scopeKey = JSON.stringify")
