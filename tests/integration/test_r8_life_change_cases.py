"""R8A source-anchored owner change cases and append-only review gates."""
from datetime import datetime, timedelta, timezone

from tests.conftest import auth, create_user

PRODUCT_TZ = timezone(timedelta(hours=8))


def _create_change(client, owner):
    pet_response = client.post(
        "/api/v1/pets", json={"name": "R8 Case Test Pet", "species": "dog"},
        headers=auth(owner),
    )
    assert pet_response.status_code == 201, pet_response.text
    pet = pet_response.json()["id"]
    now = datetime.now(PRODUCT_TZ)
    at = now - timedelta(minutes=2)
    historical = []
    for days in (1, 2, 3):
        sent = client.post(
            f"/api/v1/pets/{pet}/events",
            json={"event_type": "daily.walk",
                  "payload": {"duration_minutes": 90},
                  "occurred_at": (at - timedelta(days=days)).isoformat()},
            headers=auth(owner),
        )
        assert sent.status_code == 201, sent.text
        historical.append(sent.json()["event_id"])
    today = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk",
              "payload": {"duration_minutes": 20},
              "occurred_at": at.isoformat()},
        headers=auth(owner),
    )
    assert today.status_code == 201, today.text
    current = today.json()["event_id"]
    recompute = client.post(
        f"/api/v1/pets/{pet}/baseline/recompute?window_days=14",
        json={}, headers=auth(owner),
    )
    assert recompute.status_code == 201, recompute.text
    return pet, current, historical


def _case(client, owner, pet):
    response = client.post(
        f"/api/v1/pets/{pet}/life-change-cases",
        json={"metric": "walk_minutes_per_day"}, headers=auth(owner),
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_owner_case_has_real_sources_is_idempotent_and_non_diagnostic(client, seeded):
    owner = seeded["owner_id"]
    pet, current, history = _create_change(client, owner)
    case = _case(client, owner, pet)
    assert case["replayed"] is False
    assert case["state"] == "PROPOSED"
    assert case["source_valid"] is True
    assert case["insight_kind"] == "RECORDED_CHANGE"
    assert case["algorithm_version"] == "R8A_SAME_CLOCK_RECORDED_CHANGE_V1"
    assert set(case["evidence_event_ids"]) == {current, *history}
    assert case["current_value"] == 20
    assert case["baseline_value"] == 90
    assert case["sample_days"] == 3
    assert "非" in case["truth_note"] or "不代表" in case["truth_note"]
    repeated = _case(client, owner, pet)
    assert repeated["replayed"] is True
    assert repeated["case_id"] == case["case_id"]
    listing = client.get(
        f"/api/v1/pets/{pet}/life-change-cases", headers=auth(owner),
    )
    assert listing.status_code == 200
    assert len(listing.json()["cases"]) == 1


def test_review_is_human_action_idempotent_and_follow_up_is_real(client, seeded):
    owner = seeded["owner_id"]
    pet, _, _ = _create_change(client, owner)
    case = _case(client, owner, pet)
    path = f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}/reviews"
    first = client.post(
        path,
        json={"decision": "FOLLOW_UP_LATER", "idempotency_key": "followup-case-test-001"},
        headers=auth(owner),
    )
    assert first.status_code == 201, first.text
    assert first.json()["replayed"] is False
    again = client.post(
        path,
        json={"decision": "FOLLOW_UP_LATER", "idempotency_key": "followup-case-test-001"},
        headers=auth(owner),
    )
    assert again.status_code == 201
    assert again.json()["replayed"] is True
    assert again.json()["review_id"] == first.json()["review_id"]

    # Review needs an explicit optimistic version; no silent lost update.
    stale = client.post(
        path, json={"decision": "NOT_RELEVANT"}, headers=auth(owner),
    )
    assert stale.status_code == 409
    without_fact = client.post(
        path,
        json={"decision": "RECORD_OBSERVATION",
              "expected_latest_review_id": first.json()["review_id"]},
        headers=auth(owner),
    )
    assert without_fact.status_code == 422

    future_observation = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk",
              "payload": {"duration_minutes": 15}},
        headers=auth(owner),
    )
    assert future_observation.status_code == 201, future_observation.text
    followup = client.post(
        path,
        json={
            "decision": "RECORD_OBSERVATION",
            "related_event_ids": [future_observation.json()["event_id"]],
            "expected_latest_review_id": first.json()["review_id"],
        },
        headers=auth(owner),
    )
    assert followup.status_code == 201, followup.text
    details = client.get(
        f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}",
        headers=auth(owner),
    )
    assert details.status_code == 200
    assert details.json()["state"] == "FOLLOW_UP"
    assert [r["decision"] for r in details.json()["reviews"]] == [
        "FOLLOW_UP_LATER", "RECORD_OBSERVATION",
    ]


