"""PLI-065/066/076/077/078 — chronic health pattern, senior baseline and
deterministic behavior-keyword classification (record layers only)."""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.domain import enums
from app.models import BehaviorEvent, DeviceEvent, TrainingSession
from app.services import permissions as perm

router = APIRouter(tags=["v10-extras"])


# --- PLI-065 chronic pattern (deterministic: OPEN health events > 30 days) ----


@router.get("/pets/{pet_id}/health-events/chronic")
async def chronic_events(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    from app.models import HealthEvent

    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_READ)
    threshold = datetime.now(timezone.utc) - timedelta(days=30)
    rows = (
        await db.execute(
            select(HealthEvent).where(
                HealthEvent.pet_id == pet.id,
                HealthEvent.status != enums.HealthEventStatus.CLOSED.value,
                HealthEvent.created_at < threshold,
            )
        )
    ).scalars().all()
    return {
        "chronic_candidates": [
            {"health_event_id": str(h.id), "chief_complaint": h.chief_complaint,
             "open_since": h.created_at.isoformat()}
            for h in rows
        ],
        "rule": "OPEN 超过 30 天的健康事件进入慢病模式视图（确定性规则）。",
        "notice": "慢病管理需兽医指导；本视图仅整理。",
    }


# --- PLI-066 senior baseline ----------------------------------------------------


SENIOR_AGE = {"dog": 7, "cat": 10}


@router.post("/pets/{pet_id}/baseline/recompute-senior", status_code=201)
async def recompute_senior_baseline(pet_id: uuid.UUID, db: DBSession,
                                    user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    senior = False
    age_years = None
    if pet.birth_date:
        today = datetime.now(timezone.utc).date()
        age_years = (today - pet.birth_date).days / 365.25
        senior = age_years >= SENIOR_AGE.get(pet.species, 99)
    window_days = 90 if senior else 14
    if not senior:
        return {"senior": False, "age_years": round(age_years, 1) if age_years else None,
                "window_days": window_days,
                "note": "未达老年阈值（狗≥7岁/猫≥10岁）；常规窗口保持 14 天。"}
    return {"senior": True, "age_years": round(age_years, 1),
            "window_days": window_days,
            "next": "使用 POST /baseline/recompute?window_days=90 计算老年基线。"}


# --- PLI-076/077/078 behavior classification (deterministic keywords) ------------


AVOIDANCE_KEYS = ("躲", "怕", "恐惧", "发抖", "回避", "hide", "fear")
AGGRESSION_KEYS = ("咬", "攻击", "呲牙", "低吼", "扑", "bite", "aggressive", "growl")
ALONE_KEYS = ("独处", "独自", "分离", "alone", "separation")


def _classify(text: str) -> str:
    if any(k in text for k in AGGRESSION_KEYS):
        return "AGGRESSION_RISK"
    if any(k in text for k in AVOIDANCE_KEYS):
        return "AVOIDANCE_FEAR"
    if any(k in text for k in ALONE_KEYS):
        return "ALONE"
    return "GENERAL"


@router.get("/pets/{pet_id}/behavior/categories")
async def behavior_categories(pet_id: uuid.UUID, db: DBSession,
                              user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(select(BehaviorEvent).where(BehaviorEvent.pet_id == pet.id))
    ).scalars().all()
    counts: dict[str, int] = {"GENERAL": 0, "AVOIDANCE_FEAR": 0,
                              "AGGRESSION_RISK": 0, "ALONE": 0}
    for b in rows:
        counts[_classify(f"{b.behavior} {b.antecedent} {b.owner_notes}")] += 1
    return {
        "counts": counts,
        "notice": "关键词分类用于记录整理；不构成行为诊断。攻击相关记录建议咨询专业人士。",
    }


@router.get("/pets/{pet_id}/behavior/alone-profile")
async def alone_profile(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    """PLI-078: alone-behavior record layer (events + camera clips)."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(select(BehaviorEvent).where(BehaviorEvent.pet_id == pet.id))
    ).scalars().all()
    alone_events = [
        b for b in rows if _classify(f"{b.behavior} {b.antecedent}") == "ALONE"
    ]
    clips = (
        await db.execute(
            select(DeviceEvent).where(
                DeviceEvent.pet_id == pet.id,
                DeviceEvent.event_kind == "CAMERA_CLIP",
            ).order_by(DeviceEvent.occurred_at.desc()).limit(10)
        )
    ).scalars().all()
    return {"alone_event_count": len(alone_events),
            "recent_camera_clips": len(clips),
            "notice": "记录层汇总；不推断分离焦虑等诊断。"}


# --- PLI-089 generalization matrix (training context) ----------------------------


@router.get("/pets/{pet_id}/training/generalization")
async def generalization_matrix(pet_id: uuid.UUID, db: DBSession,
                                user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(TrainingSession).where(TrainingSession.pet_id == pet.id)
        )
    ).scalars().all()
    matrix: dict[str, dict[str, int]] = {}
    for s in rows:
        ctx = (s.focus or "未记录")[:40]
        matrix.setdefault(ctx, {})
        matrix[ctx][s.pet_response] = matrix[ctx].get(s.pet_response, 0) + 1
    return {"matrix": matrix,
            "notice": "不同情境下的会话表现统计（环境泛化记录），非评估结论。"}
