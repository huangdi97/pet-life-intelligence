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
    assert case["evidence_role_source"] == "FROZEN_AT_CREATION"
    assert case["evidence_role_by_event_id"] == {
        current: "CURRENT",
        **dict.fromkeys(history, "HISTORICAL"),
    }
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


def test_repeated_case_creation_keeps_invalidated_followup_effective_state(client, seeded):
    """POST Case retry must not resurrect a withdrawn follow-up after list/detail invalidate it."""
    owner = seeded["owner_id"]
    pet, _, _ = _create_change(client, owner)
    first_case = _case(client, owner, pet)
    case_id = first_case["case_id"]
    new_observation = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 16}},
        headers=auth(owner),
    )
    assert new_observation.status_code == 201, new_observation.text
    evidence_id = new_observation.json()["event_id"]
    reviewed = client.post(
        f"/api/v1/pets/{pet}/life-change-cases/{case_id}/reviews",
        json={"decision": "RECORD_OBSERVATION",
              "related_event_ids": [evidence_id]},
        headers=auth(owner),
    )
    assert reviewed.status_code == 201, reviewed.text
    withdrawn = client.post(
        f"/api/v1/events/{evidence_id}/retract", headers=auth(owner),
    )
    assert withdrawn.status_code == 200, withdrawn.text

    detail = client.get(
        f"/api/v1/pets/{pet}/life-change-cases/{case_id}", headers=auth(owner),
    )
    assert detail.status_code == 200, detail.text
    assert detail.json()["state"] == "FOLLOW_UP_EVIDENCE_INVALIDATED"
    assert detail.json()["recorded_state"] == "FOLLOW_UP"

    repeated = _case(client, owner, pet)
    assert repeated["replayed"] is True
    assert repeated["case_id"] == case_id
    assert repeated["recorded_state"] == "FOLLOW_UP"
    assert repeated["state"] == "FOLLOW_UP_EVIDENCE_INVALIDATED"
    assert repeated["follow_up_source_valid"] is False
    listed = client.get(
        f"/api/v1/pets/{pet}/life-change-cases", headers=auth(owner),
    )
    assert listed.status_code == 200, listed.text
    assert next(c for c in listed.json()["cases"] if c["case_id"] == case_id)["state"] == repeated["state"]


def test_reused_review_idempotency_key_cannot_change_owner_decision(client, seeded):
    """Identical retry succeeds; different action or payload must conflict without append."""
    owner = seeded["owner_id"]
    pet, _, _ = _create_change(client, owner)
    case = _case(client, owner, pet)
    endpoint = f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}/reviews"
    key = "single-human-intent-review-008"
    body = {
        "decision": "FOLLOW_UP_LATER",
        "note": "Will observe again",
        "idempotency_key": key,
    }
    first = client.post(endpoint, json=body, headers=auth(owner))
    assert first.status_code == 201, first.text
    same = client.post(endpoint, json=body, headers=auth(owner))
    assert same.status_code == 201, same.text
    assert same.json()["replayed"] is True
    assert same.json()["review_id"] == first.json()["review_id"]

    for changes in (
        {"decision": "NOT_RELEVANT"},
        {"note": "Different private note"},
        {"expected_latest_review_id": first.json()["review_id"]},
    ):
        conflicting = client.post(
            endpoint, json={**body, **changes}, headers=auth(owner),
        )
        assert conflicting.status_code == 409, conflicting.text
    details = client.get(
        f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}",
        headers=auth(owner),
    )
    assert details.status_code == 200
    assert [x["review_id"] for x in details.json()["reviews"]] == [
        first.json()["review_id"],
    ]
    assert details.json()["reviews"][0]["decision"] == "FOLLOW_UP_LATER"
    assert details.json()["reviews"][0]["note"] == "Will observe again"


