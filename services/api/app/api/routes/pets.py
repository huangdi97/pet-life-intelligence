"""Pets: create/update/list pet master records, consents, emergency profile
(PLI-001/002/016/014/215)."""

import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import NotFound, PermissionDenied, ValidationFailed
from app.domain import enums
from app.models import (
    Consent,
    EmergencyProfile,
    Household,
    HouseholdMember,
    LifeEvent,
    Pet,
    Relationship,
)
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["pets"])


class PetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    species: str = Field(pattern="^(dog|cat|other)$")
    breed: str = ""
    sex: str = Field(default="UNKNOWN", pattern="^(MALE|FEMALE|UNKNOWN)$")
    birth_date: date | None = None
    neutered: bool | None = None
    weight_note: str = ""
    timezone: str = "Asia/Shanghai"


class PetUpdate(BaseModel):
    name: str | None = None
    breed: str | None = None
    sex: str | None = None
    birth_date: date | None = None
    neutered: bool | None = None
    weight_note: str | None = None
    timezone: str | None = None


class PetOut(BaseModel):
    id: uuid.UUID
    household_id: uuid.UUID
    name: str
    species: str
    breed: str
    sex: str
    birth_date: date | None
    neutered: bool | None
    weight_note: str
    timezone: str
    avatar_artifact_id: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.post("/pets", status_code=201)
async def create_pet(body: PetCreate, db: DBSession, user: CurrentUser) -> PetOut:
    # user's household (first active membership) — v0.1 single-household model
    membership = (
        await db.execute(
            select(HouseholdMember)
            .where(HouseholdMember.user_id == user.id, HouseholdMember.status == "ACTIVE")
            .order_by(HouseholdMember.created_at)
        )
    ).scalars().first()
    if membership is None:
        raise ValidationFailed("User has no household. Join or create one first.")

    pet = Pet(
        household_id=membership.household_id,
        name=body.name,
        species=body.species,
        breed=body.breed,
        sex=body.sex,
        birth_date=body.birth_date,
        neutered=body.neutered,
        weight_note=body.weight_note,
        timezone=body.timezone,
        created_by_user_id=user.id,
    )
    db.add(pet)
    await db.flush()

    db.add(
        Relationship(
            pet_id=pet.id,
            user_id=user.id,
            role=enums.RelationshipRole.OWNER.value,
            created_by_user_id=user.id,
        )
    )
    await db.flush()

    # default consents: service essential on, everything else off
    for purpose in enums.ConsentPurpose:
        db.add(
            Consent(
                pet_id=pet.id,
                purpose=purpose.value,
                granted=purpose == enums.ConsentPurpose.SERVICE_ESSENTIAL,
                updated_by_user_id=user.id,
            )
        )
    db.add(EmergencyProfile(pet_id=pet.id, updated_by_user_id=user.id))
    await db.flush()

    await create_life_event(
        db,
        pet_id=pet.id,
        event_type="pet.created",
        payload={"name": pet.name, "species": pet.species, "breed": pet.breed},
        actor_id=user.id,
        source_type=enums.SourceType.OWNER_REPORTED,
        idempotency_key=None,
    )
    await write_audit(
        db, action="pet.create", actor_user_id=user.id,
        household_id=pet.household_id, pet_id=pet.id,
        resource_type="Pet", resource_id=str(pet.id),
    )
    await db.commit()
    return PetOut.model_validate(pet)


@router.get("/pets")
async def list_pets(db: DBSession, user: CurrentUser) -> list[PetOut]:
    ids = await perm.accessible_pet_ids(db, user.id)
    if not ids:
        return []
    rows = (
        await db.execute(
            select(Pet).where(Pet.id.in_(ids), Pet.archived_at.is_(None)).order_by(Pet.created_at)
        )
    ).scalars().all()
    return [PetOut.model_validate(p) for p in rows]


@router.get("/pets/{pet_id}")
async def get_pet(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> PetOut:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    return PetOut.model_validate(pet)


@router.patch("/pets/{pet_id}")
async def update_pet(
    pet_id: uuid.UUID, body: PetUpdate, db: DBSession, user: CurrentUser
) -> PetOut:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    changed = []
    for field, value in body.model_dump(exclude_unset=True).items():
        if value is not None and getattr(pet, field) != value:
            setattr(pet, field, value)
            changed.append(field)
    await db.flush()
    if changed:
        await write_audit(
            db, action="pet.update", actor_user_id=user.id,
            household_id=pet.household_id, pet_id=pet.id,
            resource_type="Pet", resource_id=str(pet.id), detail={"fields": changed},
        )
    await db.commit()
    return PetOut.model_validate(pet)


# --- consents (PLI-016 / PLI-215) ----------------------------------------


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
        row.updated_at = datetime.now(timezone.utc)
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


# --- emergency profile (PLI-014) -----------------------------------------


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
    prof.updated_at = datetime.now(timezone.utc)
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
