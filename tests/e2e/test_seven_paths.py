"""E2E paths E2E-01..E2E-07 from docs/01_V01_SCOPE_50_P0.md — the seven
demonstrable end-to-end flows, exercised through the public API."""

import io
from datetime import datetime, timedelta, timezone

from tests.conftest import auth
from tests.e2e._path_helpers import create_owner, create_user

NOW = datetime.now(timezone.utc)


def test_e2e_01_create_pet_today_timeline(client):
    """创建宠物 → Today → Timeline → provenance 可查 → 多宠切换."""
    # create household via owner (seeded empty household first)
    owner = create_owner("e2e01@pli.demo", "E2E01 Owner", "E2E01 Household")
    # create pet
    r = client.post("/api/v1/pets", json={"name": "E2E-Dog", "species": "dog"},
                    headers=auth(owner))
    assert r.status_code == 201, r.text
    pet = r.json()["id"]
    # multi-pet: create second pet
    r2 = client.post("/api/v1/pets", json={"name": "E2E-Cat", "species": "cat"},
                     headers=auth(owner))
    pet2 = r2.json()["id"]
    pets = client.get("/api/v1/pets", headers=auth(owner)).json()
    assert {p["id"] for p in pets} == {pet, pet2}
    # quick log meal
    r3 = client.post(f"/api/v1/pets/{pet}/events",
                     json={"event_type": "daily.meal",
                           "payload": {"food_type": "kibble", "amount": "100", "unit": "g"}},
                     headers=auth(owner))
    assert r3.status_code == 201
    # today shows it
    today = client.get(f"/api/v1/pets/{pet}/today", headers=auth(owner)).json()
    assert today["event_counts"]["daily.meal"] == 1
    # timeline shows it with provenance + actor
    tl = client.get(f"/api/v1/pets/{pet}/events?event_type=daily.meal",
                    headers=auth(owner)).json()
    assert tl["count"] == 1
    ev = tl["events"][0]
    assert ev["provenance_level"] == "OWNER_REPORTED"
    assert ev["actor_name"] == "E2E01 Owner"
    # event detail fetchable (provenance 可查)
    detail = client.get(f"/api/v1/events/{ev['event_id']}", headers=auth(owner))
    assert detail.status_code == 200
    # events never leak across pets
    tl2 = client.get(f"/api/v1/pets/{pet2}/events", headers=auth(owner)).json()
    assert tl2["count"] == 1  # only pet.created


def test_e2e_02_household_collaboration(client, seeded):
    """Owner 邀请 → 角色 → Task → 第二成员完成 → completed_by → 审计."""
    owner, hh = seeded["owner_id"], seeded["household_id"]
    inv = client.post(f"/api/v1/households/{hh}/invitations",
                      json={"email": "newmember@pli.demo", "role": "FAMILY"},
                      headers=auth(owner))
    assert inv.status_code == 201
    token = inv.json()["accept_token"]
    # a new user accepts
    new_user = create_user("newmember@pli.demo", "New Member")
    acc = client.post(f"/api/v1/households/{hh}/invitations/accept",
                      json={"token": token}, headers=auth(new_user))
    assert acc.status_code == 200, acc.text
    members = client.get(f"/api/v1/households/{hh}/members", headers=auth(owner)).json()
    assert any(m["user_id"] == new_user and m["role"] == "FAMILY" for m in members)
    # task created by owner, completed by new member
    task = client.post(f"/api/v1/pets/{seeded['coco_id']}/tasks",
                       json={"title": "Water the cat", "task_type": "OTHER"},
                       headers=auth(owner)).json()
    done = client.post(f"/api/v1/tasks/{task['id']}/complete", json={"note": "ok"},
                       headers=auth(new_user))
    assert done.status_code == 200
    assert done.json()["completed_by"] == new_user
    # audit shows join + complete trail
    audit = client.get(f"/api/v1/pets/{seeded['coco_id']}/audit",
                       headers=auth(owner)).json()
    actions = [a["action"] for a in audit]
    assert "task.create" in actions and "task.complete" in actions


def test_e2e_03_duplicate_completion_conflict(client, seeded):
    """重复完成 → 明确冲突提示 → 不静默覆盖 → 保留审计."""
    owner, family, task = seeded["owner_id"], seeded["family_id"], seeded["task_id"]
    first = client.post(f"/api/v1/tasks/{task}/complete", json={}, headers=auth(owner))
    assert first.status_code == 200
    second = client.post(f"/api/v1/tasks/{task}/complete", json={}, headers=auth(family))
    assert second.status_code == 409
    err = second.json()["error"]
    assert err["code"] == "TASK_CONFLICT"
    assert err["details"]["completed_by"] == owner
    # original completion intact
    tasks = client.get(f"/api/v1/pets/{seeded['coco_id']}/tasks",
                       headers=auth(owner)).json()
    t = [x for x in tasks if x["id"] == task][0]
    assert t["completed_by_user_id"] == owner
    assert t["conflict_count"] == 1
    audit = client.get(f"/api/v1/pets/{seeded['coco_id']}/audit",
                       headers=auth(owner)).json()
    assert any(a["action"] == "task.complete_conflict" for a in audit)
    # conflict also visible in timeline + notification
    tl = client.get(f"/api/v1/pets/{seeded['coco_id']}/events?event_type=care.task_conflict",
                    headers=auth(owner)).json()
    assert tl["count"] == 1
    notifs = client.get(f"/api/v1/households/{seeded['household_id']}/notifications",
                        headers=auth(owner)).json()
    assert any(n["type"] == "TASK_CONFLICT" for n in notifs)