def test_r8j_recovery_same_owner_instruction_after_case_source_withdrawal(client, seeded):
    """After the original evidence is withdrawn, replaying an accepted
    idempotent owner Review must return THAT Review, not append a new one.
    A previously unaccepted Review for an invalid Case still cannot be posted.
    """
    owner = seeded["owner_id"]
    pet, current, _ = _create_change(client, owner)
    case = _case(client, owner, pet)
    detail_url = f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}"
    review_url = detail_url + "/reviews"
    intent = {
        "decision": "FOLLOW_UP_LATER",
        "expected_latest_review_id": None,
        "idempotency_key": "r8j-recover-original-owner-intent",
    }
    first = client.post(review_url, json=intent, headers=auth(owner))
    assert first.status_code == 201, first.text
    first_id = first.json()["review_id"]
    assert first.json()["replayed"] is False

    withdraw = client.post(f"/api/v1/events/{current}/retract", headers=auth(owner))
    assert withdraw.status_code == 200, withdraw.text
    invalidated = client.get(detail_url, headers=auth(owner))
    assert invalidated.status_code == 200
    assert invalidated.json()["source_valid"] is False
    assert invalidated.json()["state"] == "INVALIDATED"
    assert invalidated.json()["owner_workflow_state"] == "INVALIDATED"
    assert invalidated.json()["owner_workflow_source"] == "CASE"
    assert invalidated.json()["latest_effective_outcome_id"] is None
    assert invalidated.json()["latest_effective_outcome_assessment"] is None
    assert invalidated.json()["requires_new_follow_up_observation"] is False

    # Replayed original instruction is resolvable even when original evidence
    # no longer qualifies for a new owner review.
    replay = client.post(review_url, json=intent, headers=auth(owner))
    assert replay.status_code == 201, replay.text
    assert replay.json()["review_id"] == first_id
    assert replay.json()["replayed"] is True
    after = client.get(detail_url, headers=auth(owner))
    assert [r["review_id"] for r in after.json()["reviews"]] == [first_id]

    different = client.post(
        review_url,
        json={
            "decision": "NOT_RELEVANT",
            "expected_latest_review_id": first_id,
            "idempotency_key": "r8j-different-action-after-invalidity",
        },
        headers=auth(owner),
    )
    assert different.status_code == 409
    assert len(client.get(detail_url, headers=auth(owner)).json()["reviews"]) == 1


def test_r8j_recovery_cannot_create_review_after_source_invalidated(client, seeded):
    owner = seeded["owner_id"]
    pet, current, _ = _create_change(client, owner)
    case = _case(client, owner, pet)
    review_url = f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}/reviews"
    assert client.post(f"/api/v1/events/{current}/retract", headers=auth(owner)).status_code == 200
    attempted = client.post(
        review_url,
        json={"decision": "FOLLOW_UP_LATER",
              "expected_latest_review_id": None,
              "idempotency_key": "r8j-not-previously-accepted"},
        headers=auth(owner),
    )
    assert attempted.status_code == 409
    case_detail = client.get(
        f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}",
        headers=auth(owner),
    )
    assert case_detail.status_code == 200
    assert case_detail.json()["reviews"] == []


def test_case_source_roles_are_frozen_through_owner_reviews_and_retries(client, seeded):
    owner = seeded["owner_id"]
    pet, current, history = _create_change(client, owner)
    first = _case(client, owner, pet)
    assert first["evidence_role_by_event_id"] == {
        current: "CURRENT", **dict.fromkeys(history, "HISTORICAL")
    }
    repeat = _case(client, owner, pet)
    assert repeat["replayed"] is True
    assert repeat["evidence_role_by_event_id"] == first["evidence_role_by_event_id"]
    detail_url = f"/api/v1/pets/{pet}/life-change-cases/{first['case_id']}"
    seen = client.get(detail_url, headers=auth(owner))
    assert seen.status_code == 200
    assert seen.json()["evidence_role_by_event_id"] == first["evidence_role_by_event_id"]
    reviewed = client.post(
        f"{detail_url}/reviews",
        json={"decision": "FOLLOW_UP_LATER", "idempotency_key": "frozen-source-role-001"},
        headers=auth(owner),
    )
    assert reviewed.status_code == 201, reviewed.text
    after = client.get(detail_url, headers=auth(owner))
    assert after.status_code == 200
    assert after.json()["evidence_role_by_event_id"] == first["evidence_role_by_event_id"]
    listing = client.get(f"/api/v1/pets/{pet}/life-change-cases", headers=auth(owner))
    assert listing.status_code == 200
    row = next(x for x in listing.json()["cases"] if x["case_id"] == first["case_id"])
    assert row["evidence_role_source"] == "FROZEN_AT_CREATION"
    assert row["evidence_role_by_event_id"] == first["evidence_role_by_event_id"]


