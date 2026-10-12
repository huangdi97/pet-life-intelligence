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
