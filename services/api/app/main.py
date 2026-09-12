"""Pet Life Intelligence API — application assembly.

The bootstrap app (single /health route) was superseded on 2026-09-13 by the
full v0.1 router set; system health routes moved to app/api/routes/system.py.
"""

import time
import uuid as uuid_mod
from collections import defaultdict, deque

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.routes import (
    artifacts,
    auth,
    behavior,
    care,
    events,
    health,
    medication,
    pets,
    system,
    tasks,
    v02_behavior_training,
    v02_care_health,
    v02_identity_daily,
    v02_social_platform,
    v10_extras,
    v10_platform,
)
from app.core.config import get_settings
from app.core.db import get_session_factory
from app.core.errors import install_error_handlers

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
install_error_handlers(app)

RATE_BUCKETS: dict[str, deque] = defaultdict(deque)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or uuid_mod.uuid4().hex
    request.state.request_id = request_id

    if settings.rate_limit_enabled and request.method in ("POST", "PUT", "DELETE"):
        now = time.monotonic()
        bucket = RATE_BUCKETS[request.client.host if request.client else "unknown"]
        while bucket and now - bucket[0] > 60:
            bucket.popleft()
        if len(bucket) >= settings.rate_limit_per_minute:
            return JSONResponse(
                status_code=429,
                content={"error": {"code": "RATE_LIMITED",
                                   "message": "Too many requests.",
                                   "request_id": request_id}},
            )
        bucket.append(now)

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


for router in (
    system.router, auth.router, pets.router, events.router, tasks.router,
    care.router, behavior.router, health.router, medication.router,
    artifacts.router, v02_identity_daily.router, v02_care_health.router,
    v02_behavior_training.router, v02_social_platform.router,
    v10_platform.router, v10_extras.router,
):
    app.include_router(router, prefix="/api/v1")


@app.on_event("startup")
async def startup() -> None:
    async with get_session_factory()() as session:
        await session.execute(text("SELECT 1"))
        from app.api.routes.v02_behavior_training import ensure_content_seeded

        await ensure_content_seeded(session)
        await session.commit()
