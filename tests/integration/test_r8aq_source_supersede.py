"""R8AQ: owner correction appends a superseding event; history is never edited."""
import asyncio
import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.core.db import get_session_factory
from app.domain import enums
from app.models import LifeEvent
from app.services.eventlog import create_life_event
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

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
    assert by_id[current["event_id"]]["validity_reason"] == "SUPERSEDED"
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



def test_database_rejects_a_second_direct_successor_even_if_api_check_is_bypassed(
    client, seeded,
):
    """The append-only correction graph must be a chain, never a branch."""
    owner = seeded["owner_id"]
    pet, _, current, _ = _case_with_current_source(client, owner)
    first = client.post(
        f"/api/v1/pets/{pet}/events/{current['event_id']}/supersede",
        json={"payload": {"duration_minutes": 35}, "idempotency_key": "r8bo-db-guard-001"},
        headers=auth(owner),
    )
    assert first.status_code == 201, first.text
    first_id = first.json()["event_id"]

    async def try_second_direct_successor():
        factory = get_session_factory()
        async with factory() as db:
            with pytest.raises(IntegrityError):
                await create_life_event(
                    db,
                    pet_id=uuid.UUID(pet),
                    event_type="daily.walk",
                    payload={"duration_minutes": 41},
                    actor_id=uuid.UUID(owner),
                    occurred_at=datetime.fromisoformat(current["occurred_at"]),
                    source_type=enums.SourceType.OWNER_REPORTED,
                    supersedes_event_id=uuid.UUID(current["event_id"]),
                )
            await db.rollback()
            rows = list((await db.execute(
                select(LifeEvent).where(
                    LifeEvent.pet_id == uuid.UUID(pet),
                    LifeEvent.supersedes_event_id == uuid.UUID(current["event_id"]),
                )
            )).scalars().all())
            return [str(row.id) for row in rows]

    successors = asyncio.run(try_second_direct_successor())
    assert successors == [first_id]


def test_correction_chain_can_continue_from_the_current_successor(client, seeded):
    """A→B→C is valid; only A→B and A→C is forbidden."""
    owner = seeded["owner_id"]
    pet, _, current, _ = _case_with_current_source(client, owner)
    first = client.post(
        f"/api/v1/pets/{pet}/events/{current['event_id']}/supersede",
        json={"payload": {"duration_minutes": 34}, "idempotency_key": "r8bo-chain-001"},
        headers=auth(owner),
    )
    assert first.status_code == 201, first.text
    second = client.post(
        f"/api/v1/pets/{pet}/events/{first.json()['event_id']}/supersede",
        json={"payload": {"duration_minutes": 36}, "idempotency_key": "r8bo-chain-002"},
        headers=auth(owner),
    )
    assert second.status_code == 201, second.text
    assert second.json()["supersedes_event_id"] == first.json()["event_id"]



def test_superseded_original_cannot_be_retracted_but_current_leaf_can(client, seeded):
    """One fact version has one terminal path: correction OR retraction."""
    owner = seeded["owner_id"]
    pet, _, original, _ = _case_with_current_source(client, owner)
    corrected = client.post(
        f"/api/v1/pets/{pet}/events/{original['event_id']}/supersede",
        json={"payload": {"duration_minutes": 31}, "idempotency_key": "r8bo-terminal-001"},
        headers=auth(owner),
    )
    assert corrected.status_code == 201, corrected.text
    successor_id = corrected.json()["event_id"]

    old_retract = client.post(
        f"/api/v1/events/{original['event_id']}/retract", headers=auth(owner),
    )
    assert old_retract.status_code == 409, old_retract.text
    assert old_retract.json()["error"]["code"] == "EVENT_ALREADY_SUPERSEDED"
    assert old_retract.json()["error"]["details"]["successor_event_id"] == successor_id

    original_after = client.get(
        f"/api/v1/events/{original['event_id']}", headers=auth(owner),
    )
    assert original_after.status_code == 200
    assert original_after.json()["retracted_at"] is None

    leaf_retract = client.post(
        f"/api/v1/events/{successor_id}/retract", headers=auth(owner),
    )
    assert leaf_retract.status_code == 200, leaf_retract.text
    assert leaf_retract.json()["event_id"] == successor_id
    assert leaf_retract.json()["retracted_at"] is not None