def test_follow_up_must_happen_after_persisted_case_creation_not_just_comparison_clock(
    client, seeded,
):
    """Two-time comparison is not the start of the owner's follow-up window."""
    import asyncio
    import uuid

    from app.core.db import get_session_factory
    from app.models import LifeChangeCase
    from sqlalchemy import select

    owner = seeded["owner_id"]
    pet, current, _ = _create_change(client, owner)
    case = _case(client, owner, pet)

    async def read_case_clock():
        async with get_session_factory()() as db:
            row = (await db.execute(
                select(LifeChangeCase).where(
                    LifeChangeCase.id == uuid.UUID(case["case_id"]),
                )
            )).scalar_one()
            return row.computed_at, row.created_at

    comparison_at, created_at = asyncio.run(read_case_clock())
    assert comparison_at < created_at
    # The event happened AFTER the frozen comparison, but BEFORE this Case
    # existed. Recording it now must not retroactively turn it into follow-up.
    between = comparison_at + (created_at - comparison_at) / 2
    backfill = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 6},
              "occurred_at": between.isoformat()},
        headers=auth(owner),
    )
    assert backfill.status_code == 201, backfill.text
    path = f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}/reviews"
    rejected = client.post(
        path, json={"decision": "RECORD_OBSERVATION",
                    "related_event_ids": [backfill.json()["event_id"]]},
        headers=auth(owner),
    )
    assert rejected.status_code == 422, rejected.text
    assert "Backfilled past events" in rejected.text

    duplicated = client.post(
        path, json={"decision": "RECORD_OBSERVATION",
                    "related_event_ids": [current, current]},
        headers=auth(owner),
    )
    assert duplicated.status_code == 422
    original = client.post(
        path, json={"decision": "RECORD_OBSERVATION",
                    "related_event_ids": [current]},
        headers=auth(owner),
    )
    assert original.status_code == 422
    assert "Original Case evidence" in original.text
    detail = client.get(path.rsplit("/reviews", 1)[0], headers=auth(owner))
    assert detail.status_code == 200
    assert detail.json()["reviews"] == []
    assert detail.json()["state"] == "PROPOSED"

    real_followup = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 8}},
        headers=auth(owner),
    )
    assert real_followup.status_code == 201, real_followup.text
    accepted = client.post(
        path, json={"decision": "RECORD_OBSERVATION",
                    "related_event_ids": [real_followup.json()["event_id"]]},
        headers=auth(owner),
    )
    assert accepted.status_code == 201, accepted.text
    after = client.get(path.rsplit("/reviews", 1)[0], headers=auth(owner))
    assert after.status_code == 200
    assert after.json()["follow_up_source_valid"] is True
    assert after.json()["reviews"][0]["related_sources_valid"] is True