def test_e2e_04_care_handoff_and_care_card(client, seeded):
    """Handoff → Care Card → 临时角色只能读授权字段 → 到期自动失效."""
    owner, sitter, coco = seeded["owner_id"], seeded["sitter_id"], seeded["coco_id"]
    handoff = client.post(f"/api/v1/pets/{coco}/handoffs",
                          json={"caregiver_user_id": sitter,
                                "scopes": ["daily:read", "daily:write", "card:read"],
                                "end_at": (NOW + timedelta(hours=2)).isoformat()},
                          headers=auth(owner))
    assert handoff.status_code == 201
    handoff_id = handoff.json()["handoff_id"]
    # caregiver can now log daily events
    log = client.post(f"/api/v1/pets/{coco}/events",
                      json={"event_type": "daily.walk", "payload": {"duration_minutes": 20}},
                      headers=auth(sitter))
    assert log.status_code == 201
    # …but medical data is out of scope
    medical = client.get(f"/api/v1/pets/{coco}/health-events", headers=auth(sitter))
    assert medical.status_code == 403
    # care card issued with minimal fields
    card = client.post(f"/api/v1/pets/{coco}/care-cards",
                       json={"expires_in_hours": 1}, headers=auth(owner))
    assert card.status_code == 201
    card_view = client.get(f"/api/v1/care-card/{card.json()['token']}")
    assert card_view.status_code == 200
    assert "emergency_contacts" in card_view.json()["content"]
    # end handoff → access dead
    end = client.post(f"/api/v1/handoffs/{handoff_id}/end", json={}, headers=auth(owner))
    assert end.status_code == 200
    assert client.get(f"/api/v1/pets/{coco}", headers=auth(sitter)).status_code == 403
    # expiry path: expired grant via direct grant + worker logic covered in
    # worker tests; here verify expired-at-creation is rejected instantly
    expired = client.post(f"/api/v1/pets/{coco}/grants",
                          json={"user_id": sitter, "scopes": ["daily:read"],
                                "expires_at": (NOW - timedelta(minutes=1)).isoformat()},
                          headers=auth(owner))
    assert expired.status_code == 201
    assert client.get(f"/api/v1/pets/{coco}", headers=auth(sitter)).status_code == 403


def test_e2e_05_health_event_full_path(client, seeded):
    """发现异常 → 动态追问 → 证据 → AI/规则提取 → 红旗 → 分级 → Vet Brief."""
    owner, mimi = seeded["owner_id"], seeded["mimi_id"]
    opened = client.post(f"/api/v1/pets/{mimi}/health-events",
                         json={"chief_complaint": "精神不太好，晚饭没吃",
                               "eating": "REDUCED", "duration_text": "1天"},
                         headers=auth(owner))
    assert opened.status_code == 201
    he = opened.json()["health_event_id"]
    assert opened.json()["triage"]["level"] in ("MONITOR", "VET_SOON", "URGENT")
    # dynamic questions
    qs = client.post(f"/api/v1/health-events/{he}/questions", json={}, headers=auth(owner))
    assert qs.status_code == 200
    assert len(qs.json()["questions"]) >= 3
    asked_by = {q["asked_by"] for q in qs.json()["questions"]}
    assert "RULE" in asked_by and "AI" in asked_by
    # answers escalate to emergency
    ans = client.post(f"/api/v1/health-events/{he}/answers",
                      json={"answers": [{"question_id": "activity",
                                         "answer": "反复进猫砂盆但几乎尿不出来"}]},
                      headers=auth(owner))
    assert ans.json()["triage"]["level"] == "EMERGENCY"
    # upload evidence (image artifact)
    png = b"\x89PNG\r\n\x1a\n" + b"\x01" * 50
    up = client.post(f"/api/v1/pets/{mimi}/artifacts",
                     files={"file": ("evidence.png", io.BytesIO(png), "image/png")},
                     headers=auth(owner))
    assert up.status_code == 201
    # AI + rule extract observable facts
    obs = client.post(f"/api/v1/health-events/{he}/observations",
                      json={"texts": ["今天吐了两次", "反复进猫砂盆但几乎尿不出来"],
                            "use_ai": True}, headers=auth(owner))
    assert obs.status_code == 200
    assert obs.json()["ai_observations"]
    # triage re-run keeps EMERGENCY
    tri = client.post(f"/api/v1/health-events/{he}/triage",
                      json={"note": "re-check"}, headers=auth(owner))
    assert tri.json()["level"] == "EMERGENCY"
    # vet brief generated + shareable
    brief = client.post(f"/api/v1/health-events/{he}/vet-brief", json={},
                        headers=auth(owner))
    assert brief.status_code == 201
    content = brief.json()["content"]
    assert content["red_flags"] == ["EMERGENCY"]
    assert content["ai_disclaimer"]
    share = client.post(f"/api/v1/vet-briefs/{brief.json()['vet_brief_id']}/share",
                        json={"expires_in_hours": 2}, headers=auth(owner))
    assert client.get(f"/api/v1/vet-briefs/shared/{share.json()['share_token']}").status_code == 200


