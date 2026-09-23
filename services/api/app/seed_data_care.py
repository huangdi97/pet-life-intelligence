"""Demo care rows for ``app.seed``: CareTask, its task_created life event,
and the expired temporary Grant sample (GOAL Phase 12 / G12 demo family).
"""

from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain import enums
from app.models import CareTask, Grant
from app.services.eventlog import create_life_event


async def insert_care(db: AsyncSession, ids: dict, now: datetime) -> dict:
    """Insert demo CareTask + care.task_created event and expired Grant."""
    owner_id = ids["owner_id"]
    family_id = ids["family_id"]
    sitter_id = ids["sitter_id"]
    coco_id = ids["coco_id"]

    # task
    task = CareTask(pet_id=coco_id, title="Evening feeding", task_type="FEED",
                    due_at=now.replace(hour=19, minute=0, second=0, microsecond=0),
                    repeat_rule=enums.RepeatRule.DAILY.value,
                    assignee_user_id=family_id, created_by_user_id=owner_id)
    db.add(task)
    await db.flush()
    await create_life_event(
        db, pet_id=coco_id, event_type="care.task_created",
        payload={"task_id": str(task.id), "title": task.title,
                 "task_type": "FEED",
                 "due_at": task.due_at.isoformat(), "repeat_rule": "DAILY",
                 "assignee_user_id": str(family_id)},
        actor_id=owner_id,
    )

    # expired temporary grant sample for Coco→sitter (historical)
    grant = Grant(
        pet_id=coco_id, user_id=sitter_id,
        scopes=[enums.Capability.DAILY_READ.value, enums.Capability.DAILY_WRITE.value],
        reason="历史照护交接（已到期示例）", source="DIRECT",
        granted_by_user_id=owner_id,
        starts_at=now - timedelta(days=8),
        expires_at=now - timedelta(days=1),
        status=enums.GrantStatus.EXPIRED.value,
    )
    db.add(grant)

    return {"task_id": task.id}
