"""Package-level test helpers (importable as tests.conftest)."""




def create_user(*, email: str | None = None, is_demo: bool = False,
                is_internal: bool = False) -> str:
    """Create a User row directly (sync helper; usable in sync tests)."""
    import asyncio
    import uuid

    from app.core.db import get_session_factory
    from app.models import User

    async def _mk():
        factory = get_session_factory()
        async with factory() as db:
            u = User(email=email or f"u-{uuid.uuid4().hex[:10]}@pli.test",
                     display_name="Test User", is_demo=is_demo,
                     is_internal=is_internal)
            db.add(u)
            await db.commit()
            return str(u.id)

    return asyncio.run(_mk())


def create_internal_operator() -> str:
    """Platform-internal operator account (can manage ops/ paths)."""
    return create_user(email=f"ops-{__import__('uuid').uuid4().hex[:8]}@pli.ops",
                       is_demo=False, is_internal=True)


def auth(user_id: str) -> dict:
    return {"X-Dev-User-Id": user_id}
