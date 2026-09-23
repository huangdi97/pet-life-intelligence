"""v0.2 deterministic baseline — PLI-029 trimmed mean per metric.

Pure refactor of v02_identity_daily.py; endpoint bodies kept verbatim.
"""

import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.domain import enums
from app.models import Baseline, LifeEvent
from app.services import permissions as perm
from app.services.eventlog import write_audit

router = APIRouter(tags=["v02-identity-daily"])

BASELINE_METRICS = {
    # metric -> event_type
    "meal_count_per_day": "daily.meal",
    "walk_minutes_per_day": "daily.walk",
    "sleep_minutes_per_day": "daily.sleep",
}


def _baseline_algorithm(values: list[float]) -> float:
    """Deterministic: trimmed mean (drop min/max when >=4 samples)."""
    if not values:
        return 0.0
    vals = sorted(values)
    if len(vals) >= 4:
        vals = vals[1:-1]
    return sum(vals) / len(vals)


@router.post("/pets/{pet_id}/baseline/recompute", status_code=201)
async def recompute_baseline(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser,
    window_days: int = Query(default=14, ge=3, le=90),
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    since = datetime.now(timezone.utc) - timedelta(days=window_days)
    results = {}
    for metric, event_type in BASELINE_METRICS.items():
        rows = (
            await db.execute(
                select(LifeEvent.occurred_at, LifeEvent.payload).where(
                    LifeEvent.pet_id == pet.id,
                    LifeEvent.event_type == event_type,
                    LifeEvent.retracted_at.is_(None),
                    LifeEvent.occurred_at >= since,
                )
            )
        ).all()
        by_day: dict[date, float] = {}
        for occurred_at, payload in rows:
            day = occurred_at.date()
            if metric in ("meal_count_per_day",):
                by_day[day] = by_day.get(day, 0) + 1
            else:
                minutes = payload.get("duration_minutes", 0)
                try:
                    by_day[day] = by_day.get(day, 0) + float(minutes)
                except (TypeError, ValueError):
                    continue
        values = list(by_day.values())
        if not values:
            results[metric] = None
            continue
        value = round(_baseline_algorithm(values), 2)
        row = (
            await db.execute(
                select(Baseline).where(
                    Baseline.pet_id == pet.id, Baseline.metric == metric
                )
            )
        ).scalar_one_or_none()
        if row is None:
            row = Baseline(pet_id=pet.id, metric=metric, value=str(value))
            db.add(row)
        row.value = str(value)
        row.sample_count = len(values)
        row.window_days = window_days
        row.algorithm = "trimmed_mean_v1"
        row.computed_at = datetime.now(timezone.utc)
        results[metric] = {"value": value, "samples": len(values)}
    await db.flush()
    await write_audit(db, action="baseline.recompute", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="Baseline", detail=results)
    await db.commit()
    return {"algorithm": "trimmed_mean_v1", "window_days": window_days,
            "baselines": results}


@router.get("/pets/{pet_id}/baseline")
async def get_baseline(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (await db.execute(select(Baseline).where(Baseline.pet_id == pet.id))).scalars().all()
    return [
        {"metric": r.metric, "value": r.value, "unit": r.unit,
         "sample_count": r.sample_count, "window_days": r.window_days,
         "algorithm": r.algorithm, "computed_at": r.computed_at.isoformat()}
        for r in rows
    ]