def test_owner_outcome_requires_current_real_followup_and_survives_source_invalidation(client, seeded):
    """R8BV: owner outcome is append-only judgement, never proof of recovery."""
    owner, family = seeded["owner_id"], seeded["family_id"]
    pet, _, _ = _create_change(client, owner)
    case = _case(client, owner, pet)
    case_id = case["case_id"]
    detail_url = f"/api/v1/pets/{pet}/life-change-cases/{case_id}"

    follow = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 18}},
        headers=auth(owner),
    )
    assert follow.status_code == 201, follow.text
    follow_id = follow.json()["event_id"]
    review = client.post(
        detail_url + "/reviews",
        json={"decision": "RECORD_OBSERVATION", "related_event_ids": [follow_id]},
        headers=auth(owner),
    )
    assert review.status_code == 201, review.text
    review_id = review.json()["review_id"]

    outcome_body = {
        "observation_review_id": review_id,
        "assessment": "CONTINUE_OBSERVING",
        "note": "owner-private-outcome-note-771",
        "expected_latest_review_id": review_id,
        "expected_latest_outcome_id": None,
        "idempotency_key": "r8bv-owner-outcome-001",
    }
    saved = client.post(detail_url + "/outcomes", json=outcome_body, headers=auth(owner))
    assert saved.status_code == 201, saved.text
    assert saved.json()["observation_sources_valid"] is True
    assert "不代表疾病诊断、因果关系或宠物已经恢复" in saved.json()["truth_note"]

    replay = client.post(detail_url + "/outcomes", json=outcome_body, headers=auth(owner))
    assert replay.status_code == 201, replay.text
    assert replay.json()["replayed"] is True
    assert replay.json()["outcome_id"] == saved.json()["outcome_id"]

    owner_view = client.get(detail_url, headers=auth(owner))
    family_view = client.get(detail_url, headers=auth(family))
    assert owner_view.status_code == 200 and family_view.status_code == 200
    assert owner_view.json()["outcomes"][0]["note"] == "owner-private-outcome-note-771"
    assert family_view.json()["outcomes"][0]["assessment"] == "CONTINUE_OBSERVING"
    assert family_view.json()["outcomes"][0]["note"] == ""
    assert owner_view.json()["state"] == "FOLLOW_UP"

    withdrawn = client.post(f"/api/v1/events/{follow_id}/retract", headers=auth(owner))
    assert withdrawn.status_code == 200, withdrawn.text
    after = client.get(detail_url, headers=auth(owner))
    assert after.status_code == 200
    assert after.json()["outcomes"][0]["outcome_id"] == saved.json()["outcome_id"]
    assert after.json()["outcomes"][0]["observation_sources_valid"] is False
    assert "已被撤回、修正或失效" in after.json()["outcomes"][0]["truth_note"]
    assert after.json()["state"] == "FOLLOW_UP_EVIDENCE_INVALIDATED"

    stale_outcome = client.post(
        detail_url + "/outcomes",
        json={
            "observation_review_id": review_id,
            "assessment": "NO_LONGER_CONCERNED",
            "expected_latest_review_id": review_id,
            "expected_latest_outcome_id": saved.json()["outcome_id"],
            "idempotency_key": "r8bw-stale-followup-outcome-001",
        },
        headers=auth(owner),
    )
    assert stale_outcome.status_code == 409
    unchanged = client.get(detail_url, headers=auth(owner))
    assert [row["outcome_id"] for row in unchanged.json()["outcomes"]] == [
        saved.json()["outcome_id"],
    ]


