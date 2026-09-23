"""Pets: pet master record create/update/list (PLI-001/002)."""

import uuid
from datetime import date, datetime

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import ValidationFailed
from app.domain import enums
from app.models import Consent, EmergencyProfile, HouseholdMember, Pet, Relationship
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
    # PLI-GW0 pilot isolation flags (visible in API for dashboards/debug)
    is_demo: bool = False
    is_internal: bool = False
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
async def get_pet(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    caps = await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    data = PetOut.model_validate(pet).model_dump(mode="json")
    # PLI-012: field-level privacy — viewers without manage capability see
    # masked fields; owner/co-owner always see everything.
    if enums.Capability.MANAGE_PET.value not in caps:
        masked = pet.field_privacy or []
        for f in masked:
            if f in data:
                data[f] = None
        data["field_privacy_applied"] = masked
    return data


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
