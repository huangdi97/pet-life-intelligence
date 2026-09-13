"""v0.2 routes — care deepening + health follow-up.

PLI-039 handoff checklist · PLI-040 care-period daily report ·
PLI-041 care end summary · PLI-042 responsibility matrix ·
PLI-047 role-targeted notifications · PLI-057/058 medical record import ·
PLI-061 recovery plan · PLI-062 symptom trend · PLI-064 care reminders.
"""

import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from app.api.deps import CurrentUser, DBSession
from app.core.errors import NotFound, ValidationFailed
from app.domain import enums
from app.models import (
    CareHandoff,
    CareReminder,
    CareTask,
    HealthEvent,
    HealthRecord,
    LifeEvent,
    Notification,
    RecoveryPlan,
)
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["v02-care-health"])

DEFAULT_CHECKLIST = [
    "喂食时间与份量说明",
    "当前用药与给药时间",
    "行为禁忌与应激源",
    "紧急联系人 / 首选医院",
    "常用物品位置（牵引、食盆、猫砂）",
]


class ChecklistInitIn(BaseModel):
    items: list[str] = Field(default_factory=list)


class ChecklistItemIn(BaseModel):
    index: int = Field(ge=0)
    done: bool
    note: str = ""


class RecordImportIn(BaseModel):
    kind: str = Field(pattern="^(PRESCRIPTION|LAB|EXAM|VACCINATION)$")
    occurred_at: datetime | None = None
    content: dict = Field(default_factory=dict)
    source_type: str = enums.SourceType.PROFESSIONAL_CONFIRMED.value
    source_note: str = ""
    artifact_id: uuid.UUID | None = None


class RecoveryPlanIn(BaseModel):
    items: list[dict] = Field(min_length=1)


class ReminderIn(BaseModel):
    kind: str = Field(pattern="^(VACCINE|DEWORMING|CHECKUP)$")
    title: str = Field(min_length=1, max_length=200)
    due_date: date
    note: str = ""


async def _handoff_for(db, handoff_id, user, caregiver_ok=True):
    handoff = (
        await db.execute(select(CareHandoff).where(CareHandoff.id == handoff_id))
    ).scalar_one_or_none()
    if handoff is None:
        raise NotFound("Handoff not found.")
    pet = await perm.get_pet_or_404(db, handoff.pet_id)
    is_party = user.id in (handoff.owner_user_id, handoff.caregiver_user_id)
    if not is_party:
        await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    return handoff, pet


# --- PLI-039: handoff checklist ------------------------------------------------


@router.post("/handoffs/{handoff_id}/checklist", status_code=201)
async def init_checklist(
    handoff_id: uuid.UUID, body: ChecklistInitIn, db: DBSession, user: CurrentUser
) -> dict:
    handoff, pet = await _handoff_for(db, handoff_id, user)
    items = [{"text": t, "done": False, "done_by": None, "done_at": None}
             for t in (body.items or DEFAULT_CHECKLIST)]
    handoff.checklist = items
    flag_modified(handoff, "checklist")
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="care.checklist_updated",
        payload={"handoff_id": str(handoff.id), "items": len(items)},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await db.commit()
    return {"handoff_id": str(handoff.id), "checklist": items}


@router.post("/handoffs/{handoff_id}/checklist/update")
async def update_checklist(
    handoff_id: uuid.UUID, body: ChecklistItemIn, db: DBSession, user: CurrentUser
) -> dict:
    handoff, pet = await _handoff_for(db, handoff_id, user)
    if body.index >= len(handoff.checklist):
        raise ValidationFailed("checklist index out of range")
    handoff.checklist[body.index] = {
        **handoff.checklist[body.index],
        "done": body.done,
        "done_by": str(user.id),
        "done_at": datetime.now(timezone.utc).isoformat(),
    }
    flag_modified(handoff, "checklist")
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="care.checklist_updated",
        payload={"handoff_id": str(handoff.id), "index": body.index,
                 "done": body.done},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
        allow_duplicate=True,
    )
    await db.commit()
    return {"handoff_id": str(handoff.id), "checklist": handoff.checklist}


