"""v0.2 identity routes — PLI-004 chip identifiers · PLI-013 lifecycle.

Pure refactor of v02_identity_daily.py; endpoint bodies kept verbatim.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import ValidationFailed
from app.domain import enums
from app.models import PetIdentifier
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["v02-identity-daily"])

LIFECYCLE_STATUSES = {"ACTIVE", "LOST", "DECEASED", "TRANSFERRED"}


class IdentifierIn(BaseModel):
    identifier_type: str = Field(pattern="^(CHIP|PASSPORT|TATTOO)$")
    value: str = Field(min_length=4, max_length=120)
    source_type: str = "OWNER_REPORTED"
    verify: bool = False


class StatusChangeIn(BaseModel):
    status: str
    note: str = ""


# --- PLI-004: identifiers ---------------------------------------------------


@router.post("/pets/{pet_id}/identifiers", status_code=201)
async def add_identifier(
    pet_id: uuid.UUID, body: IdentifierIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    row = PetIdentifier(
        pet_id=pet.id,
        identifier_type=body.identifier_type,
        value=body.value.strip(),
        source_type=body.source_type,
        verified=body.verify,
        verified_at=datetime.now(timezone.utc) if body.verify else None,
        created_by_user_id=user.id,
    )
    db.add(row)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="identifier.added",
        payload={"identifier_type": row.identifier_type, "verified": row.verified},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
        source_ref=f"pet_identifier:{row.id}",
    )
    await write_audit(db, action="identifier.add", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="PetIdentifier", resource_id=str(row.id))
    await db.commit()
    return {"identifier_id": str(row.id), "identifier_type": row.identifier_type,
            "verified": row.verified}


@router.get("/pets/{pet_id}/identifiers")
async def list_identifiers(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(PetIdentifier).where(PetIdentifier.pet_id == pet.id)
        )
    ).scalars().all()
    return [
        {"identifier_id": str(r.id), "identifier_type": r.identifier_type,
         "value": r.value, "verified": r.verified, "source_type": r.source_type}
        for r in rows
    ]


# --- PLI-013: lifecycle ------------------------------------------------------


@router.post("/pets/{pet_id}/status", status_code=201)
async def change_lifecycle(
    pet_id: uuid.UUID, body: StatusChangeIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    if body.status not in LIFECYCLE_STATUSES:
        raise ValidationFailed(f"status must be one of {sorted(LIFECYCLE_STATUSES)}")
    if pet.lifecycle_status == "DECEASED" and body.status != "DECEASED":
        raise ValidationFailed("DECEASED is terminal (data preserved, no silent flip).")
    old = pet.lifecycle_status
    pet.lifecycle_status = body.status
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="pet.status_changed",
        payload={"status": body.status, "previous": old, "note": body.note},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await write_audit(db, action="pet.status_change", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="Pet", detail={"from": old, "to": body.status})
    await db.commit()
    return {"lifecycle_status": body.status, "previous": old}
