"""v0.2 training routes — PLI-079/091 preferences · PLI-085..088 training
goals/steps/sessions/mastery.

Split from v02_behavior_training.py; endpoint bodies kept verbatim.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import NotFound, ValidationFailed
from app.domain import enums
from app.models import PetPreference, TrainingGoal, TrainingSession
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["v02-behavior-training"])


class PreferenceIn(BaseModel):
    kind: str = Field(pattern="^(LIKE|DISLIKE|ALLERGY_CAUTION|REWARD)$")
    subject: str = Field(min_length=1, max_length=200)
    note: str = ""
    source_type: str = "OWNER_REPORTED"


class GoalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    target_behavior: str = ""
    steps: list[str] = Field(default_factory=list)
    target_date: str | None = None


class SessionIn(BaseModel):
    goal_id: uuid.UUID | None = None
    session_at: datetime | None = None
    duration_minutes: int = Field(default=10, ge=1, le=180)
    focus: str = ""
    notes: str = ""
    pet_response: str = "UNKNOWN"
    rewards_used: list[str] = Field(default_factory=list)


# --- PLI-079/091 preferences ----------------------------------------------------


@router.post("/pets/{pet_id}/preferences", status_code=201)
async def add_preference(
    pet_id: uuid.UUID, body: PreferenceIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    if body.source_type not in enums.PROVENANCE_LEVELS:
        raise ValidationFailed("invalid source_type")
    row = PetPreference(
        pet_id=pet.id, kind=body.kind, subject=body.subject.strip(),
        note=body.note, source_type=body.source_type, created_by_user_id=user.id,
    )
    db.add(row)
    await db.flush()
    await write_audit(db, action="preference.add", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="PetPreference", resource_id=str(row.id))
    await db.commit()
    return {"preference_id": str(row.id), "kind": row.kind, "subject": row.subject}


@router.get("/pets/{pet_id}/preferences")
async def list_preferences(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(PetPreference).where(PetPreference.pet_id == pet.id)
            .order_by(PetPreference.kind)
        )
    ).scalars().all()
    return [
        {"preference_id": str(r.id), "kind": r.kind, "subject": r.subject,
         "note": r.note, "source_type": r.source_type}
        for r in rows
    ]


# --- PLI-085..088 training ----------------------------------------------------------


@router.post("/pets/{pet_id}/training-goals", status_code=201)
async def create_goal(
    pet_id: uuid.UUID, body: GoalCreate, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    goal = TrainingGoal(
        pet_id=pet.id, title=body.title, target_behavior=body.target_behavior,
        steps=[{"description": s, "status": "PENDING"} for s in body.steps],
        target_date=body.target_date, created_by_user_id=user.id,
    )
    db.add(goal)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="training.goal_created",
        payload={"goal_id": str(goal.id), "title": goal.title},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await db.commit()
    return {"goal_id": str(goal.id), "mastery_level": goal.mastery_level,
            "policy": "reward-based only"}


@router.get("/pets/{pet_id}/training-goals")
async def list_goals(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(TrainingGoal).where(TrainingGoal.pet_id == pet.id)
            .order_by(TrainingGoal.created_at.desc())
        )
    ).scalars().all()
    return [
        {"goal_id": str(g.id), "title": g.title, "status": g.status,
         "mastery_level": g.mastery_level, "steps": g.steps,
         "target_behavior": g.target_behavior}
        for g in rows
    ]


MASTERY_MAX = 5


@router.post("/pets/{pet_id}/training-sessions", status_code=201)
async def log_session(
    pet_id: uuid.UUID, body: SessionIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    session = TrainingSession(
        pet_id=pet.id, goal_id=body.goal_id,
        session_at=body.session_at or datetime.now(timezone.utc),
        duration_minutes=body.duration_minutes, focus=body.focus,
        notes=body.notes, pet_response=body.pet_response,
        rewards_used=body.rewards_used, created_by_user_id=user.id,
    )
    db.add(session)
    mastery_before = None
    if body.goal_id is not None:
        goal = (
            await db.execute(
                select(TrainingGoal).where(
                    TrainingGoal.id == body.goal_id, TrainingGoal.pet_id == pet.id
                )
            )
        ).scalar_one_or_none()
        if goal is None:
            raise NotFound("Goal not found for this pet.")
        mastery_before = goal.mastery_level
        if body.pet_response in ("GOOD", "GREAT"):
            goal.mastery_level = min(MASTERY_MAX, goal.mastery_level + 1)
        elif body.pet_response == "POOR":
            goal.mastery_level = max(0, goal.mastery_level - 1)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="training.session_logged",
        payload={"session_id": str(session.id),
                 "goal_id": str(body.goal_id) if body.goal_id else None,
                 "duration_minutes": session.duration_minutes},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await db.commit()
    return {"session_id": str(session.id),
            "mastery_level": mastery_before,
            "policy": "reward-based only"}
