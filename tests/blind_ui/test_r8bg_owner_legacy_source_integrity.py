"""R8BG: no owner client may label malformed frozen evidence 'fully checked'."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_source_container_integrity_is_reported_and_visible_on_all_three_clients():
    source = read("services/api/app/api/routes/life_change_sources.py")
    mobile_api = read("apps/mobile/src/components/life/caseHistoryApi.ts")
    android = read("apps/mobile/src/components/life/CaseSourceList.tsx")
    web = read("apps/web/app/pets/[id]/history/[caseId]/page.tsx")
    mini = read("apps/mini/src/pages/observations/detail/index.tsx")
    for name in ("evidence_shape_valid", "evidence_role_shape_valid"):
        assert f'"{name}"' in source
        for client in (mobile_api, web, mini):
            assert name in client
    note = "历史来源或角色字段格式异常，无法确认所有依据已核对。"
    for client in (android, web, mini):
        assert note in client
        assert "=== false" in client
    assert 'testID="pli.r8.case-detail.sources.integrity"' in android
    assert 'data-testid="pli.r8.mini-case.source-integrity"' in mini
    assert "missing.length > 0 || integrityWarning" in android
    assert "setSourceError" in web


def test_followup_integrity_flag_tracks_review_jsonb_not_parent_case():
    source = read("services/api/app/api/routes/life_change_sources.py")
    assert "tuple[list[object], bool]" in source
    assert "return history.frozen_source_items(review.related_event_ids)" in source
    assert "ids, shape_valid = await _review_scope_ids(db, case, review_id)" in source
    assert "ids, shape_valid = original_ids, case_shape_valid" in source
    assert '"evidence_shape_valid": shape_valid' in source
