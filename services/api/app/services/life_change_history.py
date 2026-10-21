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
import re
import uuid
from datetime import datetime

from sqlalchemy import Select, and_, func, or_, select, text

from app.core.errors import ValidationFailed
from app.models import LifeChangeCase

# The list VALID/INVALID query must agree with the detail-level
# _evidence_current() contract on EVERY source, not just retraction/supersession.
# A missing, wrong-pet, wrong-type or untrusted source is NOT valid evidence.
# The query works on bounded case evidence JSONB; malformed IDs are safely
# rejected without casting an attacker-controlled string as uuid.
_INVALID_EVIDENCE_SQL = """
(
    CASE
    WHEN jsonb_typeof(life_change_cases.evidence_event_ids) IS DISTINCT FROM 'array'
        THEN TRUE
    ELSE (
        jsonb_array_length(life_change_cases.evidence_event_ids) = 0
        OR (
            SELECT count(*) <> count(DISTINCT lower(ev.id_text))
            FROM jsonb_array_elements_text(life_change_cases.evidence_event_ids) AS ev(id_text)
        )
        OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(life_change_cases.evidence_event_ids) AS ev(id_text)
            WHERE NOT EXISTS (
                SELECT 1 FROM life_events e
                WHERE e.pet_id = life_change_cases.pet_id
                  AND e.id = (
                      CASE WHEN ev.id_text ~
                      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                      THEN ev.id_text::uuid ELSE NULL::uuid END
                  )
                  AND e.event_type = CASE life_change_cases.metric
                      WHEN 'walk_minutes_per_day' THEN 'daily.walk'
                      WHEN 'meal_count_per_day' THEN 'daily.meal'
                      WHEN 'sleep_minutes_per_day' THEN 'daily.sleep'
                      ELSE NULL END
                  AND e.source_type IN (
                      'OWNER_REPORTED', 'CAREGIVER_REPORTED', 'DEVICE_DERIVED',
                      'PROFESSIONAL_CONFIRMED', 'LAB_CONFIRMED'
                  )
                  AND e.retracted_at IS NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM life_events s
                      WHERE s.pet_id = e.pet_id
                        AND s.supersedes_event_id = e.id
                        AND s.recorded_at <= now()
                  )
            )
        )
    )
    END
)
"""
_INVALID_EVIDENCE = text(_INVALID_EVIDENCE_SQL)
_VALID_EVIDENCE = text(f"NOT ({_INVALID_EVIDENCE_SQL})")

# Match the strict 8-4-4-4-12 textual UUID grammar required by the SQL
# validity filter. Python's uuid.UUID accepts unhyphenated strings; allowing
# those only in detail would violate VALID/INVALID list/detail parity.
_CASE_UUID = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)


def frozen_source_items(value: object) -> tuple[list[object], bool]:
    """Read legacy JSONB without interpreting an object/string as an ID list.

    The second value records whether a real JSON array was stored. A corrupt
    historical Case stays inspectable, but source validity must fail closed.
    """
    return (list(value), True) if isinstance(value, list) else ([], False)


def safe_review_source_ids(value: object) -> tuple[list[str], bool]:
    """Do not let corrupt historical Review JSONB reach owner UI arrays."""
    items, shape_ok = frozen_source_items(value)
    if not shape_ok:
        return [], False
    parsed = [parse_case_source_id(item) for item in items]
    valid_ids = [str(item) for item in parsed if item is not None]
    complete = (
        all(item is not None for item in parsed)
        and len(set(valid_ids)) == len(items)
        and len(items) <= 12
    )
    return list(dict.fromkeys(valid_ids)), complete


def parse_case_source_id(value: object) -> uuid.UUID | None:
    """Parse a legacy source identifier without throwing on corrupt JSON."""
    if not isinstance(value, str) or _CASE_UUID.fullmatch(value) is None:
        return None
    return uuid.UUID(value)



def validated_frozen_roles(
    evidence_ids: object, raw_roles: object,
) -> tuple[dict[str, str] | None, bool]:
    """Check the *whole* frozen Case role partition, not merely JSON type.

    NULL is an honest legacy Case with no frozen membership. Any non-NULL
    invalid shape must remain a frozen-but-unverifiable Case: return an empty
    map (not None), so clients cannot reinterpret it as legacy date-derived
    roles. Never silently accept duplicate casefold UUIDs, missing/extra
    source identities, or invented role values.
    """
    if raw_roles is None:
        return None, True
    if not isinstance(raw_roles, dict):
        return {}, False
    sources, shape_ok = frozen_source_items(evidence_ids)
    if not shape_ok or not sources:
        return {}, False
    source_ids = [parse_case_source_id(item) for item in sources]
    if (any(item is None for item in source_ids)
            or len(set(source_ids)) != len(source_ids)):
        return {}, False
    normalized: dict[str, str] = {}
    for key, role in raw_roles.items():
        parsed = parse_case_source_id(key)
        if parsed is None or role not in ("CURRENT", "HISTORICAL"):
            return {}, False
        canonical = str(parsed)
        if canonical in normalized:
            return {}, False
        normalized[canonical] = role
    if (set(normalized) != {str(item) for item in source_ids}
            or set(normalized.values()) != {"CURRENT", "HISTORICAL"}):
        return {}, False
    return normalized, True


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
