"""R8AK bounded source detail for an owner-reviewed LifeChangeCase.

SECURITY: a Case ID or an event ID inside it is not a capability. Every event
is re-read through the same pet membership and medical-read boundary as
``GET /events/{id}``. The endpoint never widens visibility because a source is
referenced by a Case.

PROVENANCE: the frozen CASE_EVIDENCE role map is returned as stored; a legacy
Case stays ``LEGACY_DATE_DERIVED`` and is never retroactively reclassified.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.api.routes.events import MEDICAL_EVENT_TYPES, _actor_names_map, _serialize
from app.api.routes.life_changes import METRICS
from app.core.errors import NotFound, PermissionDenied, ValidationFailed
from app.domain import enums
from app.models import LifeChangeCase, LifeChangeReview, LifeEvent, User
from app.services import life_change_history as history
from app.services import permissions as perm
from app.services.life_replay import RECORD_FACT_SOURCES

router = APIRouter(tags=["life-intelligence"])

MAX_CASE_SOURCES = 200


async def _pet_scoped_case(db, pet_id: uuid.UUID, case_id: uuid.UUID) -> LifeChangeCase:
    case = (await db.execute(select(LifeChangeCase).where(
        LifeChangeCase.id == case_id, LifeChangeCase.pet_id == pet_id,
    ))).scalar_one_or_none()
    if case is None:
        raise NotFound("Life change case not found for this pet.")
    return case


async def _review_scope_ids(
    db, case: LifeChangeCase, review_id: uuid.UUID,
) -> tuple[list[object], bool]:
    review = (await db.execute(select(LifeChangeReview).where(
        LifeChangeReview.id == review_id, LifeChangeReview.case_id == case.id,
    ))).scalar_one_or_none()
    if review is None:
        raise NotFound("Owner review not found for this Case.")
    if review.decision != "RECORD_OBSERVATION":
        raise ValidationFailed("Only a recorded observation has follow-up sources.")
    return history.safe_review_source_ids(review.related_event_ids)


async def _successor_by_event(
    db, pet_id: uuid.UUID, ids: list[uuid.UUID],
) -> dict:
    """Map each superseded original event to the later correction event."""
    if not ids:
        return {}
    rows = (await db.execute(select(
        LifeEvent.supersedes_event_id, LifeEvent.id,
    ).where(
        LifeEvent.pet_id == pet_id,
        LifeEvent.supersedes_event_id.in_(ids),
        LifeEvent.recorded_at <= datetime.now(UTC),
    ))).all()
    return {
        original: successor
        for original, successor in rows
        if original is not None
    }


@router.get("/pets/{pet_id}/life-change-cases/{case_id}/sources")
async def list_case_sources(
    pet_id: uuid.UUID, case_id: uuid.UUID, db: DBSession, user: CurrentUser,
    review_id: uuid.UUID | None = Query(default=None),
    offset: int = Query(0, ge=0),
    limit: int = Query(8, ge=1, le=20),
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    capabilities = await perm.require_capability(
        db, pet, user.id, enums.Capability.DAILY_READ,
    )
    case = await _pet_scoped_case(db, pet.id, case_id)
    scope = "FOLLOW_UP_REVIEW" if review_id else "CASE_EVIDENCE"
    original_ids, case_shape_valid = history.frozen_source_items(case.evidence_event_ids)
    # Follow-up sources belong to the selected Review, not to the original
    # Case evidence. A corrupt Review JSONB must never inherit a green
    # "shape valid" marker from its well-formed parent Case.
    if review_id:
        ids, shape_valid = await _review_scope_ids(db, case, review_id)
    else:
        ids, shape_valid = original_ids, case_shape_valid
    if len(ids) > MAX_CASE_SOURCES:
        raise ValidationFailed(
            "This Case references more sources than one review page can safely load."
        )
    # A historical Case remains readable even when a legacy frozen source ID
    # is malformed; do not return HTTP 500 from uuid.UUID() on owner's tap.
    # Keep raw unresolved IDs in missing_event_ids for owner-visible audit.
    parsed = [history.parse_case_source_id(item) for item in ids]
    known_ids = list({item for item in parsed if item is not None})
    rows = list((await db.execute(select(LifeEvent).where(
        LifeEvent.pet_id == pet.id, LifeEvent.id.in_(known_ids),
    ))).scalars().all()) if known_ids else []
    medical_visible = enums.Capability.MEDICAL_READ.value in capabilities
    if any(e.event_type in MEDICAL_EVENT_TYPES for e in rows) and not medical_visible:
        raise PermissionDenied("Medical event requires medical:read.")
    actors = {}
    if rows:
        user_ids = {event.actor_id for event in rows}
        users = list((await db.execute(select(User).where(User.id.in_(user_ids)))).scalars().all())
        actors = _actor_names_map(users)
    superseded_by = await _successor_by_event(db, pet.id, [e.id for e in rows])
    by_id = {str(event.id): event for event in rows}
    ordered = sorted(
        (event for event in rows),
        key=lambda event: (event.occurred_at, str(event.id)),
        reverse=True,
    )
    total = len(ordered)
    window = ordered[offset:offset + limit]
    serialized = {item["event_id"]: item for item in _serialize(window, actors)}
    # The original Case comparison owns its frozen CURRENT/HISTORICAL role
    # partition. A later observation Review has a distinct evidence container
    # and does NOT inherit the Case's role map or integrity status. Otherwise
    # corrupted old comparison roles can falsely taint a healthy follow-up,
    # and reused event IDs can be mislabelled as original comparison evidence.
    if review_id is None:
        role_map, role_integrity_valid = history.validated_frozen_roles(
            case.evidence_event_ids, case.evidence_role_by_event_id,
        )
        normalized_roles = {
            uuid.UUID(source_id): role
            for source_id, role in (role_map or {}).items()
        }
    else:
        normalized_roles = {}
        role_integrity_valid = None
    # A currently valid source event is not automatically a legitimate
    # *follow-up*: the owner Review must cite a new observation, not recycle
    # an original comparison event or backfill the period before the Case.
    # Never overwrite the `parsed` list used in missing_event_ids below.
    # Assignment expressions in a comprehension bind in the containing scope,
    # so a prior "parsed := UUID(...)" left a UUID where a list was required.
    original_case_ids = {
        source_id
        for source_id in (
            history.parse_case_source_id(item) for item in original_ids
        )
        if source_id is not None
    }
    now = datetime.now(UTC)
    sources = []
    for event in window:
        payload = serialized[str(event.id)]
        payload["role"] = normalized_roles.get(event.id)
        payload["role_source"] = (
            "FOLLOW_UP_OBSERVATION" if review_id is not None else
            "FROZEN_AT_CREATION" if case.evidence_role_by_event_id is not None
            else "LEGACY_DATE_DERIVED"
        )
        payload["scope"] = scope
        # The owner's source-detail badge must mean the same as a source
        # eligible for this Case: metric, provenance and current validity.
        # Retracted/corrected alone is insufficient for a legacy wrong-metric
        # or synthetic/AI-sourced row. Detail/list already reject those.
        if event.retracted_at is not None:
            reason = "RETRACTED"
        elif event.id in superseded_by:
            reason = "SUPERSEDED"
        elif event.event_type != METRICS.get(case.metric):
            reason = "WRONG_METRIC"
        elif event.source_type not in RECORD_FACT_SOURCES:
            reason = "NON_FACT_SOURCE"
        elif review_id is not None and event.id in original_case_ids:
            reason = "REUSED_CASE_EVIDENCE"
        elif event.occurred_at > now or event.recorded_at > now:
            reason = "FUTURE_OBSERVATION"
        elif review_id is not None and (
            event.recorded_at <= case.created_at
            or event.occurred_at <= case.created_at
        ):
            reason = "NOT_AFTER_CASE"
        else:
            reason = "VALID"
        payload["validity_reason"] = reason
        payload["valid"] = reason == "VALID"
        payload["superseded_by_event_id"] = (
            str(superseded_by[event.id]) if event.id in superseded_by else None
        )
        sources.append(payload)
    next_offset = offset + len(sources)
    return {
        "case_id": str(case.id), "pet_id": str(case.pet_id), "scope": scope,
        "evidence_shape_valid": shape_valid,
        "evidence_role_shape_valid": role_integrity_valid,
        "review_id": str(review_id) if review_id else None,
        "sources": sources, "total": total, "offset": offset, "limit": limit,
        "has_more": next_offset < total, "next_offset": next_offset if next_offset < total else None,
        "missing_event_ids": [
            item for item, parsed_id in zip(ids, parsed, strict=True)
            if parsed_id is None or str(parsed_id) not in by_id
        ],
    }
