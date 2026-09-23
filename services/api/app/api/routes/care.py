"""Care network routes (PLI-035/036, 010/011, 037, 038, 219, 046, 216)."""

from fastapi import APIRouter

from app.api.routes.care_account import router as account_router
from app.api.routes.care_cards import router as cards_router
from app.api.routes.care_grants import router as grants_router
from app.api.routes.care_handoffs import router as handoffs_router
from app.api.routes.care_members import GRANT_SCOPES
from app.api.routes.care_members import router as members_router

router = APIRouter(tags=["care"])
router.include_router(members_router)
router.include_router(grants_router)
router.include_router(handoffs_router)
router.include_router(cards_router)
router.include_router(account_router)

__all__ = ["GRANT_SCOPES", "router"]
