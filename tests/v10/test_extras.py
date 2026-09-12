"""v1.0 extras tests (PLI-065/066/076/077/078/089/090/096/098/101/105/
114/115/117/119/122/210)."""

from datetime import datetime, timezone

from tests.conftest import auth

NOW = datetime.now(timezone.utc)


def test_chronic_view_deterministic(client, seeded):
    owner, mimi = seeded["owner_id"], seeded["mimi_id"]
    r = client.get(f"/api/v1/pets/{mimi}/health-events/chronic", headers=auth(owner))
    assert r.status_code == 200
    assert "确定性规则" in r.json()["rule"]


def test_senior_baseline_gate(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.post(f"/api/v1/pets/{coco}/baseline/recompute-senior",
                    json={}, headers=auth(owner))
    assert r.status_code == 201
    body = r.json()
    # Coco born 2022 → not senior → stays on 14-day window
    assert body["senior"] is False and body["window_days"] == 14


def test_behavior_classification_keywords(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    client.post(f"/api/v1/pets/{coco}/behavior-events",
                json={"occurred_at": NOW.isoformat(), "behavior": "低吼并呲牙",
                      "antecedent": "陌生人靠近"},
                headers=auth(owner))
    r = client.get(f"/api/v1/pets/{coco}/behavior/categories", headers=auth(owner))
    assert r.json()["counts"]["AGGRESSION_RISK"] >= 1
    assert "不构成行为诊断" in r.json()["notice"]


def test_alone_profile(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.get(f"/api/v1/pets/{coco}/behavior/alone-profile", headers=auth(owner))
    assert r.status_code == 200
    assert "不推断" in r.json()["notice"]


def test_generalization_and_next_step(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    g = client.post(f"/api/v1/pets/{coco}/training-goals",
                    json={"title": "唤回"}, headers=auth(owner)).json()
    for focus, resp in (("客厅", "GOOD"), ("公园", "POOR")):
        client.post(f"/api/v1/pets/{coco}/training-sessions",
                    json={"goal_id": g["goal_id"], "duration_minutes": 5,
                          "focus": focus, "pet_response": resp},
                    headers=auth(owner))
    gm = client.get(f"/api/v1/pets/{coco}/training/generalization",
                    headers=auth(owner)).json()
    assert "客厅" in gm["matrix"] and "公园" in gm["matrix"]
    ns = client.get(f"/api/v1/training-goals/{g['goal_id']}/next-step",
                    headers=auth(owner)).json()
    assert ns["suggestion"]
    assert "mastery_level" in ns


def test_health_constraint_caps_sessions(client, seeded):
    """PLI-096: active medication → conservative training cap."""
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    g = client.post(f"/api/v1/pets/{coco}/training-goals",
                    json={"title": "sit"}, headers=auth(owner)).json()
    ns = client.get(f"/api/v1/training-goals/{g['goal_id']}/next-step",
                    headers=auth(owner)).json()
    # seeded Coco has an ACTIVE Doxycycline plan
    assert ns["health_constraint"] is not None
    assert ns["health_constraint"]["capped_minutes"] == 15


def test_achievement_requires_mastery_5(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    g = client.post(f"/api/v1/pets/{coco}/training-goals",
                    json={"title": "shake"}, headers=auth(owner)).json()
    ach = client.get(f"/api/v1/training-goals/{g['goal_id']}/achievement",
                     headers=auth(owner)).json()
    assert ach["achieved"] is False
    assert ach["certificate"]["issued_at"] is None


def test_enrichment_plan_from_library(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.get(f"/api/v1/pets/{coco}/enrichment-plan", headers=auth(owner))
    assert r.status_code == 200
    assert len(r.json()["plan"]) == 3


def test_low_stimulus_hint_rule(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.get(f"/api/v1/pets/{coco}/low-stimulus-hint", headers=auth(owner))
    body = r.json()
    assert body["hint"] == (body["severe_events_last_7d"] >= 2)


def test_social_records_endpoints(client, seeded):
    owner, mimi = seeded["owner_id"], seeded["mimi_id"]
    for path in ("social/feedback-pairs", "social/co-occurrence", "social/baseline",
                 "familiar-people"):
        r = client.get(f"/api/v1/pets/{mimi}/{path}", headers=auth(owner))
        assert r.status_code == 200, path
    co = client.get(f"/api/v1/pets/{mimi}/social/co-occurrence", headers=auth(owner)).json()
    assert "不做科学兼容度评分" in co["notice"]


def test_social_visibility_levels(client, seeded):
    owner, mimi = seeded["owner_id"], seeded["mimi_id"]
    ok = client.put(f"/api/v1/pets/{mimi}/social-visibility",
                    json={"level": "FRIENDS"}, headers=auth(owner))
    assert ok.status_code == 200
    bad = client.put(f"/api/v1/pets/{mimi}/social-visibility",
                     json={"level": "PUBLIC"}, headers=auth(owner))
    assert bad.status_code == 422  # no public visibility in v1.0


def test_communication_style(client, seeded):
    owner = seeded["owner_id"]
    ok = client.put("/api/v1/users/me/communication-style",
                    json={"style": "SIMPLE"}, headers=auth(owner))
    assert ok.status_code == 200
    bad = client.put("/api/v1/users/me/communication-style",
                     json={"style": "LOUD"}, headers=auth(owner))
    assert bad.status_code == 422
