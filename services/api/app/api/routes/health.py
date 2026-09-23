"""Health events: open with intake, dynamic follow-up questions (rule-first,
AI-assisted), answers, observations, triage, vet brief + share link,
outcomes (PLI-049..056, PLI-063).

The bootstrap /health /ready endpoints previously defined in this file were
moved to app/api/routes/system.py (superseded 2026-09-13, content preserved
in git history).

Endpoint implementations live in the health_* sub-modules; routers are
included here in original registration order.
"""

from fastapi import APIRouter

from app.api.routes.health_intake import router as intake_router
from app.api.routes.health_observations import router as observations_router
from app.api.routes.health_outcomes import router as outcomes_router
from app.api.routes.health_triage import router as triage_router
from app.api.routes.health_vet_brief import router as vet_brief_router

router = APIRouter(tags=["health"])
router.include_router(intake_router)
router.include_router(observations_router)
router.include_router(triage_router)
router.include_router(vet_brief_router)
router.include_router(outcomes_router)
