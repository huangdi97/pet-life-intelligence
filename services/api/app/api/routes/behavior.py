"""Behavior events (PLI-069, E2E-07): ABC records — observable facts only.
Never auto-upgraded to a diagnosis; AI summaries are separate from raw
records and cannot replace them."""

import uuid
from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import ValidationFailed
from app.domain import enums
from app.models import BehaviorEvent
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["behavior"])

INTENSITIES = {"", "MILD", "MODERATE", "SEVERE"}


class BehaviorEventCreate(BaseModel):
    occurred_at: datetime
    antecedent: str = ""
    behavior: str = Field(min_length=1)
    consequence: str = ""
    duration_seconds: int | None = Field(default=None, ge=0, le=60 * 60 * 24)
    intensity: str = ""
    people_involved: str = ""
    animals_involved: str = ""
    environment: str = ""
    owner_notes: str = ""
    artifact_ids: list[uuid.UUID] = Field(default_factory=list)


@router.post("/pets/{pet_id}/behavior-events", status_code=201)
async def create_behavior_event(
    pet_id: uuid.UUID, body: BehaviorEventCreate, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    if body.intensity not in INTENSITIES:
        raise ValidationFailed(f"intensity must be one of {sorted(INTENSITIES)}")

    be = BehaviorEvent(
        pet_id=pet.id,
        occurred_at=body.occurred_at,
        antecedent=body.antecedent,
        behavior=body.behavior,
        consequence=body.consequence,
        duration_seconds=body.duration_seconds,
        intensity=body.intensity,
        intensity_source=enums.SourceType.OWNER_REPORTED.value if body.intensity else "",
        people_involved=body.people_involved,
        animals_involved=body.animals_involved,
        environment=body.environment,
        owner_notes=body.owner_notes,
        artifact_ids=[str(a) for a in body.artifact_ids],
        recorded_by_user_id=user.id,
    )
    db.add(be)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="behavior.observed",
        payload={
            "behavior_event_id": str(be.id),
            "behavior": be.behavior,
            "intensity": be.intensity,
            "intensity_source": be.intensity_source,
        },
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
        source_ref=f"behavior_event:{be.id}",
        artifact_ids=body.artifact_ids,
        occurred_at=body.occurred_at,
    )
    await write_audit(db, action="behavior.create", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="BehaviorEvent", resource_id=str(be.id))
    await db.commit()
    return {
        "behavior_event_id": str(be.id),
        "pet_id": str(pet.id),
        "occurred_at": be.occurred_at.isoformat(),
        "antecedent": be.antecedent,
        "behavior": be.behavior,
        "consequence": be.consequence,
        "duration_seconds": be.duration_seconds,
        "intensity": be.intensity,
        "intensity_source": be.intensity_source,
        "note": "原始观察按事实保存；系统不会自动推断疾病或行为诊断。",
    }


@router.get("/pets/{pet_id}/behavior-events")
async def list_behavior_events(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser, limit: int = 50
) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(BehaviorEvent).where(BehaviorEvent.pet_id == pet.id)
            .order_by(BehaviorEvent.occurred_at.desc()).limit(limit)
        )
    ).scalars().all()
    return [
        {
            "behavior_event_id": str(b.id),
            "occurred_at": b.occurred_at.isoformat(),
            "antecedent": b.antecedent,
            "behavior": b.behavior,
            "consequence": b.consequence,
            "duration_seconds": b.duration_seconds,
            "intensity": b.intensity,
            "intensity_source": b.intensity_source,
            "environment": b.environment,
            "artifact_ids": b.artifact_ids,
        }
        for b in rows
    ]
