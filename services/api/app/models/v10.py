"""v1.0 models (Stage C, 88 P2). External-dependent capabilities are
implemented as adapter interfaces + sandbox providers + feature flags; no
pretended real integrations (GOAL Stage C 外部集成原则).

Aggregator: re-exports the v1.0 model classes split across the v10_*
modules so ``from app.models.v10 import X`` keeps working. ``Base`` is
re-exported for parity with the original module namespace."""

from app.models.base import Base
from app.models.v10_automation import (
    AutomationRule,
    MergeRequest,
    ProfessionalLink,
    TransferRequest,
)
from app.models.v10_devices import DeviceEvent, FeatureFlag, PetDevice
from app.models.v10_services import (
    AgentActionLog,
    CapabilityRegistry,
    ExperimentAssignment,
    HouseholdExpenseSplit,
    InsurancePolicyRecord,
    ServiceRequest,
)
from app.models.v10_welfare import (
    BehaviorInterventionPlan,
    WelfareObservation,
    WelfareProfile,
)

__all__ = [
    "AgentActionLog",
    "AutomationRule",
    "Base",
    "BehaviorInterventionPlan",
    "CapabilityRegistry",
    "DeviceEvent",
    "ExperimentAssignment",
    "FeatureFlag",
    "HouseholdExpenseSplit",
    "InsurancePolicyRecord",
    "MergeRequest",
    "PetDevice",
    "ProfessionalLink",
    "ServiceRequest",
    "TransferRequest",
    "WelfareObservation",
    "WelfareProfile",
]
