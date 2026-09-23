"""Pets: create/update/list pet master records, consents, emergency profile
(PLI-001/002/016/014/215)."""

from fastapi import APIRouter

from app.api.routes.pets_consent import router as consent_router
from app.api.routes.pets_profile import router as profile_router

router = APIRouter(tags=["pets"])
router.include_router(profile_router)
router.include_router(consent_router)
