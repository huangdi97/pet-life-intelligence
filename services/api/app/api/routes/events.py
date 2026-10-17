"""Life events + Timeline + Today (PLI-017..025, PLI-185/186, PLI-221)."""

import uuid
from datetime import UTC, date, datetime, timedelta, timezone
from typing import Any, Literal

from fastapi import APIRouter, Header, Query
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import NotFound, PermissionDenied, ValidationFailed
from app.domain import enums
from app.domain.event_types import EVENT_REGISTRY
from app.models import Artifact, LifeEvent, User
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit
from app.services.life_replay import project_life_replay

router = APIRouter(tags=["events"])

# Registry domains classify clinical sensitivity; client payloads may not.
MEDICAL_EVENT_TYPES = frozenset(
    name for name, definition in EVENT_REGISTRY.items()
    if definition.domain in {"health", "medication"}
)
MANUAL_REPORT_SOURCES = frozenset({
    enums.SourceType.OWNER_REPORTED,
    enums.SourceType.CAREGIVER_REPORTED,
})
# Generic event append is a personal life-log interface. Domain actions,
# clinical workflow and computed/AI events must come from their guarded APIs.
MANUAL_EVENT_TYPES = frozenset(
    name for name in EVENT_REGISTRY if name.startswith("daily.")
)


def _can_read_medical(capabilities: set[str]) -> bool:
    return enums.Capability.MEDICAL_READ.value in capabilities



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

    # Daily event authoring is not a back door to clinical events/provenance.
    if body.event_type in MEDICAL_EVENT_TYPES:
        raise ValidationFailed("Use dedicated medical or medication endpoints.")
    if body.event_type not in MANUAL_EVENT_TYPES:
        raise ValidationFailed("This event type must use its dedicated domain API.")
    try:
        manual_source = enums.SourceType(body.source_type)
    except ValueError as exc:
        raise ValidationFailed("Unknown manual event source.") from exc
    if manual_source not in MANUAL_REPORT_SOURCES:
        raise ValidationFailed("Manual events cannot claim verified, device, AI or system provenance.")
    # Existing clients default to OWNER_REPORTED even during a caregiver handoff.
    # The server must assign the correct LOW-trust reporter class from roles,
    # never allow a temporary sitter to impersonate an owner report.
    try:
        await perm.require_owner(db, pet, user.id)
    except PermissionDenied:
        manual_source = enums.SourceType.CAREGIVER_REPORTED
    if body.provenance_level is not None and body.provenance_level != manual_source.value:
        raise ValidationFailed("Manual provenance must equal the verified reporter role.")

    # An event referencing another pet's media, a deleted artifact or a
    # sensitive clinical file would otherwise pollute a public daily timeline.
    if len(body.artifact_ids) > 10 or len(set(body.artifact_ids)) != len(body.artifact_ids):
        raise ValidationFailed("Invalid manual event artifact list.")
    if body.artifact_ids:
        media_rows = list((await db.execute(
            select(Artifact).where(
                Artifact.id.in_(body.artifact_ids),
                Artifact.pet_id == pet.id,
                Artifact.deleted_at.is_(None),
                Artifact.sensitive.is_(False),
                Artifact.kind.in_(["IMAGE", "VIDEO"]),
            )
        )).scalars().all())
        if {item.id for item in media_rows} != set(body.artifact_ids):
            raise ValidationFailed("Manual event evidence must be non-sensitive media from this pet.")

    event, replayed = await create_life_event(
        db,
        pet_id=pet.id,
        event_type=body.event_type,
        payload=body.payload,
        actor_id=user.id,
        occurred_at=body.occurred_at,
        source_type=manual_source,
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
    capabilities = await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)

    stmt = select(LifeEvent).where(LifeEvent.pet_id == pet.id)
    if not _can_read_medical(capabilities):
        stmt = stmt.where(LifeEvent.event_type.not_in(MEDICAL_EVENT_TYPES))
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
    capabilities = await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    if event.event_type in MEDICAL_EVENT_TYPES and not _can_read_medical(capabilities):
        raise PermissionDenied("Medical event requires medical:read.")
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


# --- R7 Life Replay (bitemporal owner-readable view) -----------------------

async def _replay_day_candidates(
    db: DBSession, pet_id: uuid.UUID, start: datetime, end: datetime,
    cutoff: datetime, *, medical_read: bool,
) -> list[LifeEvent]:
    """Load every occurrence in a day and its later correction chain.

    Shared by /today and /life-replay to prevent different retraction,
    supersession or future-event counting rules on the owner surfaces.
    """
    from app.core.errors import ValidationFailed

    stmt = select(LifeEvent).where(
        LifeEvent.pet_id == pet_id,
        LifeEvent.occurred_at >= start,
        LifeEvent.occurred_at < end,
        LifeEvent.event_type.not_in(["today.viewed", "audit.accessed"]),
    )
    if not medical_read:
        stmt = stmt.where(LifeEvent.event_type.not_in(MEDICAL_EVENT_TYPES))
    day_events = list((await db.execute(stmt)).scalars().all())
    events_by_id = {row.id: row for row in day_events}
    pending = set(events_by_id)
    for _ in range(32):
        if not pending:
            break
        next_stmt = select(LifeEvent).where(
            LifeEvent.pet_id == pet_id,
            LifeEvent.supersedes_event_id.in_(pending),
            LifeEvent.recorded_at < cutoff,
        )
        if not medical_read:
            next_stmt = next_stmt.where(LifeEvent.event_type.not_in(MEDICAL_EVENT_TYPES))
        superseders = list((await db.execute(next_stmt)).scalars().all())
        pending = {row.id for row in superseders if row.id not in events_by_id}
        for row in superseders:
            events_by_id[row.id] = row
    else:
        raise ValidationFailed("Correction chain exceeds the supported replay depth.")
    return list(events_by_id.values())


