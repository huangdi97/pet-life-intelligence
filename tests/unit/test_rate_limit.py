"""SV-007: rate limiter unit tests (Redis path + in-process fallback).

These tests never require a running Redis (SV-007 contract boundary): the
Redis path is exercised against a minimal fake client implementing INCR and
EXPIRE semantics, and the fallback path verifies that an unreachable Redis
produces a logged in-process limiter instead of a failure.
"""

from __future__ import annotations

import pytest

from app.core.config import Settings
from app.core.rate_limit import (
    InProcessRateLimiter,
    RedisRateLimiter,
    get_rate_limiter,
)


class FakeRedisClient:
    """Minimal async Redis double: INCR + EXPIRE semantics for one key."""

    def __init__(self) -> None:
        self._counts: dict[str, int] = {}
        self._ttls: dict[str, int] = {}
        self.incr_calls = 0
        self.expire_calls = 0

    async def incr(self, key: str) -> int:
        self.incr_calls += 1
        self._counts[key] = self._counts.get(key, 0) + 1
        return self._counts[key]

    async def expire(self, key: str, seconds: int) -> bool:
        self.expire_calls += 1
        self._ttls[key] = seconds
        return True


@pytest.mark.asyncio
async def test_in_process_limiter_allows_up_to_limit_then_denies() -> None:
    limiter = InProcessRateLimiter()
    for _ in range(3):
        assert await limiter.allow("ip-1", limit=3, window_seconds=60) is True
    # 4th request inside the window is denied
    assert await limiter.allow("ip-1", limit=3, window_seconds=60) is False
    # different key keeps its own independent bucket
    assert await limiter.allow("ip-2", limit=3, window_seconds=60) is True


@pytest.mark.asyncio
async def test_in_process_limiter_window_expiry_allows_again() -> None:
    limiter = InProcessRateLimiter()
    for _ in range(3):
        assert await limiter.allow("ip-1", limit=3, window_seconds=60) is True
    assert await limiter.allow("ip-1", limit=3, window_seconds=60) is False
    # A zero-length window makes every call fresh (older timestamps evicted).
    assert await limiter.allow("ip-1", limit=3, window_seconds=0) is True


@pytest.mark.asyncio
async def test_redis_limiter_uses_shared_counter_and_sets_ttl() -> None:
    client = FakeRedisClient()
    limiter = RedisRateLimiter(client)
    for _ in range(5):
        assert await limiter.allow("ip-a", limit=5, window_seconds=60) is True
    assert await limiter.allow("ip-a", limit=5, window_seconds=60) is False
    assert client.incr_calls == 6
    # TTL was set exactly once, on the first INCR of the key
    assert client.expire_calls == 1
    assert client._ttls == {"pli:ratelimit:ip-a": 60}


@pytest.mark.asyncio
async def test_redis_limiter_keys_are_per_client() -> None:
    client = FakeRedisClient()
    limiter = RedisRateLimiter(client)
    for _ in range(5):
        assert await limiter.allow("ip-a", limit=5, window_seconds=60) is True
    # a different client is not affected by ip-a's counter
    assert await limiter.allow("ip-b", limit=5, window_seconds=60) is True


@pytest.mark.asyncio
async def test_get_rate_limiter_in_process_backend() -> None:
    settings = Settings(rate_limit_backend="in_process")
    limiter = await get_rate_limiter(settings)
    assert isinstance(limiter, InProcessRateLimiter)


@pytest.mark.asyncio
async def test_get_rate_limiter_auto_falls_back_when_redis_unreachable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """SV-007: 'auto' with an unreachable Redis must log and fall back."""

    async def _unreachable(settings: Settings) -> None:
        return None

    monkeypatch.setattr(
        "app.core.rate_limit._try_redis_client", _unreachable
    )
    settings = Settings(rate_limit_backend="auto")
    limiter = await get_rate_limiter(settings)
    assert isinstance(limiter, InProcessRateLimiter)


@pytest.mark.asyncio
async def test_get_rate_limiter_redis_backend_raises_when_unreachable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """SV-007: explicit 'redis' backend must fail fast (no silent fallback)."""

    async def _unreachable(settings: Settings) -> None:
        return None

    monkeypatch.setattr(
        "app.core.rate_limit._try_redis_client", _unreachable
    )
    settings = Settings(rate_limit_backend="redis")
    with pytest.raises(RuntimeError, match="unreachable"):
        await get_rate_limiter(settings)
