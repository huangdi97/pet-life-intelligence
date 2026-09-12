"""Life events + Timeline + Today (PLI-017..025, PLI-185/186, PLI-221)."""

import uuid
from datetime import UTC, date, datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Header, Query
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import NotFound
from app.domain import enums
from app.domain.event_types import EVENT_REGISTRY
from app.models import LifeEvent, User
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["events"])


class EventCreate(BaseModel):
    event_type: str
    payload: dict[str, Any]
    occurred_at: datetime | None = None
    source_type: str = enums.SourceType.OWNER_REPORTED.value
    source_ref: str | None = None
    provenance_level: str | None = None
    artifact_ids: list[uuid.UUID] = Field(default_factory=list)
    allow_duplicate: bool = False


class EventOut(BaseModel):
    event_id: uuid.UUID
    pet_id: uuid.UUID
    event_type: str
    occurred_at: datetime
    recorded_at: datetime
    actor_id: uuid.UUID
    actor_name: str = ""
    source_type: str
    source_ref: str | None
    provenance_level: str
    schema_version: str
    payload: dict
    artifact_ids: list
    supersedes_event_id: uuid.UUID | None
    retracted_at: datetime | None

    model_config = {"from_attributes": True}


def _actor_names_map(users: list[User]) -> dict[uuid.UUID, str]:
    return {u.id: u.display_name for u in users}


def _serialize(events: list[LifeEvent], actors: dict[uuid.UUID, str]) -> list[dict]:
    out = []
    for e in events:
        d = {
            "event_id": str(e.id),
            "pet_id": str(e.pet_id),
            "event_type": e.event_type,
            "occurred_at": e.occurred_at.isoformat(),
            "recorded_at": e.recorded_at.isoformat(),
            "actor_id": str(e.actor_id),
            "actor_name": actors.get(e.actor_id, str(e.actor_id)),
            "source_type": e.source_type,
            "source_ref": e.source_ref,
            "provenance_level": e.provenance_level,
            "schema_version": e.schema_version,
            "payload": e.payload,
            "artifact_ids": e.artifact_ids,
            "supersedes_event_id": str(e.supersedes_event_id) if e.supersedes_event_id else None,
            "retracted_at": e.retracted_at.isoformat() if e.retracted_at else None,
        }
        out.append(d)
    return out


@router.post("/pets/{pet_id}/events", status_code=201)
async def create_event(
    pet_id: uuid.UUID,
    body: EventCreate,
    db: DBSession,
    user: CurrentUser,
    idempotency_key: str | None = Header(default=None),
    x_request_id: str | None = Header(default=None),
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)

    event, replayed = await create_life_event(
        db,
        pet_id=pet.id,
        event_type=body.event_type,
        payload=body.payload,
        actor_id=user.id,
        occurred_at=body.occurred_at,
        source_type=enums.SourceType(body.source_type),
        provenance_level=body.provenance_level,
        source_ref=body.source_ref,
        artifact_ids=body.artifact_ids,
        idempotency_key=idempotency_key,
        allow_duplicate=body.allow_duplicate,
    )
    if not replayed:
        await write_audit(
            db, action="event.create", actor_user_id=user.id,
            household_id=pet.household_id, pet_id=pet.id,
            resource_type="LifeEvent", resource_id=str(event.id),
            request_id=x_request_id or "",
        )
    await db.commit()
    data = _serialize([event], {user.id: user.display_name})[0]
    return {"replayed": replayed, **data}


