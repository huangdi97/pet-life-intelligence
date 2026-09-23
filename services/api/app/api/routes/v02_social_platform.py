"""v0.2 routes — social, nutrition, finance, timeline extras, personal
search/QA, memory, platform ops (aggregator).

PLI-111..113 social · PLI-163 diet · PLI-175 expenses · PLI-187 milestones ·
PLI-188 memories · PLI-190/198 search · PLI-197 QA · PLI-199 why · PLI-200
task plans · PLI-205 memory · PLI-225 counters · PLI-228 ops.

Endpoint implementations live in the v02_social_platform_* sub-modules;
routers are included here in original registration order.
"""

from fastapi import APIRouter

from app.api.routes.v02_social_platform_daily import router as daily_router
from app.api.routes.v02_social_platform_ops import router as ops_router
from app.api.routes.v02_social_platform_qa import router as qa_router
from app.api.routes.v02_social_platform_social import router as social_router

router = APIRouter(tags=["v02-social-platform"])
router.include_router(social_router)
router.include_router(daily_router)
router.include_router(qa_router)
router.include_router(ops_router)
