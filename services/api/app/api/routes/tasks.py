"""Care tasks (PLI-026/027/028): create, complete with duplicate-conflict
protection, repeating tasks, list."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import ConflictError, ValidationFailed
from app.domain import enums
from app.models import CareTask
from app.services import permissions as perm
from app.services.eventlog import create_life_event, create_notification, write_audit

router = APIRouter(tags=["tasks"])


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    task_type: str = enums.TaskType.OTHER.value
    due_at: datetime | None = None
    repeat_rule: str = enums.RepeatRule.NONE.value
    assignee_user_id: uuid.UUID | None = None


class TaskComplete(BaseModel):
    note: str = ""


class TaskOut(BaseModel):
    id: uuid.UUID
    pet_id: uuid.UUID
    title: str
    task_type: str
    due_at: datetime | None
    repeat_rule: str
    assignee_user_id: uuid.UUID | None
    status: str
    completed_by_user_id: uuid.UUID | None
    completed_at: datetime | None
    completion_note: str
    conflict_count: int

    model_config = {"from_attributes": True}


def _next_due(due: datetime | None, rule: str) -> datetime | None:
    if due is None or rule == enums.RepeatRule.NONE.value:
        return None
    if rule == enums.RepeatRule.DAILY.value:
        return due + timedelta_safe(days=1)
    if rule == enums.RepeatRule.WEEKLY.value:
        return due + timedelta_safe(days=7)
    return None


def timedelta_safe(**kw):
    from datetime import timedelta

    return timedelta(**kw)


@router.post("/pets/{pet_id}/tasks", status_code=201)
async def create_task(
    pet_id: uuid.UUID, body: TaskCreate, db: DBSession, user: CurrentUser
) -> TaskOut:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    if body.task_type not in [t.value for t in enums.TaskType]:
        raise ValidationFailed(f"Unknown task_type {body.task_type}")
    if body.repeat_rule not in [r.value for r in enums.RepeatRule]:
        raise ValidationFailed(f"Unknown repeat_rule {body.repeat_rule}")

    task = CareTask(
        pet_id=pet.id,
        title=body.title,
        task_type=body.task_type,
        due_at=body.due_at,
        repeat_rule=body.repeat_rule,
        assignee_user_id=body.assignee_user_id,
        created_by_user_id=user.id,
    )
    db.add(task)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="care.task_created",
        payload={
            "task_id": str(task.id), "title": task.title,
            "task_type": task.task_type,
            "due_at": task.due_at.isoformat() if task.due_at else None,
            "repeat_rule": task.repeat_rule,
            "assignee_user_id": str(task.assignee_user_id) if task.assignee_user_id else None,
        },
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await write_audit(db, action="task.create", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="CareTask", resource_id=str(task.id))
    await db.commit()
    return TaskOut.model_validate(task)


@router.get("/pets/{pet_id}/tasks")
async def list_tasks(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser,
    status: str | None = None,
) -> list[TaskOut]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    stmt = select(CareTask).where(CareTask.pet_id == pet.id)
    if status:
        stmt = stmt.where(CareTask.status == status)
    stmt = stmt.order_by(CareTask.created_at.desc()).limit(200)
    rows = (await db.execute(stmt)).scalars().all()
    return [TaskOut.model_validate(t) for t in rows]


@router.post("/tasks/{task_id}/complete")
async def complete_task(
    task_id: uuid.UUID, body: TaskComplete, db: DBSession, user: CurrentUser
) -> dict:
    task = (
        await db.execute(select(CareTask).where(CareTask.id == task_id))
    ).scalar_one_or_none()
    if task is None:
        from app.core.errors import NotFound

        raise NotFound(f"Task {task_id} not found.")
    pet = await perm.get_pet_or_404(db, task.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)

    if task.status == enums.TaskStatus.COMPLETED.value:
        # E2E-03: explicit conflict, never silent overwrite
        task.conflict_count += 1
        await db.flush()
        await create_life_event(
            db, pet_id=pet.id, event_type="care.task_conflict",
            payload={
                "task_id": str(task.id),
                "attempted_by": str(user.id),
                "completed_by": str(task.completed_by_user_id),
            },
            actor_id=user.id, source_type=enums.SourceType.SYSTEM_CALCULATED,
            provenance_level=enums.SourceType.SYSTEM_CALCULATED.value,
        )
        await create_notification(
            db,
            household_id=pet.household_id, pet_id=pet.id,
            notification_type="TASK_CONFLICT",
            title="任务重复完成提醒",
            body=f"任务「{task.title}」已由他人完成，本次操作被记录为冲突，未覆盖原记录。",
            data={"task_id": str(task.id)},
            dedupe_key=f"task-conflict:{task.id}:{user.id}",
        )
        await write_audit(db, action="task.complete_conflict", actor_user_id=user.id,
                          household_id=pet.household_id, pet_id=pet.id,
                          resource_type="CareTask", resource_id=str(task.id))
        await db.commit()
        raise ConflictError(
            "Task already completed by another member. First completion kept; "
            "this attempt recorded as a conflict.",
            code="TASK_CONFLICT",
            details={
                "task_id": str(task.id),
                "completed_by": str(task.completed_by_user_id),
                "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            },
        )

    if task.status != enums.TaskStatus.OPEN.value:
        raise ValidationFailed(f"Task is {task.status}, cannot complete.")

    task.status = enums.TaskStatus.COMPLETED.value
    task.completed_by_user_id = user.id
    task.completed_at = datetime.now(UTC)
    task.completion_note = body.note
    await db.flush()

    await create_life_event(
        db, pet_id=pet.id, event_type="care.task_completed",
        payload={"task_id": str(task.id), "completed_by": str(user.id),
                 "note": body.note},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    # repeating task → spawn next occurrence
    next_due = _next_due(task.due_at, task.repeat_rule)
    if next_due is not None:
        existing_next = (
            await db.execute(
                select(CareTask).where(
                    CareTask.pet_id == pet.id,
                    CareTask.title == task.title,
                    CareTask.due_at == next_due,
                    CareTask.status == enums.TaskStatus.OPEN.value,
                )
            )
        ).scalar_one_or_none()
        if existing_next is None:
            db.add(
                CareTask(
                    pet_id=pet.id, title=task.title, task_type=task.task_type,
                    due_at=next_due, repeat_rule=task.repeat_rule,
                    assignee_user_id=task.assignee_user_id,
                    created_by_user_id=user.id,
                )
            )
            await db.flush()
            await create_life_event(
                db, pet_id=pet.id, event_type="care.task_created",
                payload={
                    "task_id": "", "title": task.title,
                    "task_type": task.task_type,
                    "due_at": next_due.isoformat(),
                    "repeat_rule": task.repeat_rule,
                    "assignee_user_id": None,
                },
                actor_id=user.id, source_type=enums.SourceType.SYSTEM_CALCULATED,
                provenance_level=enums.SourceType.SYSTEM_CALCULATED.value,
                allow_duplicate=True,
            )
    await write_audit(db, action="task.complete", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="CareTask", resource_id=str(task.id))
    await db.commit()
    return {
        "task_id": str(task.id),
        "status": task.status,
        "completed_by": str(user.id),
        "completed_at": task.completed_at.isoformat(),
        "next_occurrence_due_at": next_due.isoformat() if next_due else None,
    }