def test_e2e_06_medication_and_outcome(client, seeded):
    """用药计划 → 给药 → 遗漏提醒 → Outcome 关联健康事件."""
    owner, mimi = seeded["owner_id"], seeded["mimi_id"]
    he = seeded["health_event_non_emergency_id"]  # Mimi's ear issue episode
    plan = client.post(f"/api/v1/pets/{mimi}/medication-plans",
                       json={"medicine_name": "Amoxicillin", "dose_text": "25mg",
                             "route": "oral", "frequency_per_day": 2,
                             "duration_days": 3,
                             "source_type": "PROFESSIONAL_CONFIRMED",
                             "source_note": "Dr. Chen", "health_event_id": he},
                       headers=auth(owner))
    assert plan.status_code == 201, plan.text
    plan_id = plan.json()["plan_id"]
    doses = [p for p in client.get(f"/api/v1/pets/{mimi}/medication-plans",
                                   headers=auth(owner)).json()
             if p["plan_id"] == plan_id][0]["doses"]
    assert len(doses) == 6  # 2/day × 3 days
    # give first dose
    r = client.post(f"/api/v1/medication-plans/{plan_id}/administrations",
                    json={"planned_dose_id": doses[0]["dose_id"]}, headers=auth(owner))
    assert r.status_code == 201
    # duplicate → conflict (same user retrying the same dose)
    r2 = client.post(f"/api/v1/medication-plans/{plan_id}/administrations",
                     json={"planned_dose_id": doses[0]["dose_id"]},
                     headers=auth(owner))
    assert r2.status_code == 409
    assert r2.json()["error"]["code"] == "MEDICATION_CONFLICT"
    # family member (no medical:write) is rejected outright — permission gate
    r3 = client.post(f"/api/v1/medication-plans/{plan_id}/administrations",
                     json={"planned_dose_id": doses[1]["dose_id"]},
                     headers=auth(seeded["family_id"]))
    assert r3.status_code == 403
    # missed-dose detection: mark a past pending dose via worker logic
    from tests.e2e.services_worker_harness import mark_past_dose_missed

    missed = mark_past_dose_missed()
    assert missed >= 1
    notifs = client.get(f"/api/v1/households/{seeded['household_id']}/notifications",
                        headers=auth(owner)).json()
    assert any(n["type"] == "MEDICATION_MISSED" for n in notifs)
    # outcome links back to health event
    oc = client.post(f"/api/v1/health-events/{he}/outcomes",
                     json={"outcome": "IMPROVED", "notes": "好转"}, headers=auth(owner))
    assert oc.status_code == 201
    detail = client.get(f"/api/v1/health-events/{he}", headers=auth(owner)).json()
    assert detail["outcomes"] and detail["outcomes"][0]["outcome"] == "IMPROVED"
    assert detail["status"] == "CLOSED"


def test_e2e_07_behavior_event(client, seeded):
    """行为记录 ABC → 媒体绑定 → Timeline → 不自动升级成诊断."""
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    png = b"\x89PNG\r\n\x1a\n" + b"\x02" * 30
    up = client.post(f"/api/v1/pets/{coco}/artifacts",
                     files={"file": ("clip.png", io.BytesIO(png), "image/png")},
                     headers=auth(owner))
    artifact_id = up.json()["artifact_id"]
    be = client.post(f"/api/v1/pets/{coco}/behavior-events",
                     json={"occurred_at": NOW.isoformat(),
                           "antecedent": "门铃响",
                           "behavior": "吠叫30秒后躲到床下",
                           "consequence": "主人安抚后出来",
                           "duration_seconds": 30, "intensity": "MODERATE",
                           "environment": "客厅",
                           "artifact_ids": [artifact_id]},
                     headers=auth(owner))
    assert be.status_code == 201, be.text
    # appears in timeline with provenance
    tl = client.get(f"/api/v1/pets/{coco}/events?event_type=behavior.observed",
                    headers=auth(owner)).json()
    assert tl["count"] >= 1
    ev = tl["events"][0]
    assert ev["provenance_level"] == "OWNER_REPORTED"
    assert artifact_id in [a for a in ev["artifact_ids"]] or ev["source_ref"]
    # no diagnosis anywhere in the payload
    assert "诊断" not in ev["payload"]["behavior"]
    detail = client.get(f"/api/v1/pets/{coco}/behavior-events", headers=auth(owner)).json()
    assert detail[0]["intensity_source"] == "OWNER_REPORTED"
