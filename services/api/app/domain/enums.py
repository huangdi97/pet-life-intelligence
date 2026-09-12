"""Canonical domain enums — single source of truth (PLI-211/212).

These mirror packages/domain-schema/life_event.schema.json and the
docx/xlsx master reference. Do not invent event fields per service.
"""

from enum import StrEnum

SCHEMA_VERSION = "1.0.0"


class SourceType(StrEnum):
    OWNER_REPORTED = "OWNER_REPORTED"
    CAREGIVER_REPORTED = "CAREGIVER_REPORTED"
    DEVICE_DERIVED = "DEVICE_DERIVED"
    AI_DERIVED = "AI_DERIVED"
    PROFESSIONAL_CONFIRMED = "PROFESSIONAL_CONFIRMED"
    LAB_CONFIRMED = "LAB_CONFIRMED"
    SYSTEM_CALCULATED = "SYSTEM_CALCULATED"


PROVENANCE_LEVELS = [s.value for s in SourceType]


class HouseholdRole(StrEnum):
    OWNER = "OWNER"
    CO_OWNER = "CO_OWNER"
    FAMILY = "FAMILY"
    SITTER = "SITTER"
    VET = "VET"
    TRAINER = "TRAINER"
    GROOMER = "GROOMER"


class RelationshipRole(StrEnum):
    OWNER = "OWNER"
    CO_OWNER = "CO_OWNER"
    CARER = "CARER"


class Capability(StrEnum):
    DAILY_READ = "daily:read"
    DAILY_WRITE = "daily:write"
    MEDICAL_READ = "medical:read"
    MEDICAL_WRITE = "medical:write"
    MANAGE_PET = "manage:pet"
    CARD_READ = "card:read"


ROLE_DEFAULT_CAPABILITIES: dict[str, set[str]] = {
    HouseholdRole.OWNER.value: {c.value for c in Capability},
    HouseholdRole.CO_OWNER.value: {c.value for c in Capability},
    HouseholdRole.FAMILY.value: {
        Capability.DAILY_READ.value,
        Capability.DAILY_WRITE.value,
        Capability.MEDICAL_READ.value,
        Capability.CARD_READ.value,
    },
    HouseholdRole.SITTER.value: set(),
    HouseholdRole.VET.value: set(),
    HouseholdRole.TRAINER.value: set(),
    HouseholdRole.GROOMER.value: set(),
}


class Species(StrEnum):
    DOG = "dog"
    CAT = "cat"
    OTHER = "other"


class TaskType(StrEnum):
    FEED = "FEED"
    WALK = "WALK"
    MEDICATION = "MEDICATION"
    GROOMING = "GROOMING"
    VET_VISIT = "VET_VISIT"
    OTHER = "OTHER"


class TaskStatus(StrEnum):
    OPEN = "OPEN"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class RepeatRule(StrEnum):
    NONE = "NONE"
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"


class TriageLevel(StrEnum):
    MONITOR = "MONITOR"
    VET_SOON = "VET_SOON"
    URGENT = "URGENT"
    EMERGENCY = "EMERGENCY"


TRIAGE_ORDER = {
    TriageLevel.MONITOR.value: 0,
    TriageLevel.VET_SOON.value: 1,
    TriageLevel.URGENT.value: 2,
    TriageLevel.EMERGENCY.value: 3,
}


class TriageEngine(StrEnum):
    RULE_ENGINE = "RULE_ENGINE"
    MANUAL_PROFESSIONAL = "MANUAL_PROFESSIONAL"


class ObservationKind(StrEnum):
    OWNER_STATEMENT = "OWNER_STATEMENT"
    AI_OBSERVATION = "AI_OBSERVATION"
    RULE_CONCLUSION = "RULE_CONCLUSION"
    PROFESSIONAL_CONFIRMATION = "PROFESSIONAL_CONFIRMATION"


class HealthEventStatus(StrEnum):
    OPEN = "OPEN"
    MONITORING = "MONITORING"
    CLOSED = "CLOSED"


class OutcomeValue(StrEnum):
    RECOVERED = "RECOVERED"
    IMPROVED = "IMPROVED"
    UNCHANGED = "UNCHANGED"
    WORSENED = "WORSENED"
    RELAPSED = "RELAPSED"
    REFERRED = "REFERRED"
    UNRESOLVED = "UNRESOLVED"


class ConsentPurpose(StrEnum):
    SERVICE_ESSENTIAL = "SERVICE_ESSENTIAL"
    AI_INFERENCE = "AI_INFERENCE"
    RESEARCH_SECONDARY_USE = "RESEARCH_SECONDARY_USE"
    EXTERNAL_SHARING = "EXTERNAL_SHARING"


class ArtifactKind(StrEnum):
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    AUDIO = "AUDIO"
    DOCUMENT = "DOCUMENT"


class HandoffStatus(StrEnum):
    ACTIVE = "ACTIVE"
    ENDED = "ENDED"
    EXPIRED = "EXPIRED"


class GrantStatus(StrEnum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"


class DoseStatus(StrEnum):
    PENDING = "PENDING"
    GIVEN = "GIVEN"
    SKIPPED = "SKIPPED"
    MISSED = "MISSED"


class ShareResourceType(StrEnum):
    CARE_CARD = "CARE_CARD"
    VET_BRIEF = "VET_BRIEF"


class DeletionRequestStatus(StrEnum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
