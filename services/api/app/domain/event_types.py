"""Canonical event type registry (PLI-211).

Every LifeEvent payload is validated server-side against the schemas here.
The frontend may not invent event payload fields (AGENTS.md §3).
Amounts/units are transported as strings — never bare floats (GOAL §6).
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domain.enums import SourceType


class EventTypeDef(BaseModel):
    event_type: str
    description: str
    payload_model: type[BaseModel]
    domain: str  # daily | care | behavior | health | medication | identity | platform


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


def _amount_str(v: Any) -> str:
    if isinstance(v, float) or isinstance(v, int):
        return format(float(v), ".6f").rstrip("0").rstrip(".")
    return str(v)


# --- daily.* -------------------------------------------------------------


class MealPayload(_Strict):
    food_type: str = ""
    amount: str = ""
    unit: str = ""
    notes: str = ""

    @field_validator("amount", "unit", "food_type", "notes", mode="before")
    @classmethod
    def _s(cls, v: Any) -> str:
        return _amount_str(v) if v is not None else ""


class DrinkPayload(_Strict):
    amount: str = ""
    unit: str = "ml"
    notes: str = ""

    @field_validator("amount", "unit", "notes", mode="before")
    @classmethod
    def _s(cls, v: Any) -> str:
        return _amount_str(v) if v is not None else ""


class EliminationPayload(_Strict):
    kind: str = ""  # urine | stool | both
    quality: str = ""  # normal | abnormal | concerning
    notes: str = ""


class WalkPayload(_Strict):
    duration_minutes: int = Field(default=0, ge=0, le=24 * 60)
    distance_meters: str = ""
    intensity: str = "normal"
    notes: str = ""

    @field_validator("distance_meters", "notes", mode="before")
    @classmethod
    def _s(cls, v: Any) -> str:
        return _amount_str(v) if v is not None else ""


class PlayPayload(_Strict):
    duration_minutes: int = Field(default=0, ge=0, le=24 * 60)
    activity_type: str = ""
    notes: str = ""


class WeightPayload(_Strict):
    weight_kg: str
    body_condition_score: int | None = Field(default=None, ge=1, le=9)
    notes: str = ""

    @field_validator("weight_kg", mode="before")
    @classmethod
    def _w(cls, v: Any) -> str:
        return _amount_str(v)


DAILY_EVENT_TYPES: dict[str, tuple[type[BaseModel], str]] = {
    "daily.meal": (MealPayload, " meal"),
    "daily.drink": (DrinkPayload, "drink"),
    "daily.elimination": (EliminationPayload, "elimination"),
    "daily.walk": (WalkPayload, "walk/outdoor"),
    "daily.play": (PlayPayload, "play/enrichment"),
    "daily.weight": (WeightPayload, "weight/body condition"),
}


# --- identity / platform -------------------------------------------------


class GenericPayload(_Strict):
    pass


class PetCreatedPayload(_Strict):
    name: str
    species: str
    breed: str = ""


class PetMediaAddedPayload(_Strict):
    artifact_id: str
    purpose: str = "avatar"


class RelationshipCreatedPayload(_Strict):
    user_id: str
    role: str


class GrantChangedPayload(_Strict):
    grant_id: str
    user_id: str
    action: str  # created | revoked | expired | invited_role
    scopes: list[str] = []
    expires_at: str | None = None


class GrantExpiredPayload(_Strict):
    grant_id: str
    user_id: str


class ConsentChangedPayload(_Strict):
    purpose: str
    granted: bool


class EmergencyProfileUpdatedPayload(_Strict):
    updated_fields: list[str] = []


class AuditAccessedPayload(_Strict):
    action: str
    resource_type: str = ""
    resource_id: str = ""


class NotificationCreatedPayload(_Strict):
    notification_id: str
    notification_type: str
    title: str


class DeletionRequestedPayload(_Strict):
    request_id: str
    reason: str = ""


class SecurityEventPayload(_Strict):
    action: str
    detail: str = ""


class DuplicateEventDetectedPayload(_Strict):
    duplicate_of: str
    event_type: str


class SchemaEventPayload(_Strict):
    change: str = ""


# --- care ----------------------------------------------------------------


class CareTaskCreatedPayload(_Strict):
    task_id: str
    title: str
    task_type: str
    due_at: str | None = None
    repeat_rule: str = "NONE"
    assignee_user_id: str | None = None


class CareTaskCompletedPayload(_Strict):
    task_id: str
    completed_by: str
    note: str = ""


class CareConflictDetectedPayload(_Strict):
    task_id: str
    attempted_by: str
    completed_by: str


class CareHandoffStartedPayload(_Strict):
    handoff_id: str
    caregiver_user_id: str
    scope: list[str] = []
    end_at: str | None = None


class CareHandoffEndedPayload(_Strict):
    handoff_id: str
    caregiver_user_id: str
    ended_by: str


class CareCardGeneratedPayload(_Strict):
    card_id: str
    token_prefix: str
    expires_at: str | None = None


# --- behavior ------------------------------------------------------------


class BehaviorObservedPayload(_Strict):
    behavior_event_id: str
    behavior: str
    intensity: str = ""
    intensity_source: str = "OWNER_REPORTED"


# --- health / medication -------------------------------------------------


class HealthEventOpenedPayload(_Strict):
    health_event_id: str
    chief_complaint: str


class ClinicalIntakeStepPayload(_Strict):
    health_event_id: str
    question_id: str
    asked_by: str  # RULE | AI
    answered: bool = True


class AIObservationPayload(_Strict):
    health_event_id: str
    observation_id: str
    ai_inference_id: str
    text: str


class ClinicalArtifactAddedPayload(_Strict):
    health_event_id: str
    artifact_id: str
    kind: str = ""


class RedFlagTriggeredPayload(_Strict):
    health_event_id: str
    rule_id: str
    rule_version: str
    triage_level: str


class TriageAssignedPayload(_Strict):
    health_event_id: str
    triage_id: str
    level: str
    engine: str
    matched_rules: list[str] = []


class VetBriefGeneratedPayload(_Strict):
    health_event_id: str
    vet_brief_id: str


class VetBriefSharedPayload(_Strict):
    health_event_id: str
    vet_brief_id: str
    token_prefix: str
    expires_at: str | None = None


class MedicationPlanCreatedPayload(_Strict):
    plan_id: str
    medicine_name: str
    dose_text: str
    source_type: str = SourceType.OWNER_REPORTED.value


class MedicationAdministeredPayload(_Strict):
    plan_id: str
    dose_id: str | None = None
    administered_at: str
    by_actor: str
    status: str = "GIVEN"


class MedicationMissedPayload(_Strict):
    plan_id: str
    dose_id: str
    planned_at: str


class HealthOutcomePayload(_Strict):
    health_event_id: str
    outcome_id: str
    outcome: str


class ArtifactAddedPayload(_Strict):
    artifact_id: str
    kind: str
    content_type: str


class RecordVersionedPayload(_Strict):
    supersedes_event_id: str
    event_type: str


class ProvenanceAttachedPayload(_Strict):
    event_id: str
    provenance_level: str


class TimelineViewedPayload(_Strict):
    filters: dict[str, str] = {}


class DailySummaryViewedPayload(_Strict):
    date: str = ""


class SafetyPolicyAppliedPayload(_Strict):
    context: str
    policy: str
    detail: str = ""


class AIInferenceLoggedPayload(_Strict):
    ai_inference_id: str
    capability: str
    model: str


EVENT_REGISTRY: dict[str, EventTypeDef] = {}


def _register(event_type: str, description: str, payload_model: type[BaseModel],
              domain: str) -> None:
    EVENT_REGISTRY[event_type] = EventTypeDef(
        event_type=event_type,
        description=description,
        payload_model=payload_model,
        domain=domain,
    )


for et, (model, desc) in DAILY_EVENT_TYPES.items():
    _register(et, f"Quick log: {desc.strip()}", model, "daily")

_register("pet.created", "Pet master record created", PetCreatedPayload, "identity")
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
_register("safety.policy_applied", "Medical action hard boundary applied", SafetyPolicyAppliedPayload, "platform")
_register("ai.inference_logged", "AI inference metadata logged", AIInferenceLoggedPayload, "platform")

EVENT_TYPES = sorted(EVENT_REGISTRY.keys())


def validate_payload(event_type: str, payload: dict) -> dict:
    """Validate and normalize a payload against the registry. Raises ValueError."""
    typedef = EVENT_REGISTRY.get(event_type)
    if typedef is None:
        raise ValueError(f"Unknown event_type: {event_type}")
    return typedef.payload_model.model_validate(payload).model_dump()
