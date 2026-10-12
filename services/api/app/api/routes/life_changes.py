"""R8A explicitly owner-initiated change cases and append-only reviews.

Cases are built ONLY from the existing R7 deterministic recorded-fact hint.
No autonomous medical inference, push alert, task creation, or AI owner review.
"""
import hashlib
import json
import uuid
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.api.routes.v10_extras_services import abnormal_day_hint
from app.core.errors import ConflictError, NotFound, PermissionDenied, ValidationFailed
from app.domain import enums
from app.models import CareTask, LifeChangeCase, LifeChangeReview, LifeEvent, Pet
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
    if not event_ids or len(set(event_ids)) != len(event_ids):
        return False
    ids = [uuid.UUID(item) for item in event_ids]
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


def _case_response(case: LifeChangeCase, current: bool) -> dict:
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
        "evidence_event_ids": case.evidence_event_ids,
        "source_scope": case.source_scope,
        "uncertainty": case.uncertainty,
        "human_question": case.human_question,
        "recorded_state": case.state,
        "state": case.state if current else "INVALIDATED",
        "source_valid": current,
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
    ids = sorted(set(selected["current_event_ids"] + selected["historical_event_ids"]))
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
        return {**_case_response(existing, await _case_current(db, existing)),
                "replayed": True}
    now = datetime.now(UTC)
    case = LifeChangeCase(
        pet_id=pet.id, created_by_user_id=user.id,
        metric=body.metric, insight_kind="RECORDED_CHANGE",
        algorithm_version=ALGORITHM, fingerprint=fingerprint,
        computed_at=now, knowledge_cutoff=now,
        timezone_policy="CST_UTC_PLUS_08_FALLBACK",
        current_value=float(selected["current_value"]),
        baseline_value=float(selected["same_time_baseline"]),
        sample_days=int(selected["sample_count"]),
        window_days=int(selected["window_days"]),
        evidence_event_ids=ids, source_scope="DAILY_RECORDED_EVENTS_ONLY",
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
async def list_cases(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = list((await db.execute(
        select(LifeChangeCase).where(LifeChangeCase.pet_id == pet.id)
        .order_by(LifeChangeCase.created_at.desc()).limit(50)
    )).scalars().all())
    return {"cases": [_case_response(c, await _case_current(db, c)) for c in rows]}


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
    return {**_case_response(case, await _case_current(db, case)),
            "reviews": [_review_response(r, owner_view=owner_view) for r in reviews]}


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
        if not await _evidence_current(db, pet.id, related_ids, METRICS[case.metric]):
            raise ValidationFailed("Related observation must be a current sourced event from this pet and metric.")
        related_rows = list((await db.execute(
            select(LifeEvent).where(LifeEvent.pet_id == pet.id, LifeEvent.id.in_(body.related_event_ids))
        )).scalars().all())
        # Bitemporal causality: merely ENTERING a backfilled observation
        # after opening the Case does not make the underlying event a follow-up.
        # A valid follow-up must BOTH happen and be recorded after the Case.
        if any(e.recorded_at <= case.computed_at for e in related_rows):
            raise ValidationFailed("Follow-up must be recorded after Case creation.")
        if any(e.occurred_at <= case.computed_at for e in related_rows):
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
