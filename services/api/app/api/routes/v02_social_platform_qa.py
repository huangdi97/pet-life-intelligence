"""v0.2 personal QA — PLI-197 personal QA · PLI-199 why-happened hints ·
PLI-200 low-risk task plans · PLI-205 structured memory.

Pure refactor of v02_social_platform.py; endpoint bodies kept verbatim.
"""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DBSession
from app.api.routes.v02_social_platform_daily import _event_text
from app.core.errors import NotFound
from app.domain import enums
from app.models import (
    Baseline,
    DietProfile,
    LifeEvent,
    MedicationPlan,
    PetPreference,
)
from app.services import permissions as perm
from app.services.ai_gateway import get_gateway
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["v02-social-platform"])

_GATEWAY = get_gateway()


class AskIn(BaseModel):
    question: str = Field(min_length=2, max_length=500)


@router.post("/pets/{pet_id}/ask")
async def pet_ask(pet_id: uuid.UUID, body: AskIn, db: DBSession, user: CurrentUser) -> dict:
    """PLI-197 personal QA — answer_with_evidence must cite real events."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(LifeEvent).where(
                LifeEvent.pet_id == pet.id, LifeEvent.retracted_at.is_(None)
            ).order_by(LifeEvent.occurred_at.desc()).limit(200)
        )
    ).scalars().all()
    evidence = [
        {"id": str(e.id), "text": f"{e.occurred_at:%Y-%m-%d} {e.event_type} {_event_text(e)}"}
        for e in rows
    ]
    result = _GATEWAY.invoke(
        "answer_with_evidence", {"question": body.question, "evidence": evidence}
    )
    sufficient = result.result["sufficient"]
    await create_life_event(
        db, pet_id=pet.id, event_type="pet.asked",
        payload={"question": body.question[:100],
                 "sufficient": sufficient,
                 "citations": result.result["citations"]},
        actor_id=user.id, source_type=enums.SourceType.AI_DERIVED,
        provenance_level=enums.SourceType.AI_DERIVED.value,
        allow_duplicate=True,
    )
    await db.commit()
    return {
        "answer": result.result["answer"],
        "citations": result.result["citations"],
        "sufficient": sufficient,
        "disclaimer": result.result["disclaimer"],
        "note": "答案必须引用证据；citations 可在 Timeline 核对。",
    }


@router.get("/pets/{pet_id}/why")
async def why_happened(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser,
    after_event_id: uuid.UUID = Query(...),
) -> dict:
    """PLI-199: deterministic 'prior events' hints — explicitly NOT causal."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    anchor = (
        await db.execute(select(LifeEvent).where(LifeEvent.id == after_event_id))
    ).scalar_one_or_none()
    if anchor is None or anchor.pet_id != pet.id:
        raise NotFound("Anchor event not found on this pet.")
    window_start = anchor.occurred_at - timedelta(hours=48)
    rows = (
        await db.execute(
            select(LifeEvent).where(
                LifeEvent.pet_id == pet.id,
                LifeEvent.occurred_at >= window_start,
                LifeEvent.occurred_at < anchor.occurred_at,
                LifeEvent.retracted_at.is_(None),
            ).order_by(LifeEvent.occurred_at.desc()).limit(10)
        )
    ).scalars().all()
    return {
        "anchor_event_id": str(anchor.id),
        "prior_events": [
            {"event_id": str(e.id), "event_type": e.event_type,
             "occurred_at": e.occurred_at.isoformat()}
            for e in rows
        ],
        "notice": "仅展示时间上更早的相关记录（相关性提示），不是因果解释。",
    }


# --- PLI-200 low-risk task plan --------------------------------------------------------


@router.post("/pets/{pet_id}/task-plan")
async def low_risk_task_plan(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> dict:
    """PLI-200: deterministic suggested tasks from baseline gaps — never
    medical actions."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    today = datetime.now(timezone.utc).date()
    suggestions = []
    for _metric, event_type in (("meal", "daily.meal"), ("walk", "daily.walk"),
                               ("play", "daily.play"), ("sleep", "daily.sleep")):
        count = (
            await db.execute(
                select(func.count()).where(
                    LifeEvent.pet_id == pet.id,
                    LifeEvent.event_type == event_type,
                    LifeEvent.occurred_at >= datetime(today.year, today.month, today.day,
                                                     tzinfo=timezone.utc),
                )
            )
        ).scalar_one()
        if count == 0:
            suggestions.append(f"今天还没有「{event_type}」记录，需要时可在 Quick Log 补记。")
    await write_audit(db, action="task_plan.suggest", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="TaskPlan", detail={"count": len(suggestions)})
    await db.commit()
    return {"suggestions": suggestions or ["今天的常规记录已齐全。"],
            "boundary": "仅低风险日常建议；不包含医疗动作（PLI-204 硬边界）。"}


# --- PLI-205 structured memory ----------------------------------------------------------


@router.get("/pets/{pet_id}/memory")
async def structured_memory(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    prefs = (
        await db.execute(select(PetPreference).where(PetPreference.pet_id == pet.id))
    ).scalars().all()
    baselines = (
        await db.execute(select(Baseline).where(Baseline.pet_id == pet.id))
    ).scalars().all()
    diet = (
        await db.execute(select(DietProfile).where(DietProfile.pet_id == pet.id))
    ).scalar_one_or_none()
    meds = (
        await db.execute(
            select(MedicationPlan).where(
                MedicationPlan.pet_id == pet.id, MedicationPlan.status == "ACTIVE"
            )
        )
    ).scalars().all()
    return {
        "pet_id": str(pet.id),
        "memory": {
            "preferences": [
                {"kind": p.kind, "subject": p.subject, "source": p.source_type}
                for p in prefs
            ],
            "baselines": [
                {"metric": b.metric, "value": b.value, "algorithm": b.algorithm}
                for b in baselines
            ],
            "diet": ({"allergies": diet.allergies, "current_food": diet.current_food,
                      "source": diet.source_type} if diet else None),
            "active_medications": [
                {"medicine_name": m.medicine_name, "dose_text": m.dose_text,
                 "source": m.source_type}
                for m in meds
            ],
        },
        "notice": "结构化记忆只来自已验证的记录，均带来源。",
    }