@router.get("/handoffs/{handoff_id}/checklist")
async def get_checklist(handoff_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    handoff, _ = await _handoff_for(db, handoff_id, user)
    return {"handoff_id": str(handoff.id), "checklist": handoff.checklist}


# --- PLI-040/041: care period reports -------------------------------------------


@router.get("/handoffs/{handoff_id}/daily-report")
async def handoff_daily_report(
    handoff_id: uuid.UUID, db: DBSession, user: CurrentUser,
    date: date | None = Query(default=None),
) -> dict:
    handoff, pet = await _handoff_for(db, handoff_id, user)
    day = date or datetime.now(timezone.utc).date()
    start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    rows = (
        await db.execute(
            select(LifeEvent).where(
                LifeEvent.pet_id == pet.id,
                LifeEvent.occurred_at >= max(start, handoff.start_at.replace(tzinfo=timezone.utc)),
                LifeEvent.occurred_at < end,
                LifeEvent.retracted_at.is_(None),
            ).order_by(LifeEvent.occurred_at)
        )
    ).scalars().all()
    counts: dict[str, int] = {}
    for e in rows:
        counts[e.event_type] = counts.get(e.event_type, 0) + 1
    return {"handoff_id": str(handoff.id), "date": day.isoformat(),
            "event_counts": counts,
            "events": [{"event_id": str(e.id), "event_type": e.event_type,
                        "occurred_at": e.occurred_at.isoformat()} for e in rows]}


@router.get("/handoffs/{handoff_id}/summary")
async def handoff_end_summary(handoff_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    handoff, pet = await _handoff_for(db, handoff_id, user)
    end = handoff.ended_at or datetime.now(timezone.utc)
    rows = (
        await db.execute(
            select(LifeEvent).where(
                LifeEvent.pet_id == pet.id,
                LifeEvent.occurred_at >= handoff.start_at,
                LifeEvent.occurred_at <= end,
                LifeEvent.retracted_at.is_(None),
            )
        )
    ).scalars().all()
    counts: dict[str, int] = {}
    for e in rows:
        counts[e.event_type] = counts.get(e.event_type, 0) + 1
    tasks_done = (
        await db.execute(
            select(CareTask).where(
                CareTask.pet_id == pet.id,
                CareTask.status == "COMPLETED",
                CareTask.completed_at >= handoff.start_at,
                CareTask.completed_at <= end,
            )
        )
    ).scalars().all()
    return {
        "handoff_id": str(handoff.id),
        "window": {"start": handoff.start_at.isoformat(), "end": end.isoformat()},
        "event_counts": counts,
        "tasks_completed": [{"title": t.title, "completed_by": str(t.completed_by_user_id)}
                            for t in tasks_done],
        "notice": "总结为事件统计，非主观评价。",
    }


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


# --- PLI-057/058: medical record import ---------------------------------------------


@router.post("/pets/{pet_id}/health-records", status_code=201)
async def import_health_record(
    pet_id: uuid.UUID, body: RecordImportIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_WRITE)
    if body.source_type not in enums.PROVENANCE_LEVELS:
        raise ValidationFailed("source_type must be a valid provenance level (PLI-058)")
    # PLI-045: professional records must carry signature provenance.
    sig = body.content.get("signature") if isinstance(body.content, dict) else None
    if body.kind in ("PRESCRIPTION", "EXAM"):
        signed = isinstance(sig, dict) and all(
            sig.get(k) for k in ("signer", "institution", "signed_at")
        )
        signature_status = "SIGNED" if signed else "UNSIGNED"
    else:
        signature_status = "NOT_REQUIRED"
    record = HealthRecord(
        pet_id=pet.id, kind=body.kind, occurred_at=body.occurred_at,
        content=body.content, source_type=body.source_type,
        signature_status=signature_status,
        source_note=body.source_note, artifact_id=body.artifact_id,
        created_by_user_id=user.id,
    )
    db.add(record)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="health.record_imported",
        payload={"record_id": str(record.id), "kind": record.kind,
                 "source_type": record.source_type},
        actor_id=user.id, source_type=enums.SourceType(body.source_type),
        source_ref=f"health_record:{record.id}",
    )
    await write_audit(db, action="health_record.import", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="HealthRecord", resource_id=str(record.id))
    await db.commit()
    return {"record_id": str(record.id), "kind": record.kind,
            "provenance": record.source_type,
            "signature_status": record.signature_status,
            "note": "导入记录带来源分级；PRESCRIPTION/EXAM 缺签名标记为 UNSIGNED；"
                    "不自动生成诊断。"}


@router.get("/pets/{pet_id}/health-records")
async def list_health_records(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_READ)
    rows = (
        await db.execute(
            select(HealthRecord).where(HealthRecord.pet_id == pet.id)
            .order_by(HealthRecord.created_at.desc())
        )
    ).scalars().all()
    return [
        {"record_id": str(r.id), "kind": r.kind, "content": r.content,
         "source_type": r.source_type, "source_note": r.source_note,
         "signature_status": r.signature_status,
         "occurred_at": r.occurred_at.isoformat() if r.occurred_at else None}
        for r in rows
    ]


# --- PLI-061: recovery plan -----------------------------------------------------------


@router.post("/health-events/{health_event_id}/recovery-plan", status_code=201)
async def create_recovery_plan(
    health_event_id: uuid.UUID, body: RecoveryPlanIn, db: DBSession, user: CurrentUser
) -> dict:
    he = (
        await db.execute(select(HealthEvent).where(HealthEvent.id == health_event_id))
    ).scalar_one_or_none()
    if he is None:
        raise NotFound("Health event not found.")
    pet = await perm.get_pet_or_404(db, he.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_WRITE)
    plan = RecoveryPlan(
        health_event_id=he.id, pet_id=pet.id,
        items=[{"description": str(i.get("description", "")),
                "due_at": i.get("due_at"), "status": "PENDING"}
               for i in body.items],
        created_by_user_id=user.id,
    )
    db.add(plan)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="recovery_plan.updated",
        payload={"plan_id": str(plan.id), "items": len(plan.items)},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
        source_ref=f"recovery_plan:{plan.id}",
    )
    await db.commit()
    return {"plan_id": str(plan.id), "items": plan.items}


