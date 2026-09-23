"""Health vet briefs: generate, share via time-bounded token link, view shared
brief (PLI-049..056, PLI-063).

Pure refactor of app/api/routes/health.py; endpoint bodies kept verbatim.
"""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.api.routes.health_common import (
    ShareIn,
    get_health_event_for_user,
)
from app.core.errors import NotFound
from app.core.security import new_share_token
from app.domain import enums
from app.models import ShareToken, VetBrief
from app.services import health as health_svc
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["health"])


@router.post("/health-events/{health_event_id}/vet-brief", status_code=201)
async def create_vet_brief(
    health_event_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> dict:
    he, pet = await get_health_event_for_user(
        db, health_event_id, user, enums.Capability.MEDICAL_WRITE
    )
    brief = await health_svc.generate_vet_brief(db, he, pet, user.id)
    await write_audit(db, action="vet_brief.generate", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="VetBrief", resource_id=str(brief.id))
    await db.commit()
    return {"vet_brief_id": str(brief.id), "content": brief.content}


@router.post("/vet-briefs/{vet_brief_id}/share", status_code=201)
async def share_vet_brief(
    vet_brief_id: uuid.UUID, body: ShareIn, db: DBSession, user: CurrentUser
) -> dict:
    brief = (
        await db.execute(select(VetBrief).where(VetBrief.id == vet_brief_id))
    ).scalar_one_or_none()
    if brief is None or brief.retracted_at is not None:
        raise NotFound("Vet brief not found.")
    pet = await perm.get_pet_or_404(db, brief.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_WRITE)
    raw, token_hash, prefix = new_share_token()
    expires = datetime.now(UTC) + timedelta(hours=body.expires_in_hours)
    st = ShareToken(
        pet_id=pet.id, resource_type=enums.ShareResourceType.VET_BRIEF.value,
        resource_id=brief.id, token_hash=token_hash, token_prefix=prefix,
        expires_at=expires, created_by_user_id=user.id,
    )
    db.add(st)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="health.vet_brief_shared",
        payload={"health_event_id": str(brief.health_event_id),
                 "vet_brief_id": str(brief.id), "token_prefix": prefix,
                 "expires_at": expires.isoformat()},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await write_audit(db, action="vet_brief.share", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="ShareToken", resource_id=str(st.id))
    await db.commit()
    return {"share_token": raw, "token_prefix": prefix, "expires_at": expires.isoformat()}


@router.get("/vet-briefs/shared/{token}")
async def view_shared_vet_brief(token: str, db: DBSession) -> dict:
    from app.core.security import hash_share_token

    st = (
        await db.execute(
            select(ShareToken).where(
                ShareToken.token_hash == hash_share_token(token),
                ShareToken.resource_type == enums.ShareResourceType.VET_BRIEF.value,
            )
        )
    ).scalar_one_or_none()
    if st is None:
        raise NotFound("Share link not found.")
    now = datetime.now(UTC)
    if st.revoked_at is not None or st.expires_at <= now:
        raise NotFound("Share link expired or revoked.")
    brief = (
        await db.execute(select(VetBrief).where(VetBrief.id == st.resource_id))
    ).scalar_one_or_none()
    if brief is None or brief.retracted_at is not None:
        raise NotFound("Vet brief not available.")
    st.access_count += 1
    st.last_accessed_at = now
    await db.flush()
    await write_audit(db, action="vet_brief.view", actor_user_id=None,
                      pet_id=st.pet_id, resource_type="VetBrief",
                      resource_id=str(brief.id))
    await db.commit()
    return {"vet_brief_id": str(brief.id), "content": brief.content}
