"""R8A explicitly owner-initiated change cases and append-only reviews.

Cases are built ONLY from the existing R7 deterministic recorded-fact hint.
No autonomous medical inference, push alert, task creation, or AI owner review.
"""
import hashlib
import json
import uuid
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.api.routes.v10_extras_services import abnormal_day_hint
from app.core.errors import ConflictError, NotFound, PermissionDenied, ValidationFailed
from app.domain import enums
from app.models import CareTask, LifeChangeCase, LifeChangeOutcome, LifeChangeReview, LifeEvent, Pet
from app.services import life_change_history as hist
from app.services import life_change_workflow as workflow
from app.services import permissions as perm
from app.services.eventlog import write_audit

router = APIRouter(tags=["life-intelligence"])

METRICS = {
    "walk_minutes_per_day": "daily.walk",
    "meal_count_per_day": "daily.meal",
    "sleep_minutes_per_day": "daily.sleep",
}
ALGORITHM = "R8A_SAME_CLOCK_RECORDED_CHANGE_V1"


def _freeze_evidence_roles(selected: dict) -> dict[str, str]:
    """Freeze algorithm-owned source membership, not a UI date guess.

    Reject duplicate or overlapping IDs rather than allowing one source to
    silently appear as both today's observation and a historic comparator.
    """
    current = selected.get("current_event_ids") or []
    historical = selected.get("historical_event_ids") or []
    if (not current or not historical or
        len(set(current)) != len(current) or
        len(set(historical)) != len(historical) or
        set(current) & set(historical)):
        raise ConflictError("Case evidence roles are incomplete or ambiguous.")
    return {**dict.fromkeys(historical, "HISTORICAL"),
            **dict.fromkeys(current, "CURRENT")}



def _frozen_comparison_as_of(hint: dict) -> datetime:
    """Preserve the actual same-clock comparison instant, including midnight.

    Case creation performs subsequent DB permission/evidence/idempotency work;
    its finish time must not silently shift the selected current/historical day.
    """
    candidate = datetime.fromisoformat(hint["as_of"])
    if candidate.utcoffset() is None:
        raise ConflictError("Life-change comparison returned an unzoned timestamp.")
    return candidate.astimezone(UTC)



def _require_zoned_filter(value: datetime | None, label: str) -> datetime | None:
    """History windows are owner-local instants; a naive filter is ambiguous."""
    if value is None:
        return None
    if value.utcoffset() is None:
        raise ValidationFailed(f"History filter '{label}' must include a timezone.")
    return value


class CaseCreate(BaseModel):
    metric: Literal["walk_minutes_per_day", "meal_count_per_day", "sleep_minutes_per_day"]


class ReviewCreate(BaseModel):
    decision: Literal["RECORD_OBSERVATION", "FOLLOW_UP_LATER", "NOT_RELEVANT", "CORRECT_SOURCE"]
    note: str = Field(default="", max_length=240)
    related_event_ids: list[uuid.UUID] = Field(default_factory=list, max_length=12)
    related_task_id: uuid.UUID | None = None
    expected_latest_review_id: uuid.UUID | None = None
    idempotency_key: str | None = Field(default=None, min_length=8, max_length=96)


class OutcomeCreate(BaseModel):
    observation_review_id: uuid.UUID
    assessment: Literal[
        "CONTINUE_OBSERVING",
        "NO_LONGER_CONCERNED",
        "NEEDS_FURTHER_FOLLOW_UP",
    ]
    note: str = Field(default="", max_length=240)
    expected_latest_review_id: uuid.UUID
    expected_latest_outcome_id: uuid.UUID | None = None
    idempotency_key: str = Field(min_length=8, max_length=96)


async def _evidence_current(
    db: DBSession, pet_id: uuid.UUID, event_ids: list[str],
    expected_event_type: str,
) -> bool:
    """Current truth is the same cutoff-aware evidence rule evaluated at now."""
    return await workflow.evidence_valid_at(
        db,
        pet_id=pet_id,
        event_ids=event_ids,
        expected_event_type=expected_event_type,
        cutoff=datetime.now(UTC),
    )


async def _case_current(db: DBSession, case: LifeChangeCase) -> bool:
    return await _evidence_current(
        db, case.pet_id, case.evidence_event_ids, METRICS[case.metric],
    )


async def _follow_up_current(
    db: DBSession, case: LifeChangeCase, review: LifeChangeReview,
) -> bool:
    """Current follow-up truth delegates to the same evaluator used by replay."""
    return await workflow.follow_up_valid_at(
        db,
        case=case,
        review=review,
        cutoff=datetime.now(UTC),
    )

