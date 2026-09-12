"""Durable-state worker jobs (PLI-010/011, PLI-037, PLI-060).

Shared by the standalone worker process (services/worker/main.py) and the
test suite. All state lives in PostgreSQL — never only in memory.
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.domain import enums
from app.models import CareHandoff, Grant, MedicationDose, MedicationPlan, Pet
from app.services.eventlog import create_life_event, create_notification


async def expire_grants(db) -> int:
    now = datetime.now(UTC)
    rows = (
        await db.execute(
            select(Grant).where(
                Grant.status == enums.GrantStatus.ACTIVE.value,
                Grant.revoked_at.is_(None),
                Grant.expires_at.is_not(None),
                Grant.expires_at <= now,
            )
        )
    ).scalars().all()
    count = 0
    for g in rows:
        g.status = enums.GrantStatus.EXPIRED.value
        count += 1
        await create_life_event(
            db, pet_id=g.pet_id, event_type="grant.expired",
            payload={"grant_id": str(g.id), "user_id": str(g.user_id)},
            actor_id=g.granted_by_user_id,
            source_type=enums.SourceType.SYSTEM_CALCULATED,
            provenance_level=enums.SourceType.SYSTEM_CALCULATED.value,
            idempotency_key=f"grant-expired:{g.id}",
        )
        pet = (await db.execute(select(Pet).where(Pet.id == g.pet_id))).scalar_one_or_none()
        await create_notification(
            db, household_id=pet.household_id if pet else None,
            pet_id=g.pet_id, notification_type="GRANT_EXPIRED",
            title="临时权限已到期",
            body="一条临时授权已到期并自动失效。",
            data={"grant_id": str(g.id)},
            dedupe_key=f"grant-expired-notif:{g.id}",
        )
    if count:
        await db.flush()
    return count


async def end_handoffs(db) -> int:
    now = datetime.now(UTC)
    rows = (
        await db.execute(
            select(CareHandoff).where(
                CareHandoff.status == enums.HandoffStatus.ACTIVE.value,
                CareHandoff.end_at.is_not(None),
                CareHandoff.end_at <= now,
            )
        )
    ).scalars().all()
    count = 0
    for h in rows:
        h.status = enums.HandoffStatus.EXPIRED.value
        h.ended_at = now
        if h.grant_id:
            grant = (
                await db.execute(select(Grant).where(Grant.id == h.grant_id))
            ).scalar_one_or_none()
            if grant and grant.status == enums.GrantStatus.ACTIVE.value:
                grant.status = enums.GrantStatus.EXPIRED.value
        count += 1
        await create_life_event(
            db, pet_id=h.pet_id, event_type="care.handoff_ended",
            payload={"handoff_id": str(h.id),
                     "caregiver_user_id": str(h.caregiver_user_id),
                     "ended_by": "SYSTEM"},
            actor_id=h.owner_user_id,
            source_type=enums.SourceType.SYSTEM_CALCULATED,
            provenance_level=enums.SourceType.SYSTEM_CALCULATED.value,
            idempotency_key=f"handoff-ended:{h.id}",
        )
    if count:
        await db.flush()
    return count


async def mark_missed_doses(db, *, grace_minutes: int = 30) -> int:
    now = datetime.now(UTC)
    rows = (
        await db.execute(
            select(MedicationDose).where(
                MedicationDose.status == enums.DoseStatus.PENDING.value,
                MedicationDose.planned_at < now - timedelta(minutes=grace_minutes),
            ).limit(500)
        )
    ).scalars().all()
    count = 0
    for d in rows:
        d.status = enums.DoseStatus.MISSED.value
        count += 1
        plan = (
            await db.execute(select(MedicationPlan).where(MedicationPlan.id == d.plan_id))
        ).scalar_one_or_none()
        await create_life_event(
            db, pet_id=plan.pet_id, event_type="medication.missed",
            payload={"plan_id": str(plan.id), "dose_id": str(d.id),
                     "planned_at": d.planned_at.isoformat()},
            actor_id=plan.created_by_user_id,
            source_type=enums.SourceType.SYSTEM_CALCULATED,
            provenance_level=enums.SourceType.SYSTEM_CALCULATED.value,
            idempotency_key=f"med-missed:{d.id}",
        )
        pet = (await db.execute(select(Pet).where(Pet.id == plan.pet_id))).scalar_one_or_none()
        await create_notification(
            db, household_id=pet.household_id if pet else None,
            pet_id=plan.pet_id, notification_type="MEDICATION_MISSED",
            title="用药遗漏提醒",
            body=f"「{plan.medicine_name}」计划剂量（{d.planned_at.isoformat()}）未记录给药。",
            data={"plan_id": str(plan.id), "dose_id": str(d.id)},
            dedupe_key=f"med-missed-notif:{d.id}",
        )
    if count:
        await db.flush()
    return count


async def run_once() -> dict:
    from app.core.db import get_session_factory

    factory = get_session_factory()
    async with factory() as db:
        expired = await expire_grants(db)
        handoffs = await end_handoffs(db)
        missed = await mark_missed_doses(db)
        await db.commit()
    return {"grants_expired": expired, "handoffs_ended": handoffs,
            "doses_missed": missed}
