"""LifeEvent authorization must be consistent across ALL reading surfaces."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from tests.conftest import auth

PRODUCT_TZ = timezone(timedelta(hours=8))


def _daily_only_caregiver(client, seeded):
    owner, sitter, pet = seeded["owner_id"], seeded["sitter_id"], seeded["coco_id"]
    granted = client.post(
        f"/api/v1/pets/{pet}/handoffs",
        json={"caregiver_user_id": sitter, "scopes": ["daily:read", "daily:write"],
              "end_at": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
              "reason": "Daily care without medical permissions"},
        headers=auth(owner),
    )
    assert granted.status_code == 201, granted.text
    return owner, sitter, pet


def test_daily_only_reader_cannot_view_health_event_from_any_generic_feed(client, seeded):
    owner, sitter, pet = _daily_only_caregiver(client, seeded)
    private_note = "clinical-note-private-5841"
    health = client.post(
        f"/api/v1/pets/{pet}/health-events",
        json={"chief_complaint": private_note},
        headers=auth(owner),
    )
    assert health.status_code == 201, health.text
    owner_events = client.get(f"/api/v1/pets/{pet}/events?limit=200", headers=auth(owner))
    assert owner_events.status_code == 200
    matches = [e for e in owner_events.json()["events"]
               if e["event_type"] == "health.event_opened" and private_note in str(e["payload"])]
    assert matches
    medical_event_id = matches[0]["event_id"]
    date = datetime.now(PRODUCT_TZ).date().isoformat()

    for path in (
        f"/api/v1/pets/{pet}/events?limit=200",
        f"/api/v1/pets/{pet}/events?event_type=health.event_opened",
        f"/api/v1/pets/{pet}/today",
        f"/api/v1/pets/{pet}/life-replay?date={date}&perspective=verified_now",
    ):
        response = client.get(path, headers=auth(sitter))
        assert response.status_code == 200, (path, response.text)
        assert private_note not in response.text
        assert medical_event_id not in response.text
        assert all(not row["event_type"].startswith(("health.", "medication."))
                   for row in response.json()["events"])

    direct = client.get(f"/api/v1/events/{medical_event_id}", headers=auth(sitter))
    assert direct.status_code == 403
    assert private_note not in direct.text
    allowed = client.get(f"/api/v1/events/{medical_event_id}", headers=auth(owner))
    assert allowed.status_code == 200
    assert private_note in allowed.text


def test_caregiver_daily_writer_cannot_forge_medical_or_verified_source(client, seeded):
    owner, sitter, pet = _daily_only_caregiver(client, seeded)
    for actor in (owner, sitter):
        illegal = client.post(
            f"/api/v1/pets/{pet}/events",
            json={"event_type": "health.event_opened",
                  "payload": {"health_event_id": str(uuid4()), "chief_complaint": "fake"}},
            headers=auth(actor),
        )
        assert illegal.status_code == 422, illegal.text

    for source in ("PROFESSIONAL_CONFIRMED", "LAB_CONFIRMED",
                   "DEVICE_DERIVED", "AI_DERIVED", "SYSTEM_CALCULATED"):
        forged = client.post(
            f"/api/v1/pets/{pet}/events",
            json={"event_type": "daily.walk", "payload": {"duration_minutes": 9},
                  "source_type": source},
            headers=auth(sitter),
        )
        assert forged.status_code == 422, (source, forged.text)

    level = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 9},
              "source_type": "CAREGIVER_REPORTED", "provenance_level": "LAB_CONFIRMED"},
        headers=auth(sitter),
    )
    assert level.status_code == 422, level.text

    allowed = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 9},
              "source_type": "CAREGIVER_REPORTED"},
        headers=auth(sitter),
    )
    assert allowed.status_code == 201, allowed.text
    assert allowed.json()["provenance_level"] == "CAREGIVER_REPORTED"
