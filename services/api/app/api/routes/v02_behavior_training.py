"""v0.2 routes — behavior deepening + training + welfare library.

PLI-070 ABC (regression of v0.1, served with pattern analytics) ·
PLI-071 video binding (artifact_ids, asserted) · PLI-073 trigger graph ·
PLI-074 patterns/trends · PLI-075 event templates · PLI-079 preferences ·
PLI-084 advice safety filter · PLI-085..088 training goals/steps/sessions/
mastery · PLI-091 reward library · PLI-092 training tools ·
PLI-100 enrichment activity library.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import NotFound, ValidationFailed
from app.domain import enums
from app.models import (
    BehaviorEvent,
    ContentVersion,
    PetPreference,
    TrainingGoal,
    TrainingSession,
)
from app.services import permissions as perm
from app.services.ai_gateway import get_gateway
from app.services.eventlog import create_life_event, write_audit

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

# PLI-092: reward-based training tools (versioned content seeded at startup)
TRAINING_TOOLS_V1 = {
    "tools": [
        {"name": "零食袋（高价值奖励）", "use": "即时奖励", "safe": True},
        {"name": "响片（Clicker）", "use": "标记正确行为", "safe": True},
        {"name": "牵引绳（普通胸背）", "use": "安全管理", "safe": True},
        {"name": "嗅闻垫", "use": "嗅闻丰富化", "safe": True},
    ],
    "banned_note": "禁止使用电击项圈/暴力/惩罚式方法（PLI-084 安全过滤）。",
    "version": "1.0.0",
}

# PLI-100: enrichment activity library
ENRICHMENT_V1 = {
    "activities": [
        {"name": "嗅闻垫/藏食游戏", "domain": "嗅觉", "min_minutes": 10},
        {"name": "漏食玩具", "domain": "进食丰富化", "min_minutes": 15},
        {"name": "新路径散步", "domain": "探索", "min_minutes": 20},
        {"name": "箱体探索", "domain": "猫/环境", "min_minutes": 10},
        {"name": "寻回游戏", "domain": "运动", "min_minutes": 15},
    ],
    "version": "1.0.0",
}


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


# --- PLI-092/100 versioned libraries + PLI-223 seeding -------------------------------


async def ensure_content_seeded(db) -> None:
    pairs = [("training_tools", TRAINING_TOOLS_V1["version"], TRAINING_TOOLS_V1),
             ("enrichment_activities", ENRICHMENT_V1["version"], ENRICHMENT_V1)]
    for key, version, body in pairs:
        exists = (
            await db.execute(
                select(ContentVersion).where(
                    ContentVersion.content_key == key,
                    ContentVersion.version == version,
                )
            )
        ).scalar_one_or_none()
        if exists is None:
            db.add(ContentVersion(content_key=key, version=version, body=body))


@router.get("/training/tools")
async def training_tools(db: DBSession, user: CurrentUser) -> dict:
    row = (
        await db.execute(
            select(ContentVersion).where(ContentVersion.content_key == "training_tools")
            .order_by(ContentVersion.effective_at.desc())
        )
    ).scalars().first()
    if row is None:
        return TRAINING_TOOLS_V1
    return row.body


@router.get("/welfare/enrichment-activities")
async def enrichment_activities(db: DBSession, user: CurrentUser) -> dict:
    row = (
        await db.execute(
            select(ContentVersion).where(
                ContentVersion.content_key == "enrichment_activities"
            ).order_by(ContentVersion.effective_at.desc())
        )
    ).scalars().first()
    if row is None:
        return ENRICHMENT_V1
    return row.body
