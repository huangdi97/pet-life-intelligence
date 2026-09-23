"""Care network: care cards and share tokens (PLI-038)."""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import NotFound, PermissionDenied
from app.core.security import new_share_token
from app.domain import enums
from app.models import CareCard, CareTask, EmergencyProfile, MedicationPlan, ShareToken
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["care"])


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

    masked = pet.field_privacy or []
    birth = None if "birth_date" in masked else str(pet.birth_date or "")
    breed = None if "breed" in masked else pet.breed
    content = {
        "pet": {"name": pet.name, "species": pet.species, "breed": breed,
                "sex": pet.sex, "birth_date": birth,
                "field_privacy_applied": masked},
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
