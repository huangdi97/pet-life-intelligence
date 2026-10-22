"""Authorization-aware LifeEvent query visibility.

The canonical LifeEvent fabric contains both everyday pet-life observations and
medical/medication events. DAILY_READ alone must never expose clinical event
payloads to timelines, search, memories or AI evidence inputs.
"""
from app.domain import enums
from app.domain.event_types import EVENT_REGISTRY
from app.models import LifeEvent

MEDICAL_EVENT_TYPES = frozenset(
    name
    for name, definition in EVENT_REGISTRY.items()
    if definition.domain in {"health", "medication"}
)


def can_read_medical(capabilities: set[str]) -> bool:
    return enums.Capability.MEDICAL_READ.value in capabilities


def scope_life_event_stmt(stmt, capabilities: set[str]):
    """Apply medical visibility BEFORE querying/serializing LifeEvents."""
    if can_read_medical(capabilities):
        return stmt
    return stmt.where(LifeEvent.event_type.not_in(MEDICAL_EVENT_TYPES))


def event_visible(event: LifeEvent, capabilities: set[str]) -> bool:
    return can_read_medical(capabilities) or event.event_type not in MEDICAL_EVENT_TYPES
