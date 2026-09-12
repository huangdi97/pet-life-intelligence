"""Test harness helpers for exercising worker logic inside E2E tests."""

import asyncio
from datetime import datetime, timezone


def mark_past_dose_missed() -> int:
    """Shift every PENDING dose into the past, then run the worker's
    missed-dose job once. Returns number of doses marked MISSED."""
    from sqlalchemy import select, text

    from app.core.db import get_session_factory
    from app.models import MedicationDose
    from app.worker_jobs import mark_missed_doses

    async def prepare_and_run():
        factory = get_session_factory()
        async with factory() as db:
            await db.execute(
                text(
                    "UPDATE medication_doses d SET planned_at = s.new_time "
                    "FROM (SELECT id, "
                    "  now() - interval '30 days' + "
                    "  (ROW_NUMBER() OVER (PARTITION BY plan_id ORDER BY id) "
                    "   * interval '1 minute') AS new_time "
                    "  FROM medication_doses WHERE status = 'PENDING') s "
                    "WHERE d.id = s.id"
                )
            )
            await db.commit()
        async with factory() as db:
            count = await mark_missed_doses(db)
            await db.commit()
            # verify no pending past doses remain
            left = (
                await db.execute(
                    select(MedicationDose).where(
                        MedicationDose.status == "PENDING",
                        MedicationDose.planned_at < datetime.now(timezone.utc),
                    )
                )
            ).scalars().all()
            assert not left
            return count

    return asyncio.run(prepare_and_run())
