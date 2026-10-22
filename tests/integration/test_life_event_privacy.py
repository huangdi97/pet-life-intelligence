"""LifeEvent authorization must be consistent across ALL reading surfaces."""

import asyncio
import io
import uuid
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


def test_untrusted_daily_writer_cannot_forge_system_event_or_owner_identity(client, seeded):
    owner, sitter, pet = _daily_only_caregiver(client, seeded)
    for event_type in ("grant.created", "consent.changed", "summary.generated",
                       "visual.model_activated", "diary.created", "behavior.observed",
                       "milestone.recorded"):
        forged = client.post(
            f"/api/v1/pets/{pet}/events",
            json={"event_type": event_type, "payload": {}},
            headers=auth(sitter),
        )
        assert forged.status_code == 422, (event_type, forged.text)

    # Compatibility: older QuickLog clients omit source_type entirely.
    default_event = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 11}},
        headers=auth(sitter),
    )
    assert default_event.status_code == 201, default_event.text
    assert default_event.json()["source_type"] == "CAREGIVER_REPORTED"
    assert default_event.json()["provenance_level"] == "CAREGIVER_REPORTED"

    owner_event = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 12}},
        headers=auth(owner),
    )
    assert owner_event.status_code == 201
    assert owner_event.json()["source_type"] == "OWNER_REPORTED"


def test_manual_event_media_rejects_cross_pet_and_sensitive_artifacts(client, seeded):
    owner, pet, other = seeded["owner_id"], seeded["coco_id"], seeded["mimi_id"]
    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    upload_other = client.post(
        f"/api/v1/pets/{other}/artifacts",
        files={"file": ("foreign.png", io.BytesIO(png), "image/png")},
        headers=auth(owner),
    )
    assert upload_other.status_code == 201, upload_other.text
    foreign_id = upload_other.json()["artifact_id"]
    forbidden = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {},
              "artifact_ids": [foreign_id]},
        headers=auth(owner),
    )
    assert forbidden.status_code == 422, forbidden.text

    private = client.post(
        f"/api/v1/pets/{pet}/artifacts?sensitive=true",
        files={"file": ("private.png", io.BytesIO(png), "image/png")},
        headers=auth(owner),
    )
    assert private.status_code == 201, private.text
    blocked = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {},
              "artifact_ids": [private.json()["artifact_id"]]},
        headers=auth(owner),
    )
    assert blocked.status_code == 422, blocked.text

    permitted = client.post(
        f"/api/v1/pets/{pet}/artifacts",
        files={"file": ("memory.png", io.BytesIO(png), "image/png")},
        headers=auth(owner),
    )
    assert permitted.status_code == 201, permitted.text
    published = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {},
              "artifact_ids": [permitted.json()["artifact_id"]]},
        headers=auth(owner),
    )
    assert published.status_code == 201, published.text
    assert published.json()["artifact_ids"] == [permitted.json()["artifact_id"]]



