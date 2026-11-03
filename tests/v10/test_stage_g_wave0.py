"""Wave 0 tests (Stage G-W0): demo/internal isolation, pilot_org metadata,
isolation-aware pilot metrics.

Isolation contract (PLI-GW0): demo/internal pets and users never appear in
real pilot metrics (exclude_demo=true / exclude_internal=true).
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from app.main import app
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text


@pytest.fixture
def transport():
    return ASGITransport(app=app)


@pytest.fixture
async def client(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_is_demo_flags_default_false(client):
    """A freshly registered real user and their pet are not demo/internal."""
    email = f"real-{uuid.uuid4().hex[:8]}@pli.test"
    reg = await client.post("/api/v1/auth/register", json={
        "email": email, "password": "RealPass!w0rd", "display_name": "真实用户",
    })
    assert reg.status_code == 201, reg.text
    login = await client.post("/api/v1/auth/login", json={
        "email": email, "password": "RealPass!w0rd",
    })
    h = {"Authorization": f"Bearer {login.json()['access_token']}"}
    pet = await client.post("/api/v1/pets", headers=h,
                            json={"name": "真实犬", "species": "dog"})
    assert pet.status_code == 201, pet.text
    body = pet.json()
    assert body["is_demo"] is False
    assert body["is_internal"] is False


@pytest.mark.asyncio
async def test_demo_seed_excluded_from_pilot_metrics(client, seeded):
    """Demo pets (豆豆/咪咪, is_demo=True) never count as real pilot pets."""
    r = await client.get("/api/v1/pilot/status")
    assert r.status_code == 200
    body = r.json()
    assert body["pets_total"] == 0, f"demo pets leaked: {body}"
    assert body["active_pets_3d"] == 0
    assert body["active_pets_7d"] == 0
    assert body["feedback_count"] == 0

@pytest.mark.asyncio
async def test_synthetic_domain_excluded_even_without_flag(client, seeded):
    """Regression (PLI-GW0, found by live dry-run DR-11): a pet created by a
    synthetic-domain user (@pli.test) with is_internal still false (fresh
    registration, never backfilled) must be excluded by the query-time
    synthetic-domain safety net. The old OR-of-NOT-LIKEs condition was almost
    always true and leaked this pet into pets_total."""
    email = f"dryrun-{uuid.uuid4().hex[:8]}@pli.test"
    reg = await client.post("/api/v1/auth/register", json={
        "email": email, "password": "RealPass!w0rd", "display_name": "演练宠主",
    })
    assert reg.status_code == 201, reg.text
    login = await client.post("/api/v1/auth/login", json={
        "email": email, "password": "RealPass!w0rd",
    })
    h = {"Authorization": f"Bearer {login.json()['access_token']}"}
    pet = await client.post("/api/v1/pets", headers=h,
                            json={"name": "演练犬", "species": "dog"})
    assert pet.status_code == 201, pet.text
    assert pet.json()["is_internal"] is False  # flag absent (never backfilled)
    # …but the query-time filter still excludes the synthetic-domain creator
    r = await client.get("/api/v1/pilot/status")
    body = r.json()
    assert body["pets_total"] == 0, f"synthetic-domain pet leaked: {body}"
    assert "synthetic_domain" in body["excludes"]
    assert "demo" in body["excludes"]
@pytest.mark.asyncio
async def test_internal_user_excluded_from_pilot_metrics(client, seeded):
    """An is_internal user + pet + events never enter real pilot metrics."""
    from app.core.db import get_session_factory
    from app.models import Pet, User

    factory = get_session_factory()
    async with factory() as db:
        u = User(email=f"internal-{uuid.uuid4().hex[:8]}@pli.test",
                 display_name="内部用户", is_internal=True)
        db.add(u)
        await db.flush()
        p = Pet(household_id=(await db.execute(
            text("SELECT id FROM households LIMIT 1"))).scalar_one(),
            name="内部犬", species="dog", created_by_user_id=u.id,
            is_internal=True)
        db.add(p)
        await db.flush()

    r = await client.get("/api/v1/pilot/status")
    body = r.json()
    assert body["pets_total"] == 0, f"internal pets leaked: {body}"


@pytest.mark.asyncio
async def test_pilot_org_create_list_transition(client, seeded):
    """PilotOrg metadata: create → list → controlled transitions (no hard delete)."""
    owner = seeded["owner_id"]
    h = {"X-Dev-User-Id": owner}

    r = await client.post("/api/v1/pilot/orgs", headers=h, json={
        "name": "W0-OWNER-01", "org_type": "OWNER_COHORT",
        "contact": "待定", "notes": "Wave 0 owner cohort template",
    })
    assert r.status_code == 201, r.text
    org = r.json()
    assert org["status"] == "LEAD"
    assert org["type"] == "OWNER_COHORT"
    org_id = org["pilot_org_id"]

    lst = await client.get("/api/v1/pilot/orgs", headers=h)
    assert lst.status_code == 200
    assert any(o["pilot_org_id"] == org_id for o in lst.json())

    # forward transition LEAD → ONBOARDING → ACTIVE
    t1 = await client.patch(f"/api/v1/pilot/orgs/{org_id}/status",
                            headers=h, json={"status": "ONBOARDING"})
    assert t1.status_code == 200, t1.text
    assert t1.json()["status"] == "ONBOARDING"
    t2 = await client.patch(f"/api/v1/pilot/orgs/{org_id}/status",
                            headers=h, json={"status": "ACTIVE"})
    assert t2.status_code == 200, t2.text
    assert t2.json()["status"] == "ACTIVE"
    assert t2.json()["started_at"] is not None

    # abnormal transition allowed (WITHDRAWN keeps the record — no hard delete)
    t3 = await client.patch(f"/api/v1/pilot/orgs/{org_id}/status",
                            headers=h, json={"status": "WITHDRAWN"})
    assert t3.status_code == 200, t3.text
    assert t3.json()["status"] == "WITHDRAWN"

    # invalid status rejected
    t4 = await client.patch(f"/api/v1/pilot/orgs/{org_id}/status",
                            headers=h, json={"status": "NOT_A_STATUS"})
    assert t4.status_code == 422


@pytest.mark.asyncio
async def test_pilot_org_validation(client, seeded):
    """Org create validation: empty name / bad org_type rejected."""
    owner = seeded["owner_id"]
    h = {"X-Dev-User-Id": owner}
    r1 = await client.post("/api/v1/pilot/orgs", headers=h,
                           json={"name": "", "org_type": "VET"})
    assert r1.status_code == 422
    r2 = await client.post("/api/v1/pilot/orgs", headers=h,
                           json={"name": "测试机构", "org_type": "NOT_A_TYPE"})
    assert r2.status_code == 422


async def _register_real_owner(client):
    email = f"real-{uuid.uuid4().hex[:10]}@example.com"
    reg = await client.post("/api/v1/auth/register", json={
        "email": email, "password": "RealPass!w0rd", "display_name": "真实 Pilot 宠主",
    })
    assert reg.status_code == 201, reg.text
    login = await client.post("/api/v1/auth/login", json={
        "email": email, "password": "RealPass!w0rd",
    })
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


async def _create_real_pet(client, headers, name="真实 Pilot 犬"):
    pet = await client.post(
        "/api/v1/pets", headers=headers, json={"name": name, "species": "dog"},
    )
    assert pet.status_code == 201, pet.text
    return pet.json()["id"]


async def _append_walk(client, headers, pet_id, minutes=20):
    response = await client.post(
        f"/api/v1/pets/{pet_id}/events",
        headers=headers,
        json={"event_type": "daily.walk", "payload": {"duration_minutes": minutes}},
    )
    assert response.status_code == 201, response.text
    return response.json()["event_id"]


@pytest.mark.asyncio
async def test_pilot_activity_ignores_page_view_telemetry(client):
    """Opening Today is product telemetry, never a real pet evidence chain."""
    before = (await client.get("/api/v1/pilot/status")).json()
    h = await _register_real_owner(client)
    pet = await _create_real_pet(client, h, "Page View Only")

    for _ in range(3):
        today = await client.get(f"/api/v1/pets/{pet}/today", headers=h)
        assert today.status_code == 200, today.text

    after = (await client.get("/api/v1/pilot/status")).json()
    assert after["pets_total"] == before["pets_total"] + 1
    assert after["active_pets_3d"] == before["active_pets_3d"]
    assert after["active_pets_7d"] == before["active_pets_7d"]
    assert after["activated_owners"] == before["activated_owners"]
    assert after["metric_contract_version"] == "R8_PILOT_V2"
    assert after["active_event_contract"] == "CURRENT_EFFECTIVE_RECORD_FACT"


@pytest.mark.asyncio
async def test_pilot_activation_does_not_double_count_superseded_versions(client):
    """Two facts + one correction remain two effective facts, not three."""
    before = (await client.get("/api/v1/pilot/status")).json()
    h = await _register_real_owner(client)
    pet = await _create_real_pet(client, h, "Correction Chain")
    first = await _append_walk(client, h, pet, 20)
    await _append_walk(client, h, pet, 25)

    corrected = await client.post(
        f"/api/v1/pets/{pet}/events/{first}/supersede",
        headers=h,
        json={
            "payload": {"duration_minutes": 35},
            "idempotency_key": f"pilot-{uuid.uuid4().hex[:16]}",
        },
    )
    assert corrected.status_code == 201, corrected.text

    after = (await client.get("/api/v1/pilot/status")).json()
    assert after["active_pets_3d"] == before["active_pets_3d"] + 1
    assert after["activated_owners"] == before["activated_owners"]
    assert after["r8_loop"]["source_corrections"] == (
        before["r8_loop"]["source_corrections"] + 1
    )


@pytest.mark.asyncio
async def test_pilot_activation_enforces_first_24_hours(client):
    """Three valid facts recorded after the onboarding deadline do not activate."""
    before = (await client.get("/api/v1/pilot/status")).json()
    h = await _register_real_owner(client)
    pet_id = await _create_real_pet(client, h, "Late Activation")

    from app.core.db import get_session_factory
    from app.models import Pet

    factory = get_session_factory()
    async with factory() as db:
        pet = await db.get(Pet, uuid.UUID(pet_id))
        assert pet is not None
        pet.created_at = datetime.now(UTC) - timedelta(days=2)
        await db.commit()

    for minutes in (20, 25, 30):
        await _append_walk(client, h, pet_id, minutes)

    after = (await client.get("/api/v1/pilot/status")).json()
    assert after["active_pets_3d"] == before["active_pets_3d"] + 1
    assert after["activated_owners"] == before["activated_owners"]
    assert after["activation_window_hours"] == 24


@pytest.mark.asyncio
async def test_pilot_activated_owners_are_distinct_people_not_pets(client):
    """One owner with two activated pets is still one activated owner."""
    before = (await client.get("/api/v1/pilot/status")).json()
    h = await _register_real_owner(client)
    pet_a = await _create_real_pet(client, h, "Owner Pet A")
    pet_b = await _create_real_pet(client, h, "Owner Pet B")

    for pet_id in (pet_a, pet_b):
        for minutes in (20, 25, 30):
            await _append_walk(client, h, pet_id, minutes)

    after = (await client.get("/api/v1/pilot/status")).json()
    assert after["active_pets_3d"] == before["active_pets_3d"] + 2
    assert after["activated_owners"] == before["activated_owners"] + 1
