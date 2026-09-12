"""LifeEvent creation: idempotency-key replay, duplicate detection (PLI-221),
provenance enforcement (PLI-212), payload validation via the canonical
registry (PLI-211), and notification helper (PLI-219) + audit writer
(PLI-046)."""

import hashlib
import json
import uuid
from datetime import datetime, timezone

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, ValidationFailed
from app.domain import enums
from app.domain.event_types import validate_payload
from app.models import AuditEntry, LifeEvent, Notification


def _ensure_tz(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def compute_dedupe_key(pet_id: uuid.UUID, event_type: str, payload: dict,
                       occurred_at: datetime, actor_id: uuid.UUID) -> str:
    canonical = json.dumps(
        {"pet": str(pet_id), "type": event_type, "payload": payload,
         "at": _ensure_tz(occurred_at).isoformat(), "actor": str(actor_id)},
        sort_keys=True, ensure_ascii=False, separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode()).hexdigest()


async def create_life_event(
    db: AsyncSession,
    *,
    pet_id: uuid.UUID,
    event_type: str,
    payload: dict,
    actor_id: uuid.UUID,
    occurred_at: datetime | None = None,
    source_type: enums.SourceType = enums.SourceType.OWNER_REPORTED,
    provenance_level: str | None = None,
    source_ref: str | None = None,
    artifact_ids: list[uuid.UUID] | None = None,
    supersedes_event_id: uuid.UUID | None = None,
    idempotency_key: str | None = None,
    allow_duplicate: bool = False,
) -> tuple[LifeEvent, bool]:
    """Returns (event, replayed). replayed=True means an existing event was
    returned via idempotency key (no new row)."""
    from app.domain.event_types import EVENT_REGISTRY

    if event_type not in EVENT_REGISTRY:
        raise ValidationFailed(f"Unknown event_type '{event_type}'.")
    try:
        payload = validate_payload(event_type, payload)
    except Exception as exc:  # pydantic ValidationError
        raise ValidationFailed(f"Payload invalid for {event_type}: {exc}") from exc

    occurred_at = _ensure_tz(occurred_at or datetime.now(timezone.utc))
    prov = provenance_level or source_type.value
    if prov not in enums.PROVENANCE_LEVELS:
        raise ValidationFailed(f"Invalid provenance_level '{prov}'.")

    if idempotency_key:
        existing = (
            await db.execute(
                select(LifeEvent).where(
                    LifeEvent.pet_id == pet_id,
                    LifeEvent.idempotency_key == idempotency_key,
                )
            )
        ).scalar_one_or_none()
        if existing is not None:
            return existing, True

    dedupe_key = compute_dedupe_key(pet_id, event_type, payload, occurred_at, actor_id)
    if not allow_duplicate:
        dup = (
            await db.execute(
                select(LifeEvent).where(
                    LifeEvent.pet_id == pet_id, LifeEvent.dedupe_key == dedupe_key,
                    LifeEvent.retracted_at.is_(None),
                )
            )
        ).scalar_one_or_none()
        if dup is not None:
            raise ConflictError(
                "Duplicate event: an identical event already exists.",
                code="DUPLICATE_EVENT",
                details={"existing_event_id": str(dup.id)},
            )

    event = LifeEvent(
        pet_id=pet_id,
        event_type=event_type,
        occurred_at=occurred_at,
        recorded_at=datetime.now(timezone.utc),
        actor_id=actor_id,
        source_type=source_type.value,
        source_ref=source_ref,
        provenance_level=prov,
        schema_version=enums.SCHEMA_VERSION,
        payload=payload,
        artifact_ids=[str(a) for a in (artifact_ids or [])],
        supersedes_event_id=supersedes_event_id,
        idempotency_key=idempotency_key,
        dedupe_key=dedupe_key,
        is_duplicate=False,
    )
    db.add(event)
    await db.flush()
    return event, False


async def append_event(
    db: AsyncSession, event: LifeEvent
) -> None:
    """Convenience for internal domain events (already-validated payloads)."""
    db.add(event)
    await db.flush()


async def write_audit(
    db: AsyncSession,
    *,
    action: str,
    actor_user_id: uuid.UUID | None,
    household_id: uuid.UUID | None = None,
    pet_id: uuid.UUID | None = None,
    resource_type: str = "",
    resource_id: str = "",
    detail: dict | None = None,
    request_id: str = "",
) -> AuditEntry:
    entry = AuditEntry(
        actor_user_id=actor_user_id,
        household_id=household_id,
        pet_id=pet_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        detail=detail or {},
        request_id=request_id,
    )
    db.add(entry)
    await db.flush()
    return entry


async def create_notification(
    db: AsyncSession,
    *,
    household_id: uuid.UUID | None,
    pet_id: uuid.UUID | None,
    type_: str,
    title: str,
    body: str = "",
    data: dict | None = None,
    recipient_user_id: uuid.UUID | None = None,
    dedupe_key: str | None = None,
) -> Notification | None:
    if dedupe_key:
        existing = (
            await db.execute(
                select(Notification).where(Notification.dedupe_key == dedupe_key)
            )
        ).scalar_one_or_none()
        if existing is not None:
            return existing
    n = Notification(
        household_id=household_id,
        pet_id=pet_id,
        recipient_user_id=recipient_user_id,
        type=type_,
        title=title,
        body=body,
        data=data or {},
        dedupe_key=dedupe_key,
    )
    db.add(n)
    await db.flush()
    return n


def get_request_id(request: Request | None) -> str:
    if request is not None:
        return str(getattr(request.state, "request_id", "") or "")
    return ""
