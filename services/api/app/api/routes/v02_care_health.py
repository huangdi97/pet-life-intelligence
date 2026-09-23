"""v0.2 routes — care deepening + health follow-up (aggregator).

PLI-039 handoff checklist · PLI-040 care-period daily report ·
PLI-041 care end summary · PLI-042 responsibility matrix ·
PLI-047 role-targeted notifications · PLI-057/058 medical record import ·
PLI-061 recovery plan · PLI-062 symptom trend · PLI-064 care reminders.

Endpoint implementations live in the v02_care_health_* sub-modules;
routers are included here.
"""

from fastapi import APIRouter

from app.api.routes.v02_care_health_care import router as care_router
from app.api.routes.v02_care_health_handoff import router as handoff_router
from app.api.routes.v02_care_health_medical import router as medical_router

router = APIRouter(tags=["v02-care-health"])
router.include_router(handoff_router)
router.include_router(medical_router)
router.include_router(care_router)
