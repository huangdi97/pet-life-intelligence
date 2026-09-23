"""v0.2 versioned content — PLI-092 training tools · PLI-100 enrichment
activities · PLI-223 content seeding helper.

Split from v02_behavior_training.py; endpoint bodies kept verbatim.
"""

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.models import ContentVersion

router = APIRouter(tags=["v02-behavior-training"])

# PLI-092: reward-based training tools (versioned content seeded at startup)
TRAINING_TOOLS_V1 = {
    "tools": [
        {"name": "零食袋（高价值奖励）", "use": "即时奖励", "safe": True},
        {"name": "响片（Clicker）", "use": "标记正确行为", "safe": True},
        {"name": "牵引绳（普通胸背）", "use": "安全管理", "safe": True},
        {"name": "嗅闻垫", "use": "嗅闻丰富化", "safe": True},
    ],
    "banned_note": "禁止使用电击项圈/暴力/惩罚式方法（PLI-084 安全过滤）。",
    "version": "1.0.0",
}

# PLI-100: enrichment activity library
ENRICHMENT_V1 = {
    "activities": [
        {"name": "嗅闻垫/藏食游戏", "domain": "嗅觉", "min_minutes": 10},
        {"name": "漏食玩具", "domain": "进食丰富化", "min_minutes": 15},
        {"name": "新路径散步", "domain": "探索", "min_minutes": 20},
        {"name": "箱体探索", "domain": "猫/环境", "min_minutes": 10},
        {"name": "寻回游戏", "domain": "运动", "min_minutes": 15},
    ],
    "version": "1.0.0",
}


# --- PLI-092/100 versioned libraries + PLI-223 seeding -------------------------------


async def ensure_content_seeded(db) -> None:
    pairs = [("training_tools", TRAINING_TOOLS_V1["version"], TRAINING_TOOLS_V1),
             ("enrichment_activities", ENRICHMENT_V1["version"], ENRICHMENT_V1)]
    for key, version, body in pairs:
        exists = (
            await db.execute(
                select(ContentVersion).where(
                    ContentVersion.content_key == key,
                    ContentVersion.version == version,
                )
            )
        ).scalar_one_or_none()
        if exists is None:
            db.add(ContentVersion(content_key=key, version=version, body=body))


@router.get("/training/tools")
async def training_tools(db: DBSession, user: CurrentUser) -> dict:
    row = (
        await db.execute(
            select(ContentVersion).where(ContentVersion.content_key == "training_tools")
            .order_by(ContentVersion.effective_at.desc())
        )
    ).scalars().first()
    if row is None:
        return TRAINING_TOOLS_V1
    return row.body


@router.get("/welfare/enrichment-activities")
async def enrichment_activities(db: DBSession, user: CurrentUser) -> dict:
    row = (
        await db.execute(
            select(ContentVersion).where(
                ContentVersion.content_key == "enrichment_activities"
            ).order_by(ContentVersion.effective_at.desc())
        )
    ).scalars().first()
    if row is None:
        return ENRICHMENT_V1
    return row.body
