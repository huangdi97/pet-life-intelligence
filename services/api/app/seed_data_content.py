"""Demo content rows for ``app.seed``: 豆豆/咪咪 daily life events and 豆豆's
behavior event (GOAL Phase 12 / G12 demo family).
"""

from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain import enums
from app.models import BehaviorEvent
from app.services.eventlog import create_life_event


async def insert_content(
    db: AsyncSession, ids: dict, now: datetime, today8: datetime,
) -> None:
    """Insert daily life events for both pets and 豆豆's behavior event."""
    owner_id = ids["owner_id"]
    family_id = ids["family_id"]
    coco_id = ids["coco_id"]
    mimi_id = ids["mimi_id"]

    # daily events for 豆豆
    await create_life_event(
        db, pet_id=coco_id, event_type="daily.meal",
        payload={"food_type": "dog kibble", "amount": "120", "unit": "g"},
        actor_id=owner_id, occurred_at=today8,
    )
    await create_life_event(
        db, pet_id=coco_id, event_type="daily.walk",
        payload={"duration_minutes": 30, "distance_meters": "1500",
                 "intensity": "normal"},
        actor_id=family_id, occurred_at=today8 + timedelta(hours=2),
        source_type=enums.SourceType.CAREGIVER_REPORTED,
    )
    await create_life_event(
        db, pet_id=coco_id, event_type="daily.weight",
        payload={"weight_kg": "12.2", "body_condition_score": 5},
        actor_id=owner_id, occurred_at=today8 + timedelta(minutes=30),
    )
    await create_life_event(
        db, pet_id=mimi_id, event_type="daily.elimination",
        payload={"kind": "urine", "quality": "normal"},
        actor_id=owner_id, occurred_at=today8 + timedelta(minutes=45),
    )

    # behavior event
    be = BehaviorEvent(
        pet_id=coco_id, occurred_at=today8 + timedelta(hours=3),
        antecedent="快递员敲门", behavior="连续吠叫约1分钟，随后躲到沙发下",
        consequence="主人安抚后自行出来", duration_seconds=60,
        intensity="MODERATE",
        intensity_source=enums.SourceType.OWNER_REPORTED.value,
        people_involved="快递员", environment="客厅",
        owner_notes="对敲门声敏感", recorded_by_user_id=owner_id,
    )
    db.add(be)
    await db.flush()
    await create_life_event(
        db, pet_id=coco_id, event_type="behavior.observed",
        payload={"behavior_event_id": str(be.id), "behavior": be.behavior,
                 "intensity": "MODERATE",
                 "intensity_source": enums.SourceType.OWNER_REPORTED.value},
        actor_id=owner_id, source_ref=f"behavior_event:{be.id}",
        occurred_at=be.occurred_at,
    )
