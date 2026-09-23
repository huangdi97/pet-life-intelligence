"""Pet Living Model (PLM) — state overlay and provider-status routes.

State overlay references real facts only (GOAL I); it NEVER derives
organ/emotion/lifespan from 3D appearance.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter
from sqlalchemy import desc, select

from app.adapters.visual_provider import provider_status
from app.api.deps import CurrentUser, DBSession
from app.api.routes.visual_helpers import _require_read
from app.api.routes.visual_schemas import StateOverlayOut
from app.models import Baseline, LifeEvent, PetVisualModel

router = APIRouter(tags=["pet-living-model"])


@router.get("/pets/{pet_id}/state-overlay")
async def state_overlay(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> StateOverlayOut:
    """State overlay — references real facts only (GOAL I).

    Builds a small metric list from today's events + baseline + recent
    observations. It NEVER derives organ/emotion/lifespan from 3D appearance.
    """
    await _require_read(db, pet_id, user.id)
    active = (
        await db.execute(
            select(PetVisualModel).where(
                PetVisualModel.pet_id == pet_id, PetVisualModel.status == "ACTIVE"
            )
        )
    ).scalars().first()
    today = datetime.now(UTC).date()
    since = datetime.combine(today, datetime.min.time(), tzinfo=UTC)
    events = (
        await db.execute(
            select(LifeEvent)
            .where(LifeEvent.pet_id == pet_id, LifeEvent.recorded_at >= since)
            .order_by(desc(LifeEvent.recorded_at))
            .limit(50)
        )
    ).scalars().all()
    counts: dict[str, int] = {}
    for e in events:
        counts[e.event_type] = counts.get(e.event_type, 0) + 1
    baselines = (
        await db.execute(select(Baseline).where(Baseline.pet_id == pet_id))
    ).scalars().all()
    base_map = {b.metric: b.value for b in baselines}
    label_map = {
        "daily.drink": "饮水", "daily.meal": "进食", "daily.walk": "活动",
        "daily.sleep": "睡眠", "daily.weight": "体重", "daily.elimination": "排泄",
    }
    metrics = []
    for k, v in counts.items():
        label = label_map.get(k, k)
        base = base_map.get(k)
        metrics.append({
            "key": k, "label": label, "current": v,
            "baseline_range": base if base else None,
            "delta": (v - int(base)) if base and base.isdigit() else None,
            "freshness": "today", "source": "OWNER_REPORTED",
        })
    # recent events as "最近观察" — real facts only (Observation rows are
    # scoped to health events and are not exposed as pet-level facts here)
    recent_events = events[:3]
    for e in recent_events:
        metrics.append({
            "key": "recent_event", "label": "最近记录",
            "current": e.event_type,
            "baseline_range": None, "delta": None, "freshness": "recent",
            "source": e.source_type,
        })
    # PROVENANCE:
    # The overlay only references real observations/baselines/events; the
    # provenance_kind of the active model is presented, never implied as fact.
    return StateOverlayOut(
        pet_id=pet_id,
        provenance_kind=active.provenance_kind if active else "GENERATED_3D",
        provider_real=False,
        model_status=active.status if active else None,
        metrics=metrics,
        note="状态覆盖只引用真实观察/基线/事件，不从 3D 外观推断任何健康信息。",
    )


@router.get("/visual/status")
async def visual_status() -> dict:
    return provider_status()