def test_retracted_source_invalidates_case_but_preserves_owner_review(client, seeded):
    owner = seeded["owner_id"]
    pet, current, _ = _create_change(client, owner)
    case = _case(client, owner, pet)
    path = f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}"
    review = client.post(
        path + "/reviews",
        json={"decision": "NOT_RELEVANT"},
        headers=auth(owner),
    )
    assert review.status_code == 201
    withdraw = client.post(f"/api/v1/events/{current}/retract", headers=auth(owner))
    assert withdraw.status_code == 200
    result = client.get(path, headers=auth(owner))
    assert result.status_code == 200
    data = result.json()
    assert data["state"] == "INVALIDATED"
    assert data["recorded_state"] == "CLOSED"
    assert data["source_valid"] is False
    assert len(data["reviews"]) == 1
    assert data["reviews"][0]["review_id"] == review.json()["review_id"]
    refused = client.post(
        path + "/reviews",
        json={"decision": "FOLLOW_UP_LATER",
              "expected_latest_review_id": review.json()["review_id"]},
        headers=auth(owner),
    )
    assert refused.status_code == 409


def test_case_permissions_and_pet_isolation(client, seeded):
    owner, family, other_pet = (
        seeded["owner_id"], seeded["family_id"], seeded["mimi_id"]
    )
    pet, current, _ = _create_change(client, owner)
    case = _case(client, owner, pet)
    case_id = case["case_id"]
    stranger = create_user()
    list_url = f"/api/v1/pets/{pet}/life-change-cases"
    assert client.get(list_url).status_code == 401
    assert client.get(list_url, headers=auth(stranger)).status_code == 403
    assert client.post(list_url, json={"metric": "walk_minutes_per_day"},
                       headers=auth(family)).status_code == 403

    assert client.get(
        f"/api/v1/pets/{other_pet}/life-change-cases/{case_id}",
        headers=auth(owner),
    ).status_code == 404
    assert client.post(
        f"/api/v1/pets/{other_pet}/life-change-cases/{case_id}/reviews",
        json={"decision": "NOT_RELEVANT"}, headers=auth(owner),
    ).status_code == 404

    # The family is a daily writer, but not a pet owner; cannot impersonate
    # the actual owner's decision, even if they can read the Case.
    assert client.get(list_url, headers=auth(family)).status_code == 200
    assert client.post(
        f"/api/v1/pets/{pet}/life-change-cases/{case_id}/reviews",
        json={"decision": "NOT_RELEVANT"}, headers=auth(family),
    ).status_code == 403
    # An unrelated pet's real event must not be accepted as follow-up evidence.
    foreign = client.post(
        f"/api/v1/pets/{other_pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 9}},
        headers=auth(owner),
    )
    assert foreign.status_code == 201
    refused = client.post(
        f"/api/v1/pets/{pet}/life-change-cases/{case_id}/reviews",
        json={"decision": "RECORD_OBSERVATION",
              "related_event_ids": [foreign.json()["event_id"]]},
        headers=auth(owner),
    )
    assert refused.status_code == 422
    assert current in case["evidence_event_ids"]


def test_case_requires_source_coverage_not_zero_or_missing_day(client, seeded):
    owner = seeded["owner_id"]
    created = client.post(
        "/api/v1/pets",
        json={"name": "Insufficient Case Pet", "species": "dog"},
        headers=auth(owner),
    )
    assert created.status_code == 201
    pet = created.json()["id"]
    response = client.post(
        f"/api/v1/pets/{pet}/life-change-cases",
        json={"metric": "walk_minutes_per_day"}, headers=auth(owner),
    )
    assert response.status_code == 422
    assert client.get(
        f"/api/v1/pets/{pet}/life-change-cases", headers=auth(owner),
    ).json()["cases"] == []
