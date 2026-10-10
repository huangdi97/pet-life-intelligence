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
    walk_row = next(b for b in got if b["metric"] == "walk_minutes_per_day")
    assert walk_row["unit"] == "分钟"


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


def test_voice_diary_binds_real_audio_artifact_to_timeline(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    uploaded = client.post(
        f"/api/v1/pets/{coco}/artifacts",
        files={"file": ("voice-note.mp3", b"ID3-real-owner-voice", "audio/mpeg")},
        headers=auth(owner),
    )
    assert uploaded.status_code == 201, uploaded.text
    artifact_id = uploaded.json()["artifact_id"]
    assert uploaded.json()["kind"] == "AUDIO"

    created = client.post(
        f"/api/v1/pets/{coco}/diary",
        json={"text": "", "audio_artifact_id": artifact_id},
        headers=auth(owner),
    )
    assert created.status_code == 201, created.text

    diary = client.get(f"/api/v1/pets/{coco}/diary", headers=auth(owner))
    assert diary.status_code == 200, diary.text
    row = next(item for item in diary.json() if item["diary_id"] == created.json()["diary_id"])
    assert row["text"] == ""
    assert row["has_audio"] is True
    assert row["audio_artifact_id"] == artifact_id

    events = client.get(
        f"/api/v1/pets/{coco}/events?event_type=diary.created",
        headers=auth(owner),
    )
    assert events.status_code == 200, events.text
    event = next(e for e in events.json()["events"] if e["payload"].get("diary_id") == created.json()["diary_id"])
    assert event["artifact_ids"] == [artifact_id]
    assert event["payload"]["has_audio"] is True
    assert event["payload"]["text_present"] is False

    meta = client.get(f"/api/v1/artifacts/{artifact_id}", headers=auth(owner))
    assert meta.status_code == 200, meta.text
    assert meta.json()["kind"] == "AUDIO"
    assert meta.json()["original_filename"] == "voice-note.mp3"
    assert "storage_key" not in meta.json()


def test_voice_diary_rejects_wrong_pet_or_non_audio_artifact(client, seeded):
    owner, coco, mimi = seeded["owner_id"], seeded["coco_id"], seeded["mimi_id"]

    wrong_pet = client.post(
        f"/api/v1/pets/{mimi}/artifacts",
        files={"file": ("other.mp3", b"ID3-other-pet", "audio/mpeg")},
        headers=auth(owner),
    )
    assert wrong_pet.status_code == 201, wrong_pet.text
    rejected = client.post(
        f"/api/v1/pets/{coco}/diary",
        json={"text": "", "audio_artifact_id": wrong_pet.json()["artifact_id"]},
        headers=auth(owner),
    )
    assert rejected.status_code == 422

    image = client.post(
        f"/api/v1/pets/{coco}/artifacts",
        files={"file": ("photo.gif", b"GIF89a-owner-photo", "image/gif")},
        headers=auth(owner),
    )
    assert image.status_code == 201, image.text
    rejected_kind = client.post(
        f"/api/v1/pets/{coco}/diary",
        json={"text": "", "audio_artifact_id": image.json()["artifact_id"]},
        headers=auth(owner),
    )
    assert rejected_kind.status_code == 422

    empty = client.post(
        f"/api/v1/pets/{coco}/diary",
        json={"text": ""},
        headers=auth(owner),
    )
    assert empty.status_code == 422


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


def test_care_lists_expose_human_labels_not_raw_ids(client, seeded):
    owner, sitter, coco = seeded["owner_id"], seeded["sitter_id"], seeded["coco_id"]
    created = client.post(
        f"/api/v1/pets/{coco}/handoffs",
        json={
            "caregiver_user_id": sitter,
            "scopes": ["daily:read", "daily:write"],
            "end_at": (NOW + timedelta(hours=2)).isoformat(),
        },
        headers=auth(owner),
    )
    assert created.status_code == 201

    handoffs = client.get(f"/api/v1/pets/{coco}/handoffs", headers=auth(owner)).json()
    row = next(h for h in handoffs if h["handoff_id"] == created.json()["handoff_id"])
    assert row["caregiver_label"]
    assert row["caregiver_label"] != sitter
    assert sitter[:8] not in row["caregiver_label"]

    grants = client.get(f"/api/v1/pets/{coco}/grants", headers=auth(owner)).json()
    grant = next(g for g in grants if g["grant_id"] == created.json()["grant_id"])
    assert grant["user_label"]
    assert grant["user_label"] != sitter
    assert sitter[:8] not in grant["user_label"]


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


def test_care_card_share_can_be_revoked_from_owner_surface_contract(client, seeded):
    """Care Card creation returns the revocation handle required by owner UI."""
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    created = client.post(
        f"/api/v1/pets/{coco}/care-cards",
        json={"expires_in_hours": 2},
        headers=auth(owner),
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["token"]
    assert body["token_id"]
    assert body["expires_at"]

    opened = client.get(f"/api/v1/care-card/{body['token']}")
    assert opened.status_code == 200, opened.text

    revoked = client.delete(
        f"/api/v1/share-tokens/{body['token_id']}",
        headers=auth(owner),
    )
    assert revoked.status_code == 200, revoked.text
    assert revoked.json()["status"] == "REVOKED"

    denied = client.get(f"/api/v1/care-card/{body['token']}")
    assert denied.status_code == 403


def test_notification_read_flow_is_scoped_and_idempotent(client, seeded):
    owner = seeded["owner_id"]
    outsider = seeded["sitter_id"]
    coco = seeded["coco_id"]
    household = seeded["household_id"]

    created = client.post(
        f"/api/v1/pets/{coco}/deletion-requests",
        json={"reason": "notification-read-contract"},
        headers=auth(owner),
    )
    assert created.status_code == 201, created.text

    listed = client.get(
        f"/api/v1/households/{household}/notifications",
        headers=auth(owner),
    )
    assert listed.status_code == 200, listed.text
    row = next(n for n in listed.json() if n["type"] == "DELETION_REQUESTED" and not n["read_at"])

    denied = client.post(
        f"/api/v1/notifications/{row['id']}/read",
        json={},
        headers=auth(outsider),
    )
    assert denied.status_code == 403

    first = client.post(
        f"/api/v1/notifications/{row['id']}/read",
        json={},
        headers=auth(owner),
    )
    assert first.status_code == 200, first.text
    assert first.json()["read_at"]

    replay = client.post(
        f"/api/v1/notifications/{row['id']}/read",
        json={},
        headers=auth(owner),
    )
    assert replay.status_code == 200
    assert replay.json()["read_at"] == first.json()["read_at"]

    created2 = client.post(
        f"/api/v1/pets/{seeded['mimi_id']}/deletion-requests",
        json={"reason": "notification-read-all-contract"},
        headers=auth(owner),
    )
    assert created2.status_code == 201
    all_read = client.post(
        f"/api/v1/households/{household}/notifications/read-all",
        json={},
        headers=auth(owner),
    )
    assert all_read.status_code == 200, all_read.text
    assert all_read.json()["marked"] >= 1

    final = client.get(
        f"/api/v1/households/{household}/notifications",
        headers=auth(owner),
    ).json()
    assert all(n["read_at"] is not None for n in final)


def test_pet_identifier_and_lifecycle_round_trip(client, seeded):
    owner = seeded["owner_id"]
    coco = seeded["coco_id"]

    pet = client.get(f"/api/v1/pets/{coco}", headers=auth(owner))
    assert pet.status_code == 200, pet.text
    assert pet.json()["lifecycle_status"] == "ACTIVE"

    identifier = client.post(
        f"/api/v1/pets/{coco}/identifiers",
        json={
            "identifier_type": "CHIP",
            "value": "985141000000001",
            "source_type": "OWNER_REPORTED",
            "verify": False,
        },
        headers=auth(owner),
    )
    assert identifier.status_code == 201, identifier.text
    assert identifier.json()["verified"] is False

    identifiers = client.get(
        f"/api/v1/pets/{coco}/identifiers",
        headers=auth(owner),
    )
    assert identifiers.status_code == 200, identifiers.text
    chip = next(row for row in identifiers.json() if row["identifier_id"] == identifier.json()["identifier_id"])
    assert chip["identifier_type"] == "CHIP"
    assert chip["value"] == "985141000000001"
    assert chip["verified"] is False

    changed = client.post(
        f"/api/v1/pets/{coco}/status",
        json={"status": "LOST", "note": "owner-confirmed test state"},
        headers=auth(owner),
    )
    assert changed.status_code == 201, changed.text
    assert changed.json()["lifecycle_status"] == "LOST"
    assert changed.json()["previous"] == "ACTIVE"

    refreshed = client.get(f"/api/v1/pets/{coco}", headers=auth(owner))
    assert refreshed.status_code == 200, refreshed.text
    assert refreshed.json()["lifecycle_status"] == "LOST"

    timeline = client.get(
        f"/api/v1/pets/{coco}/events?event_type=pet.status_changed",
        headers=auth(owner),
    )
    assert timeline.status_code == 200, timeline.text
    assert timeline.json()["events"][0]["payload"]["status"] == "LOST"
    assert timeline.json()["events"][0]["provenance_level"] == "OWNER_REPORTED"
