"""v0.2 platform ops — PLI-225 analytics counters · PLI-228 ops status +
incidents.

Pure refactor of v02_social_platform.py; endpoint bodies kept verbatim.
"""

from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DBSession
from app.core.security import require_ops_admin
from app.models import (
    AnalyticsCounter,
    Incident,
    LifeEvent,
    Pet,
)
from app.services.eventlog import write_audit

router = APIRouter(tags=["v02-social-platform"])


# --- PLI-225 analytics counters -----------------------------------------------------------


class CounterIn(BaseModel):
    metric: str = Field(min_length=1, max_length=80)


@router.post("/analytics/counter", status_code=201)
async def bump_counter(body: CounterIn, db: DBSession, user: CurrentUser) -> dict:
    day = datetime.now(timezone.utc).date()
    row = (
        await db.execute(
            select(AnalyticsCounter).where(
                AnalyticsCounter.metric == body.metric, AnalyticsCounter.day == day
            )
        )
    ).scalar_one_or_none()
    if row is None:
        row = AnalyticsCounter(metric=body.metric, day=day, count=1)
        db.add(row)
    else:
        row.count += 1
    await db.flush()
    await db.commit()
    return {"metric": body.metric, "day": day.isoformat(), "count": row.count,
            "note": "只存聚合计数，不存原始 payload（PLI-225）。"}


# --- PLI-228 ops status + incidents ----------------------------------------------------------


@router.get("/ops/status")
async def ops_status(db: DBSession, user: CurrentUser) -> dict:
    await require_ops_admin(user)
    counts = {}
    for name, stmt in (
        ("pets", select(func.count()).select_from(Pet)),
        ("life_events", select(func.count()).select_from(LifeEvent)),
        ("open_incidents", select(func.count()).where(Incident.status == "OPEN")),
    ):
        counts[name] = (await db.execute(stmt)).scalar_one()
    return {
        "service": "pli-api",
        "time": datetime.now(timezone.utc).isoformat(),
        "counts": counts,
        "rule_engine": __import__("pli_rules", fromlist=["get_engine"])
        .get_engine().engine_version,
        "note": "轻量运行状态（PLI-228）；完整监控栈为生产部署任务。",
    }


class IncidentIn(BaseModel):
    severity: str = Field(pattern="^(INFO|WARN|CRITICAL)$")
    title: str = Field(min_length=1, max_length=200)
    detail: str = ""


@router.post("/ops/incidents", status_code=201)
async def create_incident(body: IncidentIn, db: DBSession, user: CurrentUser) -> dict:
    await require_ops_admin(user)
    row = Incident(severity=body.severity, title=body.title,
                   detail=body.detail, created_by_user_id=user.id)
    db.add(row)
    await db.flush()
    await write_audit(db, action="incident.create", actor_user_id=user.id,
                      resource_type="Incident", resource_id=str(row.id),
                      detail={"severity": row.severity})
    await db.commit()
    return {"incident_id": str(row.id), "status": row.status}


@router.get("/ops/incidents")
async def list_incidents(db: DBSession, user: CurrentUser) -> list[dict]:
    await require_ops_admin(user)
    rows = (
        await db.execute(
            select(Incident).order_by(Incident.created_at.desc()).limit(50)
        )
    ).scalars().all()
    return [
        {"incident_id": str(r.id), "severity": r.severity, "title": r.title,
         "status": r.status, "created_at": r.created_at.isoformat()}
        for r in rows
    ]
