"""v1.0 tests — Stage C (adapters, devices, identity extras, agent policy,
services record layer, commerce constraints, finance records, platform)."""

from datetime import datetime, timedelta, timezone

from tests.conftest import auth

NOW = datetime.now(timezone.utc)


def test_feature_flags_gate_webhook(client, seeded):
    owner = seeded["owner_id"]
    # webhook is flag-gated: off by default
    r = client.post("/api/v1/adapters/device-webhook/fake",
                    json={"provider": "fake", "device_key": "dev-1",
                          "provider_event_id": "w1", "event_kind": "ACTIVITY",
                          "occurred_at": NOW.isoformat(), "payload": {"minutes": 10}},
                    headers=auth(owner))
    assert r.status_code == 403
    # enable flag → still 404 (no linked device) proving the gate passes
    client.post("/api/v1/ops/feature-flags",
                json={"key": "device.fake", "enabled": True, "note": "test"},
                headers=auth(owner))
    r2 = client.post("/api/v1/adapters/device-webhook/fake",
                     json={"provider": "fake", "device_key": "dev-1",
                           "provider_event_id": "w1", "event_kind": "ACTIVITY",
                           "occurred_at": NOW.isoformat(), "payload": {"minutes": 10}},
                     headers=auth(owner))
    assert r2.status_code == 404  # gate passed; device unknown


