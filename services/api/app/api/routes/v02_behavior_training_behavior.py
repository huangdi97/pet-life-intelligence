"""v0.2 behavior routes — PLI-075 event templates · PLI-073 trigger graph ·
PLI-074 patterns/trends · PLI-084 advice safety filter.

Split from v02_behavior_training.py; endpoint bodies kept verbatim.
"""

import uuid

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.domain import enums
from app.models import BehaviorEvent
from app.services import permissions as perm
from app.services.ai_gateway import get_gateway
from app.services.eventlog import create_life_event

router = APIRouter(tags=["v02-behavior-training"])

_GATEWAY = get_gateway()

# PLI-075: event templates (safe presets; no diagnosis language)
BEHAVIOR_TEMPLATES = {
    "barking": {"label": "吠叫", "antecedent": "", "behavior_hint": "连续吠叫 ___ 秒",
                "consequence": ""},
    "scratching": {"label": "抓挠", "antecedent": "", "behavior_hint": "抓挠 ___（门/沙发/笼）",
                   "consequence": ""},
    "destructive": {"label": "破坏", "antecedent": "", "behavior_hint": "咬/撕 ___",
                    "consequence": ""},
    "hiding": {"label": "躲藏", "antecedent": "", "behavior_hint": "躲到 ___ 超过 ___ 分钟",
               "consequence": ""},
    "house_soiling": {"label": "随处排泄", "antecedent": "", "behavior_hint": "在 ___ 排泄",
                      "consequence": ""},
}


class AdviceIn(BaseModel):
    context: str = Field(min_length=1)


# --- PLI-075 templates -------------------------------------------------------


@router.get("/behavior-templates")
async def behavior_templates() -> dict:
    return {"templates": BEHAVIOR_TEMPLATES,
            "note": "模板只是记录快捷方式；不诊断、不分级。"}


# --- PLI-073 trigger graph + PLI-074 trends -----------------------------------


@router.get("/pets/{pet_id}/behavior/triggers")
async def behavior_triggers(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(BehaviorEvent).where(BehaviorEvent.pet_id == pet.id)
        )
    ).scalars().all()
    graph: dict[str, dict[str, int]] = {}
    for b in rows:
        ant = (b.antecedent or "未记录").strip()[:40]
        graph.setdefault(ant, {})
        graph[ant][b.behavior[:40]] = graph[ant].get(b.behavior[:40], 0) + 1
    return {
        "pet_id": str(pet.id),
        "triggers": graph,
        "notice": "事件计数相关展示，不构成因果结论或诊断。",
    }


@router.get("/pets/{pet_id}/behavior/trends")
async def behavior_trends(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser,
    intensity: str | None = Query(default=None),
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(BehaviorEvent).where(BehaviorEvent.pet_id == pet.id)
            .order_by(BehaviorEvent.occurred_at)
        )
    ).scalars().all()
    per_week: dict[str, int] = {}
    for b in rows:
        iso = b.occurred_at.isocalendar()
        key = f"{iso.year}-W{iso.week:02d}"
        per_week[key] = per_week.get(key, 0) + 1
    by_intensity: dict[str, int] = {}
    for b in rows:
        if b.intensity:
            by_intensity[b.intensity] = by_intensity.get(b.intensity, 0) + 1
    return {"per_week": per_week, "by_intensity": by_intensity,
            "notice": "确定性统计；强度为主观记录（OWNER_REPORTED）。"}


# --- PLI-084 advice safety filter -------------------------------------------------


@router.post("/pets/{pet_id}/behavior/advice")
async def behavior_advice(
    pet_id: uuid.UUID, body: AdviceIn, db: DBSession, user: CurrentUser
) -> dict:
    """AI mock advice with hard safety filter (reward-based only)."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    candidates = [
        f"针对「{body.context[:40]}」：奖励式训练建议（基于当前记录的观察）。",
        "电击项圈可以快速纠正这个行为",  # deliberately unsafe candidate
        "保持规律作息，逐步脱敏（每次轻微、可控制的暴露）。",
    ]
    result = _GATEWAY.invoke("behavior_advice", {"advice_candidates": candidates})
    if result.result["filtered_reasons"]:
        await create_life_event(
            db, pet_id=pet.id, event_type="advice.filtered",
            payload={"count": len(result.result["filtered_reasons"]),
                     "reasons": result.result["filtered_reasons"]},
            actor_id=user.id, source_type=enums.SourceType.SYSTEM_CALCULATED,
            provenance_level=enums.SourceType.SYSTEM_CALCULATED.value,
            allow_duplicate=True,
        )
    await db.commit()
    return {
        "advice": result.result["advice"],
        "filtered_reasons": result.result["filtered_reasons"],
        "policy": "reward-based only；惩罚式/厌恶式建议被过滤（PLI-084）。",
        "disclaimer": result.result["disclaimer"],
    }
