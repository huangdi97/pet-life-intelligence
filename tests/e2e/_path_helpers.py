"""Shared DB-setup helpers for the seven e2e path tests (E2E-01..E2E-07)."""

from __future__ import annotations

import asyncio

from app.core.db import get_session_factory
from app.models import Household, HouseholdMember, User


def create_owner(email: str, display_name: str, household_name: str) -> str:
    """Create an owner user + household + OWNER membership; return the user id."""

    async def mk() -> str:
        factory = get_session_factory()
        async with factory() as db:
            u = User(email=email, display_name=display_name)
            h = Household(name=household_name)
            db.add_all([u, h])
            await db.flush()
            db.add(HouseholdMember(household_id=h.id, user_id=u.id,
                                   role="OWNER", status="ACTIVE"))
            await db.commit()
            return str(u.id)

    return asyncio.run(mk())


def create_user(email: str, display_name: str) -> str:
    """Create a bare user (no household); return the user id."""

    async def mk() -> str:
        factory = get_session_factory()
        async with factory() as db:
            u = User(email=email, display_name=display_name)
            db.add(u)
            await db.commit()
            return str(u.id)

    return asyncio.run(mk())
