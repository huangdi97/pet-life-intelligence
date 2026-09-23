"""v1.0 routes — welfare record layer (PLI-099..108) + behavior extras (PLI-076..083).

Observable welfare data + intervention record layer only; no pseudo-emotion
conclusions or medical/psychological diagnosis.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import NotFound
from app.domain import enums
from app.models import BehaviorInterventionPlan, WelfareObservation
from app.services import permissions as perm
from app.services.eventlog import write_audit

router = APIRouter(tags=["v10-platform"])


class WelfareObservationIn(BaseModel):
    kind: str = Field(pattern="^(CHOICE|ENVIRONMENT_LOAD|STRESS_RECOVERY|QOL_QUESTIONNAIRE)$")
    observed_at: datetime | None = None
    data: dict = Field(default_factory=dict)
    source_type: str = "OWNER_REPORTED"


@router.post("/pets/{pet_id}/welfare-observations", status_code=201)
async def add_welfare_observation(pet_id: uuid.UUID, body: WelfareObservationIn,
                                  db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    row = WelfareObservation(
        pet_id=pet.id, kind=body.kind,
        observed_at=body.observed_at or datetime.now(timezone.utc),
        data=body.data, source_type=body.source_type, created_by_user_id=user.id,
    )
    db.add(row)
    await db.flush()
    await db.commit()
    return {"observation_id": str(row.id),
            "note": "只记录可观察选择/负荷/恢复数据；不输出伪情绪结论。"}


@router.get("/pets/{pet_id}/welfare-evidence")
async def welfare_evidence(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    """PLI-108: provenance-backed welfare evidence summary (counts only)."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(WelfareObservation).where(WelfareObservation.pet_id == pet.id)
        )
    ).scalars().all()
    by_kind: dict[str, int] = {}
    for r in rows:
        by_kind[r.kind] = by_kind.get(r.kind, 0) + 1
    return {"pet_id": str(pet.id), "observation_counts": by_kind,
            "sources": sorted({r.source_type for r in rows}),
            "notice": "证据摘要来自带来源的可观察记录；不是情绪/福利真相断言。"}


BEHAVIOR_CATEGORIES = {"GENERAL", "AVOIDANCE_FEAR", "AGGRESSION_RISK", "ALONE"}


class InterventionIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    behavior_event_id: uuid.UUID | None = None
    steps: list[str] = Field(default_factory=list)


@router.post("/pets/{pet_id}/behavior-interventions", status_code=201)
async def create_intervention(pet_id: uuid.UUID, body: InterventionIn,
                              db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    row = BehaviorInterventionPlan(
        pet_id=pet.id, behavior_event_id=body.behavior_event_id,
        title=body.title, approach="REWARD_BASED",
        steps=[{"description": s, "status": "PENDING"} for s in body.steps],
        created_by_user_id=user.id,
    )
    db.add(row)
    await db.flush()
    await write_audit(db, action="behavior_intervention.create", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="BehaviorInterventionPlan", resource_id=str(row.id))
    await db.commit()
    return {"plan_id": str(row.id), "approach": "REWARD_BASED",
            "note": "行为干预计划为记录层；不做医学/心理诊断。"}


@router.post("/behavior-interventions/{plan_id}/outcomes", status_code=201)
async def add_intervention_outcome(plan_id: uuid.UUID, body: dict,
                                   db: DBSession, user: CurrentUser) -> dict:
    row = (
        await db.execute(
            select(BehaviorInterventionPlan).where(
                BehaviorInterventionPlan.id == plan_id
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise NotFound("Plan not found.")
    pet = await perm.get_pet_or_404(db, row.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    row.outcomes = list(row.outcomes) + [{
        "at": datetime.now(timezone.utc).isoformat(),
        "result": str(body.get("result", "UNKNOWN")),
        "notes": str(body.get("notes", "")),
    }]
    from sqlalchemy.orm.attributes import flag_modified

    flag_modified(row, "outcomes")
    await db.flush()
    await db.commit()
    return {"plan_id": str(row.id), "outcomes": row.outcomes}
