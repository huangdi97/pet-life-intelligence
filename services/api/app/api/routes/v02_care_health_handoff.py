"""v0.2 routes — care handoff deepening (v02_care_health sub-module).

PLI-039 handoff checklist · PLI-040 care-period daily report ·
PLI-041 care end summary.

Pure refactor of v02_care_health.py; endpoint bodies kept verbatim.
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
from app.models import CareHandoff, CareTask, LifeEvent
from app.services import permissions as perm
from app.services.eventlog import create_life_event

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
