"""SQL scope for LifeEvents that are current evidence at a cutoff.

Authorization visibility and event-version validity are separate concerns.
This scope removes obsolete event versions before Search/Ask/Why/Memory
serialization or AI evidence construction.
"""
from datetime import UTC, datetime

from sqlalchemy import exists, or_, select
from sqlalchemy.orm import aliased

from app.models import LifeEvent


def scope_current_event_stmt(stmt, cutoff: datetime | None = None):
    """Keep LifeEvent versions usable as current evidence at *cutoff*."""
    now = cutoff or datetime.now(UTC)
    successor = aliased(LifeEvent)
    has_known_successor = exists(
        select(1).where(
            successor.pet_id == LifeEvent.pet_id,
            successor.supersedes_event_id == LifeEvent.id,
            successor.recorded_at < now,
        )
    )
    return stmt.where(
        LifeEvent.occurred_at < now,
        LifeEvent.recorded_at < now,
        or_(LifeEvent.retracted_at.is_(None), LifeEvent.retracted_at >= now),
        ~has_known_successor,
    )
