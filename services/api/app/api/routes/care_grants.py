"""Care network: grants (PLI-010/011)."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.api.routes.care_members import GRANT_SCOPES
from app.core.errors import NotFound, PermissionDenied, ValidationFailed
from app.domain import enums
from app.models import Grant, User
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["care"])


class GrantCreate(BaseModel):
    user_id: uuid.UUID
    scopes: list[str] = Field(min_length=1)
    reason: str = ""
    starts_at: datetime | None = None
    expires_at: datetime | None = None


@router.get("/pets/{pet_id}/grants")
async def list_grants(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    rows = (
        await db.execute(
            select(Grant).where(Grant.pet_id == pet.id).order_by(Grant.created_at.desc())
        )
    ).scalars().all()
    return [
        {
            "grant_id": str(g.id), "user_id": str(g.user_id), "scopes": g.scopes,
            "reason": g.reason, "source": g.source, "status": g.status,
            "starts_at": g.starts_at.isoformat(),
            "expires_at": g.expires_at.isoformat() if g.expires_at else None,
            "revoked_at": g.revoked_at.isoformat() if g.revoked_at else None,
        }
        for g in rows
    ]


@router.post("/pets/{pet_id}/grants", status_code=201)
async def create_grant(
    pet_id: uuid.UUID, body: GrantCreate, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.assert_not_elevating(db, pet, user.id)  # temporary caregiver hard boundary
    invalid = [s for s in body.scopes if s not in GRANT_SCOPES]
    if invalid:
        raise ValidationFailed(f"Unknown scopes: {invalid}")
    if body.scopes and enums.Capability.MANAGE_PET.value in body.scopes:
        raise PermissionDenied("manage:pet cannot be delegated via grant (PLI-204).")
    target = (
        await db.execute(select(User).where(User.id == body.user_id))
    ).scalar_one_or_none()
    if target is None:
        raise NotFound("Target user not found.")
    grant = Grant(
        pet_id=pet.id, user_id=body.user_id, scopes=body.scopes,
        reason=body.reason, granted_by_user_id=user.id,
        starts_at=body.starts_at or datetime.now(UTC),
        expires_at=body.expires_at,
    )
    db.add(grant)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="grant.created",
        payload={"grant_id": str(grant.id), "user_id": str(body.user_id),
                 "action": "created", "scopes": body.scopes,
                 "expires_at": grant.expires_at.isoformat() if grant.expires_at else None},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await write_audit(db, action="grant.create", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="Grant", resource_id=str(grant.id),
                      detail={"scopes": body.scopes})
    await db.commit()
    return {"grant_id": str(grant.id), "status": grant.status,
            "expires_at": grant.expires_at.isoformat() if grant.expires_at else None}


@router.delete("/grants/{grant_id}")
async def revoke_grant(grant_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    grant = (
        await db.execute(select(Grant).where(Grant.id == grant_id))
    ).scalar_one_or_none()
    if grant is None:
        raise NotFound("Grant not found.")
    pet = await perm.get_pet_or_404(db, grant.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    if grant.revoked_at is None:
        grant.revoked_at = datetime.now(UTC)
        grant.revoked_by_user_id = user.id
        grant.status = enums.GrantStatus.REVOKED.value
        await db.flush()
        await create_life_event(
            db, pet_id=pet.id, event_type="grant.revoked",
            payload={"grant_id": str(grant.id), "user_id": str(grant.user_id),
                     "action": "revoked", "scopes": grant.scopes},
            actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
        )
        await write_audit(db, action="grant.revoke", actor_user_id=user.id,
                          household_id=pet.household_id, pet_id=pet.id,
                          resource_type="Grant", resource_id=str(grant.id))
    await db.commit()
    return {"grant_id": str(grant.id), "status": grant.status}
