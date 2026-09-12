"""Care network: household members/invitations (PLI-035/036), grants
(PLI-010/011), handoffs (PLI-037), care cards (PLI-038), notifications
(PLI-219), audit (PLI-046), deletion requests (PLI-216)."""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import ConflictError, NotFound, PermissionDenied, ValidationFailed
from app.core.security import new_invitation_token, new_share_token
from app.domain import enums
from app.models import (
    AuditEntry,
    CareCard,
    CareHandoff,
    CareTask,
    DeletionRequest,
    EmergencyProfile,
    Grant,
    HouseholdMember,
    Invitation,
    MedicationPlan,
    Notification,
    ShareToken,
    User,
)
from app.services import permissions as perm
from app.services.eventlog import create_life_event, create_notification, write_audit

router = APIRouter(tags=["care"])

GRANT_SCOPES = {c.value for c in enums.Capability}


# --- household members / invitations --------------------------------------


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


# --- grants (PLI-010/011) --------------------------------------------------


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


# --- handoffs (PLI-037) ----------------------------------------------------


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


# --- care cards (PLI-038) --------------------------------------------------


class CareCardCreate(BaseModel):
    expires_in_hours: int = Field(default=72, ge=1, le=24 * 30)


@router.post("/pets/{pet_id}/care-cards", status_code=201)
async def create_care_card(
    pet_id: uuid.UUID, body: CareCardCreate, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)

    profile = (
        await db.execute(
            select(EmergencyProfile).where(EmergencyProfile.pet_id == pet.id)
        )
    ).scalar_one_or_none()
    meds = (
        await db.execute(
            select(MedicationPlan).where(
                MedicationPlan.pet_id == pet.id, MedicationPlan.status == "ACTIVE"
            )
        )
    ).scalars().all()
    tasks = (
        await db.execute(
            select(CareTask).where(
                CareTask.pet_id == pet.id,
                CareTask.status == enums.TaskStatus.OPEN.value,
            ).order_by(CareTask.due_at).limit(20)
        )
    ).scalars().all()

    content = {
        "pet": {"name": pet.name, "species": pet.species, "breed": pet.breed,
                "sex": pet.sex, "birth_date": str(pet.birth_date or "")},
        "feeding_notes": "",
        "medications": [
            {"medicine_name": m.medicine_name, "dose_text": m.dose_text,
             "route": m.route, "frequency_text": m.frequency_text}
            for m in meds
        ],
        "behavior_taboos": (profile.critical_care_notes if profile else ""),
        "emergency_contacts": {
            "owner": profile.owner_contact if profile else "",
            "backup": profile.backup_contact if profile else "",
            "vet_clinic_name": profile.vet_clinic_name if profile else "",
            "vet_clinic_phone": profile.vet_clinic_phone if profile else "",
            "vet_clinic_address_text": profile.vet_clinic_address_text if profile else "",
        },
        "open_tasks": [{"title": t.title, "due_at": t.due_at.isoformat() if t.due_at else None}
                       for t in tasks],
        "generated_at": datetime.now(UTC).isoformat(),
        "notice": "最小字段卡片：不包含完整医疗历史。",
    }
    card = CareCard(pet_id=pet.id, content=content, issued_by_user_id=user.id,
                    expires_at=datetime.now(UTC) + timedelta(hours=body.expires_in_hours))
    db.add(card)
    await db.flush()

    raw, token_hash, prefix = new_share_token()
    token = ShareToken(
        pet_id=pet.id, resource_type=enums.ShareResourceType.CARE_CARD.value,
        resource_id=card.id, token_hash=token_hash, token_prefix=prefix,
        expires_at=card.expires_at, created_by_user_id=user.id,
    )
    db.add(token)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="care.card_issued",
        payload={"card_id": str(card.id), "token_prefix": prefix,
                 "expires_at": card.expires_at.isoformat()},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await write_audit(db, action="care_card.issue", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="CareCard", resource_id=str(card.id))
    await db.commit()
    return {"card_id": str(card.id), "token": raw, "token_prefix": prefix,
            "expires_at": card.expires_at.isoformat(),
            "share_url": f"/care-card/{raw}"}


