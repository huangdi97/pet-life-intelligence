"""Stage E — real-user onboarding: register → household → create pet → log."""

import uuid

import pytest
from app.main import app
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_new_user_can_create_pet_after_register(seeded):
    """A newly registered real user must be able to create a pet immediately
    (household auto-created on register)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        email = f"newuser-{uuid.uuid4().hex[:8]}@pli.test"
        reg = await c.post("/api/v1/auth/register", json={
            "email": email, "password": "StrongPass!w0rd", "display_name": "新用户",
        })
        assert reg.status_code == 201, reg.text
        if reg.json().get("verification_token"):
            await c.post("/api/v1/auth/verify-email",
                         json={"token": reg.json()["verification_token"]})

        login = await c.post("/api/v1/auth/login", json={
            "email": email, "password": "StrongPass!w0rd",
        })
        assert login.status_code == 200, login.text
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        pet = await c.post("/api/v1/pets", headers=headers, json={
            "name": "旺财", "species": "dog", "breed": "Labrador",
        })
        assert pet.status_code == 201, pet.text
        pid = pet.json()["id"]

        log = await c.post(f"/api/v1/pets/{pid}/events", headers=headers, json={
            "event_type": "daily.meal",
            "payload": {"food_type": "狗粮", "amount": "100", "unit": "g"},
        })
        assert log.status_code == 201, log.text

        tl = await c.get(f"/api/v1/pets/{pid}/events", headers=headers)
        assert tl.status_code == 200
        assert tl.json()["count"] >= 1


@pytest.mark.asyncio
async def test_new_user_household_created(seeded):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        email = f"hhtest-{uuid.uuid4().hex[:8]}@pli.test"
        reg = await c.post("/api/v1/auth/register", json={
            "email": email, "password": "StrongPass!w0rd", "display_name": "家庭用户",
        })
        assert reg.status_code == 201
        login = await c.post("/api/v1/auth/login", json={
            "email": email, "password": "StrongPass!w0rd",
        })
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        # household membership exists → pets list is empty but reachable (no 403)
        pets = await c.get("/api/v1/pets", headers=headers)
        assert pets.status_code == 200
        assert pets.json() == []