def test_daily_only_reader_medical_privacy_extends_to_search_qa_why_and_memory(
    client, seeded,
):
    """Auxiliary read surfaces must not bypass the canonical medical gate."""
    owner, sitter, pet = _daily_only_caregiver(client, seeded)
    secret = "private-medical-search-secret-7719"
    health = client.post(
        f"/api/v1/pets/{pet}/health-events",
        json={"chief_complaint": secret},
        headers=auth(owner),
    )
    assert health.status_code == 201, health.text

    owner_events = client.get(
        f"/api/v1/pets/{pet}/events?event_type=health.event_opened&limit=200",
        headers=auth(owner),
    )
    medical = next(
        row for row in owner_events.json()["events"]
        if secret in str(row["payload"])
    )
    medical_id = medical["event_id"]

    search = client.get(
        f"/api/v1/pets/{pet}/search", params={"q": secret}, headers=auth(sitter),
    )
    assert search.status_code == 200, search.text
    assert search.json()["hits"] == []
    assert medical_id not in str(search.json()["hits"])

    asked = client.post(
        f"/api/v1/pets/{pet}/ask",
        json={"question": f"记录里有没有 {secret}？"},
        headers=auth(sitter),
    )
    assert asked.status_code == 200, asked.text
    assert secret not in str(asked.json().get("citations", []))
    assert medical_id not in str(asked.json().get("citations", []))

    daily = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 7}},
        headers=auth(owner),
    )
    assert daily.status_code == 201, daily.text
    why = client.get(
        f"/api/v1/pets/{pet}/why",
        params={"after_event_id": daily.json()["event_id"]},
        headers=auth(sitter),
    )
    assert why.status_code == 200, why.text
    assert medical_id not in str(why.json()["prior_events"])
    assert not any(
        row["event_type"].startswith(("health.", "medication."))
        for row in why.json()["prior_events"]
    )

    direct_medical_why = client.get(
        f"/api/v1/pets/{pet}/why",
        params={"after_event_id": medical_id},
        headers=auth(sitter),
    )
    assert direct_medical_why.status_code == 403
    assert secret not in direct_medical_why.text

    medicine = "PrivateMedicine7719"
    dose = "PrivateDose7719"
    plan = client.post(
        f"/api/v1/pets/{pet}/medication-plans",
        json={
            "medicine_name": medicine,
            "dose_text": dose,
            "frequency_per_day": 1,
            "duration_days": 7,
        },
        headers=auth(owner),
    )
    assert plan.status_code == 201, plan.text

    owner_memory = client.get(f"/api/v1/pets/{pet}/memory", headers=auth(owner))
    assert owner_memory.status_code == 200
    assert any(
        row["medicine_name"] == medicine
        for row in owner_memory.json()["memory"]["active_medications"]
    )

    sitter_memory = client.get(f"/api/v1/pets/{pet}/memory", headers=auth(sitter))
    assert sitter_memory.status_code == 200, sitter_memory.text
    assert sitter_memory.json()["memory"]["active_medications"] == []
    assert medicine not in sitter_memory.text and dose not in sitter_memory.text



def test_generic_history_mutations_cannot_desynchronize_medical_domain_objects(
    client, seeded,
):
    """Clinical events are projections of guarded domain objects, not editable daily logs."""
    owner, pet = seeded["owner_id"], seeded["coco_id"]
    secret = "domain-object-stays-authoritative-411"
    health = client.post(
        f"/api/v1/pets/{pet}/health-events",
        json={"chief_complaint": secret},
        headers=auth(owner),
    )
    assert health.status_code == 201, health.text
    rows = client.get(
        f"/api/v1/pets/{pet}/events?event_type=health.event_opened&limit=200",
        headers=auth(owner),
    )
    medical = next(
        row for row in rows.json()["events"]
        if secret in str(row["payload"])
    )
    event_id = medical["event_id"]

    retract = client.post(f"/api/v1/events/{event_id}/retract", headers=auth(owner))
    assert retract.status_code == 422, retract.text
    assert retract.json()["error"]["code"] == "EVENT_MUTATION_DOMAIN_FORBIDDEN"

    supersede = client.post(
        f"/api/v1/pets/{pet}/events/{event_id}/supersede",
        json={
            "payload": {
                "health_event_id": medical["payload"]["health_event_id"],
                "chief_complaint": "silently rewritten",
            }
        },
        headers=auth(owner),
    )
    assert supersede.status_code == 422, supersede.text
    assert supersede.json()["error"]["code"] == "EVENT_MUTATION_DOMAIN_FORBIDDEN"

    unchanged = client.get(f"/api/v1/events/{event_id}", headers=auth(owner))
    assert unchanged.status_code == 200
    assert unchanged.json()["retracted_at"] is None
    assert unchanged.json()["supersedes_event_id"] is None
    assert unchanged.json()["payload"]["chief_complaint"] == secret


def test_generic_daily_fact_retraction_remains_supported(client, seeded):
    owner, pet = seeded["owner_id"], seeded["coco_id"]
    row = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 8}},
        headers=auth(owner),
    )
    assert row.status_code == 201, row.text
    withdrawn = client.post(
        f"/api/v1/events/{row.json()['event_id']}/retract", headers=auth(owner),
    )
    assert withdrawn.status_code == 200, withdrawn.text


