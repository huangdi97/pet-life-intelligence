"""v0.2 tests — social/nutrition/finance/timeline/search/platform
(PLI-111..113/163/175/187/188/190/197/198/199/200/205/223/225/228) +
v0.2 AI evals (evidence-cited QA, no-invention, advice filter)."""

import uuid
from datetime import datetime, timezone

from tests.conftest import auth

NOW = datetime.now(timezone.utc)


def _png():
    return b"\x89PNG\r\n\x1a\n" + b"\x03" * 30


def test_social_double_consent_and_block(client, seeded):
    """v0.2 Gate: social privacy — friend needs consent of both households;
    block stops interactions; report recorded."""
    owner, mimi = seeded["owner_id"], seeded["mimi_id"]
    # create a second pet in the same household as the "friend"
    other = client.post("/api/v1/pets",
                        json={"name": "Buddy", "species": "dog"}, headers=auth(owner)).json()
    req = client.post(f"/api/v1/pets/{mimi}/friends",
                      json={"friend_pet_id": other["id"]}, headers=auth(owner))
    assert req.status_code == 201
    request_id = req.json()["request_id"]
    # interactions rejected before acceptance
    inter = client.post(f"/api/v1/pets/{mimi}/social-interactions",
                        json={"friend_pet_id": other["id"], "quality": "GOOD"},
                        headers=auth(owner))
    assert inter.status_code == 403
    # accept (the other side — same owner in demo household, but permission path exercised)
    resp = client.post(f"/api/v1/pet-friends/{request_id}/respond",
                       json={"accept": True}, headers=auth(owner))
    assert resp.json()["status"] == "ACTIVE"
    # interaction now allowed
    inter2 = client.post(f"/api/v1/pets/{mimi}/social-interactions",
                         json={"friend_pet_id": other["id"], "quality": "GOOD",
                               "duration_minutes": 30},
                         headers=auth(owner))
    assert inter2.status_code == 201
    # block → further interactions denied + report stored
    blk = client.post(f"/api/v1/pets/{mimi}/friends/{other['id']}/block",
                      json={"action": "BLOCK", "reason": "多次冲突"},
                      headers=auth(owner))
    assert blk.status_code == 201
    inter3 = client.post(f"/api/v1/pets/{mimi}/social-interactions",
                         json={"friend_pet_id": other["id"], "quality": "GOOD"},
                         headers=auth(owner))
    assert inter3.status_code == 403
    friends = client.get(f"/api/v1/pets/{mimi}/friends", headers=auth(owner)).json()
    assert friends[0]["status"] == "BLOCKED"


def test_social_profile_no_science_claims(client, seeded):
    owner, mimi = seeded["owner_id"], seeded["mimi_id"]
    r = client.put(f"/api/v1/pets/{mimi}/social-profile",
                   json={"good_with_dogs": "CAUTION", "notes": "对大型犬警惕"},
                   headers=auth(owner))
    assert r.status_code == 200
    assert "非行为评估" in r.json()["note"]


