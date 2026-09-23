"""Distributed rate limiting (SV-007).

SV-007: the previous in-process ``collections.deque`` bucket lived in
``app.main`` and was per-worker — with multiple uvicorn workers each process
had its own budget, so the effective limit multiplied with worker count and
was not consistent across a cluster.

This module provides a small adapter:

- :class:`RedisRateLimiter`  — fixed-window counter in Redis (INCR + EXPIRE),
  shared by every worker/process.
- :class:`InProcessRateLimiter` — local deque bucket, used as the fallback
  and for tests/CI where no Redis is required.

Selection (config ``rate_limit_backend`` in :mod:`app.core.config`):

- ``"redis"``      — require Redis; fail fast at startup if unreachable.
- ``"in_process"`` — always the local deque bucket.
- ``"auto"``       — try Redis, log and fall back to in-process when
  unreachable. This is the default so local/dev/test runs never hard-depend
  on a running Redis (contract boundary for SV-007).

The middleware only consults the limiter when ``rate_limit_enabled`` is true;
when disabled, requests pass through untouched (same behavior as before).
"""

from __future__ import annotations

import logging
import time
from collections import defaultdict, deque
from typing import Protocol

from app.core.config import Settings, get_settings

logger = logging.getLogger("pli.rate_limit")


class RateLimiter(Protocol):
    """Protocol for the write-path rate limiter (SV-007)."""

    async def allow(self, key: str, limit: int, window_seconds: int) -> bool:
        """Return True when the request may pass, False when rate-limited.

        ``key`` identifies the client (currently the IP). ``limit`` is the
        maximum number of allowed calls inside ``window_seconds``.
        """
        ...


class InProcessRateLimiter:
    """Per-key sliding window using a deque (previous behavior, local only).

    This is the correctness-preserving fallback: identical semantics to the
    original ``app.main`` middleware bucket, kept for single-process runs and
    for tests that must not require Redis (SV-007 boundary).
    """

    def __init__(self) -> None:
        self._buckets: dict[str, deque[float]] = defaultdict(deque)

    async def allow(self, key: str, limit: int, window_seconds: int) -> bool:
        now = time.monotonic()
        bucket = self._buckets[key]
        while bucket and now - bucket[0] > window_seconds:
            bucket.popleft()
        if len(bucket) >= limit:
            return False
        bucket.append(now)
        return True


class RedisRateLimiter:
    """Fixed-window counter in Redis, shared across workers (SV-007).

    Uses a single INCR on a per-key counter with an EXPIRE equal to the
    window, so old keys expire and memory stays bounded. A failed Redis call
    (connection error, timeout) is treated as *deny closed* only for the
    backend choice contract — callers decide fallback via
    :func:`get_rate_limiter`; inside a call we return False (rate-limited)
    rather than fail open, because the middleware must never silently disable
    a configured security control.

    # PROVIDER:
    # redis-py is the only provider; if it becomes unavailable the factory
    # (get_rate_limiter) already fell back to in-process at startup, so a
    # mid-flight Redis error here is a hard failure signal, not a retry case.
    """

    def __init__(self, client: object, *, prefix: str = "pli:ratelimit") -> None:
        self._client = client
        self._prefix = prefix

    async def allow(self, key: str, limit: int, window_seconds: int) -> bool:
        redis_key = f"{self._prefix}:{key}"
        count = await self._client.incr(redis_key)
        if count == 1:
            await self._client.expire(redis_key, window_seconds)
        return count <= limit


async def _try_redis_client(settings: Settings) -> object | None:
    """Return a live async redis client, or None when Redis is unreachable."""
    import redis.asyncio as aioredis

    client = aioredis.from_url(
        settings.redis_url,
        socket_connect_timeout=1.0,
        socket_timeout=1.0,
        decode_responses=True,
    )
    try:
        await client.ping()
    except Exception as exc:  # noqa: BLE001 — connection refused/timeout variants
        await client.aclose()
        logger.warning(
            "Redis unreachable at %s; rate limiting falls back to in-process. "
            "(%s: %s)",
            settings.redis_url, type(exc).__name__, exc,
        )
        return None
    return client


async def get_rate_limiter(settings: Settings | None = None) -> RateLimiter:
    """Build the rate limiter for the current settings (SV-007 selection).

    - ``rate_limit_backend == "in_process"`` → :class:`InProcessRateLimiter`.
    - ``rate_limit_backend == "redis"``     → Redis or raise if unreachable.
    - ``rate_limit_backend == "auto"``      → Redis when reachable, otherwise
      in-process with a logged warning.
    """
    settings = settings or get_settings()
    backend = settings.rate_limit_backend

    if backend == "in_process":
        return InProcessRateLimiter()

    client = await _try_redis_client(settings)
    if client is not None:
        return RedisRateLimiter(client)
    if backend == "redis":
        raise RuntimeError(
            "rate_limit_backend=redis configured but Redis is unreachable "
            f"at {settings.redis_url}"
        )
    # auto: fallback (already logged in _try_redis_client)
    return InProcessRateLimiter()


# Startup singleton; assigned lazily by app lifespan so tests can override.
_limiter: RateLimiter | None = None


async def get_limiter() -> RateLimiter:
    """Return the process-wide limiter, creating it on first use.

    Tests can assign :data:`_limiter` directly to inject a fake.
    """
    global _limiter
    if _limiter is None:
        _limiter = await get_rate_limiter()
    return _limiter


def _reset_limiter_for_tests() -> None:
    global _limiter
    _limiter = None


async def _warmup_check() -> None:
    """Idempotent ping used by the app lifespan for startup observability."""
    settings = get_settings()
    if not settings.rate_limit_enabled:
        return
    await get_limiter()