def test_owner_outcome_rejects_decision_only_review_and_stale_outcome_cas(client, seeded):
    owner = seeded["owner_id"]
    pet, _, _ = _create_change(client, owner)
    case = _case(client, owner, pet)
    detail_url = f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}"

    decision = client.post(
        detail_url + "/reviews",
        json={"decision": "FOLLOW_UP_LATER"},
        headers=auth(owner),
    )
    assert decision.status_code == 201, decision.text
    refused = client.post(
        detail_url + "/outcomes",
        json={
            "observation_review_id": decision.json()["review_id"],
            "assessment": "NO_LONGER_CONCERNED",
            "expected_latest_review_id": decision.json()["review_id"],
            "expected_latest_outcome_id": None,
            "idempotency_key": "r8bv-invalid-decision-only",
        },
        headers=auth(owner),
    )
    assert refused.status_code == 422

    observation = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 14}},
        headers=auth(owner),
    )
    assert observation.status_code == 201
    latest_review = client.get(detail_url, headers=auth(owner)).json()["latest_review_id"]
    recorded = client.post(
        detail_url + "/reviews",
        json={
            "decision": "RECORD_OBSERVATION",
            "related_event_ids": [observation.json()["event_id"]],
            "expected_latest_review_id": latest_review,
        },
        headers=auth(owner),
    )
    assert recorded.status_code == 201, recorded.text
    first = client.post(
        detail_url + "/outcomes",
        json={
            "observation_review_id": recorded.json()["review_id"],
            "assessment": "NEEDS_FURTHER_FOLLOW_UP",
            "expected_latest_review_id": recorded.json()["review_id"],
            "expected_latest_outcome_id": None,
            "idempotency_key": "r8bv-owner-outcome-002",
        },
        headers=auth(owner),
    )
    assert first.status_code == 201, first.text
    stale = client.post(
        detail_url + "/outcomes",
        json={
            "observation_review_id": recorded.json()["review_id"],
            "assessment": "CONTINUE_OBSERVING",
            "expected_latest_review_id": recorded.json()["review_id"],
            "expected_latest_outcome_id": None,
            "idempotency_key": "r8bv-owner-outcome-003",
        },
        headers=auth(owner),
    )
    assert stale.status_code == 409



