"""Stage E Phase J — worker crash / poison / restart semantics.

Simulates a worker crash: job mutates rows then rolls back (as if the process
died before commit); a second run (restart) must produce exactly the same
final state — no lost work, no duplicated critical events (idempotency keys +
dedupe keys protect this).
"""

import asyncio
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app.models import Grant, LifeEvent, Notification


def _run_async(coro):
    return asyncio.run(coro)


def _count(model, **filters):
    async def inner():
        from app.core.db import get_session_factory

        async with get_session_factory()() as s:
            stmt = select(func.count()).select_from(model)
            for k, v in filters.items():
                stmt = stmt.where(getattr(model, k) == v)
            return (await s.execute(stmt)).scalar_one()

    return asyncio.run(inner())


def test_worker_crash_restart_no_duplicate(client, seeded):
    """Crash (rollback) before commit, then restart: grant must expire exactly
    once, with one event + one notification, and nothing lost."""
    from app.core.db import get_session_factory
    from app.models import Pet
    from app.worker_jobs import expire_grants

    NOW = datetime.now(UTC)

    async def setup():
        factory = get_session_factory()
        async with factory() as db:
            pet = (
                await db.execute(
                    select(Pet).where(Pet.id == uuid.UUID(seeded["coco_id"]))
                )
            ).scalar_one()
            g = Grant(
                pet_id=pet.id, user_id=uuid.UUID(seeded["family_id"]),
                scopes=["daily:read"], granted_by_user_id=uuid.UUID(seeded["owner_id"]),
                starts_at=NOW - timedelta(days=2), expires_at=NOW - timedelta(hours=1),
            )
            db.add(g)
            await db.commit()
            return str(g.id)

    grant_id = _run_async(setup())

    async def crash_run():
        """Run the job but roll back — simulates process death before commit."""
        factory = get_session_factory()
        async with factory() as db:
            c = await expire_grants(db)
            await db.rollback()
        return c

    async def restart_run():
        factory = get_session_factory()
        async with factory() as db:
            c = await expire_grants(db)
            await db.commit()
        return c

    crashed_count = _run_async(crash_run())
    assert crashed_count >= 1, "job should have found the expired grant before crash"

    # restart: must pick up the same grant (crash left it ACTIVE)
    restart_count = _run_async(restart_run())
    assert restart_count >= 1, "restart must not lose the job"

    # exactly one event + one notification
    assert _count(LifeEvent, event_type="grant.expired",
                  idempotency_key=f"grant-expired:{grant_id}") == 1
    assert _count(Notification, dedupe_key=f"grant-expired-notif:{grant_id}") == 1

    # a third clean run does nothing (fully idempotent)
    third = _run_async(restart_run())
    assert third == 0


def test_worker_restart_is_safe_for_missed_doses(client, seeded):
    from app.core.db import get_session_factory
    from app.worker_jobs import mark_missed_doses

    async def age_doses():
        from sqlalchemy import text

        async with get_session_factory()() as db:
            await db.execute(text(
                "UPDATE medication_doses SET planned_at = planned_at "
                "- interval '30 days' WHERE status = 'PENDING'"
            ))
            await db.commit()

    _run_async(age_doses())

    async def run(commit: bool):
        factory = get_session_factory()
        async with factory() as db:
            c = await mark_missed_doses(db)
            if commit:
                await db.commit()
            else:
                await db.rollback()
        return c

    # crash run (rollback), then restart (commit)
    c1 = _run_async(run(False))
    c2 = _run_async(run(True))
    assert c2 >= c1, "restart must process any doses the crash run did not persist"

    # no duplicated notifications/events for the same dose
    total_events = _count(LifeEvent, event_type="medication.missed")
    total_notifs = _count(Notification, type="MEDICATION_MISSED")
    assert total_events == total_notifs