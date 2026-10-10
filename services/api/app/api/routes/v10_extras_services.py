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


PRODUCT_TZ = timezone(timedelta(hours=8))
_HINT_METRICS = {
    "meal_count_per_day": {
        "event_type": "daily.meal",
        "label": "进食",
        "unit": "次",
        "mode": "count",
        "next_step": "继续按真实发生记录进食；如果记录长期明显变化，再结合食欲和健康事实查看。",
    },
    "walk_minutes_per_day": {
        "event_type": "daily.walk",
        "label": "散步",
        "unit": "分钟",
        "mode": "duration",
        "next_step": "继续记录真实散步时长；如果活动变化持续，再结合行为和健康记录判断下一步。",
    },
    "sleep_minutes_per_day": {
        "event_type": "daily.sleep",
        "label": "睡眠",
        "unit": "分钟",
        "mode": "duration",
        "next_step": "继续记录可观察到的睡眠时长；如果变化持续并伴随明确异常，再进入健康页查看。",
    },
}


def _local_time(value: datetime) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(PRODUCT_TZ)


def _metric_value(metric: str, events: list[LifeEvent]) -> float:
    spec = _HINT_METRICS[metric]
    if spec["mode"] == "count":
        return float(len(events))
    total = 0.0
    for event in events:
        raw = (event.payload or {}).get("duration_minutes")
        try:
            minutes = float(raw)
        except (TypeError, ValueError):
            continue
        # A malformed duration must never become a baseline fact.
        if 0 < minutes <= 24 * 60:
            total += minutes
    return total


def _fmt_value(value: float) -> str:
    rounded = round(value, 1)
    return f"{int(rounded)}" if rounded.is_integer() else f"{rounded:g}"


@router.get("/pets/{pet_id}/abnormal-day-hint")
async def abnormal_day_hint(pet_id: uuid.UUID, db: DBSession,
                            user: CurrentUser) -> dict:
    """Explain today against this pet's same-clock recorded history.

    Baseline rows define the approved metric/window. The comparison itself is
    rebuilt from raw LifeEvents at the current local clock so a 10:00 owner
    screen is never compared with a full-day total. Count metrics stay counts;
    duration metrics sum duration_minutes. This endpoint describes *recorded
    facts*, never disease, mood, or unobserved behaviour.
    """
    from app.api.routes.v02_identity_daily_baseline import _baseline_algorithm
    from app.models import Baseline

    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)

    now = datetime.now(PRODUCT_TZ)
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)
    clock_seconds = now.hour * 3600 + now.minute * 60 + now.second
    baselines = (
        await db.execute(select(Baseline).where(Baseline.pet_id == pet.id))
    ).scalars().all()

    explanations: list[dict] = []
    hints: list[str] = []
    for baseline in baselines:
        spec = _HINT_METRICS.get(baseline.metric)
        if not spec:
            continue
        try:
            stored_baseline = float(baseline.value)
        except (TypeError, ValueError):
            continue

        window_days = max(3, int(baseline.window_days or 14))
        history_start = day_start - timedelta(days=window_days)
        rows = (
            await db.execute(
                select(LifeEvent).where(
                    LifeEvent.pet_id == pet.id,
                    LifeEvent.event_type == spec["event_type"],
                    LifeEvent.occurred_at >= history_start,
                    LifeEvent.occurred_at < day_end,
                    LifeEvent.retracted_at.is_(None),
                ).order_by(LifeEvent.occurred_at.asc())
            )
        ).scalars().all()

        today_events: list[LifeEvent] = []
        by_day: dict[object, list[LifeEvent]] = {}
        for event in rows:
            local = _local_time(event.occurred_at)
            if local.date() == now.date():
                if local <= now:
                    today_events.append(event)
                continue
            seconds = local.hour * 3600 + local.minute * 60 + local.second
            if seconds <= clock_seconds:
                by_day.setdefault(local.date(), []).append(event)

        # Missing logs are unknown, not observed zero. Use only historical days
        # with at least one relevant record and expose the sample count.
        historical_values = [
            _metric_value(baseline.metric, events)
            for events in by_day.values()
            if events
        ]
        same_time_baseline = (
            round(_baseline_algorithm(historical_values), 2)
            if historical_values
            else None
        )
        current_value = round(_metric_value(baseline.metric, today_events), 2)
        comparable = same_time_baseline is not None and len(historical_values) >= 3 and same_time_baseline > 0
        deviation_percent = (
            round(((current_value - same_time_baseline) / same_time_baseline) * 100)
            if comparable and same_time_baseline
            else None
        )
        if deviation_percent is None:
            direction = "INSUFFICIENT"
            comparison = (
                f"过去 {window_days} 天同一时间的可比记录还不足，暂不判断变化。"
            )
        elif abs(deviation_percent) < 15:
            direction = "SIMILAR"
            comparison = (
                f"与过去 {window_days} 天同一时间的已记录常态接近"
                f"（{len(historical_values)} 天可比记录）。"
            )
        else:
            direction = "HIGHER" if deviation_percent > 0 else "LOWER"
            comparison = (
                f"比过去 {window_days} 天同一时间的已记录常态"
                f"{'高' if deviation_percent > 0 else '低'} {abs(deviation_percent)}%"
                f"（{len(historical_values)} 天可比记录）。"
            )

        fact = (
            f"今天截至 {now.strftime('%H:%M')} 已记录{spec['label']} "
            f"{_fmt_value(current_value)} {spec['unit']}。"
        )
        uncertainty = (
            "这里只比较已经记录的事实；漏记、设备离线或当天尚未发生的活动都可能影响结果，"
            "不能据此判断疾病、疼痛或情绪。"
        )
        notable = deviation_percent is not None and abs(deviation_percent) >= 15
        explanation = {
            "metric": baseline.metric,
            "label": spec["label"],
            "unit": spec["unit"],
            "current_value": current_value,
            "stored_daily_baseline": stored_baseline,
            "same_time_baseline": same_time_baseline,
            "sample_count": len(historical_values),
            "window_days": window_days,
            "deviation_percent": deviation_percent,
            "direction": direction,
            "notable": notable,
            "fact": fact,
            "comparison": comparison,
            "uncertainty": uncertainty,
            "next_step": spec["next_step"],
            "source_scope": "RECORDED_LIFE_EVENTS",
        }
        explanations.append(explanation)
        if notable:
            hints.append(f"{spec['label']}：{comparison}")

    explanations.sort(
        key=lambda row: (
            not row["notable"],
            -(abs(row["deviation_percent"]) if row["deviation_percent"] is not None else -1),
            row["metric"],
        )
    )
    return {
        "hints": hints or ["今天与自身同期的已记录常态相比，暂未出现需要突出显示的变化。"],
        "rule": "确定性同期对比（同一时间点、同一指标口径），仅比较已记录事实，非健康判断。",
        "as_of": now.isoformat(),
        "explanations": explanations,
    }


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
