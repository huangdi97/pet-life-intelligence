"""Health events: open with intake, dynamic follow-up questions (rule-first,
AI-assisted), answers, observations, triage, vet brief + share link,
outcomes (PLI-049..056, PLI-063).

The bootstrap /health /ready endpoints previously defined in this file were
moved to app/api/routes/system.py (superseded 2026-09-13, content preserved
in git history).
"""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import NotFound, ValidationFailed
from app.core.security import new_share_token
from app.domain import enums
from app.models import (
    ClinicalIntakeStep,
    HealthEvent,
    Observation,
    Outcome,
    ShareToken,
    TriageAssessment,
    VetBrief,
)
from app.services import health as health_svc
from app.services import permissions as perm
from app.services.ai_gateway import get_gateway
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["health"])

_GATEWAY = get_gateway()

INTAKE_QUESTIONS = [
    {"id": "onset_detail", "question": "最早什么时候发现？持续多久了？"},
    {"id": "appetite", "question": "吃饭喝水与平时相比有何变化？"},
    {"id": "elimination", "question": "排尿排便有无异常？"},
    {"id": "activity", "question": "精神与活动量如何？"},
    {"id": "medication", "question": "目前或最近用过的药物？"},
]


class HealthEventCreate(BaseModel):
    """GOAL 7.4 schema safety: decision fields (diagnosis / triage_override /
    emergency_override / treatment_order) can never enter through this
    payload — unknown fields are rejected outright."""

    model_config = {"extra": "forbid"}

    chief_complaint: str = Field(min_length=1)
    onset_at: datetime | None = None
    duration_text: str = ""
    eating: str = "UNKNOWN"
    drinking: str = "UNKNOWN"
    elimination: str = "UNKNOWN"
    activity: str = "UNKNOWN"
    current_meds_text: str = ""
    relevant_history_text: str = ""
    owner_notes: str = ""
    artifact_ids: list[uuid.UUID] = Field(default_factory=list)


class AnswersIn(BaseModel):
    answers: list[dict] = Field(min_length=1)


class ObservationsIn(BaseModel):
    texts: list[str] = Field(min_length=1)
    use_ai: bool = True


class TriageIn(BaseModel):
    note: str = ""


class ShareIn(BaseModel):
    expires_in_hours: int = Field(default=72, ge=1, le=24 * 14)


class OutcomeIn(BaseModel):
    outcome: str
    notes: str = ""


@router.post("/pets/{pet_id}/health-events", status_code=201)
async def open_health_event(
    pet_id: uuid.UUID, body: HealthEventCreate, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_WRITE)

    he = HealthEvent(
        pet_id=pet.id,
        chief_complaint=body.chief_complaint,
        onset_at=body.onset_at,
        duration_text=body.duration_text,
        eating=body.eating,
        drinking=body.drinking,
        elimination=body.elimination,
        activity=body.activity,
        current_meds_text=body.current_meds_text,
        relevant_history_text=body.relevant_history_text,
        owner_notes=body.owner_notes,
        opened_by_user_id=user.id,
    )
    db.add(he)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="health.event_opened",
        payload={"health_event_id": str(he.id), "chief_complaint": he.chief_complaint},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
        source_ref=f"health_event:{he.id}",
    )
    # Rule engine triage runs immediately on opening — rules first.
    assessment = await health_svc.run_rule_triage(db, he, pet, user.id)
    await write_audit(db, action="health_event.open", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="HealthEvent", resource_id=str(he.id))
    await db.commit()
    return {
        "health_event_id": str(he.id),
        "status": he.status,
        "chief_complaint": he.chief_complaint,
        "triage": {"level": assessment.level,
                   "engine": assessment.engine,
                   "matched_rules": [r["rule_id"] for r in (assessment.matched_rules or [])]},
        "intake_questions": INTAKE_QUESTIONS,
    }


@router.get("/pets/{pet_id}/health-events")
async def list_health_events(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser, limit: int = 50
) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_READ)
    rows = (
        await db.execute(
            select(HealthEvent).where(HealthEvent.pet_id == pet.id)
            .order_by(HealthEvent.created_at.desc()).limit(limit)
        )
    ).scalars().all()
    return [
        {
            "health_event_id": str(h.id), "status": h.status,
            "chief_complaint": h.chief_complaint,
            "latest_triage_level": h.latest_triage_level,
            "opened_at": h.created_at.isoformat(),
            "closed_at": h.closed_at.isoformat() if h.closed_at else None,
        }
        for h in rows
    ]


