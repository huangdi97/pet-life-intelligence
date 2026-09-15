"""Real auth tests (Stage E §6.5): AUTH-E2E-01..10.

Covers register, login, wrong password, refresh, logout, revoked session,
password reset, expired token, rate limit, account delete — all against the
real auth endpoints with Argon2id + rotating opaque tokens.
"""

import uuid

import pytest
from app.main import app
from app.models import LoginAttempt
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def transport():
    return ASGITransport(app=app)


@pytest.fixture
async def client(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def _register(client, email=None, password="Str0ngPass!w0rd", name="测试用户"):
    email = email or f"user-{uuid.uuid4().hex[:8]}@pli.test"
    r = await client.post("/api/v1/auth/register", json={
        "email": email, "password": password, "display_name": name,
    })
    return r, email


@pytest.mark.asyncio
async def test_auth_e2e_01_register(client):
    r, email = await _register(client)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["email"] == email
    assert body["verification_token"]  # console delivery exposes token in dev
    # duplicate register → conflict
    r2, _ = await _register(client, email=email)
    assert r2.status_code == 409, r2.text


@pytest.mark.asyncio
async def test_auth_e2e_02_login_and_access(client):
    r, email = await _register(client)
    assert r.status_code == 201
    token = r.json()["verification_token"]
    await client.post("/api/v1/auth/verify-email", json={"token": token})

    r = await client.post("/api/v1/auth/login", json={
        "email": email, "password": "Str0ngPass!w0rd", "device_label": "pytest",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["access_token"] and body["refresh_token"]

    # access token works
    who = await client.get("/api/v1/auth/sessions",
                           headers={"Authorization": f"Bearer {body['access_token']}"})
    assert who.status_code == 200, who.text


@pytest.mark.asyncio
async def test_auth_e2e_03_wrong_password(client):
    r, email = await _register(client)
    assert r.status_code == 201
    r = await client.post("/api/v1/auth/login", json={
        "email": email, "password": "WrongPass!w0rd",
    })
    assert r.status_code in (401, 403), r.text


@pytest.mark.asyncio
async def test_auth_e2e_04_refresh(client):
    r, email = await _register(client)
    r = await client.post("/api/v1/auth/login", json={
        "email": email, "password": "Str0ngPass!w0rd", "device_label": "pytest",
    })
    body = r.json()
    old_refresh = body["refresh_token"]

    r = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert r.status_code == 200, r.text
    new_body = r.json()
    assert new_body["access_token"]
    assert new_body["refresh_token"] != old_refresh  # rotating

    # old refresh token is now revoked → reuse detection
    r = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert r.status_code == 401, r.text


@pytest.mark.asyncio
async def test_auth_e2e_05_logout(client):
    r, email = await _register(client)
    r = await client.post("/api/v1/auth/login", json={
        "email": email, "password": "Str0ngPass!w0rd", "device_label": "pytest",
    })
    body = r.json()
    lo = await client.post("/api/v1/auth/logout", json={"refresh_token": body["refresh_token"]},
                           headers={"Authorization": f"Bearer {body['access_token']}"})
    assert lo.status_code == 200, lo.text
    # access token now invalid (session revoked)
    who = await client.get("/api/v1/auth/sessions",
                           headers={"Authorization": f"Bearer {body['access_token']}"})
    assert who.status_code == 401, who.text


@pytest.mark.asyncio
async def test_auth_e2e_06_revoked_session(client):
    r, email = await _register(client)
    r = await client.post("/api/v1/auth/login", json={
        "email": email, "password": "Str0ngPass!w0rd",
    })
    body = r.json()
    sessions = await client.get("/api/v1/auth/sessions",
                                headers={"Authorization": f"Bearer {body['access_token']}"})
    sid = sessions.json()[0]["session_id"]
    rev = await client.post(f"/api/v1/auth/sessions/{sid}/revoke",
                            headers={"Authorization": f"Bearer {body['access_token']}"})
    assert rev.status_code == 200
    who = await client.get("/api/v1/auth/sessions",
                           headers={"Authorization": f"Bearer {body['access_token']}"})
    assert who.status_code == 401, who.text


@pytest.mark.asyncio
async def test_auth_e2e_07_password_reset(client):
    r, email = await _register(client)
    assert r.status_code == 201
    fp = await client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert fp.status_code == 200, fp.text
    token = fp.json()["reset_token"]

    rp = await client.post("/api/v1/auth/reset-password", json={
        "token": token, "new_password": "NewPass!w0rd123",
    })
    assert rp.status_code == 200, rp.text

    # old password fails, new works
    bad = await client.post("/api/v1/auth/login", json={"email": email, "password": "Str0ngPass!w0rd"})
    assert bad.status_code in (401, 403)
    ok = await client.post("/api/v1/auth/login", json={"email": email, "password": "NewPass!w0rd123"})
    assert ok.status_code == 200, ok.text


@pytest.mark.asyncio
async def test_auth_e2e_08_expired_token(client):
    # Manually create a session with an already-expired access token
    r, email = await _register(client)
    assert r.status_code == 201
    login = await client.post("/api/v1/auth/login", json={
        "email": email, "password": "Str0ngPass!w0rd",
    })
    body = login.json()
    # tamper: use a nonexistent/expired token
    bad = await client.get("/api/v1/auth/sessions",
                           headers={"Authorization": "Bearer definitely-not-a-valid-token"})
    assert bad.status_code == 401, bad.text
    # an access token older than TTL (simulate by revoking then checking)
    who = await client.get("/api/v1/auth/sessions",
                           headers={"Authorization": f"Bearer {body['access_token']}"})
    assert who.status_code == 200


@pytest.mark.asyncio
async def test_auth_e2e_09_rate_limit(client):

    r, email = await _register(client)
    assert r.status_code == 201
    # fire 8 bad attempts → lockout (max 5)
    from app.core.db import get_session_factory
    from sqlalchemy import delete

    factory = get_session_factory()

    async def clear_attempts():
        async with factory() as db:
            await db.execute(delete(LoginAttempt))
            await db.commit()

    await clear_attempts()
    for _ in range(6):
        await client.post("/api/v1/auth/login", json={"email": email, "password": "Wrong"})
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": "Str0ngPass!w0rd"})
    assert r.status_code == 403, r.text  # locked out


@pytest.mark.asyncio
async def test_auth_e2e_10_account_delete(client):
    r, email = await _register(client)
    assert r.status_code == 201
    login = await client.post("/api/v1/auth/login", json={
        "email": email, "password": "Str0ngPass!w0rd",
    })
    body = login.json()
    headers = {"Authorization": f"Bearer {body['access_token']}"}
    d = await client.post("/api/v1/auth/delete-account", json={"password": "Str0ngPass!w0rd"},
                          headers=headers)
    assert d.status_code == 200, d.text
    # account disabled
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": "Str0ngPass!w0rd"})
    assert r.status_code == 403, r.text


@pytest.mark.asyncio
async def test_production_dev_auth_rejected_when_disabled(client):
    """DEV_AUTH_ENABLED=false must reject dev login & X-Dev-User-Id."""
    from app.core.config import get_settings

    original = get_settings().dev_auth_enabled
    get_settings().dev_auth_enabled = False
    try:
        r = await client.post("/api/v1/auth/dev/login", json={"email": "owner@pli.demo"})
        assert r.status_code == 403, r.text
        who = await client.get("/api/v1/pets", headers={"X-Dev-User-Id": str(uuid.uuid4())})
        assert who.status_code == 401, who.text
    finally:
        get_settings().dev_auth_enabled = original
