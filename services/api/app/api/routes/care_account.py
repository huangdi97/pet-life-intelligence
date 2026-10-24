"""Care network: notifications, audit, deletion requests (PLI-219/046/216)."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import and_, or_, select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import ConflictError, NotFound, PermissionDenied
from app.domain import enums
from app.models import AuditEntry, DeletionRequest, HouseholdMember, Notification
from app.services import permissions as perm
from app.services.eventlog import create_life_event, create_notification, write_audit

router = APIRouter(tags=["care"])


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
                or_(
                    and_(
                        Notification.household_id == household_id,
                        or_(
                            Notification.recipient_user_id.is_(None),
                            Notification.recipient_user_id == user.id,
                        ),
                        or_(
                            Notification.target_role.is_(None),
                            Notification.target_role == "ALL",
                            Notification.target_role == membership.role,
                        ),
                    ),
                    and_(
                        Notification.household_id.is_(None),
                        Notification.recipient_user_id == user.id,
                    ),
                )
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
            "target_role": n.target_role,
            "data": n.data,
        }
        for n in rows
    ]



async def _notification_for_user(
    notification_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> Notification:
    row = (
        await db.execute(select(Notification).where(Notification.id == notification_id))
    ).scalar_one_or_none()
    if row is None:
        raise NotFound("Notification not found.")

    if row.recipient_user_id == user.id and row.household_id is None:
        return row
    if row.household_id is None:
        raise PermissionDenied("Notification is not available to this user.")

    membership = (
        await db.execute(
            select(HouseholdMember).where(
                HouseholdMember.household_id == row.household_id,
                HouseholdMember.user_id == user.id,
                HouseholdMember.status == "ACTIVE",
            )
        )
    ).scalar_one_or_none()
    if membership is None:
        raise PermissionDenied("Notification is not available to this user.")
    if row.recipient_user_id is not None and row.recipient_user_id != user.id:
        raise PermissionDenied("Notification is addressed to another household member.")
    if row.target_role not in (None, "", "ALL", membership.role):
        raise PermissionDenied("Notification is addressed to another household role.")
    return row


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> dict:
    """Mark one visible notification read.

    Idempotent: a second call preserves the original read timestamp.
    """
    row = await _notification_for_user(notification_id, db, user)
    if row.read_at is None:
        row.read_at = datetime.now(UTC)
        await write_audit(
            db,
            action="notification.read",
            actor_user_id=user.id,
            household_id=row.household_id,
            pet_id=row.pet_id,
            resource_type="Notification",
            resource_id=str(row.id),
        )
        await db.commit()
    return {"notification_id": str(row.id), "read_at": row.read_at.isoformat() if row.read_at else None}


@router.post("/households/{household_id}/notifications/read-all")
async def mark_household_notifications_read(
    household_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> dict:
    """Mark the current user's visible notifications in one household read."""
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
            select(Notification).where(
                or_(
                    and_(
                        Notification.household_id == household_id,
                        or_(
                            Notification.recipient_user_id.is_(None),
                            Notification.recipient_user_id == user.id,
                        ),
                        or_(
                            Notification.target_role.is_(None),
                            Notification.target_role == "ALL",
                            Notification.target_role == membership.role,
                        ),
                    ),
                    and_(
                        Notification.household_id.is_(None),
                        Notification.recipient_user_id == user.id,
                    ),
                ),
                Notification.read_at.is_(None),
            )
        )
    ).scalars().all()
    now = datetime.now(UTC)
    for row in rows:
        row.read_at = now
    if rows:
        await write_audit(
            db,
            action="notification.read_all",
            actor_user_id=user.id,
            household_id=household_id,
            resource_type="Notification",
            resource_id="*",
            detail={"count": len(rows)},
        )
        await db.commit()
    return {"marked": len(rows), "read_at": now.isoformat() if rows else None}


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


class DeletionRequestIn(BaseModel):
    reason: str = ""


@router.get("/pets/{pet_id}/deletion-requests")
async def list_deletion_requests(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> list[dict]:
    """Owner-visible deletion request history.

    This is status-only. It never executes deletion; execution remains an
    explicit, manual, audited high-risk operation outside this automatic path.
    """
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    rows = (
        await db.execute(
            select(DeletionRequest)
            .where(DeletionRequest.pet_id == pet.id)
            .order_by(DeletionRequest.created_at.desc())
        )
    ).scalars().all()
    return [
        {
            "request_id": str(row.id),
            "status": row.status,
            "reason": row.reason,
            "created_at": row.created_at.isoformat(),
            "resolved_at": row.resolved_at.isoformat() if row.resolved_at else None,
        }
        for row in rows
    ]


@router.post("/pets/{pet_id}/deletion-requests", status_code=201)
async def request_deletion(
    pet_id: uuid.UUID, body: DeletionRequestIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    pending = (
        await db.execute(
            select(DeletionRequest).where(
                DeletionRequest.pet_id == pet.id,
                DeletionRequest.status == "PENDING",
            )
        )
    ).scalar_one_or_none()
    if pending is not None:
        raise ConflictError(
            "A deletion request is already pending for this pet.",
            details={"request_id": str(pending.id)},
        )
    dr = DeletionRequest(
        pet_id=pet.id,
        requested_by_user_id=user.id,
        reason=body.reason.strip(),
    )
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
