"""Shared current/historical owner-workflow projection for R8 life intelligence.

This module deliberately separates three things:
- append-only Case / Review / Outcome journal facts;
- the owner workflow that was effective at a knowledge cutoff;
- the pet's physiological or medical state (which is never inferred here).

Historical projection must not reuse LifeChangeCase.state because that column is
only the denormalized *latest* Review state. Replays rebuild the state from the
Review/Outcome journal that was knowable at the requested cutoff.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select

from app.models import LifeChangeCase, LifeChangeOutcome, LifeChangeReview, LifeEvent
from app.services import life_change_history as hist
from app.services.life_replay import RECORD_FACT_SOURCES

METRIC_EVENT_TYPES = {
    "walk_minutes_per_day": "daily.walk",
    "meal_count_per_day": "daily.meal",
    "sleep_minutes_per_day": "daily.sleep",
}

REVIEW_RECORDED_STATE = {
    "RECORD_OBSERVATION": "FOLLOW_UP",
    "FOLLOW_UP_LATER": "FOLLOW_UP",
    "NOT_RELEVANT": "CLOSED",
    "CORRECT_SOURCE": "OWNER_ACKNOWLEDGED",
}


def _aware(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def recorded_state_at(latest_review: LifeChangeReview | None) -> str:
    if latest_review is None:
        return "PROPOSED"
    return REVIEW_RECORDED_STATE.get(latest_review.decision, "PROPOSED")


def project_owner_workflow_values(
    *,
    recorded_state: str,
    case_source_valid: bool,
    latest_review_id: uuid.UUID | None,
    latest_review_decision: str | None,
    latest_follow_up_source_valid: bool | None,
    latest_outcome_id: uuid.UUID | None = None,
    latest_outcome_assessment: str | None = None,
    latest_outcome_review_head_id: uuid.UUID | None = None,
    latest_outcome_source_valid: bool | None = None,
) -> dict:
    """Pure owner-workflow projection shared by current and historical reads."""
    if not case_source_valid:
        return {
            "state": "INVALIDATED",
            "source": "CASE",
            "latest_effective_outcome_id": None,
            "latest_effective_outcome_assessment": None,
            "requires_new_follow_up_observation": False,
        }

    outcome_is_current = bool(
        latest_outcome_id is not None
        and latest_review_id is not None
        and latest_outcome_review_head_id == latest_review_id
    )
    if outcome_is_current:
        state = (
            "FOLLOW_UP_EVIDENCE_INVALIDATED"
            if latest_outcome_source_valid is False
            else f"OUTCOME_{latest_outcome_assessment}"
        )
        return {
            "state": state,
            "source": "OUTCOME",
            "latest_effective_outcome_id": str(latest_outcome_id),
            "latest_effective_outcome_assessment": latest_outcome_assessment,
            "requires_new_follow_up_observation": latest_outcome_source_valid is False,
        }

    if (
        latest_review_decision == "RECORD_OBSERVATION"
        and latest_follow_up_source_valid is False
    ):
        state = "FOLLOW_UP_EVIDENCE_INVALIDATED"
    else:
        state = recorded_state
    return {
        "state": state,
        "source": "REVIEW" if latest_review_id is not None else "CASE",
        "latest_effective_outcome_id": None,
        "latest_effective_outcome_assessment": None,
        "requires_new_follow_up_observation": (
            state == "FOLLOW_UP_EVIDENCE_INVALIDATED"
        ),
    }


async def evidence_valid_at(
    db,
    *,
    pet_id: uuid.UUID,
    event_ids: list[str],
    expected_event_type: str,
    cutoff: datetime,
) -> bool:
    """Whether frozen LifeEvent evidence was valid *at* the knowledge cutoff."""
    cutoff = _aware(cutoff)
    source_ids, shape_valid = hist.frozen_source_items(event_ids)
    if not shape_valid or not source_ids:
        return False
    parsed = [hist.parse_case_source_id(item) for item in source_ids]
    if any(item is None for item in parsed) or len(set(parsed)) != len(parsed):
        return False
    ids = [item for item in parsed if item is not None]
    rows = list((await db.execute(
        select(LifeEvent).where(LifeEvent.pet_id == pet_id, LifeEvent.id.in_(ids))
    )).scalars().all())
    if len(rows) != len(ids):
        return False
    if any(
        row.event_type != expected_event_type
        or row.source_type not in RECORD_FACT_SOURCES
        or _aware(row.recorded_at) >= cutoff
        or _aware(row.occurred_at) >= cutoff
        or (
            row.retracted_at is not None
            and _aware(row.retracted_at) < cutoff
        )
        for row in rows
    ):
        return False
    successor = (await db.execute(
        select(LifeEvent.id).where(
            LifeEvent.pet_id == pet_id,
            LifeEvent.supersedes_event_id.in_(ids),
            LifeEvent.recorded_at < cutoff,
        ).limit(1)
    )).scalar_one_or_none()
    return successor is None


async def follow_up_valid_at(
    db,
    *,
    case: LifeChangeCase,
    review: LifeChangeReview,
    cutoff: datetime,
) -> bool:
    cutoff = _aware(cutoff)
    source_ids, shape_valid = hist.frozen_source_items(review.related_event_ids)
    expected_type = METRIC_EVENT_TYPES.get(case.metric)
    if (
        review.decision != "RECORD_OBSERVATION"
        or not shape_valid
        or not source_ids
        or expected_type is None
    ):
        return False
    if not await evidence_valid_at(
        db,
        pet_id=case.pet_id,
        event_ids=source_ids,
        expected_event_type=expected_type,
        cutoff=cutoff,
    ):
        return False
    ids = [uuid.UUID(item) for item in source_ids]
    original_ids = {
        parsed for item in hist.frozen_source_items(case.evidence_event_ids)[0]
        if (parsed := hist.parse_case_source_id(item)) is not None
    }
    if set(ids) & original_ids:
        return False
    events = list((await db.execute(
        select(LifeEvent).where(
            LifeEvent.pet_id == case.pet_id,
            LifeEvent.id.in_(ids),
        )
    )).scalars().all())
    created_at = _aware(case.created_at)
    return (
        len(events) == len(ids)
        and all(
            _aware(event.recorded_at) > created_at
            and created_at < _aware(event.occurred_at) < cutoff
            for event in events
        )
    )


async def project_case_workflow_at(
    db,
    *,
    case: LifeChangeCase,
    cutoff: datetime,
) -> dict:
    """Rebuild one Case's owner workflow exactly as knowable at cutoff."""
    cutoff = _aware(cutoff)
    if cutoff <= _aware(case.created_at):
        return {
            "case_known_at_cutoff": False,
            "recorded_state": None,
            "state": None,
            "owner_workflow_state": None,
            "owner_workflow_source": None,
            "source_valid": None,
            "follow_up_source_valid": None,
            "latest_review_id": None,
            "latest_review_decision": None,
            "latest_outcome_id": None,
            "latest_effective_outcome_id": None,
            "latest_effective_outcome_assessment": None,
            "requires_new_follow_up_observation": False,
        }

    reviews = list((await db.execute(
        select(LifeChangeReview).where(
            LifeChangeReview.case_id == case.id,
            LifeChangeReview.reviewed_at < cutoff,
        ).order_by(
            LifeChangeReview.reviewed_at.asc(),
            LifeChangeReview.id.asc(),
        )
    )).scalars().all())
    outcomes = list((await db.execute(
        select(LifeChangeOutcome).where(
            LifeChangeOutcome.case_id == case.id,
            LifeChangeOutcome.recorded_at < cutoff,
        ).order_by(
            LifeChangeOutcome.recorded_at.asc(),
            LifeChangeOutcome.id.asc(),
        )
    )).scalars().all())

    latest_review = reviews[-1] if reviews else None
    latest_observation = next(
        (row for row in reversed(reviews) if row.decision == "RECORD_OBSERVATION"),
        None,
    )
    latest_follow_up_source_valid = (
        await follow_up_valid_at(db, case=case, review=latest_observation, cutoff=cutoff)
        if latest_observation is not None else None
    )

    expected_type = METRIC_EVENT_TYPES.get(case.metric)
    case_source_valid = bool(
        expected_type
        and await evidence_valid_at(
            db,
            pet_id=case.pet_id,
            event_ids=case.evidence_event_ids,
            expected_event_type=expected_type,
            cutoff=cutoff,
        )
    )

    latest_outcome = outcomes[-1] if outcomes else None
    review_by_id = {row.id: row for row in reviews}
    latest_outcome_source_valid = None
    if latest_outcome is not None:
        observation = review_by_id.get(latest_outcome.observation_review_id)
        latest_outcome_source_valid = bool(
            observation is not None
            and observation.decision == "RECORD_OBSERVATION"
            and await follow_up_valid_at(
                db, case=case, review=observation, cutoff=cutoff,
            )
        )

    recorded_state = recorded_state_at(latest_review)
    workflow = project_owner_workflow_values(
        recorded_state=recorded_state,
        case_source_valid=case_source_valid,
        latest_review_id=latest_review.id if latest_review else None,
        latest_review_decision=latest_review.decision if latest_review else None,
        latest_follow_up_source_valid=latest_follow_up_source_valid,
        latest_outcome_id=latest_outcome.id if latest_outcome else None,
        latest_outcome_assessment=latest_outcome.assessment if latest_outcome else None,
        latest_outcome_review_head_id=(
            latest_outcome.case_review_head_id if latest_outcome else None
        ),
        latest_outcome_source_valid=latest_outcome_source_valid,
    )
    return {
        "case_known_at_cutoff": True,
        "recorded_state": recorded_state,
        "state": workflow["state"],
        "owner_workflow_state": workflow["state"],
        "owner_workflow_source": workflow["source"],
        "source_valid": case_source_valid,
        "follow_up_source_valid": latest_follow_up_source_valid,
        "latest_review_id": str(latest_review.id) if latest_review else None,
        "latest_review_decision": latest_review.decision if latest_review else None,
        "latest_outcome_id": str(latest_outcome.id) if latest_outcome else None,
        "latest_effective_outcome_id": workflow["latest_effective_outcome_id"],
        "latest_effective_outcome_assessment": workflow[
            "latest_effective_outcome_assessment"
        ],
        "requires_new_follow_up_observation": workflow[
            "requires_new_follow_up_observation"
        ],
    }
