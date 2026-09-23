"""Vet brief generation for a health event.

Builds the vet-facing summary from the health event, observations,
rule-engine triage history and active medication plans. The AI narrative
draft is provenance-tagged AI_DERIVED (PLI-053); the brief keeps the
independent rule-engine triage level — AI never lowers it.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain import enums
from app.models import (
    HealthEvent,
    MedicationPlan,
    Observation,
    Pet,
    TriageAssessment,
    VetBrief,
)
from app.services.eventlog import create_life_event


async def generate_vet_brief(
    db: AsyncSession, he: HealthEvent, pet: Pet, actor_id: uuid.UUID
) -> VetBrief:
    # Imported at call time only: app.services.health re-exports this function,
    # so a module-level import here would create an import cycle.
    from app.services.health import _GATEWAY, _utcnow, log_ai_inference

    obs_rows = (
        await db.execute(
            select(Observation)
            .where(Observation.health_event_id == he.id)
            .order_by(Observation.created_at)
        )
    ).scalars().all()
    plans = (
        await db.execute(
            select(MedicationPlan).where(
                MedicationPlan.pet_id == pet.id,
                MedicationPlan.status == "ACTIVE",
            )
        )
    ).scalars().all()

    draft = _GATEWAY.invoke(
        "vet_brief_draft",
        {
            "chief_complaint": he.chief_complaint,
            "findings": [o.text for o in obs_rows],
        },
    )
    log = await log_ai_inference(
        db, draft, pet_id=pet.id, actor_id=actor_id,
        input_summary=he.chief_complaint[:300],
        output_summary=draft.result["narrative"][:300],
    )

    rule_assessments = (
        await db.execute(
            select(TriageAssessment)
            .where(TriageAssessment.health_event_id == he.id)
            .order_by(TriageAssessment.created_at)
        )
    ).scalars().all()

    content = {
        "pet": {
            "name": pet.name, "species": pet.species, "breed": pet.breed,
            "sex": pet.sex, "birth_date": str(pet.birth_date or ""),
            "neutered": pet.neutered, "weight_note": pet.weight_note,
        },
        "chief_complaint": he.chief_complaint,
        "onset_at": he.onset_at.isoformat() if he.onset_at else None,
        "duration_text": he.duration_text,
        "eating": he.eating,
        "drinking": he.drinking,
        "elimination": he.elimination,
        "activity": he.activity,
        "current_meds_text": he.current_meds_text,
        "relevant_history_text": he.relevant_history_text,
        "owner_notes": he.owner_notes,
        "key_findings": [
            {"kind": o.kind, "text": o.text, "observed_at": o.created_at.isoformat()}
            for o in obs_rows
        ],
        "red_flags": [
            a for a in (he.latest_triage_level and [he.latest_triage_level] or [])
        ],
        "triage_history": [
            {"level": a.level, "engine": a.engine, "version": a.rule_engine_version,
             "matched_rules": [r.get("rule_id") for r in (a.matched_rules or [])],
             "assessed_at": a.created_at.isoformat()}
            for a in rule_assessments
        ],
        "active_medications": [
            {"medicine_name": p.medicine_name, "dose_text": p.dose_text,
             "route": p.route, "frequency_text": p.frequency_text,
             "source_type": p.source_type}
            for p in plans
        ],
        "ai_narrative_draft": draft.result["narrative"],
        "ai_disclaimer": draft.result["disclaimer"],
        "engine_versions": {
            "rule_engine": rule_assessments[-1].rule_engine_version if rule_assessments else "",
            "ai_gateway_prompt": draft.metadata.prompt_version,
            "ai_model": draft.metadata.model,
        },
        "generated_at": _utcnow().isoformat(),
        "notice": "本摘要为信息整理，不是兽医诊断；分级建议来自独立规则引擎。",
    }
    brief = VetBrief(
        health_event_id=he.id,
        pet_id=pet.id,
        content=content,
        generated_by_user_id=actor_id,
        ai_inference_id=log.id,
        engine_versions=content["engine_versions"],
    )
    db.add(brief)
    await db.flush()

    await create_life_event(
        db,
        pet_id=pet.id,
        event_type="health.vet_brief_generated",
        payload={
            "health_event_id": str(he.id),
            "vet_brief_id": str(brief.id),
        },
        actor_id=actor_id,
        source_type=enums.SourceType.AI_DERIVED,
        provenance_level=enums.SourceType.AI_DERIVED.value,
        source_ref=f"vet_brief:{brief.id}",
        allow_duplicate=True,
    )
    return brief
