"""PLI-090/096/098/101/105/114/115/117/119 — training extras, enrichment and
social-record endpoints (deterministic record layers)."""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.domain import enums
from app.models import (
    BehaviorEvent,
    MedicationPlan,
    PetFriend,
    SocialInteraction,
    TrainingGoal,
    TrainingSession,
)
from app.services import permissions as perm

router = APIRouter(tags=["v10-extras"])


@router.get("/training-goals/{goal_id}/next-step")
async def next_step(goal_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    """PLI-090: deterministic suggestion from mastery + PLI-096 health cap."""
    goal = (
        await db.execute(select(TrainingGoal).where(TrainingGoal.id == goal_id))
    ).scalar_one_or_none()
    if goal is None:
        from app.core.errors import NotFound

        raise NotFound("Goal not found.")
    pet = await perm.get_pet_or_404(db, goal.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    if goal.mastery_level >= 5:
        suggestion = "目标已达成（5/5）。可进入泛化练习或存档为成果证明。"
    elif goal.mastery_level >= 3:
        suggestion = "掌握度良好：在更多环境/干扰下重复当前步骤。"
    else:
        suggestion = "继续当前步骤，短时多次，奖励即时。"
    active_meds = (
        await db.execute(
            select(MedicationPlan).where(
                MedicationPlan.pet_id == pet.id, MedicationPlan.status == "ACTIVE"
            )
        )
    ).scalars().all()
    health_cap = None
    if active_meds:
        health_cap = {
            "capped_minutes": 15,
            "reason": f"宠物有进行中用药（{active_meds[0].medicine_name}）；训练强度需保守，如异常请咨询兽医。",
        }
    return {"goal_id": str(goal.id), "mastery_level": goal.mastery_level,
            "suggestion": suggestion, "health_constraint": health_cap}


@router.get("/training-goals/{goal_id}/achievement")
async def achievement(goal_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    """PLI-098: achievement proof (records-based certificate)."""
    goal = (
        await db.execute(select(TrainingGoal).where(TrainingGoal.id == goal_id))
    ).scalar_one_or_none()
    if goal is None:
        from app.core.errors import NotFound

        raise NotFound("Goal not found.")
    pet = await perm.get_pet_or_404(db, goal.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    sessions = (
        await db.execute(
            select(TrainingSession).where(TrainingSession.goal_id == goal.id)
        )
    ).scalars().all()
    achieved = goal.mastery_level >= 5
    return {
        "goal_id": str(goal.id), "title": goal.title,
        "achieved": achieved,
        "sessions": len(sessions),
        "mastery_level": goal.mastery_level,
        "certificate": {
            "issued_at": datetime.now(timezone.utc).isoformat() if achieved else None,
            "basis": f"{len(sessions)} 次训练会话记录，掌握度 {goal.mastery_level}/5",
        },
        "notice": "证明基于家庭记录统计，非第三方认证。",
    }


# --- PLI-101 enrichment plan (from versioned library, deterministic) -----------------


@router.get("/pets/{pet_id}/enrichment-plan")
async def enrichment_plan(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    plan = [
        {"day": "Mon", "activity": "嗅闻垫/藏食游戏", "minutes": 10},
        {"day": "Wed", "activity": "新路径散步", "minutes": 20},
        {"day": "Sat", "activity": "漏食玩具", "minutes": 15},
    ]
    return {"plan": plan,
            "note": "默认模板计划（来自活动库 v1.0.0）；以宠物自愿参与为前提。"}


# --- PLI-105 low-stimulus hint (deterministic from device/behavior counts) ------------


@router.get("/pets/{pet_id}/low-stimulus-hint")
async def low_stimulus_hint(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    severe = (
        await db.execute(
            select(BehaviorEvent).where(
                BehaviorEvent.pet_id == pet.id,
                BehaviorEvent.intensity == "SEVERE",
                BehaviorEvent.occurred_at >= week_ago,
            )
        )
    ).scalars().all()
    hint = len(severe) >= 2
    return {"hint": hint, "severe_events_last_7d": len(severe),
            "rule": "近 7 天 ≥2 次重度强度行为记录 → 建议低刺激环境。",
            "notice": "确定性提示，非诊断。"}


# --- PLI-114/115/117/119 social records ------------------------------------------------


@router.get("/pets/{pet_id}/social/feedback-pairs")
async def social_feedback_pairs(pet_id: uuid.UUID, db: DBSession,
                                user: CurrentUser) -> list[dict]:
    """PLI-114: pairs where both sides logged interactions (bidirectional)."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    mine = (
        await db.execute(
            select(SocialInteraction).where(SocialInteraction.pet_id == pet.id)
        )
    ).scalars().all()
    theirs = (
        await db.execute(
            select(SocialInteraction).where(SocialInteraction.friend_pet_id == pet.id)
        )
    ).scalars().all()
    their_partners = {s.pet_id for s in theirs}
    return [
        {"friend_pet_id": str(f), "bidirectional": True}
        for f in {s.friend_pet_id for s in mine} & their_partners
    ]


@router.get("/pets/{pet_id}/social/co-occurrence")
async def social_co_occurrence(pet_id: uuid.UUID, db: DBSession,
                               user: CurrentUser) -> dict:
    """PLI-115: experiential co-occurrence (shared friends) — explicitly NOT
    a compatibility score."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    my_friends = {
        r.friend_pet_id
        for r in (
            await db.execute(
                select(PetFriend).where(
                    PetFriend.pet_id == pet.id, PetFriend.status == "ACTIVE"
                )
            )
        ).scalars().all()
    }
    candidates: dict[uuid.UUID, int] = {}
    for f in my_friends:
        rows = (
            await db.execute(
                select(PetFriend).where(
                    PetFriend.friend_pet_id == f,
                    PetFriend.status == "ACTIVE",
                    PetFriend.pet_id != pet.id,
                )
            )
        ).scalars().all()
        for r in rows:
            candidates[r.pet_id] = candidates.get(r.pet_id, 0) + 1
    return {
        "candidates": [
            {"pet_id": str(pid), "shared_friends": n} for pid, n in
            sorted(candidates.items(), key=lambda kv: -kv[1])[:10]
        ],
        "notice": "仅经验共现统计；不做科学兼容度评分。",
    }


@router.get("/pets/{pet_id}/social/baseline")
async def social_baseline(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    """PLI-117: interactions per week (deterministic)."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(SocialInteraction).where(SocialInteraction.pet_id == pet.id)
        )
    ).scalars().all()
    per_week: dict[str, int] = {}
    for s in rows:
        iso = s.occurred_at.isocalendar()
        per_week[f"{iso.year}-W{iso.week:02d}"] = \
            per_week.get(f"{iso.year}-W{iso.week:02d}", 0) + 1
    return {"per_week": per_week}


@router.get("/pets/{pet_id}/familiar-people")
async def familiar_people(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    """PLI-119: familiar people from behavior event records."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(select(BehaviorEvent).where(BehaviorEvent.pet_id == pet.id))
    ).scalars().all()
    people: dict[str, int] = {}
    for b in rows:
        for name in (b.people_involved or "").split("、"):
            name = name.strip()
            if name:
                people[name] = people.get(name, 0) + 1
    return {"people": people, "notice": "来自行为事件记录的共现统计。"}
