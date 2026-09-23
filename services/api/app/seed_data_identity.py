"""Demo identity rows for ``app.seed``: users, household, members, pets,
relationships (GOAL Phase 12 / G12 demo family).
"""

from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain import enums
from app.models import Household, HouseholdMember, Pet, Relationship, User


async def insert_identity(db: AsyncSession) -> dict:
    """Create demo users/household/pets/relationships; return their raw ids.

    Ordering matters: members need user ids, pets need household + creator
    ids, relationships need pet ids — flush after each stage.
    """
    owner = User(email="owner@pli.demo", display_name="Demo Owner", is_demo=True)
    family = User(email="family@pli.demo", display_name="Demo Family Member", is_demo=True)
    sitter = User(email="sitter@pli.demo", display_name="Demo Sitter", is_demo=True)
    db.add_all([owner, family, sitter])
    await db.flush()

    hh = Household(name="Demo Family")
    db.add(hh)
    await db.flush()
    db.add_all(
        [
            HouseholdMember(household_id=hh.id, user_id=owner.id,
                            role=enums.HouseholdRole.OWNER.value, status="ACTIVE"),
            HouseholdMember(household_id=hh.id, user_id=family.id,
                            role=enums.HouseholdRole.FAMILY.value, status="ACTIVE"),
        ]
    )
    await db.flush()

    coco = Pet(household_id=hh.id, name="Coco", species="dog", breed="Corgi",
               sex="FEMALE", birth_date=datetime(2022, 5, 1).date(),
               neutered=True, weight_note="12kg", created_by_user_id=owner.id,
               is_demo=True)
    mimi = Pet(household_id=hh.id, name="Mimi", species="cat", breed="DLH",
               sex="MALE", birth_date=datetime(2021, 11, 20).date(),
               neutered=True, weight_note="4.5kg", created_by_user_id=owner.id,
               is_demo=True)
    db.add_all([coco, mimi])
    await db.flush()
    db.add_all(
        [
            Relationship(pet_id=coco.id, user_id=owner.id,
                         role=enums.RelationshipRole.OWNER.value,
                         created_by_user_id=owner.id),
            Relationship(pet_id=mimi.id, user_id=owner.id,
                         role=enums.RelationshipRole.OWNER.value,
                         created_by_user_id=owner.id),
        ]
    )
    await db.flush()

    return {
        "owner_id": owner.id,
        "family_id": family.id,
        "sitter_id": sitter.id,
        "household_id": hh.id,
        "coco_id": coco.id,
        "mimi_id": mimi.id,
    }