def test_device_link_sync_dedupe_quality(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    link = client.post(f"/api/v1/pets/{coco}/devices",
                       json={"provider": "fake", "device_key": "dev-coco",
                             "display_name": "Sandbox Collar"},
                       headers=auth(owner))
    assert link.status_code == 201, link.text
    device_id = link.json()["device_id"]
    s1 = client.post(f"/api/v1/pets/{coco}/devices/{device_id}/sync",
                     json={}, headers=auth(owner))
    assert s1.status_code == 201
    assert s1.json()["ingested"] == 3
    # second sync → all duplicates → 0 ingested (dedupe across syncs)
    s2 = client.post(f"/api/v1/pets/{coco}/devices/{device_id}/sync",
                     json={}, headers=auth(owner))
    assert s2.json()["ingested"] == 0
    events = client.get(f"/api/v1/pets/{coco}/device-events",
                        headers=auth(owner)).json()
    assert all(e["quality_status"] == "OK" for e in events)
    assert all(e["payload"].get("sandbox") is True for e in events)


def test_real_vendor_device_blocked(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.post(f"/api/v1/pets/{coco}/devices",
                    json={"provider": "petkit", "device_key": "x"},
                    headers=auth(owner))
    assert r.status_code in (400, 403, 422, 500)
    assert r.status_code != 201


def test_home_summary_and_review_queue(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    summary = client.get(f"/api/v1/pets/{coco}/home-summary", headers=auth(owner))
    assert summary.status_code == 200
    rq = client.get(f"/api/v1/pets/{coco}/device-events/review-queue",
                    headers=auth(owner))
    assert rq.status_code == 200


def test_automation_rules_require_confirmation(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r1 = client.post(f"/api/v1/pets/{coco}/automation-rules",
                     json={"name": "长时间未活动提醒",
                           "condition": {"event_kind": "ACTIVITY", "op": "lt", "threshold": 5},
                           "action": "NOTIFY"},
                     headers=auth(owner))
    assert r1.json()["requires_confirmation"] is False
    r2 = client.post(f"/api/v1/pets/{coco}/automation-rules",
                     json={"name": "自动开门喂食", "condition": {"x": 1},
                           "action": "OPEN_DOOR"},
                     headers=auth(owner))
    assert r2.json()["requires_confirmation"] is True  # high-risk never auto


def test_transfer_request_never_auto_executes(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.post(f"/api/v1/pets/{coco}/transfer-requests",
                    json={"to_user_email": "newowner@example.com",
                          "reason": "搬家"},
                    headers=auth(owner))
    assert r.status_code == 201
    assert r.json()["status"] == "PENDING"
    # ownership unchanged
    pets = client.get("/api/v1/pets", headers=auth(owner)).json()
    assert any(p["id"] == coco for p in pets)


def test_merge_request_pending_only(client, seeded):
    owner = seeded["owner_id"]
    a = seeded["coco_id"]
    b = client.post("/api/v1/pets", json={"name": "Coco2", "species": "dog"},
                    headers=auth(owner)).json()["id"]
    r = client.post("/api/v1/pets/merge-requests",
                    json={"pet_id_a": a, "pet_id_b": b,
                          "evidence": {"same_chip": True}},
                    headers=auth(owner))
    assert r.status_code == 201
    assert r.json()["status"] == "PENDING"
    r2 = client.post("/api/v1/pets/merge-requests",
                     json={"pet_id_a": a, "pet_id_b": a}, headers=auth(owner))
    assert r2.status_code == 422


def test_export_bundle_owner_only_with_evidence(client, seeded):
    owner, family, coco = seeded["owner_id"], seeded["family_id"], seeded["coco_id"]
    r = client.get(f"/api/v1/pets/{coco}/export", headers=auth(owner))
    assert r.status_code == 200
    bundle = r.json()
    assert bundle["export_version"] == "1.0"
    assert bundle["life_events"], "export includes canonical events with provenance"
    assert all("provenance_level" in e for e in bundle["life_events"])
    # family member (non-owner) denied
    r2 = client.get(f"/api/v1/pets/{coco}/export", headers=auth(family))
    assert r2.status_code == 403


def test_field_privacy_validation(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    ok = client.put(f"/api/v1/pets/{coco}/field-privacy",
                    json={"hidden_fields": ["weight_note"]}, headers=auth(owner))
    assert ok.status_code == 200
    bad = client.put(f"/api/v1/pets/{coco}/field-privacy",
                     json={"hidden_fields": ["name"]}, headers=auth(owner))
    assert bad.status_code == 422  # identity fields not maskable


def test_professional_links_and_signature_policy(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.post(f"/api/v1/pets/{coco}/professionals",
                    json={"profession": "VET", "display_name": "Dr. Wang",
                          "credential_note": "执照 #12345"},
                    headers=auth(owner))
    assert r.status_code == 201
    lst = client.get(f"/api/v1/pets/{coco}/professionals", headers=auth(owner)).json()
    assert lst[0]["profession"] == "VET"
    policy = client.get("/api/v1/health-records/signature-policy").json()
    assert "signature_fields" in policy


def test_overdue_task_escalation(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    past = (NOW - timedelta(days=1)).isoformat()
    client.post(f"/api/v1/pets/{coco}/tasks",
                json={"title": "逾期任务", "task_type": "OTHER", "due_at": past},
                headers=auth(owner))
    r = client.get(f"/api/v1/pets/{coco}/overdue-tasks", headers=auth(owner))
    assert r.status_code == 200
    assert any(t["title"] == "逾期任务" for t in r.json())


def test_welfare_observations_no_pseudo_emotion(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.post(f"/api/v1/pets/{coco}/welfare-observations",
                    json={"kind": "CHOICE", "data": {"offered": ["玩具A", "玩具B"],
                                                    "chose": "玩具B"}},
                    headers=auth(owner))
    assert r.status_code == 201
    ev = client.get(f"/api/v1/pets/{coco}/welfare-evidence", headers=auth(owner)).json()
    assert ev["observation_counts"]["CHOICE"] == 1
    assert "不是情绪/福利真相断言" in ev["notice"]


def test_behavior_intervention_reward_based(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.post(f"/api/v1/pets/{coco}/behavior-interventions",
                    json={"title": "门铃脱敏计划",
                          "steps": ["低音量+奖励", "渐强"]},
                    headers=auth(owner))
    assert r.status_code == 201
    plan_id = r.json()["plan_id"]
    assert r.json()["approach"] == "REWARD_BASED"
    oc = client.post(f"/api/v1/behavior-interventions/{plan_id}/outcomes",
                     json={"result": "IMPROVED", "notes": "吠叫减少"},
                     headers=auth(owner))
    assert oc.status_code == 201
    assert oc.json()["outcomes"][0]["result"] == "IMPROVED"


def test_service_request_record_layer_no_payment(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.post(f"/api/v1/pets/{coco}/service-requests",
                    json={"service_kind": "WALKING",
                          "needs_profile": {"days": ["周一", "周三"]}},
                    headers=auth(owner))
    assert r.status_code == 201
    assert "EXTERNAL_BLOCKED" in r.json()["boundary"]
    rid = r.json()["request_id"]
    u = client.post(f"/api/v1/service-requests/{rid}/updates",
                    json={"status": "BOOKED", "note": "人工确认的服务者"},
                    headers=auth(owner))
    assert u.json()["status"] == "BOOKED"


def test_product_filter_subtractive_not_recommendation(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    client.put(f"/api/v1/pets/{coco}/diet-profile",
               json={"allergies": ["chicken"], "source_type": "OWNER_REPORTED"},
               headers=auth(owner))
    r = client.get(f"/api/v1/pets/{coco}/products/filtered", headers=auth(owner))
    skus = [p["sku"] for p in r.json()["allowed"]]
    assert "f-chicken-2kg" not in skus
    assert "约束过滤" in r.json()["disclaimer"]


def test_finance_records_no_payment(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    e = client.post(f"/api/v1/pets/{coco}/expenses",
                    json={"category": "MEDICAL", "amount": "200"},
                    headers=auth(owner)).json()
    sp = client.post(f"/api/v1/expenses/{e['expense_id']}/splits",
                     json={"splits": [{"user_id": owner, "share": "100"}]},
                     headers=auth(owner))
    assert sp.status_code == 201
    pol = client.post(f"/api/v1/pets/{coco}/insurance-policies",
                      json={"policy_no": "PLI-2026-001", "insurer_note": "记录层"},
                      headers=auth(owner))
    assert pol.status_code == 201
    assert "EXTERNAL_BLOCKED" in pol.json()["note"]
    summary = client.get(f"/api/v1/pets/{coco}/finance/summary", headers=auth(owner))
    assert summary.status_code == 200
    assert summary.json()["sums_by_category"].get("MEDICAL") == 200.0


def test_agent_policy_refuses_booking_purchase_medical(client, seeded):
    """Stage C gate: Agent action policy tests."""
    owner = seeded["owner_id"]
    for action_class, expected in (("INFO", "ALLOWED"), ("BOOKING", "REFUSED"),
                                   ("PURCHASE", "REFUSED"), ("MEDICAL", "REFUSED")):
        r = client.post("/api/v1/agent/actions",
                        json={"action_class": action_class,
                              "proposal": {"detail": f"{action_class} proposal"},
                              "pet_id": seeded["coco_id"]},
                        headers=auth(owner))
        assert r.status_code == 201
        assert r.json()["policy_result"] == expected
        assert r.json()["executed"] is False
    log = client.get("/api/v1/agent/actions", headers=auth(owner)).json()
    assert len(log) >= 4


def test_identity_normalization_candidates(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    client.post(f"/api/v1/pets/{coco}/identifiers",
                json={"identifier_type": "CHIP", "value": "981020009999999"},
                headers=auth(owner))
    # another pet with same chip
    twin = client.post("/api/v1/pets", json={"name": "CocoTwin", "species": "dog"},
                       headers=auth(owner)).json()["id"]
    client.post(f"/api/v1/pets/{twin}/identifiers",
                json={"identifier_type": "CHIP", "value": "981020009999999"},
                headers=auth(owner))
    r = client.get(f"/api/v1/pets/{coco}/identity-links", headers=auth(owner))
    assert any(c["pet_id"] == twin for c in r.json())


def test_experiment_assignment_deterministic(client, seeded):
    owner = seeded["owner_id"]
    r1 = client.post("/api/v1/experiments/search_ranking/assign", headers=auth(owner))
    r2 = client.post("/api/v1/experiments/search_ranking/assign", headers=auth(owner))
    assert r1.json()["bucket"] == r2.json()["bucket"]
    assert r1.json()["deterministic"] is True


def test_data_quality_score(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.get(f"/api/v1/pets/{coco}/data-quality", headers=auth(owner))
    body = r.json()
    assert 0 <= body["score"] <= 1
    assert "checks" in body


def test_term_map_available():
    from app.api.routes.v10_platform import TERM_MAP

    assert "GDV" in TERM_MAP
