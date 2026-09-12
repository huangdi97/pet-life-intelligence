"""v0.2 tests — identity/daily/care deepening (PLI-004/005/013/024/029/
031/033/039/040/041/042/047)."""

from datetime import datetime, timedelta, timezone

from tests.conftest import auth

NOW = datetime.now(timezone.utc)


def test_chip_identifier_add_and_list(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.post(f"/api/v1/pets/{coco}/identifiers",
                    json={"identifier_type": "CHIP", "value": "981020005674125",
                          "verify": True},
                    headers=auth(owner))
    assert r.status_code == 201, r.text
    assert r.json()["verified"] is True
    lst = client.get(f"/api/v1/pets/{coco}/identifiers", headers=auth(owner))
    assert any(i["identifier_type"] == "CHIP" for i in lst.json())


def test_lifecycle_transitions_guardrails(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.post(f"/api/v1/pets/{coco}/status",
                    json={"status": "LOST", "note": "走失"}, headers=auth(owner))
    assert r.status_code == 201
    r2 = client.post(f"/api/v1/pets/{coco}/status",
                     json={"status": "BANANA"}, headers=auth(owner))
    assert r2.status_code == 422
    # DECEASED is terminal
    client.post(f"/api/v1/pets/{coco}/status", json={"status": "ACTIVE"},
                headers=auth(owner))
    r3 = client.post(f"/api/v1/pets/{coco}/status", json={"status": "DECEASED"},
                     headers=auth(owner))
    assert r3.status_code == 201
    r4 = client.post(f"/api/v1/pets/{coco}/status", json={"status": "ACTIVE"},
                     headers=auth(owner))
    assert r4.status_code == 422


def test_sleep_quick_log_and_today_counts(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.post(f"/api/v1/pets/{coco}/events",
                    json={"event_type": "daily.sleep",
                          "payload": {"duration_minutes": 120, "quality": "NORMAL"}},
                    headers=auth(owner))
    assert r.status_code == 201, r.text
    today = client.get(f"/api/v1/pets/{coco}/today", headers=auth(owner)).json()
    assert today["event_counts"]["daily.sleep"] == 1


def test_baseline_deterministic(client, seeded):
    """trimmed_mean_v1: with 4 samples drops min and max → deterministic."""
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    at = NOW - timedelta(days=1)
    for minutes in (30, 10, 50, 70):
        client.post(f"/api/v1/pets/{coco}/events",
                    json={"event_type": "daily.walk",
                          "payload": {"duration_minutes": minutes},
                          "occurred_at": (at + timedelta(minutes=minutes)).isoformat()},
                    headers=auth(owner))
    r = client.post(f"/api/v1/pets/{coco}/baseline/recompute?window_days=14",
                    json={}, headers=auth(owner))
    assert r.status_code == 201, r.text
    walk = r.json()["baselines"]["walk_minutes_per_day"]
    assert walk is not None
    # per-day sums: yesterday 30+10+50+70=160, today (seeded) 30 → mean = 95
    # (< 4 daily samples so no trimming at the day level)
    assert walk["value"] == 95.0
    assert walk["samples"] == 2
    got = client.get(f"/api/v1/pets/{coco}/baseline", headers=auth(owner)).json()
    assert any(b["metric"] == "walk_minutes_per_day" for b in got)


def test_baseline_algorithm_pure():
    from app.api.routes.v02_identity_daily import _baseline_algorithm

    assert _baseline_algorithm([]) == 0.0
    assert _baseline_algorithm([10]) == 10.0
    assert _baseline_algorithm([10, 20, 30, 200]) == 25.0  # drops 10 and 200


def test_diary_add_and_list(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.post(f"/api/v1/pets/{coco}/diary",
                    json={"text": "今天散步时认识了新朋友"}, headers=auth(owner))
    assert r.status_code == 201
    lst = client.get(f"/api/v1/pets/{coco}/diary", headers=auth(owner)).json()
    assert lst and "新朋友" in lst[0]["text"]


def test_daily_summary_ai_provenance(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    client.post(f"/api/v1/pets/{coco}/events",
                json={"event_type": "daily.meal",
                      "payload": {"amount": "100", "unit": "g"}},
                headers=auth(owner))
    r = client.post(f"/api/v1/pets/{coco}/daily-summary", json={}, headers=auth(owner))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["provider"] == "mock"
    assert body["fact_count"] >= 1
    assert "不构成诊断" in body["disclaimer"] or "仅供参考" in body["disclaimer"]


def test_handoff_checklist_flow(client, seeded):
    """E2E (care deepening): handoff → checklist → caregiver checks items →
    daily report + end summary."""
    owner, sitter, coco = seeded["owner_id"], seeded["sitter_id"], seeded["coco_id"]
    h = client.post(f"/api/v1/pets/{coco}/handoffs",
                    json={"caregiver_user_id": sitter,
                          "scopes": ["daily:read", "daily:write"],
                          "end_at": (NOW + timedelta(hours=4)).isoformat()},
                    headers=auth(owner)).json()
    hid = h["handoff_id"]
    r = client.post(f"/api/v1/handoffs/{hid}/checklist", json={}, headers=auth(owner))
    assert r.status_code == 201
    assert len(r.json()["checklist"]) == 5
    # caregiver (a party) can update
    r2 = client.post(f"/api/v1/handoffs/{hid}/checklist/update",
                     json={"index": 0, "done": True}, headers=auth(sitter))
    assert r2.status_code == 200
    assert r2.json()["checklist"][0]["done"] is True
    # daily report during handoff shows caregiver activity
    client.post(f"/api/v1/pets/{coco}/events",
                json={"event_type": "daily.walk", "payload": {"duration_minutes": 15}},
                headers=auth(sitter))
    report = client.get(f"/api/v1/handoffs/{hid}/daily-report", headers=auth(owner)).json()
    assert report["event_counts"].get("daily.walk", 0) >= 1
    # end summary
    client.post(f"/api/v1/handoffs/{hid}/end", json={}, headers=auth(owner))
    summary = client.get(f"/api/v1/handoffs/{hid}/summary", headers=auth(owner)).json()
    assert "event_counts" in summary and "tasks_completed" in summary


def test_task_responsibility_matrix(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.get(f"/api/v1/pets/{coco}/tasks/matrix", headers=auth(owner))
    assert r.status_code == 200
    matrix = r.json()["matrix"]
    # seeded task assigned to family member
    assert any(seeded["family_id"] in who for who in matrix)


def test_role_targeted_notifications(client, seeded):
    """TRIAGE_EMERGENCY targets OWNER role; visible via role filter."""
    owner, mimi = seeded["owner_id"], seeded["mimi_id"]
    client.post(f"/api/v1/pets/{mimi}/health-events",
                json={"chief_complaint": "反复进猫砂盆但几乎尿不出来"},
                headers=auth(owner))
    r = client.get("/api/v1/notifications/for-role/OWNER", headers=auth(owner))
    assert r.status_code == 200
    types = {n["type"] for n in r.json()}
    assert "TRIAGE_EMERGENCY" in types


def test_medical_record_import_provenance(client, seeded):
    owner, mimi = seeded["owner_id"], seeded["mimi_id"]
    r = client.post(f"/api/v1/pets/{mimi}/health-records",
                    json={"kind": "PRESCRIPTION",
                          "content": {"medicine": "Ofloxacin ear drops", "days": 7},
                          "source_type": "PROFESSIONAL_CONFIRMED",
                          "source_note": "Sunshine Vet"},
                    headers=auth(owner))
    assert r.status_code == 201, r.text
    assert r.json()["provenance"] == "PROFESSIONAL_CONFIRMED"
    lst = client.get(f"/api/v1/pets/{mimi}/health-records", headers=auth(owner)).json()
    assert lst and lst[0]["kind"] == "PRESCRIPTION"
    # invalid source type rejected (PLI-058)
    r2 = client.post(f"/api/v1/pets/{mimi}/health-records",
                     json={"kind": "LAB", "content": {}, "source_type": "GUESS"},
                     headers=auth(owner))
    assert r2.status_code == 422


def test_recovery_plan_and_trend(client, seeded):
    owner, he = seeded["owner_id"], seeded["health_event_non_emergency_id"]
    r = client.post(f"/api/v1/health-events/{he}/recovery-plan",
                    json={"items": [{"description": "每日清耳2次"},
                                    {"description": "7天后复查"}]},
                    headers=auth(owner))
    assert r.status_code == 201, r.text
    plan_id = r.json()["plan_id"]
    r2 = client.patch(f"/api/v1/recovery-plans/{plan_id}/items/0",
                      json={"status": "DONE"}, headers=auth(owner))
    assert r2.status_code == 200
    assert r2.json()["items"][0]["status"] == "DONE"
    trend = client.get(f"/api/v1/health-events/{he}/trend", headers=auth(owner)).json()
    assert "observations_per_day" in trend and "triage_timeline" in trend


def test_care_reminders_flow(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    due = (NOW + timedelta(days=30)).date().isoformat()
    r = client.post(f"/api/v1/pets/{coco}/reminders",
                    json={"kind": "VACCINE", "title": "年度狂犬疫苗", "due_date": due},
                    headers=auth(owner))
    assert r.status_code == 201, r.text
    rid = r.json()["reminder_id"]
    lst = client.get(f"/api/v1/pets/{coco}/reminders", headers=auth(owner)).json()
    assert lst[0]["status"] == "PENDING"
    done = client.post(f"/api/v1/reminders/{rid}/done", json={}, headers=auth(owner))
    assert done.json()["status"] == "DONE"
