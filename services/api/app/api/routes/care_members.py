"""Care network: household members/invitations (PLI-035/036)."""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import ConflictError, NotFound, PermissionDenied, ValidationFailed
from app.core.security import new_invitation_token
from app.domain import enums
from app.models import HouseholdMember, Invitation, User
from app.services.eventlog import write_audit

router = APIRouter(tags=["care"])

GRANT_SCOPES = {c.value for c in enums.Capability}


class InviteRequest(BaseModel):
    email: EmailStr
    role: str = "FAMILY"


@router.get("/households/{household_id}/members")
async def list_members(household_id: uuid.UUID, db: DBSession, user: CurrentUser) -> list[dict]:
    membership = (
        await db.execute(
            select(HouseholdMember).where(
                HouseholdMember.household_id == household_id,
                HouseholdMember.user_id == user.id,
                HouseholdMember.status == "ACTIVE",
            )
        )
    ).scalar_one_or_none()
    if membership is None:
        raise PermissionDenied("Not a member of this household.")
    rows = (
        await db.execute(
            select(HouseholdMember, User)
            .join(User, User.id == HouseholdMember.user_id)
            .where(HouseholdMember.household_id == household_id)
        )
    ).all()
    return [
        {
            "user_id": str(u.id),
            "display_name": u.display_name,
            "email": u.email,
            "role": m.role,
            "status": m.status,
        }
        for (m, u) in rows
    ]


@router.post("/households/{household_id}/invitations", status_code=201)
async def invite_member(
    household_id: uuid.UUID, body: InviteRequest, db: DBSession, user: CurrentUser
) -> dict:
    membership = (
        await db.execute(
            select(HouseholdMember).where(
                HouseholdMember.household_id == household_id,
                HouseholdMember.user_id == user.id,
                HouseholdMember.status == "ACTIVE",
            )
        )
    ).scalar_one_or_none()
    if membership is None or membership.role not in (
        enums.HouseholdRole.OWNER.value, enums.HouseholdRole.CO_OWNER.value
    ):
        raise PermissionDenied("Only owner/co-owner can invite members.")
    if body.role not in [r.value for r in enums.HouseholdRole]:
        raise ValidationFailed(f"Unknown role {body.role}")
    if body.role == enums.HouseholdRole.OWNER.value:
        raise PermissionDenied("Ownership transfer requires explicit manual confirmation (v0.1 hard boundary, PLI-204).")

    raw, token_hash, prefix = new_invitation_token()
    inv = Invitation(
        household_id=household_id,
        email=str(body.email).lower(),
        role=body.role,
        token_hash=token_hash,
        token_prefix=prefix,
        invited_by_user_id=user.id,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    db.add(inv)
    await db.flush()
    await write_audit(db, action="member.invite", actor_user_id=user.id,
                      household_id=household_id, resource_type="Invitation",
                      resource_id=str(inv.id), detail={"role": body.role, "email": str(body.email)})
    await db.commit()
    # dev mode: token returned directly (no email delivery in v0.1)
    return {
        "invitation_id": str(inv.id),
        "email": inv.email,
        "role": inv.role,
        "expires_at": inv.expires_at.isoformat(),
        "accept_token": raw,
        "token_prefix": prefix,
        "note": "Dev mode: token returned in response because email delivery is out of v0.1 scope.",
    }


class AcceptInvitation(BaseModel):
    token: str


@router.post("/households/{household_id}/invitations/accept")
async def accept_invitation(
    household_id: uuid.UUID, body: AcceptInvitation, db: DBSession, user: CurrentUser
) -> dict:
    from app.core.security import hash_share_token

    inv = (
        await db.execute(
            select(Invitation).where(
                Invitation.household_id == household_id,
                Invitation.token_hash == hash_share_token(body.token),
            )
        )
    ).scalar_one_or_none()
    if inv is None or inv.status != "PENDING":
        raise NotFound("Invitation not found or already used.")
    if inv.expires_at <= datetime.now(UTC):
        inv.status = "EXPIRED"
        await db.flush()
        await db.commit()
        raise ValidationFailed("Invitation expired.")
    existing = (
        await db.execute(
            select(HouseholdMember).where(
                HouseholdMember.household_id == household_id,
                HouseholdMember.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise ConflictError("Already a member of this household.")
    db.add(
        HouseholdMember(
            household_id=household_id, user_id=user.id, role=inv.role,
            status="ACTIVE", invited_by_user_id=inv.invited_by_user_id,
        )
    )
    inv.status = "ACCEPTED"
    inv.accepted_by_user_id = user.id
    await db.flush()
    await write_audit(db, action="member.join", actor_user_id=user.id,
                      household_id=household_id, resource_type="HouseholdMember",
                      detail={"role": inv.role})
    await db.commit()
    return {"household_id": str(household_id), "role": inv.role,
            "user_id": str(user.id)}
