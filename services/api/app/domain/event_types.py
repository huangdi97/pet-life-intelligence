"""Canonical event type registry (PLI-211).

Every LifeEvent payload is validated server-side against the schemas here.
The frontend may not invent event payload fields (AGENTS.md §3).
Amounts/units are transported as strings — never bare floats (GOAL §6).
"""

from typing import Any

from pydantic import BaseModel, ConfigDict


class EventTypeDef(BaseModel):
    event_type: str
    description: str
    payload_model: type[BaseModel]
    domain: str  # daily | care | behavior | health | medication | identity | platform


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


def _amount_str(v: Any) -> str:
    if isinstance(v, (float, int)):
        return format(float(v), ".6f").rstrip("0").rstrip(".")
    return str(v)


class GenericPayload(_Strict):
    pass


EVENT_REGISTRY: dict[str, EventTypeDef] = {}


def _register(event_type: str, description: str, payload_model: type[BaseModel],
              domain: str) -> None:
    EVENT_REGISTRY[event_type] = EventTypeDef(
        event_type=event_type,
        description=description,
        payload_model=payload_model,
        domain=domain,
    )


# INVARIANT:
# Payload classes live in per-domain modules and import _Strict/_amount_str
# from this module, so these imports must stay below those definitions to
# avoid a partial-module circular import. The _register calls below keep the
# original order — EVENT_REGISTRY insertion order is observable by tests.
from .event_types_care import (  # noqa: E402
    CareCardGeneratedPayload,
    CareConflictDetectedPayload,
    CareHandoffEndedPayload,
    CareHandoffStartedPayload,
    CareTaskCompletedPayload,
    CareTaskCreatedPayload,
)

# Re-exported for API compatibility: consumers may import payload classes
# from app.domain.event_types. The daily.* classes are registered through
# DAILY_EVENT_TYPES below, so ruff would otherwise see them as unused.
from .event_types_daily import (  # noqa: E402
    DAILY_EVENT_TYPES,
    AdviceFilteredPayload,
    ChecklistUpdatedPayload,
    DrinkPayload,  # noqa: F401
    EliminationPayload,  # noqa: F401
    ExpenseLoggedPayload,
    FriendRequestedPayload,
    InteractionPayload,
    MealPayload,  # noqa: F401
    MilestonePayload,
    PetAskedPayload,
    PetStatusPayload,
    PlayPayload,  # noqa: F401
    RecordImportedPayload,
    RecoveryPlanPayload,
    ReminderPayload,
    SleepPayload,  # noqa: F401
    SocialBlockedPayload,
    TrainingGoalPayload,
    TrainingSessionPayload,
    WalkPayload,  # noqa: F401
    WeightPayload,  # noqa: F401
)
from .event_types_health import (  # noqa: E402
    AIInferenceLoggedPayload,
    AIObservationPayload,
    ArtifactAddedPayload,
    BehaviorObservedPayload,
    ClinicalArtifactAddedPayload,
    ClinicalIntakeStepPayload,
    DailySummaryViewedPayload,
    HealthEventOpenedPayload,
    HealthOutcomePayload,
    MedicationAdministeredPayload,
    MedicationMissedPayload,
    MedicationPlanCreatedPayload,
    ProvenanceAttachedPayload,
    RecordVersionedPayload,
    RedFlagTriggeredPayload,
    SafetyPolicyAppliedPayload,
    TimelineViewedPayload,
    TriageAssignedPayload,
    VetBriefGeneratedPayload,
    VetBriefSharedPayload,
)
from .event_types_identity import (  # noqa: E402
    AuditAccessedPayload,
    ConsentChangedPayload,
    DeletionRequestedPayload,
    DiaryCreatedPayload,
    DuplicateEventDetectedPayload,
    EmergencyProfileUpdatedPayload,
    GrantChangedPayload,
    GrantExpiredPayload,
    IdentifierAddedPayload,
    NotificationCreatedPayload,
    PetCreatedPayload,
    PetMediaAddedPayload,
    RelationshipCreatedPayload,
    SchemaEventPayload,
    SecurityEventPayload,
    SummaryGeneratedPayload,
    VisualModelActivatedPayload,
    VisualModelGeneratedPayload,
)

for et, (model, desc) in DAILY_EVENT_TYPES.items():
    _register(et, f"Quick log: {desc.strip()}", model, "daily")

