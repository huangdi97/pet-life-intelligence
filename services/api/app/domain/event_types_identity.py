"""Identity / platform event payloads (PLI-211).

Strict system-generated payload schemas: extra fields are rejected
server-side (AGENTS.md §3).
"""

from app.domain.event_types import _Strict


class IdentifierAddedPayload(_Strict):
    identifier_type: str
    verified: bool = False


class DiaryCreatedPayload(_Strict):
    diary_id: str
    has_audio: bool = False


class SummaryGeneratedPayload(_Strict):
    summary_id: str
    date: str = ""
    fact_count: int = 0


class VisualModelGeneratedPayload(_Strict):
    """Stage H.2: 3D generation enqueued for this pet (GENERATED_3D provenance)."""

    version: int
    provider: str = ""
    status: str = "GENERATING"


class VisualModelActivatedPayload(_Strict):
    """Stage H.2: 3D model activated after owner identity verification."""

    version: int
    provenance: str = "GENERATED_3D"


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
