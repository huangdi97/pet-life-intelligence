"""R8CB: deterministic "why does this day look different now?" projection.

Bitemporal replay already exposes `as_known_then` next to `verified_now`, but an
owner should not have to eyeball two screens to find the difference. This module
derives that difference from the same append-only journal the replay reads.

Hard boundaries (INVARIANT):
- every item comes from recorded timestamps and owner actions — never an LLM;
- a *knowledge* delta is not a *health* delta: no recovery / deterioration /
  normality / risk claim is produced here;
- private owner notes (Review/Outcome `note`) are never copied into the delta;
- nothing here writes: replay history stays read-only.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select

from app.models import LifeChangeOutcome, LifeChangeReview
from app.services import life_change_workflow as workflow
from app.services.life_replay import project_life_replay
from app.services.life_replay_sources import (
    load_day_replay_candidates,
    load_owner_cases_for_day,
)

LATE_RECORDED_EVENT = "LATE_RECORDED_EVENT"
SOURCE_RETRACTED_LATER = "SOURCE_RETRACTED_LATER"
SOURCE_SUPERSEDED_LATER = "SOURCE_SUPERSEDED_LATER"
REVIEW_ADDED_LATER = "REVIEW_ADDED_LATER"
OUTCOME_ADDED_LATER = "OUTCOME_ADDED_LATER"
WORKFLOW_CHANGED_LATER = "WORKFLOW_CHANGED_LATER"
CASE_BECAME_INVALID_LATER = "CASE_BECAME_INVALID_LATER"
FOLLOWUP_BECAME_INVALID_LATER = "FOLLOWUP_BECAME_INVALID_LATER"

# Owner-readable, non-diagnostic copy. These sentences describe records and
# owner decisions only, never the animal's condition.
DELTA_REASONS = {
    LATE_RECORDED_EVENT: "这条记录是在当天之后补录的",
    SOURCE_RETRACTED_LATER: "后来这条来源被主人撤回",
    SOURCE_SUPERSEDED_LATER: "后来主人提交了一条修正记录",
    REVIEW_ADDED_LATER: "主人后来追加了一次核对",
    OUTCOME_ADDED_LATER: "主人后来基于新的真实观察记录了结果",
    WORKFLOW_CHANGED_LATER: "主人后来更新了这条关注的处理方式",
    CASE_BECAME_INVALID_LATER: "作为这条关注依据的原始记录后来被撤回",
    FOLLOWUP_BECAME_INVALID_LATER: "后来作为该结果依据的记录被撤回",
}

EVENT_DELTA_KINDS = frozenset({
    LATE_RECORDED_EVENT, SOURCE_RETRACTED_LATER, SOURCE_SUPERSEDED_LATER,
})
WORKFLOW_DELTA_KINDS = frozenset({
    REVIEW_ADDED_LATER, OUTCOME_ADDED_LATER, WORKFLOW_CHANGED_LATER,
    CASE_BECAME_INVALID_LATER, FOLLOWUP_BECAME_INVALID_LATER,
})

TRUTH_NOTE = "这些变化只说明记录和主人核对后来发生了什么，不代表宠物健康状态改变。"


def _aware(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def _iso(value: datetime | None) -> str | None:
    return _aware(value).isoformat() if value is not None else None


def _item(kind: str, changed_at: datetime, *, extra: dict | None = None, **refs) -> dict:
    """One journal-derived delta row. Unknown ids stay `None`, never empty strings."""
    payload = {"kind": kind, "reason": DELTA_REASONS[kind], "changed_at": _iso(changed_at)}
    for key in ("occurred_at", "recorded_at"):
        payload[key] = _iso(refs.get(key))
    for key in ("case_id", "event_id", "review_id", "outcome_id"):
        value = refs.get(key)
        payload[key] = str(value) if value is not None else None
    if extra:
        payload.update(extra)
    return payload


def _event_delta_items(
    candidates,
    *,
    pet_id: uuid.UUID,
    start: datetime,
    end: datetime,
    historical_cutoff: datetime,
    current_cutoff: datetime,
) -> list[dict]:
    """Diff the day's event set between "known at day end" and "known now"."""
    def ids_at(cutoff: datetime) -> set:
        return {
            row.id for row in project_life_replay(
                candidates, pet_id=pet_id, day_start=start, day_end=end,
                knowledge_cutoff=cutoff,
            ).events
        }

    then_ids, now_ids = ids_at(historical_cutoff), ids_at(current_cutoff)
    by_id = {row.id: row for row in candidates}
    successors = {
        row.supersedes_event_id: row for row in candidates
        if row.supersedes_event_id is not None
        and _aware(row.recorded_at) >= historical_cutoff
    }

    items: list[dict] = []
    for event_id in sorted(now_ids - then_ids, key=str):
        event = by_id[event_id]
        if _aware(event.recorded_at) < historical_cutoff:
            # Already knowable at the day's end: the day's own view did not change.
            continue
        items.append(_item(
            LATE_RECORDED_EVENT, event.recorded_at,
            occurred_at=event.occurred_at, recorded_at=event.recorded_at, event_id=event.id,
        ))
    for event_id in sorted(then_ids - now_ids, key=str):
        event = by_id[event_id]
        successor = successors.get(event_id)
        if successor is not None:
            items.append(_item(
                SOURCE_SUPERSEDED_LATER, successor.recorded_at,
                occurred_at=event.occurred_at, recorded_at=event.recorded_at,
                event_id=event.id,
            ))
        elif event.retracted_at is not None and _aware(event.retracted_at) >= historical_cutoff:
            items.append(_item(
                SOURCE_RETRACTED_LATER, event.retracted_at,
                occurred_at=event.occurred_at, recorded_at=event.recorded_at,
                event_id=event.id,
            ))
    return items


