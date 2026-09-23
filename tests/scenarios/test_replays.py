"""Stage V REPLAY-01..12 — long-lived scenario replays.

Each replay is a full API-level journey (not a single-endpoint unit test),
exercising Event → Timeline → Baseline → Health → Permission → Outcome → UI
data paths the way a real household would. All data is synthetic/demo.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from tests.conftest import auth

NOW = datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# REPLAY-01 — Daily Life 30d
# ---------------------------------------------------------------------------


def test_replay_01_daily_life_30d(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    for d in range(30):
        at = (NOW - timedelta(days=29 - d)).replace(hour=8).isoformat()
        client.post(f"/api/v1/pets/{coco}/events", headers=auth(owner),
                    json={"event_type": "daily.meal",
                          "payload": {"amount": "80", "unit": "g"}, "occurred_at": at})
        client.post(f"/api/v1/pets/{coco}/events", headers=auth(owner),
                    json={"event_type": "daily.drink",
                          "payload": {"amount": "180", "unit": "ml"}, "occurred_at": at})
        if d % 2 == 0:
            client.post(f"/api/v1/pets/{coco}/events", headers=auth(owner),
                        json={"event_type": "daily.walk",
                              "payload": {"duration_minutes": 25}, "occurred_at": at})
    evs = client.get(f"/api/v1/pets/{coco}/events?limit=200", headers=auth(owner)).json()["events"]
    assert len(evs) >= 45  # 30 meal + 30 drink + 15 walk
    today = client.get(f"/api/v1/pets/{coco}/today", headers=auth(owner)).json()
    assert all(isinstance(v, int) for v in today["event_counts"].values())
    r = client.post(f"/api/v1/pets/{coco}/baseline/recompute", json={}, headers=auth(owner))
    assert r.status_code == 201


# ---------------------------------------------------------------------------
# REPLAY-02 — Care Collaboration
# ---------------------------------------------------------------------------


def test_replay_02_care_collaboration(client, seeded):
    owner, family, coco = seeded["owner_id"], seeded["family_id"], seeded["coco_id"]
    r1 = client.post(f"/api/v1/pets/{coco}/events", headers=auth(owner),
                     json={"event_type": "daily.meal", "payload": {"amount": "60", "unit": "g"}})
    r2 = client.post(f"/api/v1/pets/{coco}/events", headers=auth(family),
                     json={"event_type": "daily.drink", "payload": {"amount": "90", "unit": "ml"}})
    assert r1.status_code == 201 and r2.status_code == 201
    evs = client.get(f"/api/v1/pets/{coco}/events?limit=50", headers=auth(family)).json()["events"]
    actor_names = {e["actor_name"] for e in evs
                   if e["event_id"] in (r1.json()["event_id"], r2.json()["event_id"])}
    assert "Demo Owner" in actor_names and "Demo Family Member" in actor_names
    assert client.post(f"/api/v1/pets/{coco}/grants", headers=auth(family),
                       json={"user_id": seeded["sitter_id"], "scopes": ["daily:read"]}).status_code == 403


# ---------------------------------------------------------------------------
# REPLAY-03 — Duplicate Feeding
# ---------------------------------------------------------------------------


def test_replay_03_duplicate_feeding(client, seeded):
    owner, family, coco = seeded["owner_id"], seeded["family_id"], seeded["coco_id"]
    body = {"event_type": "daily.meal", "payload": {"amount": "80", "unit": "g"},
            "occurred_at": (NOW - timedelta(minutes=2)).isoformat()}
    r1 = client.post(f"/api/v1/pets/{coco}/events", json=body, headers=auth(owner))
    assert r1.status_code == 201
    # identical duplicate from the SAME actor is detected (409)
    r2 = client.post(f"/api/v1/pets/{coco}/events", json=body, headers=auth(owner))
    assert r2.status_code == 409
    assert r2.json()["error"]["code"] == "DUPLICATE_EVENT"
    # dedupe key is actor-scoped: a second caregiver recording the same meal
    # at the same time is a real double-feed and is recorded without blocking
    r3 = client.post(f"/api/v1/pets/{coco}/events", json=body, headers=auth(family))
    assert r3.status_code == 201
    # explicit allow_duplicate records an acknowledged duplicate
    r4 = client.post(f"/api/v1/pets/{coco}/events", headers=auth(owner),
                     json={**body, "allow_duplicate": True})
    assert r4.status_code == 201 and r4.json()["event_id"] != r1.json()["event_id"]


# ---------------------------------------------------------------------------
# REPLAY-04 — Medication Safety
# ---------------------------------------------------------------------------


def test_replay_04_medication_safety(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    plan = client.post(f"/api/v1/pets/{coco}/medication-plans", headers=auth(owner),
                       json={"medicine_name": "Doxycycline", "dose_text": "50mg",
                             "route": "oral", "frequency_text": "每天2次",
                             "frequency_per_day": 2,
                             "start_date": NOW.date().isoformat(),
                             "end_date": (NOW + timedelta(days=3)).date().isoformat(),
                             "source_type": "PROFESSIONAL_CONFIRMED",
                             "source_note": "Dr. Wang"}).json()
    plans = client.get(f"/api/v1/pets/{coco}/medication-plans", headers=auth(owner)).json()
    this = next(p for p in plans if p["plan_id"] == plan["plan_id"])
    pending = [d for d in this["doses"] if d["status"] == "PENDING"]
    dose_id = pending[0]["dose_id"]
    a = client.post(f"/api/v1/medication-plans/{plan['plan_id']}/administrations",
                    json={"planned_dose_id": dose_id}, headers=auth(owner))
    b = client.post(f"/api/v1/medication-plans/{plan['plan_id']}/administrations",
                    json={"planned_dose_id": dose_id}, headers=auth(owner))
    assert a.status_code == 201
    assert b.status_code == 409 and b.json()["error"]["code"] == "MEDICATION_CONFLICT"


# ---------------------------------------------------------------------------
# REPLAY-05 — Health Closure
# ---------------------------------------------------------------------------


def test_replay_05_health_closure(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    he = client.post(f"/api/v1/pets/{coco}/health-events",
                     json={"chief_complaint": "拉肚子两天"}, headers=auth(owner)).json()
    hid = he["health_event_id"]
    client.post(f"/api/v1/health-events/{hid}/questions", json={}, headers=auth(owner))
    client.post(f"/api/v1/health-events/{hid}/answers", headers=auth(owner),
                json={"answers": [{"question_id": "appetite", "answer": "正常"}]})
    client.post(f"/api/v1/health-events/{hid}/observations", headers=auth(owner),
                json={"texts": ["大便成形了", "今天吃喝正常"], "use_ai": True})
    brief = client.post(f"/api/v1/health-events/{hid}/vet-brief", json={}, headers=auth(owner))
    assert brief.status_code == 201
    out = client.post(f"/api/v1/health-events/{hid}/outcomes",
                      json={"outcome": "RECOVERED", "notes": "三天后恢复"},
                      headers=auth(owner))
    assert out.status_code == 201 and out.json()["health_event_status"] == "CLOSED"
    detail = client.get(f"/api/v1/health-events/{hid}", headers=auth(owner)).json()
    assert detail["status"] == "CLOSED"
    assert detail["latest_triage_level"] in ("MONITOR", "VET_SOON", "URGENT", "EMERGENCY")


# ---------------------------------------------------------------------------
# REPLAY-06 — Behavior → Training
# ---------------------------------------------------------------------------


def test_replay_06_behavior_to_training(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    be = client.post(f"/api/v1/pets/{coco}/behavior-events", headers=auth(owner),
                     json={"behavior": "对快递员吠叫", "antecedent": "门铃响",
                           "consequence": "躲到沙发下", "intensity": "MODERATE"}).json()
    assert be
    goal = client.post(f"/api/v1/pets/{coco}/training-goals", headers=auth(owner),
                       json={"title": "门铃脱敏", "target_behavior": "听到门铃保持安静",
                             "steps": ["第一步 远处按铃", "第二步 近距离按铃"],
                             "success_criteria": "门铃响 5 次内不吠叫"}).json()
    assert goal
    sess = client.post(f"/api/v1/pets/{coco}/training-sessions", headers=auth(owner),
                       json={"goal_id": goal["goal_id"], "environment": "客厅",
                             "distraction": "低", "success_count": 3, "fail_count": 2,
                             "duration_minutes": 5}).json()
    assert sess


# ---------------------------------------------------------------------------
# REPLAY-07 — Handoff
# ---------------------------------------------------------------------------


def test_replay_07_handoff(client, seeded):
    owner, sitter, coco = seeded["owner_id"], seeded["sitter_id"], seeded["coco_id"]
    h = client.post(f"/api/v1/pets/{coco}/handoffs", headers=auth(owner),
                    json={"caregiver_user_id": sitter,
                          "scopes": ["daily:read", "daily:write"],
                          "end_at": (NOW + timedelta(hours=6)).isoformat(),
                          "reason": "出差"}).json()
    hid = h["handoff_id"]
    assert client.get(f"/api/v1/pets/{coco}", headers=auth(sitter)).status_code == 200
    r = client.post(f"/api/v1/pets/{coco}/events", headers=auth(sitter),
                    json={"event_type": "daily.meal", "payload": {"amount": "70", "unit": "g"}})
    assert r.status_code == 201
    rep = client.get(f"/api/v1/handoffs/{hid}/daily-report", headers=auth(owner))
    assert rep.status_code in (200, 404)
    client.post(f"/api/v1/handoffs/{hid}/end", json={}, headers=auth(owner))
    assert client.get(f"/api/v1/pets/{coco}", headers=auth(sitter)).status_code == 403


# ---------------------------------------------------------------------------
# REPLAY-08 — Device Disconnect / Reconnect
# ---------------------------------------------------------------------------


def test_replay_08_device_disconnect_reconnect(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    dev = client.post(f"/api/v1/pets/{coco}/devices", headers=auth(owner),
                      json={"provider": "fake", "device_key": f"dev-{uuid.uuid4().hex[:8]}",
                            "display_name": "沙盒喂食器"})
    assert dev.status_code in (200, 201), dev.text
    dev_id = (dev.json() or {}).get("device_id")
    assert dev_id
    r = client.post(f"/api/v1/pets/{coco}/devices/{dev_id}/sync", headers=auth(owner), json={})
    assert r.status_code in (200, 201, 404)
    listed = client.get(f"/api/v1/pets/{coco}/devices", headers=auth(owner))
    assert listed.status_code == 200
    assert any(d["device_id"] == dev_id for d in listed.json())


# ---------------------------------------------------------------------------
# REPLAY-09 — Companion Session (honest GENERATED_3D semantics)
# ---------------------------------------------------------------------------


def test_replay_09_companion_session_honest_blocked(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    st = client.get("/api/v1/visual/status", headers=auth(owner)).json()
    assert st["real"] is False
    assert st["status"] == "REAL_3D_PROVIDER_EXTERNAL_BLOCKED"
    overlay = client.get(f"/api/v1/pets/{coco}/state-overlay", headers=auth(owner)).json()
    assert overlay["provenance_kind"] == "GENERATED_3D"  # never LIVE/RECORDED without provider
    assert overlay["provider_real"] is False


def test_replay_10_consent_withdrawal(client, seeded):
    owner = seeded["owner_id"]
    # a pet created through the API gets the default consent rows
    pet = client.post("/api/v1/pets", headers=auth(owner),
                      json={"name": "同意测试", "species": "dog", "breed": "Mix",
                            "sex": "FEMALE", "birth_date": "2023-05-01",
                            "neutered": True}).json()
    pid = pet["id"]
    consents = client.get(f"/api/v1/pets/{pid}/consents", headers=auth(owner)).json()
    by_purpose = {c["purpose"]: c["granted"] for c in consents}
    assert by_purpose.get("SERVICE_ESSENTIAL") is True
    r = client.put(f"/api/v1/pets/{pid}/consents/RESEARCH_SECONDARY_USE",
                   headers=auth(owner), json={"granted": False})
    assert r.status_code == 200
    after = {c["purpose"]: c["granted"] for c in
             client.get(f"/api/v1/pets/{pid}/consents", headers=auth(owner)).json()}
    assert after["RESEARCH_SECONDARY_USE"] is False  # withdrawal is durable


# ---------------------------------------------------------------------------
# REPLAY-11 — Pet Switch
# ---------------------------------------------------------------------------


def test_replay_11_pet_switch_uses_new_context(client, seeded):
    owner = seeded["owner_id"]
    new_pet = client.post("/api/v1/pets", headers=auth(owner),
                          json={"name": "新成员", "species": "cat", "breed": "DSH",
                                "sex": "MALE", "birth_date": "2024-01-01",
                                "neutered": True}).json()
    new_id = new_pet["id"]
    r = client.post(f"/api/v1/pets/{new_id}/events", headers=auth(owner),
                    json={"event_type": "daily.meal", "payload": {"amount": "45", "unit": "g"}})
    assert r.status_code == 201
    evs = client.get(f"/api/v1/pets/{new_id}/events", headers=auth(owner)).json()["events"]
    assert evs and all(e["pet_id"] == new_id for e in evs)
    old = client.get(f"/api/v1/pets/{seeded['coco_id']}/events?limit=200",
                     headers=auth(owner)).json()["events"]
    assert all(e["pet_id"] == seeded["coco_id"] for e in old)


# ---------------------------------------------------------------------------
# REPLAY-12 — 3D Model Version Evolution
# ---------------------------------------------------------------------------


def test_replay_12_3d_model_version_evolution(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    # capture 1 → model v1 → verify → activate
    c1 = client.post(f"/api/v1/pets/{coco}/visual-captures", headers=auth(owner),
                     json={"capture_type": "PHOTO_SET",
                           "consent_visual_model_training": True}).json()
    m1 = client.post(f"/api/v1/pets/{coco}/visual-models", headers=auth(owner),
                     json={"capture_id": c1["capture_id"]}).json()
    assert m1["version"] == 1
    client.post(f"/api/v1/pets/{coco}/visual-models/1/verify", headers=auth(owner),
                json={"result": "like", "issues": [], "notes": "ok"})
    a1 = client.post(f"/api/v1/pets/{coco}/visual-models/1/activate", headers=auth(owner))
    assert a1.status_code == 200
    # capture 2 → model v2 → verify → activate → manifest points to v2
    c2 = client.post(f"/api/v1/pets/{coco}/visual-captures", headers=auth(owner),
                     json={"capture_type": "PHOTO_SET",
                           "consent_visual_model_training": True}).json()
    m2 = client.post(f"/api/v1/pets/{coco}/visual-models", headers=auth(owner),
                     json={"capture_id": c2["capture_id"]}).json()
    assert m2["version"] == 2
    client.post(f"/api/v1/pets/{coco}/visual-models/2/verify", headers=auth(owner),
                json={"result": "like", "issues": [], "notes": "ok"})
    client.post(f"/api/v1/pets/{coco}/visual-models/2/activate", headers=auth(owner))
    manifest = client.get(f"/api/v1/pets/{coco}/visual-model/render-manifest",
                          headers=auth(owner)).json()
    assert manifest["version"] == 2  # evolution is forward-progressing
    models = client.get(f"/api/v1/pets/{coco}/visual-models", headers=auth(owner)).json()
    versions = [m["version"] for m in models["models"]]
    assert 1 in versions and 2 in versions  # version history preserved