@router.get("/pets/{pet_id}/events")
async def list_events(
    pet_id: uuid.UUID,
    db: DBSession,
    user: CurrentUser,
    event_type: list[str] | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    before: datetime | None = None,
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)

    stmt = select(LifeEvent).where(LifeEvent.pet_id == pet.id)
    if event_type:
        for t in event_type:
            if t not in EVENT_REGISTRY:
                raise NotFound(f"Unknown event_type filter '{t}'.")
        stmt = stmt.where(LifeEvent.event_type.in_(event_type))
    if before:
        stmt = stmt.where(LifeEvent.occurred_at < before)
    stmt = stmt.order_by(LifeEvent.occurred_at.desc()).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()

    actor_ids = {e.actor_id for e in rows}
    actors: dict[uuid.UUID, str] = {}
    if actor_ids:
        users = (
            (await db.execute(select(User).where(User.id.in_(actor_ids)))).scalars().all()
        )
        actors = _actor_names_map(list(users))
    return {"events": _serialize(list(rows), actors), "count": len(rows)}


@router.get("/events/{event_id}")
async def get_event(event_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    event = (
        await db.execute(select(LifeEvent).where(LifeEvent.id == event_id))
    ).scalar_one_or_none()
    if event is None:
        raise NotFound(f"Event {event_id} not found.")
    pet = await perm.get_pet_or_404(db, event.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    actor = (
        await db.execute(select(User).where(User.id == event.actor_id))
    ).scalar_one_or_none()
    return _serialize([event], {actor.id: actor.display_name} if actor else {})[0]


@router.post("/events/{event_id}/retract")
async def retract_event(
    event_id: uuid.UUID, db: DBSession, user: CurrentUser,
    x_request_id: str | None = Header(default=None),
) -> dict:
    event = (
        await db.execute(select(LifeEvent).where(LifeEvent.id == event_id))
    ).scalar_one_or_none()
    if event is None:
        raise NotFound(f"Event {event_id} not found.")
    pet = await perm.get_pet_or_404(db, event.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    if event.retracted_at is not None:
        return {"event_id": str(event.id), "retracted_at": event.retracted_at.isoformat(),
                "already_retracted": True}
    event.retracted_at = datetime.now(UTC)
    await db.flush()
    await write_audit(
        db, action="event.retract", actor_user_id=user.id,
        household_id=pet.household_id, pet_id=pet.id,
        resource_type="LifeEvent", resource_id=str(event.id),
        request_id=x_request_id or "",
    )
    await db.commit()
    return {"event_id": str(event.id), "retracted_at": event.retracted_at.isoformat()}


# --- Today (PLI-017) ------------------------------------------------------


@router.get("/pets/{pet_id}/today")
async def today(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser,
    date: date | None = Query(default=None),
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    tz = timezone(timedelta(hours=8))  # pet.timezone offset for v0.1 (CST default)
    day = date or datetime.now(tz).date()
    day_start = datetime(day.year, day.month, day.day, tzinfo=tz)
    day_end = day_start + timedelta(days=1)

    rows = (
        await db.execute(
            select(LifeEvent)
            .where(
                LifeEvent.pet_id == pet.id,
                LifeEvent.occurred_at >= day_start,
                LifeEvent.occurred_at < day_end,
                LifeEvent.event_type.not_in(["audit.accessed"]),
            )
            .order_by(LifeEvent.occurred_at.desc())
        )
    ).scalars().all()
    actors = {}
    if rows:
        users = (
            (await db.execute(select(User).where(User.id.in_({e.actor_id for e in rows}))))
            .scalars().all()
        )
        actors = _actor_names_map(list(users))

    daily_types = sorted(
        t for t in EVENT_REGISTRY if t.startswith("daily.")
    )
    counts: dict[str, int] = {t: 0 for t in daily_types}
    for e in rows:
        if e.event_type in counts:
            counts[e.event_type] += 1

    await create_life_event(
        db, pet_id=pet.id, event_type="today.viewed",
        payload={"date": day.isoformat()}, actor_id=user.id,
        source_type=enums.SourceType.SYSTEM_CALCULATED,
        provenance_level=enums.SourceType.SYSTEM_CALCULATED.value,
        allow_duplicate=True,
    )
    await db.commit()

    return {
        "pet": {"id": str(pet.id), "name": pet.name, "species": pet.species},
        "date": day.isoformat(),
        "event_counts": counts,
        "events": _serialize(list(rows), actors),
    }
