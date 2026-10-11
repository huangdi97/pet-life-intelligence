"""Pets: pet master record create/update/list (PLI-001/002)."""

import base64
import uuid
from datetime import date, datetime

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import ValidationFailed
from app.domain import enums
from app.models import Artifact, Consent, EmergencyProfile, HouseholdMember, Pet, Relationship
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit
from app.services.storage import get_storage

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


class PetAvatarSet(BaseModel):
    artifact_id: uuid.UUID


class PetAvatarOut(BaseModel):
    avatar_artifact_id: uuid.UUID | None
    content_type: str | None = None
    data_url: str | None = None


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
    lifecycle_status: str
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


@router.get("/pets/{pet_id}/avatar")
async def get_pet_avatar(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> PetAvatarOut:
    """Return the persisted avatar through the authenticated pet context.

    Owner clients use this compact JSON/data-url representation so the same
    protected artifact can render on Web, native and Mini without creating a
    public media URL or bypassing capability checks.
    """
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    if pet.avatar_artifact_id is None:
        return PetAvatarOut(avatar_artifact_id=None)

    artifact = (
        await db.execute(
            select(Artifact).where(
                Artifact.id == pet.avatar_artifact_id,
                Artifact.pet_id == pet.id,
                Artifact.deleted_at.is_(None),
            )
        )
    ).scalar_one_or_none()
    if artifact is None or artifact.kind != "IMAGE":
        # Do not silently substitute another image when the recorded avatar
        # artifact is gone or invalid.
        return PetAvatarOut(avatar_artifact_id=pet.avatar_artifact_id)

    content = await get_storage().get(artifact.storage_key)
    encoded = base64.b64encode(content).decode("ascii")
    return PetAvatarOut(
        avatar_artifact_id=artifact.id,
        content_type=artifact.content_type,
        data_url=f"data:{artifact.content_type};base64,{encoded}",
    )


@router.put("/pets/{pet_id}/avatar")
async def set_pet_avatar(
    pet_id: uuid.UUID, body: PetAvatarSet, db: DBSession, user: CurrentUser
) -> PetOut:
    """Choose one already-uploaded image artifact as this pet's avatar."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    artifact = (
        await db.execute(
            select(Artifact).where(
                Artifact.id == body.artifact_id,
                Artifact.pet_id == pet.id,
                Artifact.deleted_at.is_(None),
            )
        )
    ).scalar_one_or_none()
    if artifact is None:
        raise ValidationFailed("Avatar artifact does not belong to this pet.")
    if artifact.kind != "IMAGE" or not artifact.content_type.startswith("image/"):
        raise ValidationFailed("Avatar must be an uploaded image artifact.")

    pet.avatar_artifact_id = artifact.id
    await db.flush()
    await create_life_event(
        db,
        pet_id=pet.id,
        event_type="pet.media_added",
        payload={"artifact_id": str(artifact.id), "purpose": "avatar"},
        actor_id=user.id,
        source_type=enums.SourceType.OWNER_REPORTED,
        source_ref=f"artifact:{artifact.id}",
        artifact_ids=[artifact.id],
    )
    await write_audit(
        db,
        action="pet.avatar_set",
        actor_user_id=user.id,
        household_id=pet.household_id,
        pet_id=pet.id,
        resource_type="Artifact",
        resource_id=str(artifact.id),
    )
    await db.commit()
    return PetOut.model_validate(pet)


@router.patch("/pets/{pet_id}")
async def update_pet(
    pet_id: uuid.UUID, body: PetUpdate, db: DBSession, user: CurrentUser
) -> PetOut:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    changed = []
    nullable_fields = {"birth_date", "neutered"}
    for field, value in body.model_dump(exclude_unset=True).items():
        # birth_date/neutered explicitly support clearing back to "unknown".
        # Other identity strings ignore null rather than erasing required data.
        if field in nullable_fields:
            if getattr(pet, field) != value:
                setattr(pet, field, value)
                changed.append(field)
        elif value is not None and getattr(pet, field) != value:
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
