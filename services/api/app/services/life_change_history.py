"""R8AK owner history queries: stable cursor pagination and bounded search.

INVARIANT: a cursor names an immutable ``(created_at, id)`` position, never a
result offset. Creating a newer Case must not shift an older page or make the
owner see the same immutable Case twice.

SEARCH scope is deliberately bounded to fields the server already exposes to
DAILY_READ (metric identity and the frozen owner question). Private owner notes
and clinical text are never queried here.
"""

from __future__ import annotations

import base64
import json
import uuid
from datetime import datetime

from sqlalchemy import Select, and_, func, or_, select, text

from app.core.errors import ValidationFailed
from app.models import LifeChangeCase

# INVARIANT: this is the same derived validity the detail/source projection
# exposes (retracted OR superseded by a visible correction). It is computed as
# a bounded anti-join so the keyset order (created_at, id) stays stable and the
# count/page queries agree. Evidence rows are never deleted, so a missing id is
# not treated as "invalid" here; it is surfaced separately by the source page.
_INVALID_EVIDENCE_SQL = """
EXISTS (
    SELECT 1
    FROM life_events e
    JOIN LATERAL jsonb_array_elements_text(
        life_change_cases.evidence_event_ids
    ) AS ev(id_text) ON TRUE
    WHERE e.pet_id = life_change_cases.pet_id
      AND e.id = ev.id_text::uuid
      AND (
          e.retracted_at IS NOT NULL
          OR EXISTS (
              SELECT 1 FROM life_events s
              WHERE s.supersedes_event_id = e.id
                AND s.recorded_at <= now()
          )
      )
)
"""
_INVALID_EVIDENCE = text(_INVALID_EVIDENCE_SQL)
_VALID_EVIDENCE = text(f"NOT ({_INVALID_EVIDENCE_SQL})")

CURSOR_VERSION = 1
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 50

# Chinese owner-facing words map to canonical metrics. Search never accepts a
# client-supplied SQL fragment or an unknown metric alias.
METRIC_SEARCH_TERMS: dict[str, tuple[str, ...]] = {
    "walk_minutes_per_day": ("散步", "遛狗", "walk"),
    "meal_count_per_day": ("进食", "吃饭", "食欲", "meal"),
    "sleep_minutes_per_day": ("睡眠", "睡觉", "sleep"),
}


def encode_case_cursor(created_at: datetime, case_id: uuid.UUID) -> str:
    if created_at.utcoffset() is None:
        raise ValidationFailed("Case history cursor requires a timezone-aware instant.")
    raw = json.dumps(
        {"v": CURSOR_VERSION, "t": created_at.isoformat(), "id": str(case_id)},
        separators=(",", ":"),
        sort_keys=True,
    )
    return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("ascii").rstrip("=")


def decode_case_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")))
        if payload.get("v") != CURSOR_VERSION:
            raise ValueError("unsupported cursor version")
        created_at = datetime.fromisoformat(payload["t"])
        if created_at.utcoffset() is None:
            raise ValueError("naive cursor instant")
        return created_at, uuid.UUID(payload["id"])
    except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        raise ValidationFailed("Case history cursor is invalid or unsupported.") from exc


def metrics_matching(search: str) -> list[str]:
    term = search.strip().lower()
    if not term:
        return []
    return [
        metric
        for metric, words in METRIC_SEARCH_TERMS.items()
        if any(term in word.lower() for word in words)
    ]


def apply_history_filters(
    stmt: Select,
    *,
    metric: str | None,
    since: datetime | None,
    until: datetime | None,
    search: str | None,
    validity: str | None = None,
) -> Select:
    """Apply SQL-bounded filters shared by page and count queries."""
    if metric:
        stmt = stmt.where(LifeChangeCase.metric == metric)
    if since is not None:
        stmt = stmt.where(LifeChangeCase.created_at >= since)
    if until is not None:
        stmt = stmt.where(LifeChangeCase.created_at < until)
    if search and search.strip():
        term = search.strip()
        matched_metrics = metrics_matching(term)
        clauses = [LifeChangeCase.human_question.ilike(f"%{term}%")]
        if matched_metrics:
            clauses.append(LifeChangeCase.metric.in_(matched_metrics))
        stmt = stmt.where(or_(*clauses))
    if validity == "INVALID":
        stmt = stmt.where(_INVALID_EVIDENCE)
    elif validity == "VALID":
        stmt = stmt.where(_VALID_EVIDENCE)
    return stmt


def apply_cursor(stmt: Select, cursor: tuple[datetime, uuid.UUID]) -> Select:
    created_at, case_id = cursor
    return stmt.where(
        or_(
            LifeChangeCase.created_at < created_at,
            and_(
                LifeChangeCase.created_at == created_at,
                LifeChangeCase.id < case_id,
            ),
        )
    )


async def count_cases(db, stmt: Select) -> int:
    count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
    return int((await db.execute(count_stmt)).scalar_one())
