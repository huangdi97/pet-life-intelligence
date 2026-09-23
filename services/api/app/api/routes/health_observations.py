"""Health observations: record owner statements + optional AI structuring
(PLI-049..056).

Pure refactor of app/api/routes/health.py; endpoint body kept verbatim.
"""

import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser, DBSession
from app.api.routes.health_common import (
    ObservationsIn,
    get_health_event_for_user,
)
from app.domain import enums
from app.models import Observation
from app.services import health as health_svc
from app.services.eventlog import write_audit

router = APIRouter(tags=["health"])


@router.post("/health-events/{health_event_id}/observations")
async def add_observations(
    health_event_id: uuid.UUID, body: ObservationsIn, db: DBSession, user: CurrentUser
) -> dict:
    he, pet = await get_health_event_for_user(
        db, health_event_id, user, enums.Capability.MEDICAL_WRITE
    )
    created: list[Observation] = []
    for text in body.texts:
        o = Observation(
            health_event_id=he.id,
            kind=enums.ObservationKind.OWNER_STATEMENT.value,
            text=text, created_by_user_id=user.id,
        )
        db.add(o)
        created.append(o)
    await db.flush()
    ai_observations: list[str] = []
    if body.use_ai:
        ai_rows = await health_svc.add_ai_observations(
            db, he, pet, user.id, texts=body.texts
        )
        ai_observations = [o.text for o in ai_rows]
    await write_audit(db, action="observation.add", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="HealthEvent", resource_id=str(he.id))
    await db.commit()
    return {
        "owner_observations": [str(o.id) for o in created],
        "ai_observations": ai_observations,
        "latest_triage_level": he.latest_triage_level,
    }