def test_owner_outcome_rejects_stale_case_review_head(client, seeded):
    """R8BX: an outcome must belong to the exact Case journal snapshot the owner saw."""
    owner = seeded["owner_id"]
    pet, _, _ = _create_change(client, owner)
    case = _case(client, owner, pet)
    detail_url = f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}"

    observation = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 13}},
        headers=auth(owner),
    )
    assert observation.status_code == 201, observation.text
    recorded = client.post(
        detail_url + "/reviews",
        json={
            "decision": "RECORD_OBSERVATION",
            "related_event_ids": [observation.json()["event_id"]],
            "expected_latest_review_id": None,
        },
        headers=auth(owner),
    )
    assert recorded.status_code == 201, recorded.text
    stale_head = recorded.json()["review_id"]

    # Another device/user action appends a newer owner Review while the first
    # outcome sheet is still open on stale_head.
    newer = client.post(
        detail_url + "/reviews",
        json={
            "decision": "CORRECT_SOURCE",
            "expected_latest_review_id": stale_head,
        },
        headers=auth(owner),
    )
    assert newer.status_code == 201, newer.text

    stale = client.post(
        detail_url + "/outcomes",
        json={
            "observation_review_id": recorded.json()["review_id"],
            "assessment": "CONTINUE_OBSERVING",
            "expected_latest_review_id": stale_head,
            "expected_latest_outcome_id": None,
            "idempotency_key": "r8bx-stale-review-head-001",
        },
        headers=auth(owner),
    )
    assert stale.status_code == 409, stale.text
    assert "review journal changed" in stale.text
    assert client.get(detail_url, headers=auth(owner)).json()["outcomes"] == []

    refreshed = client.post(
        detail_url + "/outcomes",
        json={
            "observation_review_id": recorded.json()["review_id"],
            "assessment": "CONTINUE_OBSERVING",
            "expected_latest_review_id": newer.json()["review_id"],
            "expected_latest_outcome_id": None,
            "idempotency_key": "r8bx-fresh-review-head-001",
        },
        headers=auth(owner),
    )
    assert refreshed.status_code == 201, refreshed.text
    assert refreshed.json()["case_review_head_id"] == newer.json()["review_id"]
    assert refreshed.json()["observation_review_id"] == recorded.json()["review_id"]

    projected = client.get(detail_url, headers=auth(owner))
    assert projected.status_code == 200, projected.text
    assert projected.json()["owner_workflow_state"] == "OUTCOME_CONTINUE_OBSERVING"
    assert projected.json()["owner_workflow_source"] == "OUTCOME"
    assert projected.json()["latest_effective_outcome_id"] == refreshed.json()["outcome_id"]
    assert projected.json()["latest_effective_outcome_assessment"] == "CONTINUE_OBSERVING"
    assert projected.json()["requires_new_follow_up_observation"] is False

    # R8BW + R8BX composition: the denormalized Case state now reflects the
    # later CORRECT_SOURCE review, but withdrawing the assessed observation
    # must still invalidate the Outcome's current evidence projection.
    before_retract = client.get(detail_url, headers=auth(owner)).json()
    assert before_retract["recorded_state"] == "OWNER_ACKNOWLEDGED"
    assert before_retract["outcomes"][-1]["observation_sources_valid"] is True

    withdrawn = client.post(
        f"/api/v1/events/{observation.json()['event_id']}/retract",
        headers=auth(owner),
    )
    assert withdrawn.status_code == 200, withdrawn.text
    invalidated = client.get(detail_url, headers=auth(owner)).json()
    assert invalidated["recorded_state"] == "OWNER_ACKNOWLEDGED"
    assert invalidated["state"] == "FOLLOW_UP_EVIDENCE_INVALIDATED"
    assert invalidated["follow_up_source_valid"] is False
    assert invalidated["owner_workflow_state"] == "FOLLOW_UP_EVIDENCE_INVALIDATED"
    assert invalidated["owner_workflow_source"] == "OUTCOME"
    assert invalidated["latest_effective_outcome_id"] == refreshed.json()["outcome_id"]
    assert invalidated["latest_effective_outcome_assessment"] == "CONTINUE_OBSERVING"
    assert invalidated["requires_new_follow_up_observation"] is True
    assert invalidated["outcomes"][-1]["outcome_id"] == refreshed.json()["outcome_id"]
    assert invalidated["outcomes"][-1]["observation_sources_valid"] is False

    # R8BY: an explicit Review appended AFTER the Outcome is the new owner
    # workflow head. It does not resurrect the withdrawn observation: the old
    # Outcome stays invalid history, while the current workflow may be CLOSED.
    closed = client.post(
        detail_url + "/reviews",
        json={
            "decision": "NOT_RELEVANT",
            "expected_latest_review_id": newer.json()["review_id"],
        },
        headers=auth(owner),
    )
    assert closed.status_code == 201, closed.text
    after_closed = client.get(detail_url, headers=auth(owner)).json()
    assert after_closed["recorded_state"] == "CLOSED"
    assert after_closed["state"] == "CLOSED"
    assert after_closed["follow_up_source_valid"] is False
    assert after_closed["owner_workflow_state"] == "CLOSED"
    assert after_closed["owner_workflow_source"] == "REVIEW"
    assert after_closed["latest_effective_outcome_id"] is None
    assert after_closed["latest_effective_outcome_assessment"] is None
    assert after_closed["requires_new_follow_up_observation"] is False
    assert after_closed["outcomes"][-1]["outcome_id"] == refreshed.json()["outcome_id"]
    assert after_closed["outcomes"][-1]["observation_sources_valid"] is False

    listed = client.get(
        f"/api/v1/pets/{pet}/life-change-cases", headers=auth(owner),
    )
    assert listed.status_code == 200, listed.text
    listed_case = next(
        row for row in listed.json()["cases"] if row["case_id"] == case["case_id"]
    )
    assert listed_case["recorded_state"] == "CLOSED"
    assert listed_case["state"] == "CLOSED"
    assert listed_case["follow_up_source_valid"] is False
    assert listed_case["owner_workflow_state"] == "CLOSED"
    assert listed_case["owner_workflow_source"] == "REVIEW"
    assert listed_case["latest_effective_outcome_id"] is None
    assert listed_case["requires_new_follow_up_observation"] is False
