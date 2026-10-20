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
