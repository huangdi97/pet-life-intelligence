"""Permission resolution: RBAC roles + ABAC (pet, grant scope, time window).

Security invariants (GOAL §7):
- Non-owner cannot transfer pet ownership.
- Temporary caregiver cannot permanently re-grant to third parties.
- Expired/revoked grants are dead on resolution time.
- All access resolves through this module — routes never hand-roll checks.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFound, PermissionDenied
from app.domain import enums
from app.models import Grant, HouseholdMember, Pet, Relationship

ALL_CAPABILITIES = {c.value for c in enums.Capability}


def _now() -> datetime:
    return datetime.now(UTC)


async def get_pet_or_404(db: AsyncSession, pet_id: uuid.UUID) -> Pet:
    pet = (
        await db.execute(select(Pet).where(Pet.id == pet_id, Pet.archived_at.is_(None)))
    ).scalar_one_or_none()
    if pet is None:
        raise NotFound(f"Pet {pet_id} not found.")
    return pet


async def _household_role(db: AsyncSession, household_id: uuid.UUID,
                          user_id: uuid.UUID) -> str | None:
    member = (
        await db.execute(
            select(HouseholdMember).where(
                HouseholdMember.household_id == household_id,
                HouseholdMember.user_id == user_id,
                HouseholdMember.status == "ACTIVE",
            )
        )
    ).scalar_one_or_none()
    return member.role if member else None


async def _relationship_role(db: AsyncSession, pet_id: uuid.UUID,
                             user_id: uuid.UUID) -> str | None:
    rel = (
        await db.execute(
            select(Relationship).where(
                Relationship.pet_id == pet_id,
                Relationship.user_id == user_id,
                Relationship.revoked_at.is_(None),
            )
        )
    ).scalar_one_or_none()
    return rel.role if rel else None


async def _grant_scopes(db: AsyncSession, pet_id: uuid.UUID, user_id: uuid.UUID) -> set[str]:
    grants = (
        (
            await db.execute(
                select(Grant).where(
                    Grant.pet_id == pet_id,
                    Grant.user_id == user_id,
                    Grant.status == "ACTIVE",
                )
            )
        )
        .scalars()
        .all()
    )
    now = _now()
    scopes: set[str] = set()
    for g in grants:
        if g.revoked_at is not None or g.status != "ACTIVE":
            continue
        if g.starts_at and g.starts_at > now:
            continue
        if g.expires_at is not None and g.expires_at <= now:
            continue
        scopes.update(s for s in (g.scopes or []) if s in ALL_CAPABILITIES)
    return scopes


async def resolve_capabilities(
    db: AsyncSession, pet: Pet, user_id: uuid.UUID
) -> set[str]:
    """Union of role-based capabilities and active grant scopes."""
    caps: set[str] = set()

    rel = await _relationship_role(db, pet.id, user_id)
    if rel in (enums.RelationshipRole.OWNER.value, enums.RelationshipRole.CO_OWNER.value):
        caps.update(ALL_CAPABILITIES)
        return caps

    hh_role = await _household_role(db, pet.household_id, user_id)
    if hh_role:
        caps.update(enums.ROLE_DEFAULT_CAPABILITIES.get(hh_role, set()))

    caps.update(await _grant_scopes(db, pet.id, user_id))
    return caps


async def require_capability(
    db: AsyncSession, pet: Pet, user_id: uuid.UUID, capability: enums.Capability
) -> set[str]:
    caps = await resolve_capabilities(db, pet, user_id)
    if capability.value not in caps:
        raise PermissionDenied(
            f"Missing required capability '{capability.value}' on this pet."
        )
    return caps


async def require_owner(db: AsyncSession, pet: Pet, user_id: uuid.UUID) -> None:
    """Only OWNER/CO_OWNER may manage the pet (grants, handoffs, ownership)."""
    rel = await _relationship_role(db, pet.id, user_id)
    if rel in (enums.RelationshipRole.OWNER.value, enums.RelationshipRole.CO_OWNER.value):
        return
    hh_role = await _household_role(db, pet.household_id, user_id)
    if hh_role in (enums.HouseholdRole.OWNER.value, enums.HouseholdRole.CO_OWNER.value):
        return
    raise PermissionDenied("Only owner/co-owner can perform this action.")


async def assert_not_elevating(
    db: AsyncSession, pet: Pet, acting_user_id: uuid.UUID
) -> None:
    """Hard boundary: temporary caregivers must never be able to grant
    capabilities to others (GOAL §7). Call before any grant creation."""
    await require_owner(db, pet, acting_user_id)


async def accessible_pet_ids(db: AsyncSession, user_id: uuid.UUID) -> list[uuid.UUID]:
    """All pet ids the user can read (any capability)."""
    rows = (await db.execute(select(Pet.id, Pet.household_id))).all()
    if not rows:
        return []
    member_rows = (
        await db.execute(
            select(HouseholdMember.household_id).where(
                HouseholdMember.user_id == user_id, HouseholdMember.status == "ACTIVE"
            )
        )
    ).scalars().all()
    rel_rows = (
        await db.execute(
            select(Relationship.pet_id).where(
                Relationship.user_id == user_id, Relationship.revoked_at.is_(None)
            )
        )
    ).scalars().all()
    grant_rows = (
        await db.execute(
            select(Grant.pet_id).where(
                Grant.user_id == user_id, Grant.status == "ACTIVE",
                Grant.revoked_at.is_(None),
            )
        )
    ).scalars().all()
    hh_set = set(member_rows)
    result = [
        pid for (pid, hhid) in rows
        if pid in set(rel_rows) or pid in set(grant_rows) or hhid in hh_set
    ]
    return result
