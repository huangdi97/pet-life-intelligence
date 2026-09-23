"""v0.2 social — PLI-111 social profile · PLI-112 double-consent friends ·
PLI-113 interactions.

Pure refactor of v02_social_platform.py; endpoint bodies kept verbatim.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import NotFound, PermissionDenied, ValidationFailed
from app.domain import enums
from app.models import (
    PetFriend,
    SocialInteraction,
    SocialProfile,
)
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["v02-social-platform"])


# --- PLI-111 social profile ---------------------------------------------------


class SocialProfileIn(BaseModel):
    good_with_dogs: str = "UNKNOWN"
    good_with_cats: str = "UNKNOWN"
    good_with_kids: str = "UNKNOWN"
    good_with_strangers: str = "UNKNOWN"
    notes: str = ""


@router.put("/pets/{pet_id}/social-profile")
async def put_social_profile(
    pet_id: uuid.UUID, body: SocialProfileIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    for v in (body.good_with_dogs, body.good_with_cats, body.good_with_kids,
              body.good_with_strangers):
        if v not in {"UNKNOWN", "GOOD", "OK", "CAUTION", "NO"}:
            raise ValidationFailed("values must be UNKNOWN|GOOD|OK|CAUTION|NO")
    row = (
        await db.execute(select(SocialProfile).where(SocialProfile.pet_id == pet.id))
    ).scalar_one_or_none()
    if row is None:
        row = SocialProfile(pet_id=pet.id, updated_by_user_id=user.id)
        db.add(row)
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    row.updated_by_user_id = user.id
    await db.flush()
    await db.commit()
    return {"pet_id": str(pet.id), "profile": body.model_dump(),
            "note": "经验档案，非行为评估。"}


@router.get("/pets/{pet_id}/social-profile")
async def get_social_profile(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    row = (
        await db.execute(select(SocialProfile).where(SocialProfile.pet_id == pet.id))
    ).scalar_one_or_none()
    if row is None:
        return {"pet_id": str(pet.id), "profile": None}
    return {
        "pet_id": str(pet.id),
        "profile": {
            "good_with_dogs": row.good_with_dogs, "good_with_cats": row.good_with_cats,
            "good_with_kids": row.good_with_kids,
            "good_with_strangers": row.good_with_strangers, "notes": row.notes,
        },
    }


# --- PLI-112 friends with double consent + PLI-113 interactions -----------------


class FriendRequestIn(BaseModel):
    friend_pet_id: uuid.UUID


@router.post("/pets/{pet_id}/friends", status_code=201)
async def request_friend(
    pet_id: uuid.UUID, body: FriendRequestIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    if body.friend_pet_id == pet.id:
        raise ValidationFailed("cannot friend self")
    friend = await perm.get_pet_or_404(db, body.friend_pet_id)
    # requester must be able to manage their own pet; other side must accept
    row = PetFriend(
        pet_id=pet.id, friend_pet_id=friend.id,
        requested_by_user_id=user.id, status="PENDING",
    )
    db.add(row)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="social.friend_requested",
        payload={"friend_pet_id": str(friend.id), "request_id": str(row.id)},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await write_audit(db, action="social.request", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="PetFriend", resource_id=str(row.id))
    await db.commit()
    return {"request_id": str(row.id), "status": "PENDING",
            "note": "需要对方家庭接受后才会激活（双重同意）。"}


class FriendAcceptIn(BaseModel):
    accept: bool = True


@router.post("/pet-friends/{request_id}/respond")
async def respond_friend(
    request_id: uuid.UUID, body: FriendAcceptIn, db: DBSession, user: CurrentUser
) -> dict:
    row = (
        await db.execute(select(PetFriend).where(PetFriend.id == request_id))
    ).scalar_one_or_none()
    if row is None:
        raise NotFound("Request not found.")
    friend = await perm.get_pet_or_404(db, row.friend_pet_id)
    await perm.require_capability(db, friend, user.id, enums.Capability.MANAGE_PET)
    row.status = "ACTIVE" if body.accept else "DECLINED"
    row.accepted_by_user_id = user.id
    await db.flush()
    await db.commit()
    return {"request_id": str(row.id), "status": row.status}


@router.post("/pets/{pet_id}/friends/{friend_pet_id}/block", status_code=201)
async def block_friend(
    pet_id: uuid.UUID, friend_pet_id: uuid.UUID, body: dict,
    db: DBSession, user: CurrentUser,
) -> dict:
    from app.models import SocialReport

    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    row = (
        await db.execute(
            select(PetFriend).where(
                PetFriend.pet_id == pet.id, PetFriend.friend_pet_id == friend_pet_id
            )
        )
    ).scalar_one_or_none()
    if row is not None:
        row.status = "BLOCKED"
    db.add(
        SocialReport(
            pet_id=pet.id, friend_pet_id=friend_pet_id,
            action=str(body.get("action", "BLOCK")),
            reason=str(body.get("reason", "")), reported_by_user_id=user.id,
        )
    )
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="social.blocked",
        payload={"friend_pet_id": str(friend_pet_id),
                 "action": str(body.get("action", "BLOCK"))},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await write_audit(db, action="social.block", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="SocialReport")
    await db.commit()
    return {"pet_id": str(pet.id), "friend_pet_id": str(friend_pet_id),
            "status": "BLOCKED"}


@router.get("/pets/{pet_id}/friends")
async def list_friends(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(select(PetFriend).where(PetFriend.pet_id == pet.id))
    ).scalars().all()
    return [
        {"request_id": str(r.id), "friend_pet_id": str(r.friend_pet_id),
         "status": r.status}
        for r in rows
    ]


class InteractionIn(BaseModel):
    friend_pet_id: uuid.UUID
    occurred_at: datetime | None = None
    quality: str = "UNKNOWN"
    duration_minutes: int | None = Field(default=None, ge=0, le=24 * 60)
    notes: str = ""


@router.post("/pets/{pet_id}/social-interactions", status_code=201)
async def log_interaction(
    pet_id: uuid.UUID, body: InteractionIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    if body.quality not in {"UNKNOWN", "GOOD", "NEUTRAL", "TENSE", "BAD"}:
        raise ValidationFailed("quality must be UNKNOWN|GOOD|NEUTRAL|TENSE|BAD")
    friendship = (
        await db.execute(
            select(PetFriend).where(
                PetFriend.pet_id == pet.id,
                PetFriend.friend_pet_id == body.friend_pet_id,
                PetFriend.status == "ACTIVE",
            )
        )
    ).scalar_one_or_none()
    if friendship is None:
        raise PermissionDenied("Interactions require an ACTIVE friend relation.")
    inter = SocialInteraction(
        pet_id=pet.id, friend_pet_id=body.friend_pet_id,
        occurred_at=body.occurred_at or datetime.now(timezone.utc),
        quality=body.quality, duration_minutes=body.duration_minutes,
        notes=body.notes, created_by_user_id=user.id,
    )
    db.add(inter)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="social.interaction_logged",
        payload={"interaction_id": str(inter.id),
                 "friend_pet_id": str(body.friend_pet_id), "quality": inter.quality},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await db.commit()
    return {"interaction_id": str(inter.id), "quality": inter.quality}
