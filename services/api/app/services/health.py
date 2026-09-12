"""Health service: intake, observations, rule-first triage, AI observations,
vet brief generation. Rule engine output can never be lowered by AI (GOAL
§11.3); AI results are provenance-tagged AI_DERIVED (PLI-052/053/054)."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pli_ai_gateway import Gateway
from pli_rules import get_engine, max_level

from app.domain import enums
from app.models import (
    AIInferenceLog,
    AuditEntry,
    HealthEvent,
    LifeEvent,
    MedicationPlan,
    Observation,
    Pet,
    TriageAssessment,
    VetBrief,
)
from app.services.eventlog import create_life_event, create_notification

_GATEWAY = Gateway()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def log_ai_inference(
    db: AsyncSession, result, *, pet_id: uuid.UUID | None, actor_id: uuid.UUID | None,
    input_summary: str, output_summary: str,
) -> AIInferenceLog:
    m = result.metadata
    log = AIInferenceLog(
        capability=m.capability,
        provider=m.provider,
        model=m.model,
        prompt_version=m.prompt_version,
        schema_version=m.schema_version,
        trace_id=m.trace_id,
        latency_ms=m.latency_ms,
        safety_flags=m.safety_flags,
        fallback_used=m.fallback_used,
        input_summary=input_summary[:500],
        output_summary=output_summary[:500],
        pet_id=pet_id,
        created_by_user_id=actor_id,
    )
    db.add(log)
    await db.flush()
    return log


def collect_red_flag_texts(he: HealthEvent, extra_texts: list[str] | None = None) -> list[str]:
    texts = [
        he.chief_complaint or "",
        he.owner_notes or "",
        he.duration_text or "",
    ]
    if extra_texts:
        texts.extend(t for t in extra_texts if t)
    return texts


async def run_rule_triage(
    db: AsyncSession,
    he: HealthEvent,
    pet: Pet,
    actor_id: uuid.UUID,
    *,
    extra_texts: list[str] | None = None,
    note: str = "",
    raise_events: bool = True,
) -> TriageAssessment:
    """Rule engine is the only automatic triage authority. Level never
    decreases within one health event unless a professional overrides."""
    result = get_engine().evaluate(pet.species, collect_red_flag_texts(he, extra_texts))
    prev = he.latest_triage_level
    level = result.triage_level
    if prev:
        level = max_level(level, prev)  # never auto-downgrade
    assessment = TriageAssessment(
        health_event_id=he.id,
        level=level,
        engine=enums.TriageEngine.RULE_ENGINE.value,
        matched_rules=[
            {"rule_id": h.rule_id, "rule_version": h.rule_version,
             "matched_keywords": h.matched_keywords, "triage": h.triage}
            for h in result.hits
        ],
        rule_engine_version=result.engine_version,
        note=note,
        created_by_user_id=actor_id,
    )
    db.add(assessment)
    he.latest_triage_level = level
    await db.flush()

    if raise_events:
        for h in result.hits:
            await create_life_event(
                db,
                pet_id=pet.id,
                event_type="health.red_flag",
                payload={
                    "health_event_id": str(he.id),
                    "rule_id": h.rule_id,
                    "rule_version": h.rule_version,
                    "triage_level": h.triage,
                },
                actor_id=actor_id,
                source_type=enums.SourceType.SYSTEM_CALCULATED,
                provenance_level=enums.SourceType.SYSTEM_CALCULATED.value,
                source_ref=f"triage:{assessment.id}",
                allow_duplicate=True,
            )
        await create_life_event(
            db,
            pet_id=pet.id,
            event_type="health.triage_assigned",
            payload={
                "health_event_id": str(he.id),
                "triage_id": str(assessment.id),
                "level": level,
                "engine": enums.TriageEngine.RULE_ENGINE.value,
                "matched_rules": [h.rule_id for h in result.hits],
            },
            actor_id=actor_id,
            source_type=enums.SourceType.SYSTEM_CALCULATED,
            provenance_level=enums.SourceType.SYSTEM_CALCULATED.value,
            source_ref=f"triage:{assessment.id}",
            allow_duplicate=True,
        )
        if level == enums.TriageLevel.EMERGENCY.value:
            await create_notification(
                db,
                household_id=pet.household_id,
                pet_id=pet.id,
                type="TRIAGE_EMERGENCY",
                title="红旗警告：建议立即就医",
                body=f"规则引擎命中 {len(result.hits)} 条红旗规则，分级 {level}。",
                data={"health_event_id": str(he.id), "level": level},
                dedupe_key=f"triage-emergency:{he.id}",
            )
    return assessment


async def add_ai_observations(
    db: AsyncSession, he: HealthEvent, pet: Pet, actor_id: uuid.UUID,
    texts: list[str],
) -> list[Observation]:
    """AI extracts owner-report clauses only. Provenance stays AI_DERIVED and
    each observation is labeled 主人报告 — AI never upgrades facts."""
    result = _GATEWAY.invoke(
        "extract_observations", {"texts": texts, "species": pet.species}
    )
    log = await log_ai_inference(
        db, result, pet_id=pet.id, actor_id=actor_id,
        input_summary=" | ".join(texts)[:400],
        output_summary="; ".join(o["text"] for o in result.result["observations"])[:400],
    )
    observations: list[Observation] = []
    for obs in result.result["observations"]:
        o = Observation(
            health_event_id=he.id,
            kind=enums.ObservationKind.AI_OBSERVATION.value,
            text=obs["text"],
            source_ref=f"ai_inference:{log.id}",
            created_by_user_id=actor_id,
            ai_inference_id=log.id,
        )
        db.add(o)
        observations.append(o)
    await db.flush()

    for o in observations:
        await create_life_event(
            db,
            pet_id=pet.id,
            event_type="ai.observation",
            payload={
                "health_event_id": str(he.id),
                "observation_id": str(o.id),
                "ai_inference_id": str(log.id),
                "text": o.text,
            },
            actor_id=actor_id,
            source_type=enums.SourceType.AI_DERIVED,
            provenance_level=enums.SourceType.AI_DERIVED.value,
            source_ref=f"observation:{o.id}",
            allow_duplicate=True,
        )
    # Rule engine re-runs AFTER new text — AI presence never lowers level.
    await run_rule_triage(db, he, pet, actor_id, extra_texts=texts,
                          note="re-run after AI observation extraction")
    return observations


async def generate_vet_brief(
    db: AsyncSession, he: HealthEvent, pet: Pet, actor_id: uuid.UUID
) -> VetBrief:
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
