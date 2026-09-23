"""v0.2 routes — behavior deepening + training + welfare library (aggregator).

PLI-070 ABC (regression of v0.1, served with pattern analytics) ·
PLI-071 video binding (artifact_ids, asserted) · PLI-073 trigger graph ·
PLI-074 patterns/trends · PLI-075 event templates · PLI-079 preferences ·
PLI-084 advice safety filter · PLI-085..088 training goals/steps/sessions/
mastery · PLI-091 reward library · PLI-092 training tools ·
PLI-100 enrichment activity library.

Endpoint implementations live in the v02_behavior_training_* sub-modules;
routers are included here in original registration order.  The seeding
helper is re-exported for the app lifespan (app/main.py).
"""

from fastapi import APIRouter

from app.api.routes.v02_behavior_training_behavior import router as behavior_router
from app.api.routes.v02_behavior_training_content import ensure_content_seeded
from app.api.routes.v02_behavior_training_content import router as content_router
from app.api.routes.v02_behavior_training_training import router as training_router

router = APIRouter(tags=["v02-behavior-training"])
router.include_router(behavior_router)
router.include_router(training_router)
router.include_router(content_router)

__all__ = ["router", "ensure_content_seeded"]
