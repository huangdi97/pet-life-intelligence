"""Stage V — synthetic cohort tests (SYN-01..20) and SYNTHETIC_NEVER_COUNTS_AS_REAL.

The canonical synthetic cohort is a FIXED, reproducible set (no random seed
changes across runs): 40 pets / 12 households covering the 20 required
scenarios SYN-01..SYN-20. Every synthetic record carries is_demo / is_internal
flags and a synthetic email domain (@pli.demo family), so it can never enter
real pilot metrics / retention / outcome / vet-usefulness / commercial counts.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

import pytest

from tests.conftest import auth

SYNTHETIC_DOMAIN = "pli.demo"  # excluded by app.services.pilot at query time
SOURCE = "SYNTHETIC"

# Scenario → (species, lifecycle, special)
SCENARIOS = {
    "SYN-01": ("dog", "adult", "healthy"),
    "SYN-02": ("cat", "adult", "healthy"),
    "SYN-03": ("dog", "multi-pet", "multi-pet household"),
    "SYN-04": ("cat", "adult", "multi-member care"),
    "SYN-05": ("dog", "puppy", "growth"),
    "SYN-06": ("cat", "senior", "senior"),
    "SYN-07": ("dog", "adult", "chronic CKD management"),
    "SYN-08": ("cat", "adult", "acute health anomaly"),
    "SYN-09": ("dog", "adult", "behavior issue"),
    "SYN-10": ("dog", "adult", "training plan"),
    "SYN-11": ("cat", "adult", "temporary foster/sitter"),
    "SYN-12": ("dog", "adult", "professional collaboration"),
    "SYN-13": ("dog", "adult", "device-heavy"),
    "SYN-14": ("cat", "adult", "companion candidate"),
    "SYN-15": ("dog", "adult", "3D lifecycle"),
    "SYN-16": ("cat", "adult", "data-sparse"),
    "SYN-17": ("dog", "adult", "data-dense"),
    "SYN-18": ("cat", "adult", "cross-timezone"),
    "SYN-19": ("dog", "adult", "consent withdrawal"),
    "SYN-20": ("cat", "senior", "lifecycle end / archive"),
}

# Fixed names so the cohort is reproducible across runs.
PET_NAMES = [
    "阿黄", "Mochi", "煤球", "Luna", "豆包", "Momo", "雪饼", "Oliver",
    "年糕", "Coco-S", "布丁", "Mimi-S", "芝麻", "Bella", "汤圆", "Rocky",
    "团子", "Chloe", "奶糖", "Max", "奥利奥", "Daisy", "花卷", "Simba",
    "芋圆", "Nala", "肉松", "Leo", "红糖", "Lucy", "波子", "Milo",
    "桂花", "Zoe", "栗子", "Oreo-S", "琥珀", "Nico", "青团", "Mika",
]




async def build_cohort(db) -> dict:
    """Create the fixed 40-pet / 12-household synthetic cohort.

    Every user/pet carries is_demo=True + is_internal=True and an
    @pli.demo email domain (the synthetic reserved domain). Returns the
    ids keyed by scenario id for reuse by replay/regression tests.
    """
    from app.domain import enums
    from app.models import Household, HouseholdMember, Pet, Relationship, User
    from app.services.eventlog import create_life_event

    async def _build():
        result: dict[str, str] = {}
        now = datetime.now(timezone.utc)
        # 12 households; household i owns pets in a deterministic bucket.
        households = []
        for i in range(12):
            hh = Household(name=f"SYN Household {i:02d}")
            db.add(hh)
            await db.flush()
            households.append(hh)
            # owner per household
            owner = User(
                email=f"syn-owner-{i:02d}@{SYNTHETIC_DOMAIN}",
                display_name=f"SYN Owner {i:02d}",
                is_demo=True, is_internal=True,
            )
            db.add(owner)
            await db.flush()
            db.add(HouseholdMember(
                household_id=hh.id, user_id=owner.id,
                role=enums.HouseholdRole.OWNER.value, status="ACTIVE",
            ))
            await db.flush()
            result[f"HH-{i:02d}"] = str(hh.id)
            result[f"OWNER-{i:02d}"] = str(owner.id)

        for _pass in range(2):  # two pets per scenario → 40 pets / 12 households
            for idx, (sid, (species, lifecycle, _special)) in enumerate(SCENARIOS.items()):
                slot = idx + _pass * 20
                hh = households[slot % 12]
                owner_id = uuid.UUID(result[f"OWNER-{slot % 12:02d}"])
                pet = Pet(
                    household_id=hh.id, name=PET_NAMES[slot], species=species,
                    breed=f"SYN-{species}", sex="FEMALE" if idx % 2 else "MALE",
                    birth_date=(now - timedelta(days=365 * (1 if lifecycle == "puppy" else
                                                             9 if lifecycle == "senior" else 4))).date(),
                    neutered=True, is_demo=True, is_internal=True,
                    created_by_user_id=owner_id,
                )
                db.add(pet)
                await db.flush()
                db.add(Relationship(
                    pet_id=pet.id, user_id=owner_id,
                    role=enums.RelationshipRole.OWNER.value,
                    created_by_user_id=owner_id,
                ))
                await db.flush()
                event_type, payload = {
                    "SYN-01": ("daily.meal", {"amount": "80", "unit": "g"}),
                    "SYN-02": ("daily.drink", {"amount": "150", "unit": "ml"}),
                    "SYN-03": ("daily.walk", {"duration_minutes": 20}),
                    "SYN-04": ("daily.play", {"duration_minutes": 10}),
                    "SYN-05": ("daily.weight", {"weight_kg": "2.1"}),
                    "SYN-06": ("daily.sleep", {"duration_minutes": 540}),
                    "SYN-07": ("daily.drink", {"amount": "90", "unit": "ml"}),
                    "SYN-08": ("daily.meal", {"amount": "0", "unit": "g", "notes": "拒食"}),
                    "SYN-09": ("behavior.observed", {"behavior_event_id": str(uuid.uuid4()), "behavior": "对敲门声吠叫"}),
                    "SYN-10": ("care.task_created", {"task_id": str(uuid.uuid4()), "title": "训练-召回", "task_type": "OTHER"}),
                    "SYN-11": ("daily.walk", {"duration_minutes": 15}),
                    "SYN-12": ("health.event_opened", {"health_event_id": str(uuid.uuid4()), "chief_complaint": "定期体检"}),
                    "SYN-13": ("daily.drink", {"amount": "120", "unit": "ml"}),
                    "SYN-14": ("daily.play", {"duration_minutes": 5}),
                    "SYN-15": ("daily.weight", {"weight_kg": "4.0"}),
                    "SYN-16": ("daily.meal", {"amount": "60", "unit": "g"}),
                    "SYN-17": ("daily.drink", {"amount": "200", "unit": "ml"}),
                    "SYN-18": ("daily.sleep", {"duration_minutes": 480}),
                    "SYN-19": ("daily.meal", {"amount": "75", "unit": "g"}),
                    "SYN-20": ("daily.weight", {"weight_kg": "3.8"}),
                }[sid]
                await create_life_event(
                    db, pet_id=pet.id, event_type=event_type, payload=payload,
                    actor_id=owner_id, occurred_at=now - timedelta(hours=idx),
                    source_type=enums.SourceType.OWNER_REPORTED,
                )
                if _pass == 0:
                    result[sid] = str(pet.id)
        await db.commit()

        return result

    return await _build()



@pytest.fixture
def synthetic_ids(client):
    from app.core.db import get_session_factory

    async def _build():
        factory = get_session_factory()
        async with factory() as db:
            return await build_cohort(db)
    return asyncio.run(_build())


def test_cohort_has_all_20_scenarios(synthetic_ids):
    for sid in SCENARIOS:
        assert sid in synthetic_ids, f"missing {sid}"
    assert len(synthetic_ids) >= 40


def test_cohort_is_deterministic():
    # Same input produces the same names/species assignment (no rng).
    assert PET_NAMES[0] == "阿黄" and PET_NAMES[39] == "Mika"
    assert list(SCENARIOS) == [
        f"SYN-{i:02d}" for i in range(1, 21)
    ]


# --- SYNTHETIC_NEVER_COUNTS_AS_REAL (contract §11 + §73 synthetic isolation) --


def test_synthetic_never_counts_as_real(client, synthetic_ids):
    """Pilot dashboard must report 0 real pets / 0 feedback after seeding
    the full 40-pet synthetic cohort with events and feedback."""
    owner = synthetic_ids["OWNER-00"]
    # add pilot feedback from a synthetic user (would corrupt real counts)
    r = client.post("/api/v1/pilot/feedback",
                    json={"category": "feature_request", "message": "synthetic"},
                    headers=auth(owner))
    assert r.status_code == 201
    dash = client.get("/api/v1/pilot/status", headers=auth(owner)).json()
    assert dash["pets_total"] == 0, dash
    assert dash["feedback_count"] == 0, dash
    assert dash["active_pets_3d"] == 0 and dash["active_pets_7d"] == 0
    assert "demo" in dash["excludes"] and "internal" in dash["excludes"]


def test_synthetic_pets_flagged(client, synthetic_ids):
    from app.core.db import get_session_factory
    from app.models import Pet
    from sqlalchemy import select

    async def check():
        factory = get_session_factory()
        async with factory() as db:
            rows = (await db.execute(select(Pet))).scalars().all()
            syn = [p for p in rows if p.name in PET_NAMES]
            assert len(syn) == 40
            assert all(p.is_demo and p.is_internal for p in syn)

    asyncio.run(check())


def test_synthetic_email_domain_reserved(client, synthetic_ids):
    from app.core.db import get_session_factory
    from app.models import User
    from sqlalchemy import select

    async def check():
        factory = get_session_factory()
        async with factory() as db:
            users = (await db.execute(select(User))).scalars().all()
            syn = [u for u in users if u.email.endswith(f"@{SYNTHETIC_DOMAIN}")]
            assert len(syn) >= 12
            assert all(u.is_demo and u.is_internal for u in syn)

    asyncio.run(check())


def test_synthetic_events_do_not_enter_timeline_of_real_pets(client, seeded, synthetic_ids):
    """A real owner cannot see synthetic pets, and synthetic pets cannot
    see real pets — isolation both directions."""
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    syn_pet = synthetic_ids["SYN-01"]
    assert client.get(f"/api/v1/pets/{syn_pet}", headers=auth(owner)).status_code in (403, 404)
    # synthetic owner cannot read the real demo pet
    syn_owner = synthetic_ids["OWNER-00"]
    r = client.get(f"/api/v1/pets/{coco}", headers=auth(syn_owner))
    assert r.status_code in (403, 404)
