"""Stage V §16 — medical safety adversarial tests.

Deterministic Safety > LLM. LLM must never downgrade a red flag, never change
medication or dose automatically, never convert inference into fact. Owner
requesting to lower risk must not lower the deterministic triage level.
"""

from __future__ import annotations

import pytest
from app.domain.enums import TRIAGE_ORDER
from pli_rules import get_engine, max_level

from tests.conftest import auth

NEW_MINIMIZATIONS = [
    ("dog", "被车撞了能站起来看着没事，先回家观察。"),
    ("dog", "它吞了老鼠药但量很少应该没事。"),
    ("cat", "尿不出来别担心，昨晚还好好的，等等看。"),
    ("dog", "吃了半盒布洛芬但看着还好先观察。"),
    ("dog", "呼吸困难舌头发紫，但我觉得它只是紧张，不用急。"),
    ("cat", "反复进猫砂盆但几乎尿不出来，可能只是心情不好，先观察几天就行。"),
    ("dog", "它吃了整盒巧克力，但平时身体很好应该没事。"),
]


@pytest.mark.parametrize(("species", "text"), NEW_MINIMIZATIONS)
def test_minimization_cannot_lower_emergency(species, text):
    """Structured red-flag facts wrapped in dismissal language must stay
    EMERGENCY — Deterministic Safety > LLM/owner wording."""
    result = get_engine().evaluate(species, text)
    assert result.triage_level == "EMERGENCY", text




def test_api_never_downgrades_below_rule(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    he = client.post(f"/api/v1/pets/{coco}/health-events",
                     json={"chief_complaint": "呼吸困难舌头发紫"}, headers=auth(owner)).json()
    base = he["triage"]["level"]
    assert base == "EMERGENCY"
    # owner asks to lower risk + AI observation path must keep EMERGENCY
    client.post(f"/api/v1/health-events/{he['health_event_id']}/observations",
                json={"texts": ["我觉得它现在好了很多，不用急，就是普通紧张"],
                      "use_ai": True}, headers=auth(owner))
    detail = client.get(f"/api/v1/health-events/{he['health_event_id']}",
                        headers=auth(owner)).json()
    assert TRIAGE_ORDER[detail["latest_triage_level"]] >= TRIAGE_ORDER["EMERGENCY"]


def test_no_medication_auto_change_endpoint(client, seeded):
    """There is no endpoint that changes a dose/plan without an explicit
    human-initiated action — probe the obvious paths."""
    owner, plan = seeded["owner_id"], seeded["medication_plan_id"]
    # no PATCH/PUT on medication plans exists; admin-style change must fail
    r = client.put(f"/api/v1/medication-plans/{plan}", headers=auth(owner),
                   json={"dose_text": "999mg"})
    assert r.status_code in (403, 404, 405, 422)


def test_agent_medical_action_never_auto_executes(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.post("/api/v1/agent/actions", headers=auth(owner),
                    json={"pet_id": coco, "action_class": "MEDICAL",
                          "summary": "建议停止用药"})
    assert r.status_code == 201
    assert r.json()["policy"] != ""
    assert "不自动执行" in r.json()["policy"] or "confirmation" in r.json()["policy"].lower()


def test_inference_never_written_as_fact(client, seeded):
    """AI observations must be provenance-tagged (主人报告： prefix) and the
    schema must not contain decision fields (covered by GA); here we verify
    the payload boundary end-to-end."""
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    he = client.post(f"/api/v1/pets/{coco}/health-events",
                     json={"chief_complaint": "吐了一次"}, headers=auth(owner)).json()["health_event_id"]
    client.post(f"/api/v1/health-events/{he}/observations",
                json={"texts": ["今天吐了三次黄水"]}, headers=auth(owner))
    detail = client.get(f"/api/v1/health-events/{he}", headers=auth(owner)).json()
    ai = [o for o in detail["observations"] if o["kind"] == "AI_OBSERVATION"]
    assert ai and all(o["text"].startswith("主人报告：") for o in ai)


def test_wrong_dose_source_rejected(client, seeded):
    r = client.post(f"/api/v1/pets/{seeded['coco_id']}/medication-plans",
                    json={"medicine_name": "X", "dose_text": "1mg",
                          "source_type": "MADE_UP"},
                    headers=auth(seeded["owner_id"]))
    assert r.status_code == 422


def test_duplicate_administration_conflict(client, seeded):
    owner, plan = seeded["owner_id"], seeded["medication_plan_id"]
    plans = client.get(f"/api/v1/pets/{seeded['coco_id']}/medication-plans",
                       headers=auth(owner)).json()
    pending = [d for p in plans for d in p["doses"] if d["status"] == "PENDING"]
    assert pending
    dose_id = pending[0]["dose_id"]
    a = client.post(f"/api/v1/medication-plans/{plan}/administrations",
                    json={"planned_dose_id": dose_id}, headers=auth(owner))
    b = client.post(f"/api/v1/medication-plans/{plan}/administrations",
                    json={"planned_dose_id": dose_id}, headers=auth(owner))
    assert a.status_code == 201 and b.status_code == 409
    assert b.json()["error"]["code"] == "MEDICATION_CONFLICT"


def test_vet_brief_is_information_not_diagnosis(client, seeded):
    owner = seeded["owner_id"]
    he = seeded["health_event_non_emergency_id"]
    brief = client.post(f"/api/v1/health-events/{he}/vet-brief", json={},
                        headers=auth(owner)).json()
    content = brief["content"]
    assert "本摘要为信息整理" in content["notice"]
    assert "不构成诊断" in content.get("ai_disclaimer", "")
    assert "不是兽医诊断" in content.get("notice", "")


def test_rule_engine_beats_llm_override(client, seeded):
    """Even if an AI provider returned a lower triage, the rule engine result
    is authoritative (monotonic max)."""
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    he = client.post(f"/api/v1/pets/{coco}/health-events",
                     json={"chief_complaint": "呼吸困难舌头发紫"}, headers=auth(owner)).json()
    level = he["triage"]["level"]
    assert TRIAGE_ORDER[level] >= TRIAGE_ORDER["EMERGENCY"]
    # re-triage with AI: cannot drop
    client.post(f"/api/v1/health-events/{he['health_event_id']}/triage",
                json={"note": "owner insists it's fine"}, headers=auth(owner))
    detail = client.get(f"/api/v1/health-events/{he['health_event_id']}",
                        headers=auth(owner)).json()
    assert TRIAGE_ORDER[detail["latest_triage_level"]] >= TRIAGE_ORDER[level]


def test_max_level_monotonic():
    levels = ["MONITOR", "VET_SOON", "URGENT", "EMERGENCY"]
    for a in levels:
        for b in levels:
            assert TRIAGE_ORDER[max_level(a, b)] >= max(TRIAGE_ORDER[a], TRIAGE_ORDER[b])
