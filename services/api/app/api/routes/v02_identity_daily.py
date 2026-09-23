"""v0.2 routes — identity & daily deepening (aggregator).

PLI-004 chip identifiers · PLI-005 QR care card · PLI-013 lifecycle ·
PLI-024 sleep · PLI-029 deterministic baseline · PLI-031 diary ·
PLI-033 AI daily summary.

Endpoint implementations live in the v02_identity_daily_* sub-modules;
routers are included here in original registration order.
"""

from fastapi import APIRouter

from app.api.routes.v02_identity_daily_baseline import (
    _baseline_algorithm as _baseline_algorithm,
)
from app.api.routes.v02_identity_daily_baseline import router as baseline_router
from app.api.routes.v02_identity_daily_carecard import router as carecard_router
from app.api.routes.v02_identity_daily_diary import router as diary_router
from app.api.routes.v02_identity_daily_identity import router as identity_router

router = APIRouter(tags=["v02-identity-daily"])
router.include_router(identity_router)
router.include_router(baseline_router)
router.include_router(diary_router)
router.include_router(carecard_router)
