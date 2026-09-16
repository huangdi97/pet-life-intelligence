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
