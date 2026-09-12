"""Shared route dependencies."""

import uuid
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import get_current_user
from app.domain import enums
from app.models import Pet, User
from app.services import permissions as perm


def request_id(request: Request) -> str:
    return str(getattr(request.state, "request_id", "") or "")


DBSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


async def pet_with_access(
    pet_id: uuid.UUID,
    db: DBSession,
    user: CurrentUser,
    capability: enums.Capability,
) -> tuple[Pet, User, set[str]]:
    pet = await perm.get_pet_or_404(db, pet_id)
    caps = await perm.require_capability(db, pet, user.id, capability)
    return pet, user, caps
