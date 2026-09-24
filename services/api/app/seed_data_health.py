"""Demo health rows for ``app.seed``: health events, triage assessments,
medication plan + doses, outcome (GOAL Phase 12 / G12 demo family).
"""

from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain import enums
from app.models import (
    ClinicalIntakeStep,
    HealthEvent,
    MedicationDose,
    MedicationPlan,
    Observation,
    Outcome,
    TriageAssessment,
)
from app.services.eventlog import create_life_event


async def insert_health(db: AsyncSession, ids: dict, now: datetime) -> dict:
    """Insert demo health content; return ids + triage levels for seed().

    The pli_rules engine is resolved once and reused for both triages, same
    as the original inline seed() code (lazy dev dependency).
    """
    owner_id = ids["owner_id"]
    coco_id = ids["coco_id"]
    mimi_id = ids["mimi_id"]

    # non-emergency health event (咪咪 ear issue)
    he = HealthEvent(
        pet_id=mimi_id, chief_complaint="左耳抓挠三天，有棕色分泌物，精神食欲正常",
        onset_at=now - timedelta(days=3), duration_text="3天",
        eating="NORMAL", drinking="NORMAL", elimination="NORMAL",
        activity="NORMAL", opened_by_user_id=owner_id,
    )
    db.add(he)
    await db.flush()
    await create_life_event(
        db, pet_id=mimi_id, event_type="health.event_opened",
        payload={"health_event_id": str(he.id), "chief_complaint": he.chief_complaint},
        actor_id=owner_id, source_ref=f"health_event:{he.id}",
    )
    engine = __import__("pli_rules", fromlist=["get_engine"]).get_engine()
    result = engine.evaluate("cat", he.chief_complaint)
    triage = TriageAssessment(
        health_event_id=he.id, level=result.triage_level,
        engine=enums.TriageEngine.RULE_ENGINE.value,
        matched_rules=[{"rule_id": h.rule_id, "rule_version": h.rule_version,
                        "matched_keywords": h.matched_keywords, "triage": h.triage}
                       for h in result.hits],
        rule_engine_version=result.engine_version, created_by_user_id=owner_id,
    )
    db.add(triage)
    he.latest_triage_level = result.triage_level
    obs = Observation(
        health_event_id=he.id,
        kind=enums.ObservationKind.OWNER_STATEMENT.value,
        text="左耳有棕色分泌物，频繁抓挠", created_by_user_id=owner_id,
    )
    db.add(obs)
    step = ClinicalIntakeStep(
        health_event_id=he.id, question_id="onset_detail",
        question_text="最早什么时候发现？持续多久了？", asked_by="RULE",
        answer_text="三天前开始", answered_by_user_id=owner_id,
    )
    db.add(step)
    await db.flush()

    # medication plan for 豆豆 (linked to nothing, owner-reported vet instruction)
    plan = MedicationPlan(
        pet_id=coco_id, medicine_name="Doxycycline", dose_text="50mg",
        route="oral", frequency_text="每天2次，连用7天", frequency_per_day=2,
        start_date=now - timedelta(hours=12),
        end_date=now + timedelta(days=6),
        source_type=enums.SourceType.PROFESSIONAL_CONFIRMED.value,
        source_note="Dr. Wang @ Sunshine Vet Clinic",
        instructions="饭后服用", created_by_user_id=owner_id,
    )
    db.add(plan)
    await db.flush()
    d1 = MedicationDose(plan_id=plan.id, planned_at=now - timedelta(hours=12),
                        status=enums.DoseStatus.GIVEN.value,
                        given_at=now - timedelta(hours=11),
                        given_by_user_id=owner_id)
    d2 = MedicationDose(plan_id=plan.id, planned_at=now)
    db.add_all([d1, d2])
    await db.flush()
    await create_life_event(
        db, pet_id=coco_id, event_type="medication.plan_created",
        payload={"plan_id": str(plan.id), "medicine_name": "Doxycycline",
                 "dose_text": "50mg",
                 "source_type": enums.SourceType.PROFESSIONAL_CONFIRMED.value},
        actor_id=owner_id,
        source_type=enums.SourceType.PROFESSIONAL_CONFIRMED,
    )
    await create_life_event(
        db, pet_id=coco_id, event_type="medication.administered",
        payload={"plan_id": str(plan.id), "dose_id": str(d1.id),
                 "administered_at": d1.given_at.isoformat(),
                 "by_actor": str(owner_id), "status": "GIVEN"},
        actor_id=owner_id,
    )

    # outcome for 咪咪 health event
    outcome = Outcome(
        pet_id=mimi_id, health_event_id=he.id,
        outcome=enums.OutcomeValue.IMPROVED.value,
        notes="清耳后分泌物减少", recorded_by_user_id=owner_id,
    )
    db.add(outcome)
    await db.flush()
    await create_life_event(
        db, pet_id=mimi_id, event_type="health.outcome_recorded",
        payload={"health_event_id": str(he.id), "outcome_id": str(outcome.id),
                 "outcome": "IMPROVED"},
        actor_id=owner_id,
    )

    # emergency red-flag sample (test/demo data, cat urinary obstruction)
    he2 = HealthEvent(
        pet_id=mimi_id,
        chief_complaint="反复进猫砂盆但几乎尿不出来，频繁舔下体",
        onset_at=now - timedelta(hours=5), duration_text="5小时",
        eating="REDUCED", drinking="NORMAL", elimination="ABNORMAL",
        activity="LOW", opened_by_user_id=owner_id,
    )
    db.add(he2)
    await db.flush()
    await create_life_event(
        db, pet_id=mimi_id, event_type="health.event_opened",
        payload={"health_event_id": str(he2.id),
                 "chief_complaint": he2.chief_complaint},
        actor_id=owner_id, source_ref=f"health_event:{he2.id}",
    )
    result2 = engine.evaluate("cat", he2.chief_complaint)
    triage2 = TriageAssessment(
        health_event_id=he2.id, level=result2.triage_level,
        engine=enums.TriageEngine.RULE_ENGINE.value,
        matched_rules=[{"rule_id": h.rule_id, "rule_version": h.rule_version,
                        "matched_keywords": h.matched_keywords, "triage": h.triage}
                       for h in result2.hits],
        rule_engine_version=result2.engine_version, created_by_user_id=owner_id,
    )
    db.add(triage2)
    he2.latest_triage_level = result2.triage_level

    return {
        "health_event_non_emergency_id": he.id,
        "health_event_emergency_id": he2.id,
        "medication_plan_id": plan.id,
        "outcome_id": outcome.id,
        "triage_non_emergency": result.triage_level,
        "triage_emergency": result2.triage_level,
    }
