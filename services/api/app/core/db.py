from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.config import get_settings
from app.models.base import Base

__all__ = [
    "Base",
    "get_db",
    "get_engine",
    "get_session_factory",
    "set_engine",
    "dispose_engine",
]


_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        settings = get_settings()
        if settings.db_pool_enabled:
            _engine = create_async_engine(
                settings.database_url,
                pool_pre_ping=True,
                pool_size=settings.db_pool_size,
                max_overflow=settings.db_pool_max_overflow,
                pool_timeout=settings.db_pool_timeout_seconds,
                pool_recycle=1800,
            )
        else:
            _engine = create_async_engine(
                settings.database_url, pool_pre_ping=True, poolclass=NullPool
            )
    return _engine


def set_engine(engine: AsyncEngine) -> None:
    global _engine, _session_factory
    _engine = engine
    _session_factory = None


async def dispose_engine() -> None:
    """Graceful shutdown: close pooled connections."""
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _session_factory = None


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            get_engine(), expire_on_commit=False, autoflush=False
        )
    return _session_factory


async def get_db() -> AsyncIterator[AsyncSession]:
    async with get_session_factory()() as session:
        yield session
