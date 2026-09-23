"""v0.2 models: identity extensions, baselines, diary, summaries, care
deepening, health records/plans/reminders, preferences, training, social,
nutrition, finance, milestones, content versions, analytics, incidents.

Feature IDs annotated per model (GOAL_全量连续执行 Stage B).

Aggregator: re-exports the v0.2 model classes split across the v02_*
modules so ``from app.models.v02 import X`` keeps working. ``Base`` is
re-exported because existing consumers access ``app.models.v02.Base``."""

from app.models.base import Base
from app.models.v02_care import (
    CareReminder,
    HealthRecord,
    PetPreference,
    RecoveryPlan,
)
from app.models.v02_finance import (
    AnalyticsCounter,
    ContentVersion,
    DietProfile,
    Expense,
    Incident,
    Milestone,
)
from app.models.v02_identity import (
    Baseline,
    DailySummary,
    DiaryEntry,
    PetIdentifier,
)
from app.models.v02_social import (
    PetFriend,
    SocialInteraction,
    SocialProfile,
    SocialReport,
)
from app.models.v02_training import TrainingGoal, TrainingSession

__all__ = [
    "AnalyticsCounter",
    "Baseline",
    "Base",
    "CareReminder",
    "ContentVersion",
    "DailySummary",
    "DiaryEntry",
    "DietProfile",
    "Expense",
    "HealthRecord",
    "Incident",
    "Milestone",
    "PetFriend",
    "PetIdentifier",
    "PetPreference",
    "RecoveryPlan",
    "SocialInteraction",
    "SocialProfile",
    "SocialReport",
    "TrainingGoal",
    "TrainingSession",
]
