"""v1.0 extras — remaining P2 record-layer endpoints (PLI-065/066/076/077/078/
089/090/096/098/101/105/114/115/117/119/122/206/210). All deterministic
record/aggregation layers; no medical or behavioural diagnosis. Aggregates the
v10_extras_* sub-routers in original order."""

from fastapi import APIRouter

from app.api.routes.v10_extras_behavior import router as behavior_router
from app.api.routes.v10_extras_senior import router as senior_router
from app.api.routes.v10_extras_services import router as services_router
from app.api.routes.v10_extras_social import router as social_router

router = APIRouter(tags=["v10-extras"])
router.include_router(senior_router)
router.include_router(behavior_router)
router.include_router(social_router)
router.include_router(services_router)
