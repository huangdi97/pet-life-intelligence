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


def test_daily_read_family_sees_review_decision_but_not_private_owner_note(client, seeded):
    """An owner's free text is not a DAILY_READ capability."""
    owner, family = seeded["owner_id"], seeded["family_id"]
    pet, _, _ = _create_change(client, owner)
    case = _case(client, owner, pet)
    path = f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}"
    secret_note = "owner-private-observation-with-clinical-context-4815"
    saved = client.post(
        path + "/reviews",
        json={"decision": "FOLLOW_UP_LATER", "note": secret_note},
        headers=auth(owner),
    )
    assert saved.status_code == 201, saved.text
    assert saved.json()["note"] == secret_note

    owner_view = client.get(path, headers=auth(owner))
    family_view = client.get(path, headers=auth(family))
    assert owner_view.status_code == 200
    assert family_view.status_code == 200
    assert owner_view.json()["reviews"][0]["note"] == secret_note
    assert family_view.json()["reviews"][0]["decision"] == "FOLLOW_UP_LATER"
    assert family_view.json()["reviews"][0]["note"] == ""
    assert family_view.json()["reviews"][0]["related_task_id"] is None
    assert secret_note not in family_view.text
    assert family_view.json()["case_id"] == case["case_id"]


def test_follow_up_rejects_late_backfilled_past_but_accepts_truly_later_observation(client, seeded):
    """Recorded later is not equivalent to happened later (R8 causal boundary)."""
    owner = seeded["owner_id"]
    pet, _, _ = _create_change(client, owner)
    case = _case(client, owner, pet)
    endpoint = f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}/reviews"

    # User enters a past walk AFTER opening the change Case.
    past = (datetime.now(PRODUCT_TZ) - timedelta(days=2, minutes=13))
    backfilled = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 17},
              "occurred_at": past.isoformat()},
        headers=auth(owner),
    )
    assert backfilled.status_code == 201, backfilled.text
    past_id = backfilled.json()["event_id"]
    refused = client.post(
        endpoint, json={"decision": "RECORD_OBSERVATION",
                        "related_event_ids": [past_id]},
        headers=auth(owner),
    )
    assert refused.status_code == 422, refused.text
    assert "Backfilled past events" in refused.text

    # Real observation happened after this Case; owner can append it.
    actual = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 12}},
        headers=auth(owner),
    )
    assert actual.status_code == 201, actual.text
    accepted = client.post(
        endpoint, json={"decision": "RECORD_OBSERVATION",
                        "related_event_ids": [actual.json()["event_id"]]},
        headers=auth(owner),
    )
    assert accepted.status_code == 201, accepted.text
    assert accepted.json()["related_event_ids"] == [actual.json()["event_id"]]
    case_after = client.get(
        f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}",
        headers=auth(owner),
    )
    assert case_after.status_code == 200
    assert len(case_after.json()["reviews"]) == 1
    assert past_id not in case_after.json()["reviews"][0]["related_event_ids"]


def test_follow_up_rejects_future_occurred_at_even_if_it_was_recorded_now(client, seeded):
    owner = seeded["owner_id"]
    pet, _, _ = _create_change(client, owner)
    case = _case(client, owner, pet)
    later = datetime.now(PRODUCT_TZ) + timedelta(days=3)
    future = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 11},
              "occurred_at": later.isoformat()},
        headers=auth(owner),
    )
    assert future.status_code == 201, future.text
    reviewed = client.post(
        f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}/reviews",
        json={"decision": "RECORD_OBSERVATION",
              "related_event_ids": [future.json()["event_id"]]},
        headers=auth(owner),
    )
    assert reviewed.status_code == 422, reviewed.text
    assert "Future-dated events" in reviewed.text


def test_followup_retraction_invalidates_effective_loop_not_append_only_review(client, seeded):
    """A completed review is historical, not proof that withdrawn evidence survives."""
    owner = seeded["owner_id"]
    pet, _, _ = _create_change(client, owner)
    original = _case(client, owner, pet)
    case_id = original["case_id"]
    next_walk = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 19}},
        headers=auth(owner),
    )
    assert next_walk.status_code == 201, next_walk.text
    follow_id = next_walk.json()["event_id"]
    review = client.post(
        f"/api/v1/pets/{pet}/life-change-cases/{case_id}/reviews",
        json={"decision": "RECORD_OBSERVATION", "related_event_ids": [follow_id],
              "note": "Owner observation preserved after later withdrawal"},
        headers=auth(owner),
    )
    assert review.status_code == 201, review.text
    url = f"/api/v1/pets/{pet}/life-change-cases/{case_id}"
    before = client.get(url, headers=auth(owner))
    assert before.status_code == 200, before.text
    assert before.json()["state"] == "FOLLOW_UP"
    assert before.json()["follow_up_source_valid"] is True
    assert before.json()["reviews"][0]["related_sources_valid"] is True

    withdrawn = client.post(f"/api/v1/events/{follow_id}/retract", headers=auth(owner))
    assert withdrawn.status_code == 200, withdrawn.text
    after = client.get(url, headers=auth(owner))
    assert after.status_code == 200, after.text
    data = after.json()
    assert data["source_valid"] is True  # Original change facts still valid.
    assert data["recorded_state"] == "FOLLOW_UP"  # Never rewrite history.
    assert data["state"] == "FOLLOW_UP_EVIDENCE_INVALIDATED"
    assert data["follow_up_source_valid"] is False
    assert data["reviews"][0]["review_id"] == review.json()["review_id"]
    assert data["reviews"][0]["related_sources_valid"] is False
    assert data["reviews"][0]["note"] == "Owner observation preserved after later withdrawal"
    listed = client.get(f"/api/v1/pets/{pet}/life-change-cases", headers=auth(owner))
    assert listed.status_code == 200
    case_in_list = next(item for item in listed.json()["cases"] if item["case_id"] == case_id)
    assert case_in_list["state"] == "FOLLOW_UP_EVIDENCE_INVALIDATED"
    assert case_in_list["follow_up_source_valid"] is False


def test_review_history_only_does_not_become_invalidated_followup(client, seeded):
    owner = seeded["owner_id"]
    pet, _, _ = _create_change(client, owner)
    case = _case(client, owner, pet)
    url = f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}"
    review = client.post(
        url + "/reviews", json={"decision": "FOLLOW_UP_LATER"},
        headers=auth(owner),
    )
    assert review.status_code == 201, review.text
    current = client.get(url, headers=auth(owner))
    assert current.status_code == 200
    assert current.json()["state"] == "FOLLOW_UP"
    assert current.json()["follow_up_source_valid"] is None
    assert current.json()["reviews"][0]["related_sources_valid"] is None