@router.get("/pets/{pet_id}/life-replay")
async def life_replay(
    pet_id: uuid.UUID,
    db: DBSession,
    user: CurrentUser,
    date: date = Query(..., description="Local calendar day YYYY-MM-DD"),
    perspective: Literal["verified_now", "as_known_then"] = Query(default="verified_now"),
    day_start_at: datetime | None = Query(default=None),
    day_end_at: datetime | None = Query(default=None),
) -> dict:
    """Read-only event-sourced replay. It does not invent historical 3D states.

    Date uses the same fixed CST fallback as /today, pending individual-pet
    timezone support. "as_known_then" includes only records known by that day's
    end. "verified_now" includes later backfilled owner records and honors
    subsequent retractions/supersession. Neither is a medical judgement.
    """
    from app.core.errors import ValidationFailed

    pet = await perm.get_pet_or_404(db, pet_id)
    capabilities = await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    tz = timezone(timedelta(hours=8))
    if (day_start_at is None) != (day_end_at is None):
        raise ValidationFailed("Both local-day boundaries are required together.")
    if day_start_at is not None and day_end_at is not None:
        # Physical local calendar days can last 23/24/25 h around DST changes.
        # Explicit UTC instants preserve the selected owner's own day instead
        # of forcing a fixed CST day on an overseas phone.
        if day_start_at.utcoffset() is None or day_end_at.utcoffset() is None:
            raise ValidationFailed("Local-day boundaries must include a timezone.")
        start, end = day_start_at, day_end_at
        duration = (end - start).total_seconds()
        if not 23 * 3600 <= duration <= 25 * 3600:
            raise ValidationFailed("The supplied boundaries are not a local calendar day.")
    else:
        start = datetime(date.year, date.month, date.day, tzinfo=tz)
        end = start + timedelta(days=1)
    now = datetime.now(UTC)
    if start > now:
        raise ValidationFailed("Life Replay cannot present a future day as recorded history.")
    cutoff = min(end, now) if perspective == "as_known_then" else now
    candidates = await _replay_day_candidates(
        db, pet.id, start, end, cutoff,
        medical_read=_can_read_medical(capabilities),
    )
    projection = project_life_replay(
        candidates,
        pet_id=pet.id,
        day_start=start,
        day_end=end,
        knowledge_cutoff=cutoff,
    )
    actor_ids = {row.actor_id for row in projection.events}
    actors = {}
    if actor_ids:
        actors = _actor_names_map(list((await db.execute(
            select(User).where(User.id.in_(actor_ids))
        )).scalars().all()))
    serialized = _serialize(projection.events, actors)
    if perspective == "as_known_then":
        # Later withdrawal cannot retroactively appear in an earlier knowledge view.
        for source_event in serialized:
            withdrawn = source_event["retracted_at"]
            if withdrawn and datetime.fromisoformat(withdrawn) >= cutoff:
                source_event["retracted_at"] = None
    return {
        "pet_id": str(pet.id),
        "date": date.isoformat(),
        "perspective": perspective,
        "time_policy": (
            "CLIENT_EXPLICIT_LOCAL_DAY_BOUNDS"
            if day_start_at is not None else "CST_UTC_PLUS_08_FALLBACK"
        ),
        "day_start_at": start.isoformat(),
        "day_end_at": end.isoformat(),
        "knowledge_cutoff": cutoff.isoformat(),
        "events": serialized,
        "count": len(projection.events),
        "event_counts": projection.event_counts,
        "provenance_counts": projection.provenance_counts,
        "exclusions": {
            "retracted": projection.excluded_retracted,
            "superseded": projection.excluded_superseded,
            "reported_later": projection.excluded_late_reported,
        },
        "truth_note": (
            "仅回放当时已记录的事实；后来补录、撤回与修正不回写当时已知内容。"
            if perspective == "as_known_then"
            else "截至目前的记录；包含事后补录，并排除已撤回或被替代的旧版本。具体事实需按来源判断。"
        ),
        "model_status": "RECORDED_EVENTS_ONLY_NO_HISTORICAL_3D_INFERENCE",
    }


# --- Today (PLI-017) ------------------------------------------------------


@router.get("/pets/{pet_id}/today")
async def today(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser,
    date: date | None = Query(default=None),
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    capabilities = await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    tz = timezone(timedelta(hours=8))  # pet.timezone offset for v0.1 (CST default)
    day = date or datetime.now(tz).date()
    day_start = datetime(day.year, day.month, day.day, tzinfo=tz)
    day_end = day_start + timedelta(days=1)

    now = datetime.now(UTC)
    candidates = await _replay_day_candidates(
        db, pet.id, day_start, day_end, now,
        medical_read=_can_read_medical(capabilities),
    )
    projection = project_life_replay(
        candidates, pet_id=pet.id, day_start=day_start, day_end=day_end,
        knowledge_cutoff=now,
    )
    rows = projection.events
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
    for event_type, count in projection.event_counts.items():
        if event_type in counts:
            counts[event_type] = count

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
