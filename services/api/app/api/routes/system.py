"""System routes: /health, /ready (G1)."""

from fastapi import APIRouter, Response
from redis.asyncio import Redis
from sqlalchemy import text

from app.core.config import get_settings
from app.core.db import get_session_factory

router = APIRouter(tags=["system"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "pli-api", "version": "0.1.0"}


@router.get("/ready")
async def ready(response: Response) -> dict:
    settings = get_settings()
    checks: dict[str, str] = {}

    try:
        async with get_session_factory()() as session:
            await session.execute(text("SELECT 1"))
        checks["postgres"] = "ok"
    except Exception as exc:  # noqa: BLE001
        checks["postgres"] = f"error: {type(exc).__name__}"

    try:
        redis = Redis.from_url(settings.redis_url, decode_responses=True)
        await redis.ping()
        await redis.aclose()
        checks["redis"] = "ok"
    except Exception as exc:  # noqa: BLE001
        checks["redis"] = f"error: {type(exc).__name__}"

    ok = all(v == "ok" for v in checks.values())
    if not ok:
        response.status_code = 503
    return {"status": "ready" if ok else "degraded", "checks": checks}


@router.get("/ready/db")
async def ready_db() -> dict[str, str]:
    try:
        async with get_session_factory()() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as exc:  # noqa: BLE001
        return {"status": f"error: {type(exc).__name__}"}


@router.get("/ready/engine-info")
async def engine_info() -> dict:
    import pli_rules

    engine = pli_rules.get_engine()
    return {
        "rule_engine": engine.engine_name,
        "rule_engine_version": engine.engine_version,
        "rule_count": len(engine.rules),
    }


@router.get("/ai/status")
async def ai_status() -> dict:
    """Honest AI provider status: real vs mock (Stage E §7)."""
    from app.services.ai_gateway import ai_provider_status

    return ai_provider_status()


@router.get("/metrics")
async def metrics() -> dict:
    """Lightweight operational metrics for monitoring (Stage E §17).

    Counts aggregate rows (safe, non-sensitive). Production dashboards can
    poll this; Prometheus adapter can be layered without touching logic.
    """
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import func, select

    from app.core.db import get_session_factory
    from app.models import (
        AIInferenceLog,
        AuditEntry,
        Incident,
        LifeEvent,
        LoginAttempt,
        Pet,
        SecurityEvent,
    )

    async with get_session_factory()() as db:
        now = datetime.now(UTC)
        day_ago = now - timedelta(hours=24)
        pets = (await db.execute(select(func.count()).select_from(Pet))).scalar_one()
        events_24h = (await db.execute(
            select(func.count()).select_from(LifeEvent)
            .where(LifeEvent.recorded_at >= day_ago)
        )).scalar_one()
        ai_calls_24h = (await db.execute(
            select(func.count()).select_from(AIInferenceLog)
            .where(AIInferenceLog.created_at >= day_ago)
        )).scalar_one()
        login_fail_24h = (await db.execute(
            select(func.count()).select_from(LoginAttempt)
            .where(LoginAttempt.attempted_at >= day_ago, LoginAttempt.success.is_(False))
        )).scalar_one()
        security_events_24h = (await db.execute(
            select(func.count()).select_from(SecurityEvent)
            .where(SecurityEvent.created_at >= day_ago)
        )).scalar_one()
        open_incidents = (await db.execute(
            select(func.count()).where(Incident.status == "OPEN")
        )).scalar_one()
        audit_24h = (await db.execute(
            select(func.count()).select_from(AuditEntry)
            .where(AuditEntry.occurred_at >= day_ago)
        )).scalar_one()

    return {
        "time": now.isoformat(),
        "counters": {
            "pets_total": pets,
            "life_events_24h": events_24h,
            "ai_calls_24h": ai_calls_24h,
            "login_failures_24h": login_fail_24h,
            "security_events_24h": security_events_24h,
            "audit_entries_24h": audit_24h,
            "open_incidents": open_incidents,
        },
    }
