"""Care network: handoffs (PLI-037)."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.api.routes.care_members import GRANT_SCOPES
from app.core.errors import NotFound, PermissionDenied, ValidationFailed
from app.domain import enums
from app.models import CareHandoff, Grant, User
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["care"])


class HandoffCreate(BaseModel):
    caregiver_user_id: uuid.UUID
    scopes: list[str] = Field(min_length=1)
    start_at: datetime | None = None
    end_at: datetime
    reason: str = ""


@router.post("/pets/{pet_id}/handoffs", status_code=201)
async def create_handoff(
    pet_id: uuid.UUID, body: HandoffCreate, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.assert_not_elevating(db, pet, user.id)
    invalid = [s for s in body.scopes if s not in GRANT_SCOPES]
    if invalid:
        raise ValidationFailed(f"Unknown scopes: {invalid}")
    if enums.Capability.MANAGE_PET.value in body.scopes:
        raise PermissionDenied("manage:pet cannot be included in a handoff (PLI-204).")
    if body.end_at <= datetime.now(UTC):
        raise ValidationFailed("end_at must be in the future.")
    caregiver = (
        await db.execute(select(User).where(User.id == body.caregiver_user_id))
    ).scalar_one_or_none()
    if caregiver is None:
        raise NotFound("Caregiver user not found.")

    grant = Grant(
        pet_id=pet.id, user_id=body.caregiver_user_id, scopes=body.scopes,
        reason=body.reason or "care handoff", source="HANDOFF",
        granted_by_user_id=user.id,
        starts_at=body.start_at or datetime.now(UTC),
        expires_at=body.end_at,
    )
    db.add(grant)
    await db.flush()
    handoff = CareHandoff(
        pet_id=pet.id, caregiver_user_id=body.caregiver_user_id,
        owner_user_id=user.id, scope=body.scopes,
        start_at=grant.starts_at, end_at=body.end_at, grant_id=grant.id,
        notes=body.reason,
    )
    db.add(handoff)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="care.handoff_started",
        payload={"handoff_id": str(handoff.id),
                 "caregiver_user_id": str(body.caregiver_user_id),
                 "scope": body.scopes,
                 "end_at": body.end_at.isoformat()},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await write_audit(db, action="handoff.start", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="CareHandoff", resource_id=str(handoff.id),
                      detail={"scopes": body.scopes, "caregiver": str(body.caregiver_user_id)})
    await db.commit()
    return {"handoff_id": str(handoff.id), "grant_id": str(grant.id),
            "status": handoff.status, "end_at": body.end_at.isoformat()}


@router.post("/handoffs/{handoff_id}/end")
async def end_handoff(handoff_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    handoff = (
        await db.execute(select(CareHandoff).where(CareHandoff.id == handoff_id))
    ).scalar_one_or_none()
    if handoff is None:
        raise NotFound("Handoff not found.")
    pet = await perm.get_pet_or_404(db, handoff.pet_id)
    is_owner = user.id == handoff.owner_user_id
    if not is_owner and user.id != handoff.caregiver_user_id:
        await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    if handoff.status != enums.HandoffStatus.ACTIVE.value:
        return {"handoff_id": str(handoff.id), "status": handoff.status}
    handoff.status = enums.HandoffStatus.ENDED.value
    handoff.ended_at = datetime.now(UTC)
    handoff.ended_by_user_id = user.id
    if handoff.grant_id:
        grant = (
            await db.execute(select(Grant).where(Grant.id == handoff.grant_id))
        ).scalar_one_or_none()
        if grant and grant.revoked_at is None:
            grant.revoked_at = handoff.ended_at
            grant.revoked_by_user_id = user.id
            grant.status = enums.GrantStatus.REVOKED.value
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="care.handoff_ended",
        payload={"handoff_id": str(handoff.id),
                 "caregiver_user_id": str(handoff.caregiver_user_id),
                 "ended_by": str(user.id)},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await write_audit(db, action="handoff.end", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="CareHandoff", resource_id=str(handoff.id))
    await db.commit()
    return {"handoff_id": str(handoff.id), "status": handoff.status}


@router.get("/pets/{pet_id}/handoffs")
async def list_handoffs(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    rows = (
        await db.execute(
            select(CareHandoff).where(CareHandoff.pet_id == pet.id)
            .order_by(CareHandoff.created_at.desc())
        )
    ).scalars().all()
    return [
        {
            "handoff_id": str(h.id), "caregiver_user_id": str(h.caregiver_user_id),
            "scope": h.scope, "start_at": h.start_at.isoformat(),
            "end_at": h.end_at.isoformat() if h.end_at else None,
            "status": h.status, "notes": h.notes,
        }
        for h in rows
    ]
