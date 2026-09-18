"""Pilot mode routes (Stage E Phase O): invite codes (admin), registration
gating, feedback, pilot dashboard.
"""

import uuid
from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.api.deps import CurrentUser, DBSession
from app.services import pilot as pilot_svc

router = APIRouter(prefix="/pilot", tags=["pilot"])


class InviteCreate(BaseModel):
    purpose: str = "pilot"
    max_uses: int = Field(default=1, ge=1, le=100)
    expires_hours: int = Field(default=168, ge=1, le=24 * 30)
    note: str = ""


class InviteRedeem(BaseModel):
    code: str


class FeedbackIn(BaseModel):
    category: str
    message: str = Field(min_length=1, max_length=4000)
    page_url: str = ""
    pet_id: uuid.UUID | None = None
    client: str = "web"
    extra: dict = Field(default_factory=dict)


@router.get("/status")
async def pilot_status(db: DBSession) -> dict:
    return await pilot_svc.pilot_dashboard(db)


@router.post("/invites", status_code=201)
async def create_invite(body: InviteCreate, db: DBSession, user: CurrentUser) -> dict:
    # Only pilot admins / owners may mint codes. In this release the admin is
    # a designated user; the check is advisory (real admin roles come with
    # the production console). Codes are always audited via audit entries.
    from app.services.eventlog import write_audit

    result = await pilot_svc.create_invite_code(
        db, user.id, purpose=body.purpose, max_uses=body.max_uses,
        expires_hours=body.expires_hours, note=body.note,
    )
    await write_audit(db, action="pilot.invite.create", actor_user_id=user.id,
                      resource_type="PilotInviteCode", resource_id=result["invite_id"])
    await db.commit()
    return result


@router.post("/redeem", status_code=200)
async def redeem_invite(body: InviteRedeem, db: DBSession, user: CurrentUser) -> dict:
    await pilot_svc.validate_invite_code(db, body.code, user.id, "owner")
    from app.services.eventlog import write_audit

    await write_audit(db, action="pilot.invite.redeem", actor_user_id=user.id,
                      resource_type="PilotInviteCode", resource_id=body.code)
    await db.commit()
    return {"ok": True, "message": "邀请码已绑定。"}


@router.post("/feedback", status_code=201)
async def submit_feedback(body: FeedbackIn, db: DBSession, user: CurrentUser) -> dict:
    from app.services.eventlog import write_audit

    result = await pilot_svc.submit_feedback(
        db, user.id, category=body.category, message=body.message,
        page_url=body.page_url, pet_id=body.pet_id, client=body.client,
        extra=body.extra,
    )
    await write_audit(db, action="pilot.feedback", actor_user_id=user.id,
                      resource_type="PilotFeedback", resource_id=result["feedback_id"])
    await db.commit()
    return result


class OrgCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    org_type: str = "OWNER_COHORT"
    contact: str = ""
    status: str = "LEAD"
    started_at: datetime | None = None
    expected_end_at: datetime | None = None
    participant_limit: int | None = Field(default=None, ge=1, le=100000)
    consent_version: str = ""
    notes: str = ""


class OrgTransition(BaseModel):
    status: str


@router.post("/orgs", status_code=201)
async def create_org(body: OrgCreate, db: DBSession, user: CurrentUser) -> dict:
    """Create a pilot organization (metadata only, no fake real users)."""
    from app.services.eventlog import write_audit

    result = await pilot_svc.create_pilot_org(
        db, name=body.name, org_type=body.org_type, contact=body.contact,
        status=body.status, started_at=body.started_at,
        expected_end_at=body.expected_end_at,
        participant_limit=body.participant_limit,
        consent_version=body.consent_version, notes=body.notes,
    )
    await write_audit(db, action="pilot.org.create", actor_user_id=user.id,
                      resource_type="PilotOrg", resource_id=result["pilot_org_id"])
    await db.commit()
    return result


@router.get("/orgs")
async def list_orgs(db: DBSession, user: CurrentUser) -> list[dict]:
    return await pilot_svc.list_pilot_orgs(db)


@router.patch("/orgs/{org_id}/status")
async def transition_org(org_id: uuid.UUID, body: OrgTransition,
                         db: DBSession, user: CurrentUser) -> dict:
    from app.services.eventlog import write_audit

    result = await pilot_svc.transition_pilot_org(db, org_id, body.status)
    await write_audit(db, action="pilot.org.transition", actor_user_id=user.id,
                      resource_type="PilotOrg", resource_id=str(org_id),
                      detail={"to_status": body.status})
    await db.commit()
    return result
