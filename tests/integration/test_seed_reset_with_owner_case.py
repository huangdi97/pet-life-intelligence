"""Seed reset must stay idempotent after a real owner Review Case exists.

The Browser E2E job runs `python -m app.seed` AFTER functional specs. A real
Case created by the follow-up regression previously made that reset fail with
an FK violation on `pets`; this locks the child-first deletion order.
"""
import asyncio
import uuid
from datetime import UTC, datetime

from tests.conftest import auth


def test_seed_reset_deletes_owner_cases_and_reviews_before_pets(client, seeded):
    owner = seeded["owner_id"]
    pet = client.post(
        "/api/v1/pets", json={"name": "Seed Reset Pet", "species": "dog"},
        headers=auth(owner),
    ).json()["id"]

    from app.core.db import get_session_factory
    from app.models import LifeChangeCase, LifeChangeReview

    async def insert_case() -> None:
        factory = get_session_factory()
        async with factory() as db:
            now = datetime.now(UTC)
            case = LifeChangeCase(
                pet_id=uuid.UUID(pet), created_by_user_id=uuid.UUID(owner),
                metric="walk_minutes_per_day", insight_kind="RECORDED_CHANGE",
                algorithm_version="R8A_SAME_CLOCK_RECORDED_CHANGE_V1",
                fingerprint=uuid.uuid4().hex,
                computed_at=now, knowledge_cutoff=now,
                timezone_policy="CST_UTC_PLUS_08_FALLBACK",
                current_value=20.0, baseline_value=90.0,
                sample_days=3, window_days=14,
                evidence_event_ids=[str(uuid.uuid4())],
                evidence_role_by_event_id=None,
                source_scope="DAILY_RECORDED_EVENTS_ONLY",
                uncertainty="样本有限。", human_question="是否继续观察？",
                state="PROPOSED",
            )
            db.add(case)
            await db.flush()
            db.add(LifeChangeReview(
                case_id=case.id, pet_id=case.pet_id, actor_id=uuid.UUID(owner),
                decision="FOLLOW_UP_LATER", note="", related_event_ids=[],
            ))
            await db.commit()

    asyncio.run(insert_case())

    from app.seed import seed
    from sqlalchemy import func, select

    asyncio.run(seed())

    async def remaining() -> int:
        factory = get_session_factory()
        async with factory() as db:
            cases = await db.execute(select(func.count()).select_from(LifeChangeCase))
            reviews = await db.execute(select(func.count()).select_from(LifeChangeReview))
            return int(cases.scalar_one()) + int(reviews.scalar_one())

    assert asyncio.run(remaining()) == 0

    # The demo household is recreated by the same reset (not left empty).
    users = client.post(
        "/api/v1/auth/dev/login", json={"email": "owner@pli.demo"},
    )
    assert users.status_code == 200
    rows = client.get("/api/v1/pets", headers={"X-Dev-User-Id": users.json()["user_id"]})
    assert rows.status_code == 200
    assert len(rows.json()) >= 2