def test_daily_only_reader_cannot_discover_admin_identity_events_via_generic_surfaces(
    client, seeded,
):
    """manage:pet guarded facts must not leak back through the LifeEvent fabric."""
    owner, sitter, pet = _daily_only_caregiver(client, seeded)
    grant = client.post(
        f"/api/v1/pets/{pet}/grants",
        json={
            "user_id": sitter,
            "scopes": ["daily:read"],
            "reason": "admin-visibility-regression-8831",
        },
        headers=auth(owner),
    )
    assert grant.status_code == 201, grant.text
    grant_id = grant.json()["grant_id"]

    owner_rows = client.get(
        f"/api/v1/pets/{pet}/events?event_type=grant.created&limit=200",
        headers=auth(owner),
    )
    assert owner_rows.status_code == 200, owner_rows.text
    admin_event = next(
        row for row in owner_rows.json()["events"]
        if row["payload"]["grant_id"] == grant_id
    )
    event_id = admin_event["event_id"]

    # The dedicated management API remains owner-only; generic life surfaces
    # must not downgrade that boundary to daily:read.
    for endpoint in (
        f"/api/v1/pets/{pet}/events?limit=200",
        f"/api/v1/pets/{pet}/events?event_type=grant.created&limit=200",
        f"/api/v1/pets/{pet}/today",
        f"/api/v1/pets/{pet}/life-replay?date={datetime.now(PRODUCT_TZ).date().isoformat()}",
    ):
        response = client.get(endpoint, headers=auth(sitter))
        assert response.status_code == 200, (endpoint, response.text)
        assert event_id not in response.text
        assert grant_id not in response.text
        assert "grant.created" not in response.text

    direct = client.get(f"/api/v1/events/{event_id}", headers=auth(sitter))
    assert direct.status_code == 403
    assert grant_id not in direct.text

    search = client.get(
        f"/api/v1/pets/{pet}/search", params={"q": grant_id}, headers=auth(sitter),
    )
    assert search.status_code == 200
    assert search.json()["hits"] == []
    assert event_id not in str(search.json()["hits"])

    ask = client.post(
        f"/api/v1/pets/{pet}/ask",
        json={"question": f"记录里有没有授权 {grant_id}？"},
        headers=auth(sitter),
    )
    assert ask.status_code == 200, ask.text
    assert event_id not in str(ask.json().get("citations", []))
    assert grant_id not in str(ask.json().get("citations", []))

    daily = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 6}},
        headers=auth(sitter),
    )
    assert daily.status_code == 201, daily.text
    why = client.get(
        f"/api/v1/pets/{pet}/why",
        params={"after_event_id": daily.json()["event_id"]},
        headers=auth(sitter),
    )
    assert why.status_code == 200
    assert event_id not in str(why.json()["prior_events"])
    assert not any(
        row["event_type"] == "grant.created"
        for row in why.json()["prior_events"]
    )

    direct_admin_why = client.get(
        f"/api/v1/pets/{pet}/why",
        params={"after_event_id": event_id},
        headers=auth(sitter),
    )
    assert direct_admin_why.status_code == 403

    memories = client.get(
        f"/api/v1/pets/{pet}/memories?years_back=1",
        headers=auth(sitter),
    )
    assert memories.status_code == 200
    assert grant_id not in memories.text
    assert "grant.created" not in memories.text

    owner_direct = client.get(f"/api/v1/events/{event_id}", headers=auth(owner))
    assert owner_direct.status_code == 200
    assert owner_direct.json()["payload"]["grant_id"] == grant_id


