"""Daily-life event payloads (PLI-211).

Schemas are canonical: the frontend may not invent event payload fields
(AGENTS.md §3). Amounts/units are transported as strings — never bare floats.
"""

from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.domain.event_types import _amount_str, _Strict


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


class SleepPayload(_Strict):
    duration_minutes: int = Field(default=0, ge=0, le=24 * 60)
    quality: str = ""
    notes: str = ""


DAILY_EVENT_TYPES["daily.sleep"] = (SleepPayload, "sleep/rest (PLI-024)")


class PetStatusPayload(_Strict):
    status: str
    previous: str = ""
    note: str = ""


class ChecklistUpdatedPayload(_Strict):
    handoff_id: str
    items: int | None = None
    index: int | None = None
    done: bool | None = None


class ReminderPayload(_Strict):
    reminder_id: str
    kind: str
    due_date: str | None = None


class RecordImportedPayload(_Strict):
    record_id: str
    kind: str
    source_type: str = ""


class RecoveryPlanPayload(_Strict):
    plan_id: str
    items: int = 0


class TrainingGoalPayload(_Strict):
    goal_id: str
    title: str = ""


class TrainingSessionPayload(_Strict):
    session_id: str
    goal_id: str | None = None
    duration_minutes: int = 0


class FriendRequestedPayload(_Strict):
    friend_pet_id: str
    request_id: str = ""


class InteractionPayload(_Strict):
    interaction_id: str
    friend_pet_id: str
    quality: str = ""


class SocialBlockedPayload(_Strict):
    friend_pet_id: str
    action: str = "BLOCK"


class ExpenseLoggedPayload(_Strict):
    expense_id: str
    category: str
    amount: str = ""
    currency: str = "CNY"


class MilestonePayload(_Strict):
    milestone_id: str
    title: str = ""
    kind: str = "OTHER"


class PetAskedPayload(_Strict):
    question: str = ""
    sufficient: bool = False
    citations: list[str] = []


class AdviceFilteredPayload(_Strict):
    count: int = 0
    reasons: list[str] = []
