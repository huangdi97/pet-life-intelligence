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
from app.models import CareTask, LifeChangeCase, LifeChangeReview, LifeEvent, Pet
from app.services import life_change_history as hist
from app.services import permissions as perm
from app.services.eventlog import write_audit
from app.services.life_replay import RECORD_FACT_SOURCES

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


async def _evidence_current(
    db: DBSession, pet_id: uuid.UUID, event_ids: list[str],
    expected_event_type: str,
) -> bool:
    source_ids, shape_valid = hist.frozen_source_items(event_ids)
    if not shape_valid or not source_ids:
        return False
    parsed = [hist.parse_case_source_id(item) for item in source_ids]
    # A malformed source or duplicated underlying UUID is not a valid
    # frozen evidence set. Upper/lower-case spelling cannot manufacture two
    # independent observations from one real event.
    if any(item is None for item in parsed) or len(set(parsed)) != len(parsed):
        return False
    ids = [item for item in parsed if item is not None]
    rows = list((await db.execute(
        select(LifeEvent).where(LifeEvent.pet_id == pet_id, LifeEvent.id.in_(ids))
    )).scalars().all())
    if len(rows) != len(ids):
        return False
    if any(
        e.event_type != expected_event_type or
        e.source_type not in RECORD_FACT_SOURCES or e.retracted_at is not None
        for e in rows
    ):
        return False
    successors = (await db.execute(select(LifeEvent.id).where(
        LifeEvent.pet_id == pet_id,
        LifeEvent.supersedes_event_id.in_(ids),
        LifeEvent.recorded_at <= datetime.now(UTC),
    ))).first()
    return successors is None


async def _case_current(db: DBSession, case: LifeChangeCase) -> bool:
    return await _evidence_current(
        db, case.pet_id, case.evidence_event_ids, METRICS[case.metric],
    )


async def _follow_up_current(
    db: DBSession, case: LifeChangeCase, review: LifeChangeReview,
) -> bool:
    """Check whether a previously accepted real follow-up remains evidence.

    A source correction/retraction does not erase an append-only owner Review,
    but the UX must stop showing that Review as a valid observation loop.
    """
    followup_ids, followup_shape_valid = hist.frozen_source_items(review.related_event_ids)
    if review.decision != "RECORD_OBSERVATION" or not followup_shape_valid or not followup_ids:
        return False
    if not await _evidence_current(
        db, case.pet_id, followup_ids, METRICS[case.metric],
    ):
        return False
    ids = [uuid.UUID(item) for item in followup_ids]
    events = list((await db.execute(select(LifeEvent).where(
        LifeEvent.pet_id == case.pet_id, LifeEvent.id.in_(ids),
    ))).scalars().all())
    now = datetime.now(UTC)
    # A comparison is computed before the owner Case is persisted. A walk
    # during that gap was not a follow-up to an existing Case, even if it
    # happened after the algorithm's frozen comparison clock.
    return (
        len(events) == len(ids)
        and not set(ids) & {
            parsed for item in hist.frozen_source_items(case.evidence_event_ids)[0]
            if (parsed := hist.parse_case_source_id(item)) is not None
        }
        and all(
            event.recorded_at > case.created_at
            and case.created_at < event.occurred_at <= now
            for event in events
        )
    )


def _case_response(
    case: LifeChangeCase, current: bool, *,
    follow_up_source_valid: bool | None = None,
) -> dict:
    original_ids, source_shape_valid = hist.frozen_source_items(case.evidence_event_ids)
    role_map = case.evidence_role_by_event_id
    role_shape_valid = role_map is None or isinstance(role_map, dict)
    # The *case* source and the *follow-up* source are independent. Preserve
    # historical owner reviews, but never mislabel a withdrawn follow-up as a
    # completed observation cycle.
    state = case.state if current else "INVALIDATED"
    if current and case.state == "FOLLOW_UP" and follow_up_source_valid is False:
        state = "FOLLOW_UP_EVIDENCE_INVALIDATED"
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
        "evidence_role_by_event_id": role_map if isinstance(role_map, dict) else None,
        "evidence_role_source": (
            "FROZEN_AT_CREATION" if case.evidence_role_by_event_id is not None
            else "LEGACY_DATE_DERIVED"
        ),
        "source_scope": case.source_scope,
        "uncertainty": case.uncertainty,
        "human_question": case.human_question,
        "recorded_state": case.state,
        "state": state,
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
    return {
        "review_id": str(row.id), "case_id": str(row.case_id),
        "pet_id": str(row.pet_id), "actor_id": str(row.actor_id),
        "reviewed_at": row.reviewed_at.isoformat(), "decision": row.decision,
        "note": row.note if owner_view else "",
        "related_event_ids": row.related_event_ids,
        "related_task_id": (
            str(row.related_task_id) if owner_view and row.related_task_id else None
        ),
        "prior_review_id": str(row.prior_review_id) if row.prior_review_id else None,
    }


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
        last_observation = (await db.execute(
            select(LifeChangeReview).where(
                LifeChangeReview.case_id == existing.id,
                LifeChangeReview.decision == "RECORD_OBSERVATION",
            ).order_by(
                LifeChangeReview.reviewed_at.desc(),
                LifeChangeReview.id.desc(),
            ).limit(1)
        )).scalar_one_or_none()
        followup_valid = (
            await _follow_up_current(db, existing, last_observation)
            if last_observation else None
        )
        return {
            **_case_response(
                existing, await _case_current(db, existing),
                follow_up_source_valid=followup_valid,
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
    # One bounded query for the latest accepted observation for each case.
    # A later "follow up later" message does not make a withdrawn previously
    # accepted observation valid again.
    observation_by_case: dict[uuid.UUID, LifeChangeReview] = {}
    if rows:
        reviews = list((await db.execute(
            select(LifeChangeReview).where(
                LifeChangeReview.case_id.in_([case.id for case in rows]),
                LifeChangeReview.decision == "RECORD_OBSERVATION",
            ).order_by(
                LifeChangeReview.reviewed_at.desc(),
                LifeChangeReview.id.desc(),
            )
        )).scalars().all())
        for review in reviews:
            observation_by_case.setdefault(review.case_id, review)
    responses = []
    for case in rows:
        accepted = observation_by_case.get(case.id)
        followup_valid = (
            await _follow_up_current(db, case, accepted) if accepted else None
        )
        responses.append(_case_response(
            case, await _case_current(db, case),
            follow_up_source_valid=followup_valid,
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
    case_current = await _case_current(db, case)
    return {
        **_case_response(
            case, case_current,
            follow_up_source_valid=followup_valid,
        ),
        "reviews": review_payloads,
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
        if not await _evidence_current(db, pet.id, related_ids, METRICS[case.metric]):
            raise ValidationFailed("Related observation must be a current sourced event from this pet and metric.")
        related_rows = list((await db.execute(
            select(LifeEvent).where(LifeEvent.pet_id == pet.id, LifeEvent.id.in_(body.related_event_ids))
        )).scalars().all())
        # The frozen comparison clock defines the old baseline; created_at
        # defines when a real owner-followup loop first became possible.
        # Both recording and occurrence must be later than Case creation.
        if any(e.recorded_at <= case.created_at for e in related_rows):
            raise ValidationFailed("Follow-up must be recorded after Case creation.")
        if any(e.occurred_at <= case.created_at for e in related_rows):
            raise ValidationFailed("Backfilled past events are history, not follow-up observations.")
        if any(e.occurred_at > datetime.now(UTC) for e in related_rows):
            raise ValidationFailed("Future-dated events cannot be follow-up observations.")
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