def _case_response(
    case: LifeChangeCase, current: bool, *,
    follow_up_source_valid: bool | None = None,
    effective_state: str | None = None,
    owner_workflow: dict | None = None,
) -> dict:
    original_ids, source_shape_valid = hist.frozen_source_items(case.evidence_event_ids)
    role_map, role_shape_valid = hist.validated_frozen_roles(
        case.evidence_event_ids, case.evidence_role_by_event_id,
    )
    # The *case* source and the *follow-up* source are independent. Preserve
    # historical owner reviews, but never mislabel a withdrawn follow-up as a
    # completed observation cycle.
    state = effective_state
    if state is None:
        state = case.state if current else "INVALIDATED"
        if current and case.state == "FOLLOW_UP" and follow_up_source_valid is False:
            state = "FOLLOW_UP_EVIDENCE_INVALIDATED"
    workflow = owner_workflow or {
        "state": state,
        "source": "CASE",
        "latest_effective_outcome_id": None,
        "latest_effective_outcome_assessment": None,
        "requires_new_follow_up_observation": state == "FOLLOW_UP_EVIDENCE_INVALIDATED",
    }
    return {
        "case_id": str(case.id), "pet_id": str(case.pet_id),
        "metric": case.metric, "insight_kind": case.insight_kind,
        "algorithm_version": case.algorithm_version,
        "computed_at": case.computed_at.isoformat(),
        "knowledge_cutoff": case.knowledge_cutoff.isoformat(),
        "timezone_policy": case.timezone_policy,
        "current_value": case.current_value,
        "baseline_value": case.baseline_value,
        "sample_days": case.sample_days,
        "window_days": case.window_days,
        "evidence_event_ids": original_ids,
        "evidence_shape_valid": source_shape_valid,
        "evidence_role_shape_valid": role_shape_valid,
        # {} signals corrupt frozen membership; None alone means true legacy.
        "evidence_role_by_event_id": role_map,
        "evidence_role_source": (
            "FROZEN_AT_CREATION" if case.evidence_role_by_event_id is not None
            else "LEGACY_DATE_DERIVED"
        ),
        "source_scope": case.source_scope,
        "uncertainty": case.uncertainty,
        "human_question": case.human_question,
        "recorded_state": case.state,
        "state": state,
        "owner_workflow_state": workflow["state"],
        "owner_workflow_source": workflow["source"],
        "latest_effective_outcome_id": workflow["latest_effective_outcome_id"],
        "latest_effective_outcome_assessment": workflow[
            "latest_effective_outcome_assessment"
        ],
        "requires_new_follow_up_observation": workflow[
            "requires_new_follow_up_observation"
        ],
        "source_valid": current,
        "follow_up_source_valid": follow_up_source_valid,
        "truth_note": (
            "仅是有来源记录的描述性变化，不代表疾病、情绪或未记录的真实活动。"
            if current else
            "原始依据已被修正、撤回或不可访问；旧结论失效，主人历史确认仍可回看。"
        ),
    }


def _review_response(row: LifeChangeReview, *, owner_view: bool = True) -> dict:
    # Life-change progress is shareable within DAILY_READ; the owner's free
    # text and linked task ID are not. A note may contain symptoms or private
    # context, and some tasks are clinical despite the Case being daily-only.
    readable_ids, ids_valid = hist.safe_review_source_ids(row.related_event_ids)
    return {
        "review_id": str(row.id), "case_id": str(row.case_id),
        "pet_id": str(row.pet_id), "actor_id": str(row.actor_id),
        "reviewed_at": row.reviewed_at.isoformat(), "decision": row.decision,
        "note": row.note if owner_view else "",
        "related_event_ids": readable_ids,
        "related_evidence_shape_valid": ids_valid,
        "related_task_id": (
            str(row.related_task_id) if owner_view and row.related_task_id else None
        ),
        "prior_review_id": str(row.prior_review_id) if row.prior_review_id else None,
    }


def _outcome_response(
    row: LifeChangeOutcome, *, source_valid: bool, owner_view: bool,
) -> dict:
    return {
        "outcome_id": str(row.id),
        "case_id": str(row.case_id),
        "pet_id": str(row.pet_id),
        "actor_id": str(row.actor_id),
        "observation_review_id": str(row.observation_review_id),
        "case_review_head_id": str(row.case_review_head_id),
        "recorded_at": row.recorded_at.isoformat(),
        "assessment": row.assessment,
        "note": row.note if owner_view else "",
        "prior_outcome_id": str(row.prior_outcome_id) if row.prior_outcome_id else None,
        "observation_sources_valid": source_valid,
        "truth_note": (
            "这是主人的跟进判断，不代表疾病诊断、因果关系或宠物已经恢复。"
            if source_valid else
            "这条主人判断仍保留，但它所依据的后续记录已被撤回、修正或失效。"
        ),
    }