async def _get_health_event(db, health_event_id, user, capability):
    he = (
        await db.execute(select(HealthEvent).where(HealthEvent.id == health_event_id))
    ).scalar_one_or_none()
    if he is None:
        raise NotFound(f"Health event {health_event_id} not found.")
    pet = await perm.get_pet_or_404(db, he.pet_id)
    await perm.require_capability(db, pet, user.id, capability)
    return he, pet


@router.get("/health-events/{health_event_id}")
async def get_health_event(
    health_event_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> dict:
    he, pet = await _get_health_event(db, health_event_id, user, enums.Capability.MEDICAL_READ)
    triage_rows = (
        await db.execute(
            select(TriageAssessment).where(TriageAssessment.health_event_id == he.id)
            .order_by(TriageAssessment.created_at)
        )
    ).scalars().all()
    obs_rows = (
        await db.execute(
            select(Observation).where(Observation.health_event_id == he.id)
            .order_by(Observation.created_at)
        )
    ).scalars().all()
    steps = (
        await db.execute(
            select(ClinicalIntakeStep).where(ClinicalIntakeStep.health_event_id == he.id)
            .order_by(ClinicalIntakeStep.created_at)
        )
    ).scalars().all()
    briefs = (
        await db.execute(select(VetBrief).where(VetBrief.health_event_id == he.id))
    ).scalars().all()
    outcomes = (
        await db.execute(select(Outcome).where(Outcome.health_event_id == he.id))
    ).scalars().all()
    return {
        "health_event_id": str(he.id),
        "pet_id": str(pet.id),
        "status": he.status,
        "chief_complaint": he.chief_complaint,
        "onset_at": he.onset_at.isoformat() if he.onset_at else None,
        "eating": he.eating, "drinking": he.drinking,
        "elimination": he.elimination, "activity": he.activity,
        "current_meds_text": he.current_meds_text,
        "relevant_history_text": he.relevant_history_text,
        "owner_notes": he.owner_notes,
        "latest_triage_level": he.latest_triage_level,
        "triage_history": [
            {"id": str(t.id), "level": t.level, "engine": t.engine,
             "matched_rules": t.matched_rules, "version": t.rule_engine_version,
             "assessed_at": t.created_at.isoformat()}
            for t in triage_rows
        ],
        "observations": [
            {"id": str(o.id), "kind": o.kind, "text": o.text,
             "created_at": o.created_at.isoformat()}
            for o in obs_rows
        ],
        "intake_steps": [
            {"question_id": s.question_id, "question_text": s.question_text,
             "answer_text": s.answer_text, "asked_by": s.asked_by}
            for s in steps
        ],
        "vet_briefs": [str(b.id) for b in briefs],
        "outcomes": [
            {"outcome": o.outcome, "notes": o.notes, "recorded_at": o.created_at.isoformat()}
            for o in outcomes
        ],
    }


@router.post("/health-events/{health_event_id}/questions")
async def generate_questions(
    health_event_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> dict:
    """Dynamic follow-up: deterministic template first, AI mock refines.
    Questions only — never conclusions (GOAL §11.2)."""
    he, pet = await _get_health_event(db, health_event_id, user, enums.Capability.MEDICAL_WRITE)
    asked = (
        await db.execute(
            select(ClinicalIntakeStep).where(
                ClinicalIntakeStep.health_event_id == he.id
            )
        )
    ).scalars().all()
    asked_ids = {s.question_id for s in asked}

    base = [q for q in INTAKE_QUESTIONS if q["id"] not in asked_ids]
    if base or not asked_ids:
        result = _GATEWAY.invoke(
            "intake_questions",
            {"species": pet.species, "chief_complaint": he.chief_complaint},
        )
        await health_svc.log_ai_inference(
            db, result, pet_id=pet.id, actor_id=user.id,
            input_summary=he.chief_complaint[:300],
            output_summary=f"{len(result.result['questions'])} questions",
        )
        for q in result.result["questions"]:
            if q["id"] in asked_ids or q["id"] in {x["id"] for x in base}:
                continue
            db.add(
                ClinicalIntakeStep(
                    health_event_id=he.id, question_id=q["id"],
                    question_text=q["question"], asked_by="AI",
                    answer_text="",
                )
            )
    for q in base:
        db.add(
            ClinicalIntakeStep(
                health_event_id=he.id, question_id=q["id"],
                question_text=q["question"], asked_by="RULE", answer_text="",
            )
        )
    await db.flush()
    steps = (
        await db.execute(
            select(ClinicalIntakeStep).where(ClinicalIntakeStep.health_event_id == he.id)
            .order_by(ClinicalIntakeStep.created_at)
        )
    ).scalars().all()
    await db.commit()
    return {
        "questions": [
            {"question_id": s.question_id, "question_text": s.question_text,
             "asked_by": s.asked_by, "answered": bool(s.answer_text)}
            for s in steps
            if not s.answer_text
        ]
    }


@router.post("/health-events/{health_event_id}/answers")
async def submit_answers(
    health_event_id: uuid.UUID, body: AnswersIn, db: DBSession, user: CurrentUser
) -> dict:
    he, pet = await _get_health_event(db, health_event_id, user, enums.Capability.MEDICAL_WRITE)
    answered: list[str] = []
    for a in body.answers:
        question_id = str(a.get("question_id", ""))
        answer = str(a.get("answer", ""))
        if not question_id or not answer:
            raise ValidationFailed("Each answer needs question_id and answer.")
        step = (
            await db.execute(
                select(ClinicalIntakeStep).where(
                    ClinicalIntakeStep.health_event_id == he.id,
                    ClinicalIntakeStep.question_id == question_id,
                )
            )
        ).scalar_one_or_none()
        if step is None:
            db.add(
                ClinicalIntakeStep(
                    health_event_id=he.id, question_id=question_id,
                    question_text=question_id, asked_by="RULE",
                    answered_by_user_id=user.id, answer_text=answer,
                )
            )
        else:
            step.answer_text = answer
            step.answered_by_user_id = user.id
        answered.append(answer)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="health.intake_step",
        payload={"health_event_id": str(he.id),
                 "question_id": str(body.answers[0].get("question_id", "")),
                 "asked_by": "RULE", "answered": True},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
        allow_duplicate=True,
    )
    # rules re-run over new answers — level never lower than previous
    assessment = await health_svc.run_rule_triage(
        db, he, pet, user.id, extra_texts=answered, note="after intake answers"
    )
    await db.commit()
    return {
        "answered": len(body.answers),
        "triage": {"level": assessment.level, "engine": assessment.engine,
                   "matched_rules": [r["rule_id"] for r in (assessment.matched_rules or [])]},
    }


@router.post("/health-events/{health_event_id}/observations")
async def add_observations(
    health_event_id: uuid.UUID, body: ObservationsIn, db: DBSession, user: CurrentUser
) -> dict:
    he, pet = await _get_health_event(db, health_event_id, user, enums.Capability.MEDICAL_WRITE)
    created: list[Observation] = []
    for text in body.texts:
        o = Observation(
            health_event_id=he.id,
            kind=enums.ObservationKind.OWNER_STATEMENT.value,
            text=text, created_by_user_id=user.id,
        )
        db.add(o)
        created.append(o)
    await db.flush()
    ai_observations: list[str] = []
    if body.use_ai:
        ai_rows = await health_svc.add_ai_observations(
            db, he, pet, user.id, texts=body.texts
        )
        ai_observations = [o.text for o in ai_rows]
    await write_audit(db, action="observation.add", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="HealthEvent", resource_id=str(he.id))
    await db.commit()
    return {
        "owner_observations": [str(o.id) for o in created],
        "ai_observations": ai_observations,
        "latest_triage_level": he.latest_triage_level,
    }


@router.post("/health-events/{health_event_id}/triage")
async def retriage(health_event_id: uuid.UUID, body: TriageIn,
                   db: DBSession, user: CurrentUser) -> dict:
    """Re-triage is rule-engine only; AI output can never lower the level."""
    he, pet = await _get_health_event(db, health_event_id, user, enums.Capability.MEDICAL_WRITE)
    assessment = await health_svc.run_rule_triage(db, he, pet, user.id,
                                                  note=body.note or "manual re-run")
    await db.commit()
    return {"level": assessment.level, "engine": assessment.engine,
            "matched_rules": [r["rule_id"] for r in (assessment.matched_rules or [])],
            "note": "Automatic re-triage is rule-engine only; level never decreases."}


@router.post("/health-events/{health_event_id}/vet-brief", status_code=201)
async def create_vet_brief(
    health_event_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> dict:
    he, pet = await _get_health_event(db, health_event_id, user, enums.Capability.MEDICAL_WRITE)
    brief = await health_svc.generate_vet_brief(db, he, pet, user.id)
    await write_audit(db, action="vet_brief.generate", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="VetBrief", resource_id=str(brief.id))
    await db.commit()
    return {"vet_brief_id": str(brief.id), "content": brief.content}


@router.post("/vet-briefs/{vet_brief_id}/share", status_code=201)
async def share_vet_brief(
    vet_brief_id: uuid.UUID, body: ShareIn, db: DBSession, user: CurrentUser
) -> dict:
    brief = (
        await db.execute(select(VetBrief).where(VetBrief.id == vet_brief_id))
    ).scalar_one_or_none()
    if brief is None or brief.retracted_at is not None:
        raise NotFound("Vet brief not found.")
    pet = await perm.get_pet_or_404(db, brief.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_WRITE)
    raw, token_hash, prefix = new_share_token()
    expires = datetime.now(UTC) + timedelta(hours=body.expires_in_hours)
    st = ShareToken(
        pet_id=pet.id, resource_type=enums.ShareResourceType.VET_BRIEF.value,
        resource_id=brief.id, token_hash=token_hash, token_prefix=prefix,
        expires_at=expires, created_by_user_id=user.id,
    )
    db.add(st)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="health.vet_brief_shared",
        payload={"health_event_id": str(brief.health_event_id),
                 "vet_brief_id": str(brief.id), "token_prefix": prefix,
                 "expires_at": expires.isoformat()},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await write_audit(db, action="vet_brief.share", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="ShareToken", resource_id=str(st.id))
    await db.commit()
    return {"share_token": raw, "token_prefix": prefix, "expires_at": expires.isoformat()}


@router.get("/vet-briefs/shared/{token}")
async def view_shared_vet_brief(token: str, db: DBSession) -> dict:
    from app.core.security import hash_share_token

    st = (
        await db.execute(
            select(ShareToken).where(
                ShareToken.token_hash == hash_share_token(token),
                ShareToken.resource_type == enums.ShareResourceType.VET_BRIEF.value,
            )
        )
    ).scalar_one_or_none()
    if st is None:
        raise NotFound("Share link not found.")
    now = datetime.now(UTC)
    if st.revoked_at is not None or st.expires_at <= now:
        raise NotFound("Share link expired or revoked.")
    brief = (
        await db.execute(select(VetBrief).where(VetBrief.id == st.resource_id))
    ).scalar_one_or_none()
    if brief is None or brief.retracted_at is not None:
        raise NotFound("Vet brief not available.")
    st.access_count += 1
    st.last_accessed_at = now
    await db.flush()
    await write_audit(db, action="vet_brief.view", actor_user_id=None,
                      pet_id=st.pet_id, resource_type="VetBrief",
                      resource_id=str(brief.id))
    await db.commit()
    return {"vet_brief_id": str(brief.id), "content": brief.content}


@router.post("/health-events/{health_event_id}/outcomes", status_code=201)
async def record_outcome(
    health_event_id: uuid.UUID, body: OutcomeIn, db: DBSession, user: CurrentUser
) -> dict:
    he, pet = await _get_health_event(db, health_event_id, user, enums.Capability.MEDICAL_WRITE)
    if body.outcome not in [o.value for o in enums.OutcomeValue]:
        raise ValidationFailed(
            f"outcome must be one of {[o.value for o in enums.OutcomeValue]}"
        )
    outcome = Outcome(
        pet_id=pet.id, health_event_id=he.id, outcome=body.outcome,
        notes=body.notes, recorded_by_user_id=user.id,
    )
    db.add(outcome)
    he.status = enums.HealthEventStatus.CLOSED.value
    he.closed_at = datetime.now(UTC)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="health.outcome_recorded",
        payload={"health_event_id": str(he.id), "outcome_id": str(outcome.id),
                 "outcome": body.outcome},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await write_audit(db, action="outcome.record", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="Outcome", resource_id=str(outcome.id))
    await db.commit()
    return {"outcome_id": str(outcome.id), "outcome": body.outcome,
            "health_event_status": he.status}