def test_search_ask_and_why_do_not_reuse_superseded_event_payloads(client, seeded):
    """Auxiliary intelligence reads must consume the same current fact version."""
    from app.core.db import get_session_factory
    from app.domain import enums
    from app.services.eventlog import create_life_event

    owner, pet = seeded["owner_id"], seeded["coco_id"]
    occurred = datetime.now(timezone.utc) - timedelta(hours=2)
    first = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk",
              "payload": {"duration_minutes": 91, "note": "obsolete-walk-91"},
              "occurred_at": occurred.isoformat()},
        headers=auth(owner),
    )
    assert first.status_code == 201, first.text
    old_id = first.json()["event_id"]

    async def correct():
        async with get_session_factory()() as db:
            replacement, replayed = await create_life_event(
                db, pet_id=uuid.UUID(pet), actor_id=uuid.UUID(owner),
                event_type="daily.walk",
                payload={"duration_minutes": 21, "note": "current-walk-21"},
                occurred_at=occurred,
                supersedes_event_id=uuid.UUID(old_id),
                source_type=enums.SourceType.OWNER_REPORTED,
            )
            assert not replayed
            await db.commit()
            return str(replacement.id)

    new_id = asyncio.run(correct())

    old_search = client.get(
        f"/api/v1/pets/{pet}/search",
        params={"q": "obsolete-walk-91"},
        headers=auth(owner),
    )
    assert old_search.status_code == 200
    assert old_search.json()["hits"] == []

    new_search = client.get(
        f"/api/v1/pets/{pet}/search",
        params={"q": "current-walk-21"},
        headers=auth(owner),
    )
    assert new_search.status_code == 200
    assert [row["event_id"] for row in new_search.json()["hits"]] == [new_id]

    asked = client.post(
        f"/api/v1/pets/{pet}/ask",
        json={"question": "最近散步记录是什么？"},
        headers=auth(owner),
    )
    assert asked.status_code == 200, asked.text
    assert old_id not in str(asked.json().get("citations", []))

    anchor = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.play", "payload": {"duration_minutes": 3}},
        headers=auth(owner),
    )
    assert anchor.status_code == 201, anchor.text
    why = client.get(
        f"/api/v1/pets/{pet}/why",
        params={"after_event_id": anchor.json()["event_id"]},
        headers=auth(owner),
    )
    assert why.status_code == 200, why.text
    prior_ids = [row["event_id"] for row in why.json()["prior_events"]]
    assert old_id not in prior_ids
    assert new_id in prior_ids


def test_daily_only_reader_cannot_read_owner_private_agent_question_history(client, seeded):
    """Using Ask is collaborative; another person's archived question text is not."""
    owner, sitter, pet = _daily_only_caregiver(client, seeded)
    secret_question = "private-owner-question-6642 should I discuss this observation"
    asked = client.post(
        f"/api/v1/pets/{pet}/ask",
        json={"question": secret_question},
        headers=auth(owner),
    )
    assert asked.status_code == 200, asked.text

    owner_rows = client.get(
        f"/api/v1/pets/{pet}/events?event_type=pet.asked&limit=200",
        headers=auth(owner),
    )
    assert owner_rows.status_code == 200, owner_rows.text
    private_event = next(
        row for row in owner_rows.json()["events"]
        if "private-owner-question-6642" in str(row["payload"])
    )
    private_id = private_event["event_id"]

    sitter_rows = client.get(
        f"/api/v1/pets/{pet}/events?event_type=pet.asked&limit=200",
        headers=auth(sitter),
    )
    assert sitter_rows.status_code == 200
    assert sitter_rows.json()["events"] == []
    assert private_id not in sitter_rows.text

    search = client.get(
        f"/api/v1/pets/{pet}/search",
        params={"q": "private-owner-question-6642"},
        headers=auth(sitter),
    )
    assert search.status_code == 200
    assert search.json()["hits"] == []

    direct = client.get(f"/api/v1/events/{private_id}", headers=auth(sitter))
    assert direct.status_code == 403

    # The sitter may still ask their own question and receive the immediate
    # answer; only the archived agent-interaction LifeEvent is manager-private.
    own = client.post(
        f"/api/v1/pets/{pet}/ask",
        json={"question": "今天有哪些我能看到的生活记录？"},
        headers=auth(sitter),
    )
    assert own.status_code == 200, own.text
