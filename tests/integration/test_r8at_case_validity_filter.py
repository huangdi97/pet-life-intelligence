"""R8AT: history validity filter uses the SAME derived source validity as detail."""
from datetime import datetime, timedelta, timezone

from tests.conftest import auth

TZ = timezone(timedelta(hours=8))


def _case(client, owner, name: str, *, current_minutes: int = 20):
    pet = client.post(
        "/api/v1/pets", json={"name": name, "species": "dog"}, headers=auth(owner),
    ).json()["id"]
    at = datetime.now(TZ) - timedelta(minutes=2)
    for days in (1, 2, 3):
        response = client.post(
            f"/api/v1/pets/{pet}/events",
            json={"event_type": "daily.walk", "payload": {"duration_minutes": 90},
                  "occurred_at": (at - timedelta(days=days)).isoformat()},
            headers=auth(owner),
        )
        assert response.status_code == 201, response.text
    current = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": current_minutes},
              "occurred_at": at.isoformat()},
        headers=auth(owner),
    )
    assert current.status_code == 201, current.text
    current_id = current.json()["event_id"]
    assert client.post(
        f"/api/v1/pets/{pet}/baseline/recompute?window_days=14", json={},
        headers=auth(owner),
    ).status_code == 201
    case = client.post(
        f"/api/v1/pets/{pet}/life-change-cases",
        json={"metric": "walk_minutes_per_day"}, headers=auth(owner),
    )
    assert case.status_code == 201, case.text
    return pet, case.json()["case_id"], current_id


def _ids(client, owner, pet, validity=None):
    params = {} if validity is None else {"validity": validity}
    response = client.get(
        f"/api/v1/pets/{pet}/life-change-cases", params=params, headers=auth(owner),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    return {row["case_id"] for row in body["cases"]}, body


def test_validity_filter_matches_retraction_and_supersede(client, seeded):
    owner = seeded["owner_id"]

    pet_retracted, retracted_case, retracted_event = _case(client, owner, "R8AT Retracted")
    assert client.post(
        f"/api/v1/events/{retracted_event}/retract", headers=auth(owner),
    ).status_code == 200

    pet_corrected, corrected_case, corrected_event = _case(client, owner, "R8AT Corrected")
    assert client.post(
        f"/api/v1/pets/{pet_corrected}/events/{corrected_event}/supersede",
        json={"payload": {"duration_minutes": 35}}, headers=auth(owner),
    ).status_code == 201

    pet_valid, valid_case, _ = _case(client, owner, "R8AT Valid")

    for pet, case_id, valid_expected in (
        (pet_retracted, retracted_case, False),
        (pet_corrected, corrected_case, False),
        (pet_valid, valid_case, True),
    ):
        valid_ids, valid_body = _ids(client, owner, pet, "VALID")
        invalid_ids, invalid_body = _ids(client, owner, pet, "INVALID")
        if valid_expected:
            assert valid_ids == {case_id}
            assert invalid_ids == set()
            assert valid_body["total"] == 1
            assert invalid_body["total"] == 0
        else:
            assert valid_ids == set()
            assert invalid_ids == {case_id}
            assert invalid_body["total"] == 1

    # Mixed pet: same evidence set, one invalidated Case and one newer valid one.
    extra = client.post(
        f"/api/v1/pets/{pet_retracted}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 40},
              "occurred_at": (datetime.now(TZ) - timedelta(minutes=1)).isoformat()},
        headers=auth(owner),
    )
    assert extra.status_code == 201
    assert client.post(
        f"/api/v1/pets/{pet_retracted}/baseline/recompute?window_days=14", json={},
        headers=auth(owner),
    ).status_code == 201
    fresh = client.post(
        f"/api/v1/pets/{pet_retracted}/life-change-cases",
        json={"metric": "walk_minutes_per_day"}, headers=auth(owner),
    )
    assert fresh.status_code == 201, fresh.text
    fresh_id = fresh.json()["case_id"]

    valid_ids, valid_body = _ids(client, owner, pet_retracted, "VALID")
    invalid_ids, invalid_body = _ids(client, owner, pet_retracted, "INVALID")
    assert valid_ids == {fresh_id}
    assert invalid_ids == {retracted_case}
    assert valid_body["total"] == 1
    assert invalid_body["total"] == 1

    # Keyset stays valid with a filter; the filtered page carries its own count.
    response = client.get(
        f"/api/v1/pets/{pet_retracted}/life-change-cases",
        params={"validity": "VALID", "limit": 1}, headers=auth(owner),
    )
    assert response.status_code == 200
    assert [row["case_id"] for row in response.json()["cases"]] == [fresh_id]
    assert response.json()["total"] == 1
    assert response.json()["next_cursor"] is None

    bad = client.get(
        f"/api/v1/pets/{pet_retracted}/life-change-cases",
        params={"validity": "MAYBE"}, headers=auth(owner),
    )
    assert bad.status_code == 422
