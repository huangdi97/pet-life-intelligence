"""Read-only R7 Life Replay: scopes, backfill, retraction and metadata."""
from datetime import datetime, timedelta, timezone

from tests.conftest import auth, create_user

TZ = timezone(timedelta(hours=8))


def test_life_replay_late_owner_report_is_not_backdated_into_past_knowledge(client, seeded):
    owner, pet = seeded["owner_id"], seeded["coco_id"]
    yesterday = datetime.now(TZ) - timedelta(days=2)
    at = yesterday.replace(hour=12, minute=0, second=0, microsecond=0)
    created = client.post(
        f"/api/v1/pets/{pet}/events",
        json={
            "event_type": "daily.walk",
            "payload": {"duration_minutes": 17},
            "occurred_at": at.isoformat(),
        },
        headers=auth(owner),
    )
    assert created.status_code == 201, created.text
    date = at.date().isoformat()
    now = client.get(
        f"/api/v1/pets/{pet}/life-replay?date={date}&perspective=verified_now",
        headers=auth(owner),
    )
    then = client.get(
        f"/api/v1/pets/{pet}/life-replay?date={date}&perspective=as_known_then",
        headers=auth(owner),
    )
    assert now.status_code == 200 and then.status_code == 200
    event_id = created.json()["event_id"]
    assert event_id in [x["event_id"] for x in now.json()["events"]]
    assert event_id not in [x["event_id"] for x in then.json()["events"]]
    assert now.json()["model_status"] == "RECORDED_EVENTS_ONLY_NO_HISTORICAL_3D_INFERENCE"
    assert now.json()["time_policy"] == "CST_UTC_PLUS_08_FALLBACK"

    withdrawn = client.post(f"/api/v1/events/{event_id}/retract", headers=auth(owner))
    assert withdrawn.status_code == 200
    updated = client.get(
        f"/api/v1/pets/{pet}/life-replay?date={date}&perspective=verified_now",
        headers=auth(owner),
    )
    assert event_id not in [x["event_id"] for x in updated.json()["events"]]
    assert updated.json()["exclusions"]["retracted"] >= 1


def test_life_replay_is_pet_scoped_and_not_a_public_history_feed(client, seeded):
    owner, pet = seeded["owner_id"], seeded["coco_id"]
    date = datetime.now(TZ).date().isoformat()
    path = f"/api/v1/pets/{pet}/life-replay?date={date}"
    assert client.get(path).status_code == 401
    outsider = create_user()
    assert client.get(path, headers=auth(outsider)).status_code == 403
    assert client.get(path, headers=auth(owner)).status_code == 200


def test_life_replay_rejects_future_as_recorded_history(client, seeded):
    owner, pet = seeded["owner_id"], seeded["coco_id"]
    future = (datetime.now(TZ) + timedelta(days=3)).date().isoformat()
    r = client.get(f"/api/v1/pets/{pet}/life-replay?date={future}", headers=auth(owner))
    assert r.status_code == 422


def test_today_and_current_replay_agree_after_retraction(client, seeded):
    owner, pet = seeded["owner_id"], seeded["coco_id"]
    at = datetime.now(TZ) - timedelta(minutes=1)
    date = at.date().isoformat()
    created = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 13},
              "occurred_at": at.isoformat()},
        headers=auth(owner),
    )
    assert created.status_code == 201, created.text
    event_id = created.json()["event_id"]
    before = client.get(f"/api/v1/pets/{pet}/today?date={date}", headers=auth(owner))
    assert before.status_code == 200
    assert event_id in [e["event_id"] for e in before.json()["events"]]
    count_before = before.json()["event_counts"]["daily.walk"]
    retract = client.post(f"/api/v1/events/{event_id}/retract", headers=auth(owner))
    assert retract.status_code == 200

    today = client.get(f"/api/v1/pets/{pet}/today?date={date}", headers=auth(owner))
    replay = client.get(
        f"/api/v1/pets/{pet}/life-replay?date={date}&perspective=verified_now",
        headers=auth(owner),
    )
    assert today.status_code == 200 and replay.status_code == 200
    assert today.json()["event_counts"]["daily.walk"] == count_before - 1
    assert event_id not in [e["event_id"] for e in today.json()["events"]]
    assert event_id not in [e["event_id"] for e in replay.json()["events"]]
    assert today.json()["event_counts"]["daily.walk"] == replay.json()["event_counts"].get("daily.walk", 0)


def test_life_replay_accepts_owner_local_day_boundaries(client, seeded):
    owner, pet = seeded["owner_id"], seeded["coco_id"]
    # A past Pacific local calendar day explicitly maps to UTC instants.
    start = datetime(2026, 10, 1, 7, 0, tzinfo=timezone.utc)
    end = start + timedelta(hours=24)
    occurred = start + timedelta(hours=3)
    created = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 12},
              "occurred_at": occurred.isoformat()},
        headers=auth(owner),
    )
    assert created.status_code == 201, created.text
    resp = client.get(
        f"/api/v1/pets/{pet}/life-replay",
        params={"date": "2026-10-01", "perspective": "verified_now",
                "day_start_at": start.isoformat(), "day_end_at": end.isoformat()},
        headers=auth(owner),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["time_policy"] == "CLIENT_EXPLICIT_LOCAL_DAY_BOUNDS"
    assert created.json()["event_id"] in [x["event_id"] for x in body["events"]]
    bad = client.get(
        f"/api/v1/pets/{pet}/life-replay",
        params={"date": "2026-10-01", "day_start_at": start.isoformat()},
        headers=auth(owner),
    )
    assert bad.status_code == 422


def test_life_replay_current_labels_observations_not_as_independently_verified(client, seeded):
    owner, pet = seeded["owner_id"], seeded["coco_id"]
    day = datetime.now(TZ).date().isoformat()
    response = client.get(
        f"/api/v1/pets/{pet}/life-replay?date={day}&perspective=verified_now",
        headers=auth(owner),
    )
    assert response.status_code == 200, response.text
    note = response.json()["truth_note"]
    assert "截至目前的记录" in note
    assert "具体事实需按来源判断" in note
    assert "当前已核实记录" not in note
