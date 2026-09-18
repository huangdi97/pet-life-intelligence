"""Demo seed (GOAL Phase 12 / G12): Demo Family household with Coco (dog) +
Mimi (cat), owner/family/temp-caregiver users, one day of daily events, a
task, a behavior event, a non-emergency health event, an emergency red-flag
sample, a medication plan with administrations, and an outcome.

Idempotent: wipes the demo household first (dev only), then recreates.
Run:  python -m app.seed
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import delete

from app.core.db import get_session_factory
from app.domain import enums
from app.models import (
    AgentActionLog,
    AIInferenceLog,
    Artifact,
    AuditEntry,
    AuthSession,
    AutomationRule,
    Baseline,
    BehaviorEvent,
    BehaviorInterventionPlan,
    CapabilityRegistry,
    CareCard,
    CareHandoff,
    CareReminder,
    CareTask,
    ClinicalIntakeStep,
    Consent,
    Credential,
    DailySummary,
    DeletionRequest,
    DeviceEvent,
    DiaryEntry,
    DietProfile,
    EmergencyProfile,
    Expense,
    ExperimentAssignment,
    FeatureFlag,
    Grant,
    HealthEvent,
    HealthRecord,
    Household,
    HouseholdExpenseSplit,
    HouseholdMember,
    Incident,
    InsurancePolicyRecord,
    Invitation,
    LifeEvent,
    LoginAttempt,
    MedicationDose,
    MedicationPlan,
    MergeRequest,
    Milestone,
    Notification,
    Observation,
    Outcome,
    PasswordResetToken,
    Pet,
    PetDevice,
    PetFriend,
    PetIdentifier,
    PetPreference,
    PilotFeedback,
    PilotInviteCode,
    PilotUserProfile,
    ProfessionalLink,
    RecoveryPlan,
    Relationship,
    SecurityEvent,
    ServiceRequest,
    ShareToken,
    SocialInteraction,
    SocialProfile,
    SocialReport,
    TrainingGoal,
    TrainingSession,
    TransferRequest,
    TriageAssessment,
    User,
    VerificationToken,
    VetBrief,
    WelfareObservation,
    WelfareProfile,
)
from app.services.eventlog import create_life_event

CST = timezone(timedelta(hours=8))

_TABLES = [
    CapabilityRegistry,
    FeatureFlag,
    Incident,
    ExperimentAssignment,
    AgentActionLog,
    InsurancePolicyRecord,
    HouseholdExpenseSplit,
    ServiceRequest,
    WelfareObservation,
    WelfareProfile,
    BehaviorInterventionPlan,
    ProfessionalLink,
    MergeRequest,
    TransferRequest,
    AutomationRule,
    DeviceEvent,
    PetDevice,
    Milestone,
    Expense,
    DietProfile,
    SocialReport,
    SocialInteraction,
    PetFriend,
    SocialProfile,
    TrainingSession,
    TrainingGoal,
    PetPreference,
    CareReminder,
    RecoveryPlan,
    HealthRecord,
    HouseholdExpenseSplit,
    DailySummary,
    DiaryEntry,
    Baseline,
    PetFriend,
    PetIdentifier,
    Notification, ShareToken, DeletionRequest, CareCard, CareHandoff,
    MedicationDose, MedicationPlan, Outcome, VetBrief, TriageAssessment,
    Observation, ClinicalIntakeStep, HealthEvent, BehaviorEvent, CareTask,
    Consent, EmergencyProfile, Grant, Relationship, Invitation, Artifact,
    LifeEvent, Pet, HouseholdMember, Household, AIInferenceLog, AuditEntry,
    # auth + pilot tables reference `users` — must be deleted BEFORE User;
    # pilot_user_profiles also references pilot_invite_codes → profiles first
    AuthSession, Credential, LoginAttempt, PasswordResetToken, SecurityEvent,
    VerificationToken, PilotFeedback, PilotUserProfile, PilotInviteCode,
    User,
]


async def seed() -> dict:
    factory = get_session_factory()
    async with factory() as db:
        for t in _TABLES:
            await db.execute(delete(t))
        await db.flush()

        owner = User(email="owner@pli.demo", display_name="Demo Owner", is_demo=True)
        family = User(email="family@pli.demo", display_name="Demo Family Member", is_demo=True)
        sitter = User(email="sitter@pli.demo", display_name="Demo Sitter", is_demo=True)
        db.add_all([owner, family, sitter])
        await db.flush()

        hh = Household(name="Demo Family")
        db.add(hh)
        await db.flush()
        db.add_all(
            [
                HouseholdMember(household_id=hh.id, user_id=owner.id,
                                role=enums.HouseholdRole.OWNER.value, status="ACTIVE"),
                HouseholdMember(household_id=hh.id, user_id=family.id,
                                role=enums.HouseholdRole.FAMILY.value, status="ACTIVE"),
            ]
        )
        await db.flush()

        coco = Pet(household_id=hh.id, name="Coco", species="dog", breed="Corgi",
                   sex="FEMALE", birth_date=datetime(2022, 5, 1).date(),
                   neutered=True, weight_note="12kg", created_by_user_id=owner.id,
                   is_demo=True)
        mimi = Pet(household_id=hh.id, name="Mimi", species="cat", breed="DLH",
                   sex="MALE", birth_date=datetime(2021, 11, 20).date(),
                   neutered=True, weight_note="4.5kg", created_by_user_id=owner.id,
                   is_demo=True)
        db.add_all([coco, mimi])
        await db.flush()
        db.add_all(
            [
                Relationship(pet_id=coco.id, user_id=owner.id,
                             role=enums.RelationshipRole.OWNER.value,
                             created_by_user_id=owner.id),
                Relationship(pet_id=mimi.id, user_id=owner.id,
                             role=enums.RelationshipRole.OWNER.value,
                             created_by_user_id=owner.id),
            ]
        )
        await db.flush()

        now = datetime.now(CST)
        today8 = now.replace(hour=8, minute=0, second=0, microsecond=0)

        # daily events for Coco
        await create_life_event(
            db, pet_id=coco.id, event_type="daily.meal",
            payload={"food_type": "dog kibble", "amount": "120", "unit": "g"},
            actor_id=owner.id, occurred_at=today8,
        )
        await create_life_event(
            db, pet_id=coco.id, event_type="daily.walk",
            payload={"duration_minutes": 30, "distance_meters": "1500",
                     "intensity": "normal"},
            actor_id=family.id, occurred_at=today8 + timedelta(hours=2),
            source_type=enums.SourceType.CAREGIVER_REPORTED,
        )
        await create_life_event(
            db, pet_id=coco.id, event_type="daily.weight",
            payload={"weight_kg": "12.2", "body_condition_score": 5},
            actor_id=owner.id, occurred_at=today8 + timedelta(minutes=30),
        )
        await create_life_event(
            db, pet_id=mimi.id, event_type="daily.elimination",
            payload={"kind": "urine", "quality": "normal"},
            actor_id=owner.id, occurred_at=today8 + timedelta(minutes=45),
        )

        # task
        task = CareTask(pet_id=coco.id, title="Evening feeding", task_type="FEED",
                        due_at=now.replace(hour=19, minute=0, second=0, microsecond=0),
                        repeat_rule=enums.RepeatRule.DAILY.value,
                        assignee_user_id=family.id, created_by_user_id=owner.id)
        db.add(task)
        await db.flush()
        await create_life_event(
            db, pet_id=coco.id, event_type="care.task_created",
            payload={"task_id": str(task.id), "title": task.title,
                     "task_type": "FEED",
                     "due_at": task.due_at.isoformat(), "repeat_rule": "DAILY",
                     "assignee_user_id": str(family.id)},
            actor_id=owner.id,
        )

        # behavior event
        be = BehaviorEvent(
            pet_id=coco.id, occurred_at=today8 + timedelta(hours=3),
            antecedent="快递员敲门", behavior="连续吠叫约1分钟，随后躲到沙发下",
            consequence="主人安抚后自行出来", duration_seconds=60,
            intensity="MODERATE",
            intensity_source=enums.SourceType.OWNER_REPORTED.value,
            people_involved="快递员", environment="客厅",
            owner_notes="对敲门声敏感", recorded_by_user_id=owner.id,
        )
        db.add(be)
        await db.flush()
        await create_life_event(
            db, pet_id=coco.id, event_type="behavior.observed",
            payload={"behavior_event_id": str(be.id), "behavior": be.behavior,
                     "intensity": "MODERATE",
                     "intensity_source": enums.SourceType.OWNER_REPORTED.value},
            actor_id=owner.id, source_ref=f"behavior_event:{be.id}",
            occurred_at=be.occurred_at,
        )

        # non-emergency health event (Mimi ear issue)
        he = HealthEvent(
            pet_id=mimi.id, chief_complaint="左耳抓挠三天，有棕色分泌物，精神食欲正常",
            onset_at=now - timedelta(days=3), duration_text="3天",
            eating="NORMAL", drinking="NORMAL", elimination="NORMAL",
            activity="NORMAL", opened_by_user_id=owner.id,
        )
        db.add(he)
        await db.flush()
        await create_life_event(
            db, pet_id=mimi.id, event_type="health.event_opened",
            payload={"health_event_id": str(he.id), "chief_complaint": he.chief_complaint},
            actor_id=owner.id, source_ref=f"health_event:{he.id}",
        )
        engine = __import__("pli_rules", fromlist=["get_engine"]).get_engine()
        result = engine.evaluate("cat", he.chief_complaint)
        triage = TriageAssessment(
            health_event_id=he.id, level=result.triage_level,
            engine=enums.TriageEngine.RULE_ENGINE.value,
            matched_rules=[{"rule_id": h.rule_id, "rule_version": h.rule_version,
                            "matched_keywords": h.matched_keywords, "triage": h.triage}
                           for h in result.hits],
            rule_engine_version=result.engine_version, created_by_user_id=owner.id,
        )
        db.add(triage)
        he.latest_triage_level = result.triage_level
        obs = Observation(
            health_event_id=he.id,
            kind=enums.ObservationKind.OWNER_STATEMENT.value,
            text="左耳有棕色分泌物，频繁抓挠", created_by_user_id=owner.id,
        )
        db.add(obs)
        step = ClinicalIntakeStep(
            health_event_id=he.id, question_id="onset_detail",
            question_text="最早什么时候发现？持续多久了？", asked_by="RULE",
            answer_text="三天前开始", answered_by_user_id=owner.id,
        )
        db.add(step)
        await db.flush()

        # medication plan for Coco (linked to nothing, owner-reported vet instruction)
        plan = MedicationPlan(
            pet_id=coco.id, medicine_name="Doxycycline", dose_text="50mg",
            route="oral", frequency_text="每天2次，连用7天", frequency_per_day=2,
            start_date=now - timedelta(hours=12),
            end_date=now + timedelta(days=6),
            source_type=enums.SourceType.PROFESSIONAL_CONFIRMED.value,
            source_note="Dr. Wang @ Sunshine Vet Clinic",
            instructions="饭后服用", created_by_user_id=owner.id,
        )
        db.add(plan)
        await db.flush()
        d1 = MedicationDose(plan_id=plan.id, planned_at=now - timedelta(hours=12),
                            status=enums.DoseStatus.GIVEN.value,
                            given_at=now - timedelta(hours=11),
                            given_by_user_id=owner.id)
        d2 = MedicationDose(plan_id=plan.id, planned_at=now)
        db.add_all([d1, d2])
        await db.flush()
        await create_life_event(
            db, pet_id=coco.id, event_type="medication.plan_created",
            payload={"plan_id": str(plan.id), "medicine_name": "Doxycycline",
                     "dose_text": "50mg",
                     "source_type": enums.SourceType.PROFESSIONAL_CONFIRMED.value},
            actor_id=owner.id,
            source_type=enums.SourceType.PROFESSIONAL_CONFIRMED,
        )
        await create_life_event(
            db, pet_id=coco.id, event_type="medication.administered",
            payload={"plan_id": str(plan.id), "dose_id": str(d1.id),
                     "administered_at": d1.given_at.isoformat(),
                     "by_actor": str(owner.id), "status": "GIVEN"},
            actor_id=owner.id,
        )

        # outcome for Mimi health event
        outcome = Outcome(
            pet_id=mimi.id, health_event_id=he.id,
            outcome=enums.OutcomeValue.IMPROVED.value,
            notes="清耳后分泌物减少", recorded_by_user_id=owner.id,
        )
        db.add(outcome)
        await db.flush()
        await create_life_event(
            db, pet_id=mimi.id, event_type="health.outcome_recorded",
            payload={"health_event_id": str(he.id), "outcome_id": str(outcome.id),
                     "outcome": "IMPROVED"},
            actor_id=owner.id,
        )

        # emergency red-flag sample (test/demo data, cat urinary obstruction)
        he2 = HealthEvent(
            pet_id=mimi.id,
            chief_complaint="反复进猫砂盆但几乎尿不出来，频繁舔下体",
            onset_at=now - timedelta(hours=5), duration_text="5小时",
            eating="REDUCED", drinking="NORMAL", elimination="ABNORMAL",
            activity="LOW", opened_by_user_id=owner.id,
        )
        db.add(he2)
        await db.flush()
        await create_life_event(
            db, pet_id=mimi.id, event_type="health.event_opened",
            payload={"health_event_id": str(he2.id),
                     "chief_complaint": he2.chief_complaint},
            actor_id=owner.id, source_ref=f"health_event:{he2.id}",
        )
        result2 = engine.evaluate("cat", he2.chief_complaint)
        triage2 = TriageAssessment(
            health_event_id=he2.id, level=result2.triage_level,
            engine=enums.TriageEngine.RULE_ENGINE.value,
            matched_rules=[{"rule_id": h.rule_id, "rule_version": h.rule_version,
                            "matched_keywords": h.matched_keywords, "triage": h.triage}
                           for h in result2.hits],
            rule_engine_version=result2.engine_version, created_by_user_id=owner.id,
        )
        db.add(triage2)
        he2.latest_triage_level = result2.triage_level

        # expired temporary grant sample for Coco→sitter (historical)
        grant = Grant(
            pet_id=coco.id, user_id=sitter.id,
            scopes=[enums.Capability.DAILY_READ.value, enums.Capability.DAILY_WRITE.value],
            reason="历史照护交接（已到期示例）", source="DIRECT",
            granted_by_user_id=owner.id,
            starts_at=now - timedelta(days=8),
            expires_at=now - timedelta(days=1),
            status=enums.GrantStatus.EXPIRED.value,
        )
        db.add(grant)

        await db.commit()
        return {
            "household_id": str(hh.id),
            "owner_id": str(owner.id),
            "family_id": str(family.id),
            "sitter_id": str(sitter.id),
            "coco_id": str(coco.id),
            "mimi_id": str(mimi.id),
            "task_id": str(task.id),
            "health_event_non_emergency_id": str(he.id),
            "health_event_emergency_id": str(he2.id),
            "medication_plan_id": str(plan.id),
            "outcome_id": str(outcome.id),
            "triage_non_emergency": result.triage_level,
            "triage_emergency": result2.triage_level,
        }




def main() -> None:
    result = asyncio.run(seed())
    print("SEED_OK")
    for k, v in result.items():
        print(f"{k}={v}")


if __name__ == "__main__":
    main()
