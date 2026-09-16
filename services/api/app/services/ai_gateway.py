"""AI Gateway construction for the API.

Single place to build the Gateway from settings:
- AI_PROVIDER=openai_compatible → real LLM provider (if key present)
- otherwise → MockProvider (deterministic offline)

Every module must get the Gateway from here so the real provider is wired
consistently and the fallback is always MockProvider.
"""

from functools import lru_cache

from pli_ai_gateway import Gateway

from app.adapters.ai_provider import build_gateway


@lru_cache(maxsize=1)
def get_gateway() -> Gateway:
    primary, fallback = build_gateway()
    return Gateway(provider=primary, fallback=fallback)


def ai_provider_status() -> dict:
    from app.adapters.ai_provider import provider_status

    return provider_status()
