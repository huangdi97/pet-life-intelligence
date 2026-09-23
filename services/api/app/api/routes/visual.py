"""Pet Living Model (PLM) visual routes — Stage H.2 (GOAL PHASE D4).

Aggregates the visual_capture / visual_model / visual_overlay sub-routers.

Rules enforced across the modules (GOAL D2/D4/F/G/I/L):
- State overlay references Observation/Baseline/Event/Inference; it NEVER
  stores business facts or derives organ/emotion/lifespan from 3D.
- Owner verification: a model verified "不像" (not_like) can not be activated.
- Sandbox provider honestly reports REAL_3D_PROVIDER_EXTERNAL_BLOCKED.
"""

from fastapi import APIRouter

from app.api.routes.visual_capture import router as capture_router
from app.api.routes.visual_model import router as model_router
from app.api.routes.visual_overlay import router as overlay_router

router = APIRouter(tags=["pet-living-model"])
router.include_router(capture_router)
router.include_router(model_router)
router.include_router(overlay_router)