def _effective_case_state(
    case: LifeChangeCase,
    *,
    case_source_valid: bool,
    latest_review: LifeChangeReview | None,
    latest_follow_up_source_valid: bool | None,
    latest_outcome: LifeChangeOutcome | None = None,
    latest_outcome_source_valid: bool | None = None,
) -> str:
    """Derive current owner workflow without rewriting historical records.

    An Outcome is current only while it still points at the latest Review head
    the owner had seen when recording it. Source invalidation then overrides
    that Outcome. If a newer Review is appended afterwards, that Review becomes
    the workflow head instead of an older Outcome reopening or overriding it.
    """
    if not case_source_valid:
        return "INVALIDATED"

    outcome_is_current = bool(
        latest_outcome is not None
        and latest_review is not None
        and latest_outcome.case_review_head_id == latest_review.id
    )
    if outcome_is_current and latest_outcome_source_valid is False:
        return "FOLLOW_UP_EVIDENCE_INVALIDATED"

    if (
        latest_review is not None
        and latest_review.decision == "RECORD_OBSERVATION"
        and latest_follow_up_source_valid is False
    ):
        return "FOLLOW_UP_EVIDENCE_INVALIDATED"

    return case.state


def _owner_workflow_projection(
    case: LifeChangeCase,
    *,
    case_source_valid: bool,
    latest_review: LifeChangeReview | None,
    latest_follow_up_source_valid: bool | None,
    latest_outcome: LifeChangeOutcome | None = None,
    latest_outcome_source_valid: bool | None = None,
) -> dict:
    """Current R8BY view delegated to the same pure projector as R8CA replay."""
    return workflow.project_owner_workflow_values(
        recorded_state=case.state,
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

async def _get_case(db: DBSession, pet_id: uuid.UUID, case_id: uuid.UUID,
                    *, lock: bool = False) -> LifeChangeCase:
    stmt = select(LifeChangeCase).where(
        LifeChangeCase.id == case_id, LifeChangeCase.pet_id == pet_id,
    )
    if lock:
        stmt = stmt.with_for_update()
    case = (await db.execute(stmt)).scalar_one_or_none()
    if case is None:
        raise NotFound("Life change case not found for this pet.")
    return case


@router.post("/pets/{pet_id}/life-change-cases", status_code=201)
async def create_case(
    pet_id: uuid.UUID, body: CaseCreate, db: DBSession, user: CurrentUser,
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    await perm.require_owner(db, pet, user.id)
    # Serialize owner-initiated case creation per pet; a duplicate fingerprint
    # stays a single immutable observation even for simultaneous requests.
    await db.execute(select(Pet.id).where(Pet.id == pet.id).with_for_update())
    hint = await abnormal_day_hint(pet_id, db, user)
    selected = next(
        (x for x in hint["explanations"] if x["metric"] == body.metric), None
    )
    if (selected is None or not selected["notable"] or
        not selected["current_recorded"] or selected["sample_count"] < 3 or
        selected["same_time_baseline"] is None):
        raise ValidationFailed(
            "No reviewable source-backed change; missing facts are not a decline."
        )
    roles = _freeze_evidence_roles(selected)
    ids = sorted(roles)
    if not await _evidence_current(db, pet.id, ids, METRICS[body.metric]):
        raise ConflictError("Source evidence changed; recompute before reviewing.")
    raw = {
        "pet": str(pet.id), "metric": body.metric,
        "evidence": ids, "current": selected["current_value"],
        "baseline": selected["same_time_baseline"], "algo": ALGORITHM,
    }
    fingerprint = hashlib.sha256(
        json.dumps(raw, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    existing = (await db.execute(select(LifeChangeCase).where(
        LifeChangeCase.pet_id == pet.id, LifeChangeCase.fingerprint == fingerprint,
    ))).scalar_one_or_none()
    if existing:
        # POST retries must agree with list/detail on the EFFECTIVE status.
        # The stored FOLLOW_UP review remains append-only, but a withdrawn
        # follow-up source can no longer be represented as still valid.
        replay_reviews = list((await db.execute(
            select(LifeChangeReview).where(
                LifeChangeReview.case_id == existing.id,
            ).order_by(
                LifeChangeReview.reviewed_at.asc(),
                LifeChangeReview.id.asc(),
            )
        )).scalars().all())
        latest_review = replay_reviews[-1] if replay_reviews else None
        last_observation = next(
            (row for row in reversed(replay_reviews)
             if row.decision == "RECORD_OBSERVATION"),
            None,
        )
        followup_valid = (
            await _follow_up_current(db, existing, last_observation)
            if last_observation else None
        )
        latest_outcome = (await db.execute(
            select(LifeChangeOutcome).where(
                LifeChangeOutcome.case_id == existing.id,
            ).order_by(
                LifeChangeOutcome.recorded_at.desc(),
                LifeChangeOutcome.id.desc(),
            ).limit(1)
        )).scalar_one_or_none()
        latest_outcome_source_valid = None
        if latest_outcome is not None:
            outcome_observation = next(
                (row for row in replay_reviews
                 if row.id == latest_outcome.observation_review_id),
                None,
            )
            latest_outcome_source_valid = bool(
                outcome_observation is not None
                and outcome_observation.decision == "RECORD_OBSERVATION"
                and await _follow_up_current(db, existing, outcome_observation)
            )
        case_current = await _case_current(db, existing)
        owner_workflow = _owner_workflow_projection(
            existing,
            case_source_valid=case_current,
            latest_review=latest_review,
            latest_follow_up_source_valid=followup_valid,
            latest_outcome=latest_outcome,
            latest_outcome_source_valid=latest_outcome_source_valid,
        )
        return {
            **_case_response(
                existing, case_current,
                follow_up_source_valid=followup_valid,
                effective_state=_effective_case_state(
                    existing,
                    case_source_valid=case_current,
                    latest_review=latest_review,
                    latest_follow_up_source_valid=followup_valid,
                    latest_outcome=latest_outcome,
                    latest_outcome_source_valid=latest_outcome_source_valid,
                ),
                owner_workflow=owner_workflow,
            ),
            "replayed": True,
        }
    comparison_as_of = _frozen_comparison_as_of(hint)
    case = LifeChangeCase(
        pet_id=pet.id, created_by_user_id=user.id,
        metric=body.metric, insight_kind="RECORDED_CHANGE",
        algorithm_version=ALGORITHM, fingerprint=fingerprint,
        computed_at=comparison_as_of, knowledge_cutoff=comparison_as_of,
        timezone_policy="CST_UTC_PLUS_08_FALLBACK",
        current_value=float(selected["current_value"]),
        baseline_value=float(selected["same_time_baseline"]),
        sample_days=int(selected["sample_count"]),
        window_days=int(selected["window_days"]),
        evidence_event_ids=ids, evidence_role_by_event_id=roles,
        source_scope="DAILY_RECORDED_EVENTS_ONLY",
        uncertainty=selected["uncertainty"],
        human_question="这些已记录的变化是否值得继续观察？",
        state="PROPOSED",
    )
    db.add(case)
    await db.flush()
    await write_audit(
        db, action="life_change.case_create", actor_user_id=user.id,
        household_id=pet.household_id, pet_id=pet.id,
        resource_type="LifeChangeCase", resource_id=str(case.id),
        detail={"metric": body.metric, "source_count": len(ids)},
    )
    await db.commit()
    return {**_case_response(case, True), "replayed": False}


@router.get("/pets/{pet_id}/life-change-cases")
async def list_cases(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser,
    limit: int = Query(hist.DEFAULT_PAGE_SIZE, ge=1, le=hist.MAX_PAGE_SIZE),
    cursor: str | None = Query(default=None),
    metric: Literal["walk_minutes_per_day", "meal_count_per_day", "sleep_minutes_per_day"] | None = Query(default=None),
    since: datetime | None = Query(default=None),
    until: datetime | None = Query(default=None),
    q: str | None = Query(default=None, max_length=60),
    validity: Literal["VALID", "INVALID"] | None = Query(default=None),
) -> dict:
    """R8AK owner history page: immutable keyset pagination + bounded filters.

    The Case list is append-only, so an older page must never shift because a
    new observation created another Case. "VALID"/"INVALID" filter on the same
    derived source validity the detail exposes (missing, duplicated,
    wrong pet/type/source, retracted or superseded evidence); the bounded
    anti-join does not change the keyset order.
    """
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    since = _require_zoned_filter(since, "since")
    until = _require_zoned_filter(until, "until")
    if since is not None and until is not None and until <= since:
        raise ValidationFailed("History window must end after it starts.")
    base = select(LifeChangeCase).where(LifeChangeCase.pet_id == pet.id)
    base = hist.apply_history_filters(
        base, metric=metric, since=since, until=until, search=q, validity=validity,
    )
    total = await hist.count_cases(db, base)
    page_stmt = base.order_by(
        LifeChangeCase.created_at.desc(), LifeChangeCase.id.desc(),
    )
    if cursor:
        page_stmt = hist.apply_cursor(page_stmt, hist.decode_case_cursor(cursor))
    rows = list((await db.execute(page_stmt.limit(limit + 1))).scalars().all())
    has_more = len(rows) > limit
    rows = rows[:limit]
    # One bounded journal read per page. The newest Review is the current
    # owner workflow head; the newest RECORD_OBSERVATION remains the source
    # candidate used for follow-up validity. Outcomes carry the exact Review
    # head they were recorded against, so an older Outcome cannot shadow a
    # later explicit owner Review.
    observation_by_case: dict[uuid.UUID, LifeChangeReview] = {}
    latest_review_by_case: dict[uuid.UUID, LifeChangeReview] = {}
    review_by_id: dict[uuid.UUID, LifeChangeReview] = {}
    latest_outcome_by_case: dict[uuid.UUID, LifeChangeOutcome] = {}
    if rows:
        case_ids = [case.id for case in rows]
        reviews = list((await db.execute(
            select(LifeChangeReview).where(
                LifeChangeReview.case_id.in_(case_ids),
            ).order_by(
                LifeChangeReview.reviewed_at.desc(),
                LifeChangeReview.id.desc(),
            )
        )).scalars().all())
        for review in reviews:
            latest_review_by_case.setdefault(review.case_id, review)
            review_by_id[review.id] = review
            if review.decision == "RECORD_OBSERVATION":
                observation_by_case.setdefault(review.case_id, review)
        outcomes = list((await db.execute(
            select(LifeChangeOutcome).where(
                LifeChangeOutcome.case_id.in_(case_ids),
            ).order_by(
                LifeChangeOutcome.recorded_at.desc(),
                LifeChangeOutcome.id.desc(),
            )
        )).scalars().all())
        for outcome in outcomes:
            latest_outcome_by_case.setdefault(outcome.case_id, outcome)
    responses = []
    for case in rows:
        accepted = observation_by_case.get(case.id)
        followup_valid = (
            await _follow_up_current(db, case, accepted) if accepted else None
        )
        latest_outcome = latest_outcome_by_case.get(case.id)
        latest_outcome_source_valid = None
        if latest_outcome is not None:
            outcome_observation = review_by_id.get(latest_outcome.observation_review_id)
            latest_outcome_source_valid = bool(
                outcome_observation is not None
                and outcome_observation.decision == "RECORD_OBSERVATION"
                and await _follow_up_current(db, case, outcome_observation)
            )
        case_current = await _case_current(db, case)
        latest_review = latest_review_by_case.get(case.id)
        owner_workflow = _owner_workflow_projection(
            case,
            case_source_valid=case_current,
            latest_review=latest_review,
            latest_follow_up_source_valid=followup_valid,
            latest_outcome=latest_outcome,
            latest_outcome_source_valid=latest_outcome_source_valid,
        )
        responses.append(_case_response(
            case, case_current,
            follow_up_source_valid=followup_valid,
            effective_state=_effective_case_state(
                case,
                case_source_valid=case_current,
                latest_review=latest_review,
                latest_follow_up_source_valid=followup_valid,
                latest_outcome=latest_outcome,
                latest_outcome_source_valid=latest_outcome_source_valid,
            ),
            owner_workflow=owner_workflow,
        ))
    next_cursor = (
        hist.encode_case_cursor(rows[-1].created_at, rows[-1].id)
        if has_more and rows else None
    )
    return {
        "cases": responses, "next_cursor": next_cursor,
        "has_more": has_more, "total": total,
        "filters": {
            "metric": metric, "since": since.isoformat() if since else None,
            "until": until.isoformat() if until else None, "q": q,
        },
    }


@router.get("/pets/{pet_id}/life-change-cases/{case_id}")
async def get_case(
    pet_id: uuid.UUID, case_id: uuid.UUID, db: DBSession, user: CurrentUser,
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    case = await _get_case(db, pet.id, case_id)
    reviews = list((await db.execute(
        select(LifeChangeReview).where(LifeChangeReview.case_id == case.id)
        .order_by(LifeChangeReview.reviewed_at.asc(), LifeChangeReview.id.asc())
    )).scalars().all())
    try:
        await perm.require_owner(db, pet, user.id)
        owner_view = True
    except PermissionDenied:
        owner_view = False
    followup_states: dict[uuid.UUID, bool] = {}
    for review in reviews:
        if review.decision == "RECORD_OBSERVATION":
            followup_states[review.id] = await _follow_up_current(db, case, review)
    last_followup = next(
        (review for review in reversed(reviews) if review.id in followup_states),
        None,
    )
    followup_valid = (
        followup_states[last_followup.id] if last_followup else None
    )
    review_payloads = []
    for review in reviews:
        detail = _review_response(review, owner_view=owner_view)
        detail["related_sources_valid"] = followup_states.get(review.id)
        review_payloads.append(detail)
    outcomes = list((await db.execute(
        select(LifeChangeOutcome).where(LifeChangeOutcome.case_id == case.id)
        .order_by(LifeChangeOutcome.recorded_at.asc(), LifeChangeOutcome.id.asc())
    )).scalars().all())
    review_by_id = {review.id: review for review in reviews}
    outcome_payloads = []
    outcome_source_validity: dict[uuid.UUID, bool] = {}
    for outcome in outcomes:
        observation = review_by_id.get(outcome.observation_review_id)
        source_valid = (
            await _follow_up_current(db, case, observation)
            if observation is not None and observation.decision == "RECORD_OBSERVATION"
            else False
        )
        outcome_source_validity[outcome.id] = source_valid
        outcome_payloads.append(_outcome_response(
            outcome, source_valid=source_valid, owner_view=owner_view,
        ))
    case_current = await _case_current(db, case)
    latest_review = reviews[-1] if reviews else None
    latest_outcome = outcomes[-1] if outcomes else None
    latest_outcome_source_valid = (
        outcome_source_validity.get(latest_outcome.id)
        if latest_outcome is not None else None
    )
    owner_workflow = _owner_workflow_projection(
        case,
        case_source_valid=case_current,
        latest_review=latest_review,
        latest_follow_up_source_valid=followup_valid,
        latest_outcome=latest_outcome,
        latest_outcome_source_valid=latest_outcome_source_valid,
    )
    return {
        **_case_response(
            case, case_current,
            follow_up_source_valid=followup_valid,
            effective_state=_effective_case_state(
                case,
                case_source_valid=case_current,
                latest_review=latest_review,
                latest_follow_up_source_valid=followup_valid,
                latest_outcome=latest_outcome,
                latest_outcome_source_valid=latest_outcome_source_valid,
            ),
            owner_workflow=owner_workflow,
        ),
        "reviews": review_payloads,
        "outcomes": outcome_payloads,
        "latest_outcome_id": str(outcomes[-1].id) if outcomes else None,
        # R8AK: the owner may keep reviewing an old Case from its own detail
        # page. The token is the append-only Review identity, not a hidden
        # capability: POST still re-checks source validity, owner role and CAS.
        "owner_can_review": owner_view and case_current,
        "latest_review_id": str(reviews[-1].id) if reviews else None,
        "review_decisions": [
            "RECORD_OBSERVATION", "FOLLOW_UP_LATER", "NOT_RELEVANT", "CORRECT_SOURCE",
        ],
        "follow_up_review_count": len(followup_states),
    }


@router.get("/pets/{pet_id}/life-change-cases/{case_id}/workflow-replay")
async def replay_case_workflow(
    pet_id: uuid.UUID,
    case_id: uuid.UUID,
    knowledge_cutoff: datetime,
    db: DBSession,
    user: CurrentUser,
) -> dict:
    """Rebuild the owner workflow exactly as it was knowable at a cutoff.

    This is owner-intelligence history, not pet health history. It never reads
    the denormalized current Case state as historical truth.
    """
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    if knowledge_cutoff.utcoffset() is None:
        raise ValidationFailed("Owner-workflow replay cutoff must include a timezone.")
    cutoff = knowledge_cutoff.astimezone(UTC)
    if cutoff > datetime.now(UTC):
        raise ValidationFailed("Owner-workflow replay cutoff cannot be in the future.")

    case = await _get_case(db, pet.id, case_id)
    projected = await workflow.project_case_workflow_at(
        db, case=case, cutoff=cutoff,
    )
    return {
        "case_id": str(case.id),
        "pet_id": str(case.pet_id),
        "metric": case.metric,
        "computed_at": case.computed_at.isoformat(),
        "case_created_at": case.created_at.isoformat(),
        "knowledge_cutoff": cutoff.isoformat(),
        **projected,
        "truth_note": (
            "这是截至该时点可知的主人核对与跟进工作流，不代表宠物当时或现在的健康、恢复、诊断或因果状态。"
        ),
    }


@router.post("/pets/{pet_id}/life-change-cases/{case_id}/reviews", status_code=201)
async def review_case(
    pet_id: uuid.UUID, case_id: uuid.UUID, body: ReviewCreate,
    db: DBSession, user: CurrentUser,
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    await perm.require_owner(db, pet, user.id)
    case = await _get_case(db, pet.id, case_id, lock=True)
    if body.idempotency_key:
        existing = (await db.execute(
            select(LifeChangeReview).where(
                LifeChangeReview.case_id == case.id,
                LifeChangeReview.actor_id == user.id,
                LifeChangeReview.idempotency_key == body.idempotency_key,
            )
        )).scalar_one_or_none()
        if existing:
            # An idempotency key identifies ONE human instruction, not an
            # arbitrary sequence of possibly contradictory instructions.
            # The latest-review token is part of that original instruction.
            submitted_ids = sorted(str(item) for item in body.related_event_ids)
            saved_ids = sorted(existing.related_event_ids)
            if (
                existing.decision != body.decision
                or existing.note != body.note
                or saved_ids != submitted_ids
                or existing.related_task_id != body.related_task_id
                or existing.prior_review_id != body.expected_latest_review_id
            ):
                raise ConflictError(
                    "Idempotency key already belongs to a different owner review."
                )
            return {**_review_response(existing), "replayed": True}
    if not await _case_current(db, case):
        raise ConflictError("Case evidence has changed; this review cannot be attached to an invalidated case.")
    last = (await db.execute(
        select(LifeChangeReview).where(LifeChangeReview.case_id == case.id)
        .order_by(LifeChangeReview.reviewed_at.desc(), LifeChangeReview.id.desc()).limit(1)
    )).scalar_one_or_none()
    if body.expected_latest_review_id != (last.id if last else None):
        raise ConflictError("Case review changed since the owner's last view.")
    if (body.decision == "RECORD_OBSERVATION") != bool(body.related_event_ids):
        raise ValidationFailed("RECORD_OBSERVATION requires real new life-event IDs, other decisions do not.")
    if body.related_event_ids:
        related_ids = [str(x) for x in body.related_event_ids]
        if len(set(related_ids)) != len(related_ids):
            raise ValidationFailed("Follow-up evidence IDs must be distinct.")
        if set(related_ids) & set(case.evidence_event_ids):
            raise ValidationFailed("Original Case evidence is not a new follow-up.")
        related_rows = list((await db.execute(
            select(LifeEvent).where(LifeEvent.pet_id == pet.id, LifeEvent.id.in_(body.related_event_ids))
        )).scalars().all())
        # A future-dated observation is an explicit temporal error, not a
        # generic source-invalid message. The source IDs must all belong to
        # this pet before returning the specific classification.
        now = datetime.now(UTC)
        if len(related_rows) == len(related_ids) and any(
            e.occurred_at > now or e.recorded_at > now for e in related_rows
        ):
            raise ValidationFailed("Future-dated events cannot be follow-up observations.")
        if not await _evidence_current(db, pet.id, related_ids, METRICS[case.metric]):
            raise ValidationFailed("Related observation must be a current sourced event from this pet and metric.")
        # The frozen comparison clock defines the old baseline; created_at
        # defines when a real owner-followup loop first became possible.
        # Both recording and occurrence must be later than Case creation.
        if any(e.recorded_at <= case.created_at for e in related_rows):
            raise ValidationFailed("Follow-up must be recorded after Case creation.")
        if any(e.occurred_at <= case.created_at for e in related_rows):
            raise ValidationFailed("Backfilled past events are history, not follow-up observations.")
    if body.related_task_id:
        task = (await db.execute(
            select(CareTask).where(
                CareTask.id == body.related_task_id, CareTask.pet_id == pet.id,
            )
        )).scalar_one_or_none()
        if task is None:
            raise ValidationFailed("Related task must belong to this pet.")
    state = {
        "RECORD_OBSERVATION": "FOLLOW_UP",
        "FOLLOW_UP_LATER": "FOLLOW_UP",
        "NOT_RELEVANT": "CLOSED",
        "CORRECT_SOURCE": "OWNER_ACKNOWLEDGED",
    }[body.decision]
    review = LifeChangeReview(
        case_id=case.id, pet_id=pet.id, actor_id=user.id,
        decision=body.decision, note=body.note,
        related_event_ids=[str(x) for x in body.related_event_ids],
        related_task_id=body.related_task_id,
        prior_review_id=last.id if last else None,
        idempotency_key=body.idempotency_key,
    )
    db.add(review)
    case.state = state
    await db.flush()
    await write_audit(
        db, action="life_change.owner_review", actor_user_id=user.id,
        household_id=pet.household_id, pet_id=pet.id,
        resource_type="LifeChangeReview", resource_id=str(review.id),
        detail={"case_id": str(case.id), "decision": body.decision},
    )
    await db.commit()
    return {**_review_response(review), "replayed": False}


@router.post("/pets/{pet_id}/life-change-cases/{case_id}/outcomes", status_code=201)
async def record_case_outcome(
    pet_id: uuid.UUID, case_id: uuid.UUID, body: OutcomeCreate,
    db: DBSession, user: CurrentUser,
) -> dict:
    """Append an owner assessment anchored to a real follow-up observation.

    An outcome is a human judgement about what to do next. It never rewrites
    the Case, claims recovery, or converts temporal association into causality.
    """
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    await perm.require_owner(db, pet, user.id)
    case = await _get_case(db, pet.id, case_id, lock=True)

    existing = (await db.execute(select(LifeChangeOutcome).where(
        LifeChangeOutcome.case_id == case.id,
        LifeChangeOutcome.actor_id == user.id,
        LifeChangeOutcome.idempotency_key == body.idempotency_key,
    ))).scalar_one_or_none()
    if existing:
        if (
            existing.observation_review_id != body.observation_review_id
            or existing.case_review_head_id != body.expected_latest_review_id
            or existing.assessment != body.assessment
            or existing.note != body.note
            or existing.prior_outcome_id != body.expected_latest_outcome_id
        ):
            raise ConflictError(
                "Idempotency key already belongs to a different owner outcome."
            )
        observation = (await db.execute(select(LifeChangeReview).where(
            LifeChangeReview.id == existing.observation_review_id,
            LifeChangeReview.case_id == case.id,
        ))).scalar_one_or_none()
        source_valid = bool(
            observation is not None
            and observation.decision == "RECORD_OBSERVATION"
            and await _follow_up_current(db, case, observation)
        )
        return {
            **_outcome_response(existing, source_valid=source_valid, owner_view=True),
            "replayed": True,
        }

    if not await _case_current(db, case):
        raise ConflictError(
            "Case evidence has changed; a new outcome cannot be attached to an invalidated case."
        )
    latest_review = (await db.execute(
        select(LifeChangeReview).where(LifeChangeReview.case_id == case.id)
        .order_by(LifeChangeReview.reviewed_at.desc(), LifeChangeReview.id.desc())
        .limit(1)
    )).scalar_one_or_none()
    if latest_review is None or body.expected_latest_review_id != latest_review.id:
        raise ConflictError(
            "Case review journal changed since the owner's last view."
        )
    observation = (await db.execute(select(LifeChangeReview).where(
        LifeChangeReview.id == body.observation_review_id,
        LifeChangeReview.case_id == case.id,
        LifeChangeReview.pet_id == pet.id,
    ))).scalar_one_or_none()
    if observation is None or observation.decision != "RECORD_OBSERVATION":
        raise ValidationFailed(
            "Outcome must reference this Case's real RECORD_OBSERVATION review."
        )
    if not await _follow_up_current(db, case, observation):
        raise ConflictError(
            "Follow-up observation evidence changed; record a new observation before a new outcome."
        )
    latest = (await db.execute(
        select(LifeChangeOutcome).where(LifeChangeOutcome.case_id == case.id)
        .order_by(LifeChangeOutcome.recorded_at.desc(), LifeChangeOutcome.id.desc())
        .limit(1)
    )).scalar_one_or_none()
    if body.expected_latest_outcome_id != (latest.id if latest else None):
        raise ConflictError("Case outcome changed since the owner's last view.")

    outcome = LifeChangeOutcome(
        case_id=case.id,
        pet_id=pet.id,
        actor_id=user.id,
        observation_review_id=observation.id,
        case_review_head_id=latest_review.id,
        assessment=body.assessment,
        note=body.note,
        prior_outcome_id=latest.id if latest else None,
        idempotency_key=body.idempotency_key,
    )
    db.add(outcome)
    await db.flush()
    await write_audit(
        db,
        action="life_change.owner_outcome",
        actor_user_id=user.id,
        household_id=pet.household_id,
        pet_id=pet.id,
        resource_type="LifeChangeOutcome",
        resource_id=str(outcome.id),
        detail={
            "case_id": str(case.id),
            "observation_review_id": str(observation.id),
            "case_review_head_id": str(latest_review.id),
            "assessment": body.assessment,
        },
    )
    await db.commit()
    return {
        **_outcome_response(outcome, source_valid=True, owner_view=True),
        "replayed": False,
    }