_register("pet.created", "Pet master record created", PetCreatedPayload, "identity")
_register("pet.status_changed", "Pet lifecycle status changed (PLI-013)", PetStatusPayload, "identity")
_register("identifier.added", "Chip/passport identifier added (PLI-004)", IdentifierAddedPayload, "identity")
_register("diary.created", "Free-text/voice diary entry (PLI-031)", DiaryCreatedPayload, "daily")
_register("summary.generated", "AI daily summary generated (PLI-033)", SummaryGeneratedPayload, "daily")
_register("care.checklist_updated", "Handoff checklist item updated (PLI-039)", ChecklistUpdatedPayload, "care")
_register("reminder.created", "Care reminder created (PLI-064)", ReminderPayload, "health")
_register("reminder.completed", "Care reminder completed", ReminderPayload, "health")
_register("health.record_imported", "Vet record imported (PLI-057)", RecordImportedPayload, "health")
_register("recovery_plan.updated", "Recovery plan updated (PLI-061)", RecoveryPlanPayload, "health")
_register("training.goal_created", "Training goal created (PLI-085)", TrainingGoalPayload, "training")
_register("training.session_logged", "Training session logged (PLI-087)", TrainingSessionPayload, "training")
_register("social.friend_requested", "Pet friend requested (PLI-112)", FriendRequestedPayload, "social")
_register("social.interaction_logged", "Social interaction logged (PLI-113)", InteractionPayload, "social")
_register("social.blocked", "Social block/report applied (PLI-112)", SocialBlockedPayload, "social")
_register("expense.logged", "Expense logged (PLI-175)", ExpenseLoggedPayload, "finance")
_register("milestone.recorded", "Milestone recorded (PLI-187)", MilestonePayload, "timeline")
_register("pet.asked", "Personal QA answered with evidence (PLI-197)", PetAskedPayload, "agent")
_register("advice.filtered", "Unsafe behavior advice filtered (PLI-084)", AdviceFilteredPayload, "behavior")
_register("pet.media_added", "Pet avatar/media added", PetMediaAddedPayload, "identity")
_register("relationship.created", "Owner/co-owner relationship", RelationshipCreatedPayload, "identity")
_register("grant.created", "Grant issued", GrantChangedPayload, "identity")
_register("grant.revoked", "Grant revoked", GrantChangedPayload, "identity")
_register("grant.expired", "Grant expired", GrantExpiredPayload, "identity")
_register("consent.changed", "Consent changed", ConsentChangedPayload, "platform")
_register("emergency_profile.updated", "Emergency profile updated", EmergencyProfileUpdatedPayload, "identity")
_register("care.task_created", "Care task created", CareTaskCreatedPayload, "care")
_register("care.task_completed", "Care task completed", CareTaskCompletedPayload, "care")
_register("care.task_conflict", "Duplicate completion conflict", CareConflictDetectedPayload, "care")
_register("care.handoff_started", "Care handoff started", CareHandoffStartedPayload, "care")
_register("care.handoff_ended", "Care handoff ended", CareHandoffEndedPayload, "care")
_register("care.card_issued", "Care card generated", CareCardGeneratedPayload, "care")
_register("behavior.observed", "Behavior event recorded", BehaviorObservedPayload, "behavior")
_register("health.event_opened", "Health event opened", HealthEventOpenedPayload, "health")
_register("health.intake_step", "Clinical intake Q&A step", ClinicalIntakeStepPayload, "health")
_register("health.observation_added", "Observable finding added", GenericPayload, "health")
_register("ai.observation", "AI-extracted observation", AIObservationPayload, "health")
_register("health.artifact_added", "Clinical evidence attached", ClinicalArtifactAddedPayload, "health")
_register("health.red_flag", "Red flag rule triggered", RedFlagTriggeredPayload, "health")
_register("health.triage_assigned", "Triage level assigned", TriageAssignedPayload, "health")
_register("health.vet_brief_generated", "Vet brief generated", VetBriefGeneratedPayload, "health")
_register("health.vet_brief_shared", "Vet brief share link created", VetBriefSharedPayload, "health")
_register("health.outcome_recorded", "Outcome recorded", HealthOutcomePayload, "health")
_register("medication.plan_created", "Medication plan created", MedicationPlanCreatedPayload, "medication")
_register("medication.administered", "Medication administered", MedicationAdministeredPayload, "medication")
_register("medication.missed", "Medication dose missed", MedicationMissedPayload, "medication")
_register("artifact.added", "Artifact uploaded", ArtifactAddedPayload, "platform")
_register("audit.accessed", "Sensitive access recorded", AuditAccessedPayload, "platform")
_register("notification.created", "Notification created", NotificationCreatedPayload, "platform")
_register("deletion.requested", "Data deletion requested", DeletionRequestedPayload, "platform")
_register("security.event", "Security event", SecurityEventPayload, "platform")
_register("duplicate.detected", "Duplicate event detected", DuplicateEventDetectedPayload, "platform")
_register("schema.registered", "Canonical schema event", SchemaEventPayload, "platform")
_register("record.versioned", "Record superseded (no silent overwrite)", RecordVersionedPayload, "platform")
_register("provenance.attached", "Provenance level attached", ProvenanceAttachedPayload, "platform")
_register("timeline.viewed", "Timeline viewed", TimelineViewedPayload, "platform")
_register("today.viewed", "Today summary viewed", DailySummaryViewedPayload, "platform")
_register("visual.model_generated", "3D visual model generation enqueued (H.2)", VisualModelGeneratedPayload, "platform")
_register("visual.model_activated", "3D visual model activated (H.2)", VisualModelActivatedPayload, "platform")
_register("safety.policy_applied", "Medical action hard boundary applied", SafetyPolicyAppliedPayload, "platform")
_register("ai.inference_logged", "AI inference metadata logged", AIInferenceLoggedPayload, "platform")

EVENT_TYPES = sorted(EVENT_REGISTRY.keys())


def validate_payload(event_type: str, payload: dict) -> dict:
    """Validate and normalize a payload against the registry. Raises ValueError."""
    typedef = EVENT_REGISTRY.get(event_type)
    if typedef is None:
        raise ValueError(f"Unknown event_type: {event_type}")
    return typedef.payload_model.model_validate(payload).model_dump()
