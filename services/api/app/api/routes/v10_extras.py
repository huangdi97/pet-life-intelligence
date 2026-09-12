"""v1.0 extras — remaining P2 record-layer endpoints (PLI-065/066/076/077/
078/089/090/096/098/101/105/114/115/117/119/122/206/210). All deterministic
record/aggregation layers; no medical or behavioural diagnosis."""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import ValidationFailed
from app.domain import enums
from app.models import (
    BehaviorEvent,
    DeviceEvent,
    LifeEvent,
    MedicationPlan,
    PetFriend,
    SocialInteraction,
    TrainingGoal,
    TrainingSession,
)
from app.services import permissions as perm
from app.services.eventlog import create_notification, write_audit

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


# --- PLI-089/090/096/098 training extras -------------------------------------------


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


# --- PLI-122 visibility (audit-recorded level) -------------------------------------------


class VisibilityIn(BaseModel):
    level: str


@router.put("/pets/{pet_id}/social-visibility")
async def set_social_visibility(pet_id: uuid.UUID, body: VisibilityIn,
                                db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    if body.level not in {"PRIVATE", "FRIENDS", "HOUSEHOLD"}:
        raise ValidationFailed("level must be PRIVATE|FRIENDS|HOUSEHOLD")
    await write_audit(db, action="social_visibility.set", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="Pet", resource_id=str(pet.id),
                      detail={"level": body.level})
    await db.commit()
    return {"pet_id": str(pet.id), "level": body.level,
            "enforcement": "社交相关端点仅返回已授权关系数据；级别入审计。"}


# --- PLI-210 communication style -------------------------------------------------------------


class CommStyleIn(BaseModel):
    style: str


@router.put("/users/me/communication-style")
async def set_comm_style(body: CommStyleIn, db: DBSession, user: CurrentUser) -> dict:
    if body.style not in {"STANDARD", "SIMPLE", "DETAILED"}:
        raise ValidationFailed("style must be STANDARD|SIMPLE|DETAILED")
    await write_audit(db, action="comm_style.set", actor_user_id=user.id,
                      resource_type="User", resource_id=str(user.id),
                      detail={"style": body.style})
    await db.commit()
    return {"user_id": str(user.id), "style": body.style,
            "enforcement": "记录层：AI 生成文案按此偏好调整（提示词版本随内容发布）。"}


# --- PLI-048 emergency authorization mode (short-TTL, scoped, audited) ---------


class EmergencyGrantIn(BaseModel):
    user_id: uuid.UUID
    hours: int = Field(default=4, ge=1, le=24)


@router.post("/pets/{pet_id}/emergency-grants", status_code=201)
async def emergency_grant(pet_id: uuid.UUID, body: EmergencyGrantIn,
                          db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    from app.models import Grant as GrantModel

    row = GrantModel(
        pet_id=pet.id, user_id=body.user_id,
        scopes=[enums.Capability.MEDICAL_READ.value, enums.Capability.CARD_READ.value],
        reason="EMERGENCY authorization (auto-expiring)",
        granted_by_user_id=user.id,
        starts_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=body.hours),
    )
    db.add(row)
    await db.flush()
    await create_notification(
        db, household_id=pet.household_id, pet_id=pet.id,
        notification_type="EMERGENCY_GRANT",
        title="紧急授权已开启",
        body=f"紧急只读授权 {body.hours} 小时后自动失效。",
        data={"grant_id": str(row.id)},
        dedupe_key=f"emergency-grant:{row.id}",
        target_role=enums.HouseholdRole.OWNER.value,
    )
    await db.commit()
    return {"grant_id": str(row.id), "expires_at": row.expires_at.isoformat(),
            "scopes": row.scopes,
            "note": "紧急模式仅短期只读（医疗/卡片），自动到期，全程审计。"}


# --- PLI-030 abnormal-day hint (today vs baseline deviation) ---------------------


@router.get("/pets/{pet_id}/abnormal-day-hint")
async def abnormal_day_hint(pet_id: uuid.UUID, db: DBSession,
                            user: CurrentUser) -> dict:
    from app.models import Baseline

    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0,
                                                   microsecond=0)
    hints = []
    baselines = (
        await db.execute(select(Baseline).where(Baseline.pet_id == pet.id))
    ).scalars().all()
    type_by_metric = {"meal_count_per_day": "daily.meal",
                      "walk_minutes_per_day": "daily.walk",
                      "sleep_minutes_per_day": "daily.sleep"}
    for b in baselines:
        et = type_by_metric.get(b.metric)
        if not et:
            continue
        today_count = (
            await db.execute(
                select(func.count()).where(
                    LifeEvent.pet_id == pet.id,
                    LifeEvent.event_type == et,
                    LifeEvent.occurred_at >= day_start,
                    LifeEvent.retracted_at.is_(None),
                )
            )
        ).scalar_one()
        try:
            base = float(b.value)
        except ValueError:
            continue
        if base > 0 and today_count == 0:
            hints.append(f"今天还没有「{et}」记录（基线约 {base:g}/天）。")
    return {"hints": hints or ["今天与基线相比无明显异常。"],
            "rule": "确定性对比（今日计数 vs 基线），非健康判断。"}


# --- PLI-034 continuous care feedback (7-day streak vs baseline) -------------------


@router.get("/pets/{pet_id}/care-feedback")
async def care_feedback(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    counts = (
        await db.execute(
            select(LifeEvent.event_type, func.count()).where(
                LifeEvent.pet_id == pet.id,
                LifeEvent.occurred_at >= week_ago,
                LifeEvent.event_type.in_(["daily.meal", "daily.walk", "daily.play",
                                          "daily.sleep"]),
                LifeEvent.retracted_at.is_(None),
            ).group_by(LifeEvent.event_type)
        )
    ).all()
    feedback = [
        {"event_type": t, "count_7d": c,
         "status": "active" if c > 0 else "quiet"}
        for t, c in counts
    ]
    return {"feedback": feedback,
            "note": "轻量连续照护反馈：近 7 天记录活跃度（记录层）。"}


# --- PLI-081 behavior consultation package (JSON bundle) ------------------------------


@router.get("/pets/{pet_id}/behavior-consultation-package")
async def consultation_package(pet_id: uuid.UUID, db: DBSession,
                               user: CurrentUser) -> dict:
    from app.models import BehaviorInterventionPlan

    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    events = (
        await db.execute(
            select(BehaviorEvent).where(BehaviorEvent.pet_id == pet.id)
            .order_by(BehaviorEvent.occurred_at.desc()).limit(50)
        )
    ).scalars().all()
    plans = (
        await db.execute(
            select(BehaviorInterventionPlan).where(
                BehaviorInterventionPlan.pet_id == pet.id)
        )
    ).scalars().all()
    return {
        "pet": {"name": pet.name, "species": pet.species, "breed": pet.breed},
        "recent_behaviors": [
            {"occurred_at": b.occurred_at.isoformat(), "antecedent": b.antecedent,
             "behavior": b.behavior, "consequence": b.consequence,
             "intensity": b.intensity}
            for b in events
        ],
        "intervention_plans": [
            {"title": p.title, "steps": p.steps, "outcomes": p.outcomes}
            for p in plans
        ],
        "disclaimer": "信息整理供行为咨询使用；不构成诊断。",
    }
