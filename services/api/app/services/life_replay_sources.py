"""Shared Life Replay source loading for R7 day history and R8 owner replay.

Today, `verified_now`, `as_known_then` and the R8CB knowledge delta must all read
the *same* occurrence set and the *same* later correction chain. If any of them
grew its own query, retraction/supersession rules could silently diverge and the
product would expose two competing truths for one day.

Nothing here decides what is knowable at a cutoff: that stays in the pure
projectors (`life_replay.project_life_replay`,
`life_change_workflow.project_case_workflow_at`).
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import select

from app.core.errors import ValidationFailed
from app.models import LifeChangeCase, LifeEvent
from app.services.event_visibility import scope_life_event_stmt

# Correction chains are walked in bounded hops so a corrupted/duplicated
# supersede graph cannot hang a read path.
MAX_CORRECTION_CHAIN_DEPTH = 32


async def load_day_replay_candidates(
    db,
    pet_id: uuid.UUID,
    start: datetime,
    end: datetime,
    cutoff: datetime,
    *,
    capabilities: set[str],
) -> list[LifeEvent]:
    """Load every occurrence in a day plus its later correction chain.

    Later corrections are loaded as candidates only; whether they are knowable
    at a given cutoff is decided by the pure replay projector.
    """
    stmt = select(LifeEvent).where(
        LifeEvent.pet_id == pet_id,
        LifeEvent.occurred_at >= start,
        LifeEvent.occurred_at < end,
        LifeEvent.event_type.not_in(["today.viewed", "audit.accessed"]),
    )
    stmt = scope_life_event_stmt(stmt, capabilities)
    day_events = list((await db.execute(stmt)).scalars().all())
    events_by_id = {row.id: row for row in day_events}
    pending = set(events_by_id)
    for _ in range(MAX_CORRECTION_CHAIN_DEPTH):
        if not pending:
            break
        next_stmt = select(LifeEvent).where(
            LifeEvent.pet_id == pet_id,
            LifeEvent.supersedes_event_id.in_(pending),
            LifeEvent.recorded_at < cutoff,
        )
        next_stmt = scope_life_event_stmt(next_stmt, capabilities)
        superseders = list((await db.execute(next_stmt)).scalars().all())
        pending = {row.id for row in superseders if row.id not in events_by_id}
        for row in superseders:
            events_by_id[row.id] = row
    else:
        raise ValidationFailed("Correction chain exceeds the supported replay depth.")
    return list(events_by_id.values())


async def load_owner_cases_for_day(
    db,
    pet_id: uuid.UUID,
    start: datetime,
    end: datetime,
    cutoff: datetime,
) -> list[LifeChangeCase]:
    """Owner-intelligence cases whose comparison instant falls inside the day.

    Cases are selected by the frozen comparison instant but cannot appear in a
    perspective earlier than their real creation time.
    """
    return list((await db.execute(
        select(LifeChangeCase).where(
            LifeChangeCase.pet_id == pet_id,
            LifeChangeCase.computed_at >= start,
            LifeChangeCase.computed_at < end,
            LifeChangeCase.created_at < cutoff,
        ).order_by(
            LifeChangeCase.computed_at.asc(),
            LifeChangeCase.id.asc(),
        )
    )).scalars().all())
