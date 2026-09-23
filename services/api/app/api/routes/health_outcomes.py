"""Health outcomes: close a health event with a validated outcome
(PLI-049..056).

Pure refactor of app/api/routes/health.py; endpoint body kept verbatim.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter

from app.api.deps import CurrentUser, DBSession
from app.api.routes.health_common import (
    OutcomeIn,
    get_health_event_for_user,
)
from app.core.errors import ValidationFailed
from app.domain import enums
from app.models import Outcome
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["health"])


@router.post("/health-events/{health_event_id}/outcomes", status_code=201)
async def record_outcome(
    health_event_id: uuid.UUID, body: OutcomeIn, db: DBSession, user: CurrentUser
) -> dict:
    he, pet = await get_health_event_for_user(
        db, health_event_id, user, enums.Capability.MEDICAL_WRITE
    )
    if body.outcome not in [o.value for o in enums.OutcomeValue]:
        raise ValidationFailed(
            f"outcome must be one of {[o.value for o in enums.OutcomeValue]}"
        )
    outcome = Outcome(
        pet_id=pet.id, health_event_id=he.id, outcome=body.outcome,
        notes=body.notes, recorded_by_user_id=user.id,
    )
    db.add(outcome)
    he.status = enums.HealthEventStatus.CLOSED.value
    he.closed_at = datetime.now(UTC)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="health.outcome_recorded",
        payload={"health_event_id": str(he.id), "outcome_id": str(outcome.id),
                 "outcome": body.outcome},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await write_audit(db, action="outcome.record", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="Outcome", resource_id=str(outcome.id))
    await db.commit()
    return {"outcome_id": str(outcome.id), "outcome": body.outcome,
            "health_event_status": he.status}