@router.patch("/recovery-plans/{plan_id}/items/{index}")
async def update_recovery_item(
    plan_id: uuid.UUID, index: int, body: dict, db: DBSession, user: CurrentUser
) -> dict:
    plan = (
        await db.execute(select(RecoveryPlan).where(RecoveryPlan.id == plan_id))
    ).scalar_one_or_none()
    if plan is None:
        raise NotFound("Plan not found.")
    pet = await perm.get_pet_or_404(db, plan.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_WRITE)
    if index >= len(plan.items):
        raise ValidationFailed("item index out of range")
    status = str(body.get("status", ""))
    if status not in {"PENDING", "DONE", "SKIPPED"}:
        raise ValidationFailed("status must be PENDING|DONE|SKIPPED")
    plan.items[index]["status"] = status
    plan.updated_at = datetime.now(timezone.utc)
    flag_modified(plan, "items")
    await db.flush()
    await db.commit()
    return {"plan_id": str(plan.id), "items": plan.items}


# --- PLI-062: symptom trend ------------------------------------------------------------


@router.get("/health-events/{health_event_id}/trend")
async def symptom_trend(
    health_event_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> dict:
    he = (
        await db.execute(select(HealthEvent).where(HealthEvent.id == health_event_id))
    ).scalar_one_or_none()
    if he is None:
        raise NotFound("Health event not found.")
    pet = await perm.get_pet_or_404(db, he.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_READ)
    rows = (
        await db.execute(
            select(LifeEvent).where(
                LifeEvent.pet_id == pet.id,
                LifeEvent.occurred_at >= he.created_at,
                LifeEvent.event_type.in_(["health.observation_added", "ai.observation",
                                          "health.intake_step"]),
                LifeEvent.retracted_at.is_(None),
            ).order_by(LifeEvent.occurred_at)
        )
    ).scalars().all()
    per_day: dict[str, int] = {}
    for e in rows:
        k = e.occurred_at.date().isoformat()
        per_day[k] = per_day.get(k, 0) + 1
    triage = (
        await db.execute(
            select(LifeEvent).where(
                LifeEvent.pet_id == pet.id,
                LifeEvent.event_type == "health.triage_assigned",
                LifeEvent.occurred_at >= he.created_at,
            ).order_by(LifeEvent.occurred_at)
        )
    ).scalars().all()
    return {
        "health_event_id": str(he.id),
        "observations_per_day": per_day,
        "triage_timeline": [
            {"level": e.payload.get("level"), "at": e.occurred_at.isoformat()}
            for e in triage
        ],
        "notice": "确定性统计（规则），非医学判断。",
    }


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
