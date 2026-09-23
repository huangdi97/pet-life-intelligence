"""Health / medication / behavior event payloads (PLI-211).

Strict clinical payload schemas: extra fields are rejected server-side
(AGENTS.md §3).
"""

from app.domain.enums import SourceType
from app.domain.event_types import _Strict


class BehaviorObservedPayload(_Strict):
    behavior_event_id: str
    behavior: str
    intensity: str = ""
    intensity_source: str = "OWNER_REPORTED"


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


# SAFETY:
# Red-flag events carry a deterministic rule id + version; the strict schema
# guarantees downstream consumers cannot silently drop or alter rule identity.
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
