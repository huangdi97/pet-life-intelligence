"""R8AQ: owner correction appends a superseding event; history is never edited."""
from datetime import datetime, timedelta, timezone

from tests.conftest import auth, create_user

TZ = timezone(timedelta(hours=8))


def _case_with_current_source(client, owner):
    pet = client.post(
        "/api/v1/pets", json={"name": "R8AQ Supersede Pet", "species": "dog"},
        headers=auth(owner),
    ).json()["id"]
    at = datetime.now(TZ) - timedelta(minutes=2)
    history = []
    for days in (1, 2, 3):
        response = client.post(
            f"/api/v1/pets/{pet}/events",
            json={"event_type": "daily.walk", "payload": {"duration_minutes": 90},
                  "occurred_at": (at - timedelta(days=days)).isoformat()},
            headers=auth(owner),
        )
        assert response.status_code == 201, response.text
        history.append(response.json())
    current = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 20},
              "occurred_at": at.isoformat()},
        headers=auth(owner),
    )
    assert current.status_code == 201, current.text
    assert client.post(
        f"/api/v1/pets/{pet}/baseline/recompute?window_days=14", json={},
        headers=auth(owner),
    ).status_code == 201
    case = client.post(
        f"/api/v1/pets/{pet}/life-change-cases",
        json={"metric": "walk_minutes_per_day"}, headers=auth(owner),
    )
    assert case.status_code == 201, case.text
    return pet, case.json(), current.json(), history


def test_owner_correction_appends_supersede_and_invalidates_the_case(client, seeded):
    owner = seeded["owner_id"]
    pet, case, current, _ = _case_with_current_source(client, owner)
    review = client.post(
        f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}/reviews",
        json={"decision": "FOLLOW_UP_LATER"}, headers=auth(owner),
    )
    assert review.status_code == 201, review.text

    corrected = client.post(
        f"/api/v1/pets/{pet}/events/{current['event_id']}/supersede",
        json={"payload": {"duration_minutes": 35}, "idempotency_key": "r8aq-correction-001"},
        headers=auth(owner),
    )
    assert corrected.status_code == 201, corrected.text
    body = corrected.json()
    assert body["event_type"] == "daily.walk"
    assert body["payload"]["duration_minutes"] == 35
    assert body["supersedes_event_id"] == current["event_id"]
    assert datetime.fromisoformat(body["occurred_at"]) == datetime.fromisoformat(
        current["occurred_at"]
    )
    assert body["replayed"] is False

    # Idempotent replay returns the SAME correction, never a second one.
    replay = client.post(
        f"/api/v1/pets/{pet}/events/{current['event_id']}/supersede",
        json={"payload": {"duration_minutes": 35}, "idempotency_key": "r8aq-correction-001"},
        headers=auth(owner),
    )
    assert replay.status_code == 201, replay.text
    assert replay.json()["event_id"] == body["event_id"]
    assert replay.json()["replayed"] is True

    # A second, different correction is rejected: one append-only chain.
    second = client.post(
        f"/api/v1/pets/{pet}/events/{current['event_id']}/supersede",
        json={"payload": {"duration_minutes": 40}}, headers=auth(owner),
    )
    assert second.status_code == 409, second.text

    detail = client.get(
        f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}", headers=auth(owner),
    )
    assert detail.status_code == 200
    refreshed = detail.json()
    assert refreshed["source_valid"] is False
    assert refreshed["state"] == "INVALIDATED"
    assert [row["review_id"] for row in refreshed["reviews"]] == [review.json()["review_id"]]

    sources = client.get(
        f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}/sources",
        params={"limit": 20}, headers=auth(owner),
    )
    assert sources.status_code == 200
    by_id = {row["event_id"]: row for row in sources.json()["sources"]}
    assert by_id[current["event_id"]]["valid"] is False
    assert by_id[current["event_id"]]["superseded_by_event_id"] == body["event_id"]

    # The original is never edited: its payload and occurrence stay intact.
    original = client.get(f"/api/v1/events/{current['event_id']}", headers=auth(owner))
    assert original.status_code == 200
    assert original.json()["payload"]["duration_minutes"] == 20
    assert original.json()["retracted_at"] is None


def test_correction_permissions_pet_scope_and_payload_validation(client, seeded):
    owner = seeded["owner_id"]
    pet, _, current, _ = _case_with_current_source(client, owner)
    path = f"/api/v1/pets/{pet}/events/{current['event_id']}/supersede"

    family = client.post(
        path, json={"payload": {"duration_minutes": 30}},
        headers=auth(seeded["family_id"]),
    )
    assert family.status_code == 403, family.text

    stranger = create_user()
    denied = client.post(
        path, json={"payload": {"duration_minutes": 30}}, headers=auth(stranger),
    )
    assert denied.status_code in (403, 404), denied.text

    other_pet = client.post(
        "/api/v1/pets", json={"name": "R8AQ Other Pet", "species": "cat"},
        headers=auth(owner),
    ).json()["id"]
    cross = client.post(
        f"/api/v1/pets/{other_pet}/events/{current['event_id']}/supersede",
        json={"payload": {"duration_minutes": 30}}, headers=auth(owner),
    )
    assert cross.status_code == 404, cross.text

    invalid = client.post(
        path, json={"payload": {"duration_minutes": -5}}, headers=auth(owner),
    )
    assert invalid.status_code == 422, invalid.text

    retracted = client.post(f"/api/v1/events/{current['event_id']}/retract", headers=auth(owner))
    assert retracted.status_code == 200
    after_retract = client.post(
        path, json={"payload": {"duration_minutes": 30}}, headers=auth(owner),
    )
    assert after_retract.status_code == 409, after_retract.text
