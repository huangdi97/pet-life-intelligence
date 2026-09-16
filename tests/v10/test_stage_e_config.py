"""Stage E — production config fail-fast + WeChat login gating."""

import pytest
from app.core.config import get_settings
from app.main import app
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_wechat_login_external_blocked_without_credentials(seeded):
    """Without WECHAT_APP_ID/SECRET, /auth/wechat/login must honestly refuse."""
    settings = get_settings()
    orig_id, orig_secret = settings.wechat_app_id, settings.wechat_app_secret
    settings.wechat_app_id = ""
    settings.wechat_app_secret = ""
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post("/api/v1/auth/wechat/login", json={"code": "any-code"})
            assert r.status_code == 401
            assert "EXTERNAL_BLOCKED" in r.json()["error"]["message"]
    finally:
        settings.wechat_app_id = orig_id
        settings.wechat_app_secret = orig_secret


def test_auth_status_reports_wechat_and_pilot():
    settings = get_settings()
    orig_id = settings.wechat_app_id
    settings.wechat_app_id = ""
    try:
        from fastapi.testclient import TestClient

        with TestClient(app) as c:
            r = c.get("/api/v1/auth/status")
            assert r.status_code == 200
            body = r.json()
            assert body["wechat_login"] == "external_blocked"
            assert "pilot_mode" in body
    finally:
        settings.wechat_app_id = orig_id


def test_production_config_failfast_detects_dev_auth():
    settings = get_settings()
    orig_env = settings.app_env
    orig_dev = settings.dev_auth_enabled
    orig_secret = settings.session_secret
    settings.app_env = "production"
    settings.dev_auth_enabled = True
    settings.session_secret = "CHANGE_ME_DEV_ONLY"
    try:
        problems = settings.validate_production()
        assert any("DEV_AUTH_ENABLED" in p for p in problems)
        assert any("SESSION_SECRET" in p for p in problems)
        # default dev DB URL is flagged too
        assert any("DATABASE_URL" in p for p in problems)
    finally:
        settings.app_env = orig_env
        settings.dev_auth_enabled = orig_dev
        settings.session_secret = orig_secret


def test_production_config_clean_when_configured():
    settings = get_settings()
    orig_env = settings.app_env
    orig_dev = settings.dev_auth_enabled
    orig_secret = settings.session_secret
    orig_care = settings.care_card_signing_secret
    orig_s3 = (settings.s3_access_key, settings.s3_secret_key)
    orig_db = settings.database_url
    orig_cors = settings.cors_origins
    settings.app_env = "production"
    settings.dev_auth_enabled = False
    settings.session_secret = "a" * 64
    settings.care_card_signing_secret = "b" * 64
    settings.s3_access_key = "real"
    settings.s3_secret_key = "real-secret-123"
    settings.database_url = "postgresql+asyncpg://real:pass@db:5432/pli"
    settings.cors_origins = "https://app.pli.example.com"
    try:
        problems = settings.validate_production()
        assert problems == []
    finally:
        settings.app_env = orig_env
        settings.dev_auth_enabled = orig_dev
        settings.session_secret = orig_secret
        settings.care_card_signing_secret = orig_care
        settings.s3_access_key, settings.s3_secret_key = orig_s3
        settings.database_url = orig_db
        settings.cors_origins = orig_cors
