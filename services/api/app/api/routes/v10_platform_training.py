"""v1.0 routes — health term map (PLI-065/066/067) + training extras (PLI-089..098)."""

import uuid

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.domain import enums
from app.models import TrainingSession
from app.services import permissions as perm

router = APIRouter(tags=["v10-platform"])


TERM_MAP = {
    "GDV": "胃扩张-扭转（紧急）",
    "FLUTD": "猫下泌尿道疾病",
    "otitis externa": "外耳炎",
    "dermatitis": "皮炎",
}


@router.get("/health/term-map")
async def term_map() -> dict:
    return {"map": TERM_MAP, "note": "静态标准术语映射 v1；由兽医专业内容版本管理。"}


@router.get("/pets/{pet_id}/training/consistency")
async def training_consistency(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    """PLI-093: sessions grouped by family member (deterministic)."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(TrainingSession).where(TrainingSession.pet_id == pet.id)
        )
    ).scalars().all()
    by_actor: dict[str, int] = {}
    for s in rows:
        who = str(s.created_by_user_id)
        by_actor[who] = by_actor.get(who, 0) + 1
    return {"by_member": by_actor,
            "note": "一致性为记录统计，非评价。"}


@router.get("/training/course-templates")
async def course_templates() -> dict:
    """PLI-097: reward-based course templates (content-versioned)."""
    return {
        "version": "1.0.0",
        "templates": [
            {"name": "唤回基础", "weeks": 4, "method": "reward-based"},
            {"name": "笼内适应", "weeks": 3, "method": "reward-based"},
            {"name": "牵引随行", "weeks": 6, "method": "reward-based"},
        ],
        "policy": "仅正向强化课程模板。",
    }
