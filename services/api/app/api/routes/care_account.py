"""Care network: notifications, audit, deletion requests (PLI-219/046/216)."""

import uuid

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import PermissionDenied
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
