"""v0.2 routes — daily care operations: responsibility matrix, role-targeted
notifications, care reminders (v02_care_health sub-module).

PLI-042 responsibility matrix · PLI-047 role-targeted notifications ·
PLI-064 care reminders.

Pure refactor of v02_care_health.py; endpoint bodies kept verbatim.
"""

import uuid
from datetime import date

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import NotFound, ValidationFailed
from app.domain import enums
from app.models import CareReminder, CareTask, Notification
from app.services import permissions as perm
from app.services.eventlog import create_life_event

router = APIRouter(tags=["v02-care-health"])


class ReminderIn(BaseModel):
    kind: str = Field(pattern="^(VACCINE|DEWORMING|CHECKUP)$")
    title: str = Field(min_length=1, max_length=200)
    due_date: date
    note: str = ""


# --- PLI-042: responsibility matrix ----------------------------------------------


@router.get("/pets/{pet_id}/tasks/matrix")
async def task_matrix(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(select(CareTask).where(CareTask.pet_id == pet.id))
    ).scalars().all()
    matrix: dict[str, dict[str, int]] = {}
    for t in rows:
        who = str(t.assignee_user_id) if t.assignee_user_id else "unassigned"
        matrix.setdefault(who, {})
        matrix[who][t.task_type] = matrix[who].get(t.task_type, 0) + 1
    return {"pet_id": str(pet.id), "matrix": matrix,
            "note": "按任务类型 × 责任人统计（当前全部任务）"}


# --- PLI-047: role-targeted notifications ------------------------------------------


@router.get("/notifications/for-role/{role}")
async def notifications_for_role(
    role: str, db: DBSession, user: CurrentUser,
    household_id: uuid.UUID | None = Query(default=None),
) -> list[dict]:
    from app.models import HouseholdMember

    if role not in [r.value for r in enums.HouseholdRole]:
        raise ValidationFailed("unknown role")
    hh = household_id
    if hh is None:
        membership = (
            await db.execute(
                select(HouseholdMember).where(
                    HouseholdMember.user_id == user.id,
                    HouseholdMember.status == "ACTIVE",
                )
            )
        ).scalars().first()
        if membership is None:
            return []
        hh = membership.household_id
    rows = (
        await db.execute(
            select(Notification).where(
                Notification.household_id == hh,
                Notification.target_role == role,
            ).order_by(Notification.created_at.desc()).limit(100)
        )
    ).scalars().all()
    return [
        {"id": str(n.id), "type": n.type, "title": n.title, "body": n.body,
         "target_role": n.target_role, "created_at": n.created_at.isoformat()}
        for n in rows
    ]


# --- PLI-064: care reminders ------------------------------------------------------------


@router.post("/pets/{pet_id}/reminders", status_code=201)
async def create_reminder(
    pet_id: uuid.UUID, body: ReminderIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    reminder = CareReminder(
        pet_id=pet.id, kind=body.kind, title=body.title,
        due_date=body.due_date, note=body.note, created_by_user_id=user.id,
    )
    db.add(reminder)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="reminder.created",
        payload={"reminder_id": str(reminder.id), "kind": reminder.kind,
                 "due_date": reminder.due_date.isoformat()},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await db.commit()
    return {"reminder_id": str(reminder.id), "due_date": reminder.due_date.isoformat()}


@router.get("/pets/{pet_id}/reminders")
async def list_reminders(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(CareReminder).where(CareReminder.pet_id == pet.id)
            .order_by(CareReminder.due_date)
        )
    ).scalars().all()
    return [
        {"reminder_id": str(r.id), "kind": r.kind, "title": r.title,
         "due_date": r.due_date.isoformat(), "status": r.status}
        for r in rows
    ]


@router.post("/reminders/{reminder_id}/done")
async def complete_reminder(reminder_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    reminder = (
        await db.execute(select(CareReminder).where(CareReminder.id == reminder_id))
    ).scalar_one_or_none()
    if reminder is None:
        raise NotFound("Reminder not found.")
    pet = await perm.get_pet_or_404(db, reminder.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    reminder.status = "DONE"
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="reminder.completed",
        payload={"reminder_id": str(reminder.id), "kind": reminder.kind},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await db.commit()
    return {"reminder_id": str(reminder.id), "status": "DONE"}
