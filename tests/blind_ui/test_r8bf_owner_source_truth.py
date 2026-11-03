"""R8BF source validity and strict UUID identity, beyond a boolean badge."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_case_source_status_uses_factual_reason_not_fabricated_owner_actions():
    api = read("services/api/app/api/routes/life_change_sources.py")
    ui = read("apps/mobile/src/components/life/CaseSourceList.tsx")
    contract = read("apps/mobile/src/components/life/caseHistoryApi.ts")
    for reason in ("VALID", "RETRACTED", "SUPERSEDED", "WRONG_METRIC", "NON_FACT_SOURCE"):
        assert f'"{reason}"' in api
        assert reason in ui
        assert reason in contract
    assert 'payload["validity_reason"] = reason' in api
    assert "sourceTruthLabel(source)" in ui
    assert "来源已撤回或修正" not in ui
    assert "来源有效性待核实" in ui


def test_android_source_allowlist_matches_strict_casefolded_uuid_contract():
    api = read("services/api/app/api/routes/life_change_sources.py")
    ui = read("apps/mobile/src/components/life/CaseSourceList.tsx")
    evidence = read("apps/mobile/src/components/life/ownerEvidence.ts")
    assert "normalized_roles.get(event.id)" in api
    assert "canonicalCaseSourceId(item.event_id)" in ui
    assert "id === null || !allowed.has(id)" in ui
    assert "canonicalCaseSourceId(key) !== canonical" in evidence
    assert "CASE_SOURCE_UUID.test(raw)" in evidence
    assert "SOURCE_NOT_IN_FROZEN_CASE" in ui


def test_three_owner_clients_show_the_same_reason_without_erasing_original_values():
    android = read("apps/mobile/src/components/life/CaseSourceList.tsx")
    web = read("apps/web/app/pets/[id]/history/[caseId]/page.tsx")
    mini = read("apps/mini/src/pages/observations/detail/index.tsx")
    for client in (android, web, mini):
        assert "sourceTruthLabel(source)" in client
        assert "WRONG_METRIC" in client and "NON_FACT_SOURCE" in client
        assert "来源已撤回或修正" not in client
        assert "来源有效性待核实" in client
    assert "if (!source.valid) return" not in web
    assert "if (!source.valid) return" not in mini
    assert "按 1 条进食记录计数，不代表食物摄入量" in web
    assert "按 1 条进食记录计数，不代表食物摄入量" in mini
