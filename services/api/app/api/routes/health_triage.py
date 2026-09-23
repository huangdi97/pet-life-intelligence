"""Health triage: rule-engine-only re-triage that can never lower the level
(PLI-049..056).

Pure refactor of app/api/routes/health.py; endpoint body kept verbatim.
"""

import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser, DBSession
from app.api.routes.health_common import (
    TriageIn,
    get_health_event_for_user,
)
from app.domain import enums
from app.services import health as health_svc

router = APIRouter(tags=["health"])


@router.post("/health-events/{health_event_id}/triage")
async def retriage(health_event_id: uuid.UUID, body: TriageIn,
                   db: DBSession, user: CurrentUser) -> dict:
    """Re-triage is rule-engine only; AI output can never lower the level."""
    he, pet = await get_health_event_for_user(
        db, health_event_id, user, enums.Capability.MEDICAL_WRITE
    )
    assessment = await health_svc.run_rule_triage(db, he, pet, user.id,
                                                  note=body.note or "manual re-run")
    await db.commit()
    return {"level": assessment.level, "engine": assessment.engine,
            "matched_rules": [r["rule_id"] for r in (assessment.matched_rules or [])],
            "note": "Automatic re-triage is rule-engine only; level never decreases."}
