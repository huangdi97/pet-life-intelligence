"""Wave 0 tests (Stage G-W0): demo/internal isolation, pilot_org metadata,
isolation-aware pilot metrics.

Isolation contract (PLI-GW0): demo/internal pets and users never appear in
real pilot metrics (exclude_demo=true / exclude_internal=true).
"""

import uuid

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
    """Demo pets (Coco/Mimi, is_demo=True) never count as real pilot pets."""
    r = await client.get("/api/v1/pilot/status")
    assert r.status_code == 200
    body = r.json()
    assert body["pets_total"] == 0, f"demo pets leaked: {body}"
    assert body["active_pets_3d"] == 0
    assert body["active_pets_7d"] == 0
    assert body["feedback_count"] == 0
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
