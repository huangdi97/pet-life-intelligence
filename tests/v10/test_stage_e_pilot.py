"""Pilot mode tests (Stage E Phase O): invite-only registration, feedback,
dashboard metrics."""

import uuid

import pytest
from app.main import app
from app.services.pilot import hash_invite_code, new_invite_code
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def transport():
    return ASGITransport(app=app)


@pytest.fixture
async def client(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_pilot_status_endpoint(client):
    r = await client.get("/api/v1/pilot/status")
    assert r.status_code == 200
    body = r.json()
    assert "pilot_mode" in body
    assert "north_star" in body
    assert body["north_star"] == "Active Pets with Continuous Evidence Chain"


@pytest.mark.asyncio
async def test_create_and_redeem_invite_code(client, seeded):
    owner = seeded["owner_id"]
    h = {"X-Dev-User-Id": owner}
    r = await client.post("/api/v1/pilot/invites", headers=h,
                          json={"purpose": "pilot", "max_uses": 1, "expires_hours": 24})
    assert r.status_code == 201, r.text
    code = r.json()["code"]
    assert len(code) >= 6

    # redeem with a fresh real-auth user
    reg = await client.post("/api/v1/auth/register", json={
        "email": f"pilot-{uuid.uuid4().hex[:8]}@pli.test",
        "password": "PilotPass!w0rd", "display_name": "试点用户",
    })
    assert reg.status_code == 201, reg.text
    login = await client.post("/api/v1/auth/login", json={
        "email": reg.json()["email"], "password": "PilotPass!w0rd",
    })
    access = login.json()["access_token"]

    redeem = await client.post("/api/v1/pilot/redeem",
                               json={"code": code},
                               headers={"Authorization": f"Bearer {access}"})
    assert redeem.status_code == 200, redeem.text

    # code single-use → second redeem fails
    redeem2 = await client.post("/api/v1/pilot/redeem",
                                json={"code": code},
                                headers={"Authorization": f"Bearer {access}"})
    assert redeem2.status_code == 422, redeem2.text


@pytest.mark.asyncio
async def test_pilot_registration_requires_code_when_enabled(client, seeded):
    """When PILOT_MODE=true, registration without an invite code is rejected."""
    from app.core.config import get_settings

    owner = seeded["owner_id"]
    original = get_settings().pilot_mode
    get_settings().pilot_mode = True
    try:
        r = await client.post("/api/v1/auth/register", json={
            "email": f"nopilot-{uuid.uuid4().hex[:8]}@pli.test",
            "password": "PilotPass!w0rd", "display_name": "无码用户",
        })
        assert r.status_code == 422, r.text
        assert "邀请码" in r.json()["error"]["message"]

        # with an invite code it succeeds
        # mint a code via the API (dev auth for the seeded owner)
        r2 = await client.post("/api/v1/pilot/invites", headers={"X-Dev-User-Id": owner},
                               json={"purpose": "pilot", "max_uses": 1})
        assert r2.status_code == 201, r2.text
        code = r2.json()["code"]
        r3 = await client.post("/api/v1/auth/register", json={
            "email": f"pilotok-{uuid.uuid4().hex[:8]}@pli.test",
            "password": "PilotPass!w0rd", "display_name": "有码用户",
            "invite_code": code, "role": "owner",
        })
        assert r3.status_code == 201, r3.text
    finally:
        get_settings().pilot_mode = original


@pytest.mark.asyncio
async def test_feedback_submission(client, seeded):
    # use real-auth user
    reg = await client.post("/api/v1/auth/register", json={
        "email": f"fb-{uuid.uuid4().hex[:8]}@pli.test",
        "password": "PilotPass!w0rd", "display_name": "反馈用户",
    })
    login = await client.post("/api/v1/auth/login", json={
        "email": reg.json()["email"], "password": "PilotPass!w0rd",
    })
    access = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {access}"}

    r = await client.post("/api/v1/pilot/feedback", headers=headers, json={
        "category": "feature_request", "message": "希望支持体重趋势图。", "page_url": "/today",
    })
    assert r.status_code == 201, r.text
    assert r.json()["feedback_id"]

    # invalid category rejected
    r2 = await client.post("/api/v1/pilot/feedback", headers=headers, json={
        "category": "nonsense", "message": "x",
    })
    assert r2.status_code == 422, r2.text


def test_invite_code_hashing():
    raw, code_hash = new_invite_code()
    assert hash_invite_code(raw) == code_hash
    assert hash_invite_code("wrong") != code_hash