def test_diet_profile(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.put(f"/api/v1/pets/{coco}/diet-profile",
                   json={"current_food": "鸡肉配方狗粮", "allergies": ["牛肉"],
                         "feeding_rules": "每日2次各120g", "vet_advised": True,
                         "source_type": "PROFESSIONAL_CONFIRMED"},
                   headers=auth(owner))
    assert r.status_code == 200
    got = client.get(f"/api/v1/pets/{coco}/diet-profile", headers=auth(owner)).json()
    assert got["profile"]["allergies"] == ["牛肉"]


def test_expense_ledger_amounts_as_strings(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.post(f"/api/v1/pets/{coco}/expenses",
                    json={"category": "MEDICAL", "amount": "358.50",
                          "note": "耳道检查"}, headers=auth(owner))
    assert r.status_code == 201, r.text
    bad = client.post(f"/api/v1/pets/{coco}/expenses",
                      json={"category": "MEDICAL", "amount": "abc"},
                      headers=auth(owner))
    assert bad.status_code == 422
    lst = client.get(f"/api/v1/pets/{coco}/expenses", headers=auth(owner)).json()
    assert lst[0]["amount"] == "358.50"


def test_milestones_and_memories(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    last_year = NOW.replace(year=NOW.year - 1) if NOW.year > 1 else NOW
    r = client.post(f"/api/v1/pets/{coco}/milestones",
                    json={"title": "学会握手", "kind": "TRAINING",
                          "occurred_at": last_year.isoformat()},
                    headers=auth(owner))
    assert r.status_code == 201
    lst = client.get(f"/api/v1/pets/{coco}/milestones", headers=auth(owner)).json()
    assert any(m["title"] == "学会握手" for m in lst)
    mem = client.get(f"/api/v1/pets/{coco}/memories", headers=auth(owner)).json()
    assert isinstance(mem, list)


def test_search_returns_only_real_events_with_citations(client, seeded):
    """v0.2 Gate: Pet Search 有证据引用，无凭空生成。"""
    owner, mimi = seeded["owner_id"], seeded["mimi_id"]
    r = client.get(f"/api/v1/pets/{mimi}/search?q=猫砂盆", headers=auth(owner))
    assert r.status_code == 200
    hits = r.json()["hits"]
    assert hits, "seeded emergency event mentions 猫砂盆"
    assert all(uuid.UUID(h["event_id"]) for h in hits)
    # no-match query returns empty — not invented content
    r2 = client.get(f"/api/v1/pets/{mimi}/search?q=量子力学", headers=auth(owner))
    assert r2.json()["hits"] == []
    # domain filter (PLI-198 cross-domain scoping)
    r3 = client.get(f"/api/v1/pets/{mimi}/search?q=猫砂盆&domain=daily",
                    headers=auth(owner))
    assert r3.json()["hits"] == []


def test_personal_qa_cites_evidence_or_refuses(client, seeded):
    """v0.2 Gate: PLI-197 — answers must cite evidence; else refuse."""
    owner, mimi = seeded["owner_id"], seeded["mimi_id"]
    r = client.post(f"/api/v1/pets/{mimi}/ask",
                    json={"question": "最近猫砂盆使用有什么异常？"}, headers=auth(owner))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["sufficient"] is True
    assert body["citations"], "must cite events"
    # citations point to real events
    ev = client.get(f"/api/v1/events/{body['citations'][0]}", headers=auth(owner))
    assert ev.status_code == 200
    # unrelated question → refuses instead of hallucinating
    r2 = client.post(f"/api/v1/pets/{mimi}/ask",
                     json={"question": " 它最喜欢的股票是什么？"}, headers=auth(owner))
    body2 = r2.json()
    assert body2["sufficient"] is False
    assert body2["citations"] == []
    assert "没有找到" in body2["answer"]


def test_why_happened_correlation_not_causation(client, seeded):
    owner, mimi = seeded["owner_id"], seeded["mimi_id"]
    tl = client.get(f"/api/v1/pets/{mimi}/events?limit=10", headers=auth(owner)).json()
    anchor = tl["events"][0]["event_id"]
    r = client.get(f"/api/v1/pets/{mimi}/why?after_event_id={anchor}",
                   headers=auth(owner))
    assert r.status_code == 200
    assert "不是因果" in r.json()["notice"]


def test_low_risk_task_plan_boundary(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.post(f"/api/v1/pets/{coco}/task-plan", json={}, headers=auth(owner))
    assert r.status_code == 200
    assert "不包含医疗动作" in r.json()["boundary"]


def test_structured_memory_with_sources(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    client.post(f"/api/v1/pets/{coco}/preferences",
                json={"kind": "REWARD", "subject": "冻干"}, headers=auth(owner))
    r = client.get(f"/api/v1/pets/{coco}/memory", headers=auth(owner))
    memory = r.json()["memory"]
    assert memory["preferences"] and memory["preferences"][0]["source"]
    assert memory["active_medications"], "seeded Doxycycline plan is ACTIVE"


def test_analytics_counters_no_raw_payload(client, seeded):
    r = client.post("/api/v1/analytics/counter",
                    json={"metric": "quick_log.meal"}, headers=auth(seeded["owner_id"]))
    assert r.status_code == 201
    assert r.json()["count"] == 1
    assert "不存原始 payload" in r.json()["note"]


def test_ops_status_and_incidents(client, seeded):
    from tests.conftest import create_internal_operator

    op = create_internal_operator()
    # regular owner must not reach ops endpoints (Stage V admin boundary)
    owner = seeded["owner_id"]
    assert client.get("/api/v1/ops/status", headers=auth(owner)).status_code == 403
    status = client.get("/api/v1/ops/status", headers=auth(op))
    assert status.status_code == 200
    body = status.json()
    assert body["counts"]["pets"] >= 2
    assert body["rule_engine"]
    inc = client.post("/api/v1/ops/incidents",
                      json={"severity": "WARN", "title": "Redis 延迟升高",
                            "detail": "p99 > 50ms"},
                      headers=auth(op))
    assert inc.status_code == 201
    lst = client.get("/api/v1/ops/incidents", headers=auth(op)).json()
    assert any(i["title"] == "Redis 延迟升高" for i in lst)


# --- v0.2 AI evals: evidence-grounded QA + advice filter --------------------------


def test_ai_answer_never_invents_ids():
    from pli_ai_gateway import Gateway

    g = Gateway()
    evidence = [{"id": "ev-1", "text": "2026-09-13 daily.meal amount:120"}]
    r = g.invoke("answer_with_evidence",
                 {"question": "今天吃了多少？", "evidence": evidence})
    for c in r.result["citations"]:
        assert c in {e["id"] for e in evidence}, "citation not in provided evidence"


def test_ai_answer_refuses_without_match():
    from pli_ai_gateway import Gateway

    g = Gateway()
    r = g.invoke("answer_with_evidence",
                 {"question": "疫苗接种历史？", "evidence": []})
    assert r.result["sufficient"] is False
    assert r.result["citations"] == []


def test_ai_advice_filter_records_reasons():
    from pli_ai_gateway import Gateway

    g = Gateway()
    r = g.invoke("behavior_advice", {"advice_candidates": [
        "用 alpha roll 压制它", "奖励式引导",
    ]})
    assert any("alpha" in x for x in r.result["filtered_reasons"])
    assert "奖励式引导" in r.result["advice"]
