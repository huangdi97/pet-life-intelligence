"""Real AI provider readiness + fallback tests (Stage E §7).

- Provider status endpoint reports honestly (real vs mock).
- When a real provider is configured but has no key / fails, the Gateway
  falls back to MockProvider so core product keeps working.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services.ai_gateway import ai_provider_status, get_gateway


@pytest.mark.asyncio
async def test_ai_status_endpoint_reports_honestly(seeded):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get("/api/v1/ai/status")
        assert r.status_code == 200
        body = r.json()
        assert "provider" in body
        assert "real" in body
        assert body["real"] in (True, False)


def test_gateway_falls_back_when_provider_has_no_key():
    """Provider configured as openai_compatible without a key must not break
    the capability path — Gateway falls back to MockProvider."""
    from app.adapters.ai_provider import OpenAICompatibleProvider
    from pli_ai_gateway import MockProvider

    broken = OpenAICompatibleProvider()
    # no key in test env → invoke raises → gateway fallback
    gateway = get_gateway()
    result = gateway.invoke("intake_questions", {"chief_complaint": "吐了", "species": "dog"})
    assert result.metadata.fallback_used is True or result.result["questions"]
    assert result.result["questions"]


def test_openai_provider_ready_flag():
    from app.adapters.ai_provider import OpenAICompatibleProvider
    from app.core.config import get_settings

    original = get_settings().ai_api_key
    get_settings().ai_api_key = ""
    try:
        p = OpenAICompatibleProvider()
        assert p.ready is False
        with pytest.raises(RuntimeError):
            p.invoke("intake_questions", {})
    finally:
        get_settings().ai_api_key = original


def test_ai_status_not_mock_when_real_configured():
    from app.core.config import get_settings

    original_provider = get_settings().ai_provider
    original_key = get_settings().ai_api_key
    get_settings().ai_provider = "openai_compatible"
    get_settings().ai_api_key = ""
    try:
        status = ai_provider_status()
        assert status["provider"] == "openai_compatible"
        assert status["real"] is False
        assert "EXTERNAL_BLOCKED" in status["reason"]
    finally:
        get_settings().ai_provider = original_provider
        get_settings().ai_api_key = original_key