"""Health intake: open health events, list, detail, dynamic follow-up
questions, submit answers (PLI-049..056).

Pure refactor of app/api/routes/health.py; endpoint bodies kept verbatim.
"""

import uuid

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.api.routes.health_common import (
    INTAKE_QUESTIONS,
    AnswersIn,
    HealthEventCreate,
    get_health_event_for_user,
)
from app.core.errors import ValidationFailed
from app.domain import enums
from app.models import (
    ClinicalIntakeStep,
    HealthEvent,
    Observation,
    Outcome,
    TriageAssessment,
    VetBrief,
)
from app.services import health as health_svc
from app.services import permissions as perm
from app.services.ai_gateway import get_gateway
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["health"])

_GATEWAY = get_gateway()


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


@router.get("/health-events/{health_event_id}")
async def get_health_event(
    health_event_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> dict:
    he, pet = await get_health_event_for_user(
        db, health_event_id, user, enums.Capability.MEDICAL_READ
    )
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
    he, pet = await get_health_event_for_user(
        db, health_event_id, user, enums.Capability.MEDICAL_WRITE
    )
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
    he, pet = await get_health_event_for_user(
        db, health_event_id, user, enums.Capability.MEDICAL_WRITE
    )
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
