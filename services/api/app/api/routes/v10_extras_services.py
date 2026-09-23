"""PLI-048/030/034/081/099 — emergency grants, baseline hints, care feedback,
consultation package and welfare profile (record layers)."""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import ValidationFailed
from app.domain import enums
from app.models import BehaviorEvent, LifeEvent
from app.services import permissions as perm
from app.services.eventlog import create_notification

router = APIRouter(tags=["v10-extras"])


# --- PLI-048 emergency authorization mode (short-TTL, scoped, audited) ---------

# SAFETY:
# Emergency grants are short-lived (<=24h), read-only (MEDICAL/CARD) and
# written to the audit log; they never grant write or manage capabilities.


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


# --- PLI-099 five-domain welfare profile ------------------------------------


WELFARE_DOMAINS = {"NUTRITION", "ENVIRONMENT", "HEALTH", "BEHAVIOR", "MENTAL"}


class WelfareProfileIn(BaseModel):
    domains: dict


@router.put("/pets/{pet_id}/welfare-profile")
async def put_welfare_profile(pet_id: uuid.UUID, body: WelfareProfileIn,
                              db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    invalid = [k for k in body.domains if k not in WELFARE_DOMAINS]
    if invalid:
        raise ValidationFailed(f"unknown domains: {invalid}")
    from app.models import WelfareProfile as WP

    row = (
        await db.execute(select(WP).where(WP.pet_id == pet.id))
    ).scalar_one_or_none()
    if row is None:
        row = WP(pet_id=pet.id, updated_by_user_id=user.id)
        db.add(row)
    row.domains = body.domains
    row.updated_by_user_id = user.id
    from sqlalchemy.orm.attributes import flag_modified

    flag_modified(row, "domains")
    await db.flush()
    await db.commit()
    return {"pet_id": str(pet.id), "domains": row.domains}


@router.get("/pets/{pet_id}/welfare-profile")
async def get_welfare_profile(pet_id: uuid.UUID, db: DBSession,
                              user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    from app.models import WelfareProfile as WP

    row = (
        await db.execute(select(WP).where(WP.pet_id == pet.id))
    ).scalar_one_or_none()
    if row is None:
        return {"pet_id": str(pet.id), "domains": None,
                "domains_schema": sorted(WELFARE_DOMAINS)}
    return {"pet_id": str(pet.id), "domains": row.domains,
            "updated_at": row.updated_at.isoformat()}