async def _owner_rows_after(
    db, model, time_column, case_ids, *, historical_cutoff: datetime, current_cutoff: datetime,
) -> list:
    """Append-only journal rows written after the day ended.

    Row bodies are used for ids/timestamps only; `note` content never leaves
    this boundary.
    """
    return list((await db.execute(
        select(model).where(
            model.case_id.in_(case_ids),
            time_column >= historical_cutoff,
            time_column < current_cutoff,
        ).order_by(time_column.asc(), model.id.asc())
    )).scalars().all())


async def _workflow_delta_items(
    db,
    *,
    pet_id: uuid.UUID,
    start: datetime,
    end: datetime,
    historical_cutoff: datetime,
    current_cutoff: datetime,
    workflows_now: dict[str, dict],
) -> list[dict]:
    cases = await load_owner_cases_for_day(db, pet_id, start, end, current_cutoff)
    case_ids = [case.id for case in cases if _aware(case.created_at) < historical_cutoff]
    if not case_ids:
        return []
    reviews = await _owner_rows_after(
        db, LifeChangeReview, LifeChangeReview.reviewed_at, case_ids,
        historical_cutoff=historical_cutoff, current_cutoff=current_cutoff,
    )
    outcomes = await _owner_rows_after(
        db, LifeChangeOutcome, LifeChangeOutcome.recorded_at, case_ids,
        historical_cutoff=historical_cutoff, current_cutoff=current_cutoff,
    )

    items: list[dict] = []
    for case in cases:
        if _aware(case.created_at) >= historical_cutoff:
            # The Case did not exist at that day's end and R8CA hides it in that
            # perspective too, so it cannot explain a same-day difference.
            continue
        then_projection = await workflow.project_case_workflow_at(
            db, case=case, cutoff=historical_cutoff,
        )
        if not then_projection.get("case_known_at_cutoff"):
            continue
        now_projection = workflows_now.get(str(case.id)) or (
            await workflow.project_case_workflow_at(db, case=case, cutoff=current_cutoff)
        )

        explained = False
        for review in (row for row in reviews if row.case_id == case.id):
            items.append(_item(
                REVIEW_ADDED_LATER, review.reviewed_at,
                recorded_at=review.reviewed_at, case_id=case.id, review_id=review.id,
            ))
            explained = True
        for outcome in (row for row in outcomes if row.case_id == case.id):
            items.append(_item(
                OUTCOME_ADDED_LATER, outcome.recorded_at, recorded_at=outcome.recorded_at,
                case_id=case.id, outcome_id=outcome.id,
                extra={"assessment": outcome.assessment},
            ))
            explained = True
        if then_projection.get("source_valid") is True and (
            now_projection.get("source_valid") is False
        ):
            items.append(_item(CASE_BECAME_INVALID_LATER, current_cutoff, case_id=case.id))
            explained = True
        if then_projection.get("follow_up_source_valid") is True and (
            now_projection.get("follow_up_source_valid") is False
        ):
            items.append(_item(FOLLOWUP_BECAME_INVALID_LATER, current_cutoff, case_id=case.id))
            explained = True
        if not explained and (
            then_projection.get("owner_workflow_state")
            != now_projection.get("owner_workflow_state")
        ):
            items.append(_item(
                WORKFLOW_CHANGED_LATER, current_cutoff, case_id=case.id,
                extra={
                    "workflow_state_then": then_projection.get("owner_workflow_state"),
                    "workflow_state_now": now_projection.get("owner_workflow_state"),
                },
            ))
    return items


def _sort_key(row: dict) -> tuple:
    anchor = (
        row["event_id"] or row["case_id"]
        or row["review_id"] or row["outcome_id"] or ""
    )
    return (row["changed_at"] or "", row["kind"], anchor)


async def build_day_knowledge_delta(
    db,
    *,
    pet_id: uuid.UUID,
    start: datetime,
    end: datetime,
    capabilities: set[str],
    historical_cutoff: datetime | None = None,
    workflows_now: dict[str, dict] | None = None,
) -> dict:
    """Explain what became knowable after the selected day ended.

    `historical_cutoff` defaults to that day's end (what the owner could know
    then) and `current_cutoff` is now, so a day that is still running reports no
    delta: nothing has "later" happened yet. An explicit cutoff is accepted for
    auditing/verification and must be a real instant no later than now.
    """
    current_cutoff = datetime.now(UTC)
    historical_cutoff = min(_aware(historical_cutoff or end), current_cutoff)
    candidates = await load_day_replay_candidates(
        db, pet_id, start, end, current_cutoff, capabilities=capabilities,
    )
    items = _event_delta_items(
        candidates, pet_id=pet_id, start=start, end=end,
        historical_cutoff=historical_cutoff, current_cutoff=current_cutoff,
    )
    items.extend(await _workflow_delta_items(
        db, pet_id=pet_id, start=start, end=end,
        historical_cutoff=historical_cutoff, current_cutoff=current_cutoff,
        workflows_now=workflows_now or {},
    ))
    items.sort(key=_sort_key)
    return {
        "changed": bool(items),
        "items": items,
        "event_delta_count": sum(1 for row in items if row["kind"] in EVENT_DELTA_KINDS),
        "owner_workflow_delta_count": sum(
            1 for row in items if row["kind"] in WORKFLOW_DELTA_KINDS
        ),
        "historical_cutoff": historical_cutoff.isoformat(),
        "current_cutoff": current_cutoff.isoformat(),
        "truth_note": TRUTH_NOTE,
        "derived_from": "APPEND_ONLY_JOURNAL",
        "model_status": "DETERMINISTIC_NO_LLM_NO_HEALTH_INFERENCE",
    }
