"""PLI-122/210 — social visibility level and communication style (audit-recorded
preference writes)."""

import uuid

from fastapi import APIRouter
from pydantic import BaseModel

from app.api.deps import CurrentUser, DBSession
from app.core.errors import ValidationFailed
from app.domain import enums
from app.services import permissions as perm
from app.services.eventlog import write_audit

router = APIRouter(tags=["v10-extras"])


# --- PLI-122 visibility (audit-recorded level) -------------------------------------------


class VisibilityIn(BaseModel):
    level: str


@router.put("/pets/{pet_id}/social-visibility")
async def set_social_visibility(pet_id: uuid.UUID, body: VisibilityIn,
                                db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    if body.level not in {"PRIVATE", "FRIENDS", "HOUSEHOLD"}:
        raise ValidationFailed("level must be PRIVATE|FRIENDS|HOUSEHOLD")
    await write_audit(db, action="social_visibility.set", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="Pet", resource_id=str(pet.id),
                      detail={"level": body.level})
    await db.commit()
    return {"pet_id": str(pet.id), "level": body.level,
            "enforcement": "社交相关端点仅返回已授权关系数据；级别入审计。"}


# --- PLI-210 communication style -------------------------------------------------------------


class CommStyleIn(BaseModel):
    style: str


@router.put("/users/me/communication-style")
async def set_comm_style(body: CommStyleIn, db: DBSession, user: CurrentUser) -> dict:
    if body.style not in {"STANDARD", "SIMPLE", "DETAILED"}:
        raise ValidationFailed("style must be STANDARD|SIMPLE|DETAILED")
    await write_audit(db, action="comm_style.set", actor_user_id=user.id,
                      resource_type="User", resource_id=str(user.id),
                      detail={"style": body.style})
    await db.commit()
    return {"user_id": str(user.id), "style": body.style,
            "enforcement": "记录层：AI 生成文案按此偏好调整（提示词版本随内容发布）。"}