@router.get("/care-card/{token}")
async def view_care_card(token: str, db: DBSession) -> dict:
    from app.core.security import hash_share_token

    row = (
        await db.execute(
            select(ShareToken, CareCard)
            .join(CareCard, CareCard.id == ShareToken.resource_id)
            .where(
                ShareToken.token_hash == hash_share_token(token),
                ShareToken.resource_type == enums.ShareResourceType.CARE_CARD.value,
            )
        )
    ).first()
    if row is None:
        raise NotFound("Care card not found.")
    st, card = row
    now = datetime.now(UTC)
    if st.revoked_at is not None or st.expires_at <= now:
        await write_audit(db, action="care_card.denied", actor_user_id=None,
                          pet_id=st.pet_id, resource_type="ShareToken",
                          resource_id=str(st.id), detail={"reason": "expired_or_revoked"})
        await db.commit()
        raise PermissionDenied("This care card link is expired or revoked.")
    if card.expires_at is not None and card.expires_at <= now:
        raise PermissionDenied("This care card has expired.")
    st.access_count += 1
    st.last_accessed_at = now
    await db.flush()
    await write_audit(db, action="care_card.view", actor_user_id=None,
                      pet_id=st.pet_id, resource_type="CareCard",
                      resource_id=str(card.id), detail={"token_prefix": st.token_prefix})
    await db.commit()
    return {"card_id": str(card.id), "content": card.content}


@router.delete("/share-tokens/{token_id}")
async def revoke_share_token(token_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    st = (
        await db.execute(select(ShareToken).where(ShareToken.id == token_id))
    ).scalar_one_or_none()
    if st is None:
        raise NotFound("Share token not found.")
    pet = await perm.get_pet_or_404(db, st.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    if st.revoked_at is None:
        st.revoked_at = datetime.now(UTC)
        st.revoked_by_user_id = user.id
        await db.flush()
        await write_audit(db, action="share_token.revoke", actor_user_id=user.id,
                          household_id=pet.household_id, pet_id=pet.id,
                          resource_type="ShareToken", resource_id=str(st.id))
    await db.commit()
    return {"token_id": str(st.id), "status": "REVOKED"}


# --- notifications (PLI-219) -----------------------------------------------


@router.get("/households/{household_id}/notifications")
async def list_notifications(
    household_id: uuid.UUID, db: DBSession, user: CurrentUser, limit: int = 50
) -> list[dict]:
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
            select(Notification)
            .where(
                (Notification.household_id == household_id)
                | (Notification.recipient_user_id == user.id)
            )
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    return [
        {
            "id": str(n.id), "type": n.type, "title": n.title, "body": n.body,
            "pet_id": str(n.pet_id) if n.pet_id else None,
            "created_at": n.created_at.isoformat(),
            "read_at": n.read_at.isoformat() if n.read_at else None,
            "data": n.data,
        }
        for n in rows
    ]


# --- audit (PLI-046) --------------------------------------------------------


@router.get("/pets/{pet_id}/audit")
async def pet_audit(pet_id: uuid.UUID, db: DBSession, user: CurrentUser,
                    limit: int = 100) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    rows = (
        await db.execute(
            select(AuditEntry).where(AuditEntry.pet_id == pet.id)
            .order_by(AuditEntry.occurred_at.desc()).limit(limit)
        )
    ).scalars().all()
    return [
        {
            "id": str(a.id), "occurred_at": a.occurred_at.isoformat(),
            "actor_user_id": str(a.actor_user_id) if a.actor_user_id else None,
            "action": a.action, "resource_type": a.resource_type,
            "resource_id": a.resource_id, "detail": a.detail,
        }
        for a in rows
    ]


# --- deletion request (PLI-216) ---------------------------------------------


class DeletionRequestIn(BaseModel):
    reason: str = ""


@router.post("/pets/{pet_id}/deletion-requests", status_code=201)
async def request_deletion(
    pet_id: uuid.UUID, body: DeletionRequestIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    dr = DeletionRequest(pet_id=pet.id, requested_by_user_id=user.id, reason=body.reason)
    db.add(dr)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="deletion.requested",
        payload={"request_id": str(dr.id), "reason": body.reason},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await create_notification(
        db, household_id=pet.household_id, pet_id=pet.id, notification_type="DELETION_REQUESTED",
        title="数据删除请求已记录",
        body="删除请求已登记，等待人工确认后执行（不会自动删除）。", data={"request_id": str(dr.id)},
        dedupe_key=f"deletion:{dr.id}",
    )
    await write_audit(db, action="deletion.request", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="DeletionRequest", resource_id=str(dr.id))
    await db.commit()
    return {"request_id": str(dr.id), "status": dr.status,
            "note": "Recorded only. Actual deletion requires explicit manual confirmation."}
