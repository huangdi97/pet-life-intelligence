"""Authorization-aware LifeEvent query visibility.

LifeEvent is an append-only fact fabric, not an authorization bypass. Different
domains have different reader requirements and filtering happens BEFORE rows are
serialized, searched, counted or sent to AI evidence.
"""
from app.domain import enums
from app.domain.event_types import EVENT_REGISTRY
from app.models import LifeEvent

MEDICAL_EVENT_TYPES = frozenset(
    name
    for name, definition in EVENT_REGISTRY.items()
    if definition.domain in {"health", "medication"}
)

# Administrative facts expose household identity/authorization/platform state or
# private finance or private AI interaction history. They remain available through their dedicated guarded APIs,
# but a daily-only caregiver must not discover them through the generic life feed.
ADMIN_EVENT_TYPES = frozenset(
    name
    for name, definition in EVENT_REGISTRY.items()
    if definition.domain in {"identity", "platform", "finance", "agent"}
)


def can_read_medical(capabilities: set[str]) -> bool:
    return enums.Capability.MEDICAL_READ.value in capabilities


def can_read_admin(capabilities: set[str]) -> bool:
    return enums.Capability.MANAGE_PET.value in capabilities


def hidden_event_types(capabilities: set[str]) -> frozenset[str]:
    hidden: set[str] = set()
    if not can_read_medical(capabilities):
        hidden.update(MEDICAL_EVENT_TYPES)
    if not can_read_admin(capabilities):
        hidden.update(ADMIN_EVENT_TYPES)
    return frozenset(hidden)


def scope_life_event_stmt(stmt, capabilities: set[str]):
    """Apply domain visibility BEFORE querying/serializing LifeEvents."""
    hidden = hidden_event_types(capabilities)
    if not hidden:
        return stmt
    return stmt.where(LifeEvent.event_type.not_in(hidden))


def event_visible(event: LifeEvent, capabilities: set[str]) -> bool:
    return event.event_type not in hidden_event_types(capabilities)
