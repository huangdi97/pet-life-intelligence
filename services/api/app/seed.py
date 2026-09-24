"""Demo seed (GOAL Phase 12 / G12): Demo Family household with 豆豆 (dog) +
咪咪 (cat), owner/family/temp-caregiver users, one day of daily events, a
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
from app.seed_data_care import insert_care
from app.seed_data_content import insert_content
from app.seed_data_health import insert_health
from app.seed_data_identity import insert_identity

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

        ids = await insert_identity(db)
        now = datetime.now(CST)
        today8 = now.replace(hour=8, minute=0, second=0, microsecond=0)

        await insert_content(db, ids, now, today8)
        care = await insert_care(db, ids, now)
        health = await insert_health(db, ids, now)

        await db.commit()
        return {
            "household_id": str(ids["household_id"]),
            "owner_id": str(ids["owner_id"]),
            "family_id": str(ids["family_id"]),
            "sitter_id": str(ids["sitter_id"]),
            "coco_id": str(ids["coco_id"]),
            "mimi_id": str(ids["mimi_id"]),
            "task_id": str(care["task_id"]),
            "health_event_non_emergency_id": str(health["health_event_non_emergency_id"]),
            "health_event_emergency_id": str(health["health_event_emergency_id"]),
            "medication_plan_id": str(health["medication_plan_id"]),
            "outcome_id": str(health["outcome_id"]),
            "triage_non_emergency": health["triage_non_emergency"],
            "triage_emergency": health["triage_emergency"],
        }


def main() -> None:
    result = asyncio.run(seed())
    print("SEED_OK")
    for k, v in result.items():
        print(f"{k}={v}")


if __name__ == "__main__":
    main()
