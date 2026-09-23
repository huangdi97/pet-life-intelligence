"""Pets: consents and emergency profile (PLI-016/014/215)."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import NotFound, ValidationFailed
from app.domain import enums
from app.models import Consent, EmergencyProfile
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["pets"])


class ConsentPut(BaseModel):
    granted: bool


@router.get("/pets/{pet_id}/consents")
async def list_consents(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> list[dict]:
    pet, _, _ = await _ctx(db, user, pet_id, enums.Capability.DAILY_READ)
    rows = (await db.execute(select(Consent).where(Consent.pet_id == pet.id))).scalars().all()
    return [
        {"purpose": c.purpose, "granted": c.granted, "updated_at": c.updated_at.isoformat()}
        for c in rows
    ]


@router.put("/pets/{pet_id}/consents/{purpose}")
async def put_consent(
    pet_id: uuid.UUID, purpose: str, body: ConsentPut, db: DBSession, user: CurrentUser
) -> dict:
    pet, _, _ = await _ctx(db, user, pet_id, enums.Capability.MANAGE_PET)
    if purpose not in [p.value for p in enums.ConsentPurpose]:
        raise ValidationFailed(f"Unknown consent purpose '{purpose}'.")
    if purpose == enums.ConsentPurpose.SERVICE_ESSENTIAL.value and not body.granted:
        raise ValidationFailed("SERVICE_ESSENTIAL consent cannot be withdrawn (product-critical).")
    row = (
        await db.execute(
            select(Consent).where(Consent.pet_id == pet.id, Consent.purpose == purpose)
        )
    ).scalar_one_or_none()
    if row is None:
        row = Consent(pet_id=pet.id, purpose=purpose, granted=body.granted,
                      updated_by_user_id=user.id)
        db.add(row)
    else:
        row.granted = body.granted
        row.updated_by_user_id = user.id
        row.updated_at = datetime.now(UTC)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="consent.changed",
        payload={"purpose": purpose, "granted": body.granted},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await write_audit(
        db, action="consent.change", actor_user_id=user.id,
        household_id=pet.household_id, pet_id=pet.id,
        resource_type="Consent", resource_id=purpose, detail={"granted": body.granted},
    )
    await db.commit()
    return {"purpose": purpose, "granted": body.granted}


class EmergencyProfileIn(BaseModel):
    owner_contact: str | None = None
    backup_contact: str | None = None
    vet_clinic_name: str | None = None
    vet_clinic_phone: str | None = None
    vet_clinic_address_text: str | None = None
    critical_care_notes: str | None = None


@router.get("/pets/{pet_id}/emergency-profile")
async def get_emergency_profile(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> dict:
    pet, _, _ = await _ctx(db, user, pet_id, enums.Capability.DAILY_READ)
    prof = (
        await db.execute(
            select(EmergencyProfile).where(EmergencyProfile.pet_id == pet.id)
        )
    ).scalar_one_or_none()
    if prof is None:
        raise NotFound("Emergency profile not initialized.")
    return {
        "owner_contact": prof.owner_contact,
        "backup_contact": prof.backup_contact,
        "vet_clinic_name": prof.vet_clinic_name,
        "vet_clinic_phone": prof.vet_clinic_phone,
        "vet_clinic_address_text": prof.vet_clinic_address_text,
        "critical_care_notes": prof.critical_care_notes,
        "updated_at": prof.updated_at.isoformat(),
    }


@router.put("/pets/{pet_id}/emergency-profile")
async def put_emergency_profile(
    pet_id: uuid.UUID, body: EmergencyProfileIn, db: DBSession, user: CurrentUser
) -> dict:
    pet, _, _ = await _ctx(db, user, pet_id, enums.Capability.MANAGE_PET)
    prof = (
        await db.execute(
            select(EmergencyProfile).where(EmergencyProfile.pet_id == pet.id)
        )
    ).scalar_one_or_none()
    if prof is None:
        prof = EmergencyProfile(pet_id=pet.id, updated_by_user_id=user.id)
        db.add(prof)
    changed = []
    for field, value in body.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(prof, field, value)
            changed.append(field)
    prof.updated_by_user_id = user.id
    prof.updated_at = datetime.now(UTC)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="emergency_profile.updated",
        payload={"updated_fields": changed}, actor_id=user.id,
        source_type=enums.SourceType.OWNER_REPORTED,
    )
    await write_audit(
        db, action="emergency_profile.update", actor_user_id=user.id,
        household_id=pet.household_id, pet_id=pet.id,
        resource_type="EmergencyProfile", resource_id=str(prof.id),
    )
    await db.commit()
    return {"updated_fields": changed}


async def _ctx(db, user, pet_id, capability):
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, capability)
    return pet, user, None
