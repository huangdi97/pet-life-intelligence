"""Shared intake questions, request schemas, and event-lookup helper for the
health routes (PLI-049..056, PLI-063).

Pure refactor of app/api/routes/health.py; content kept verbatim.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field
from sqlalchemy import select

from app.core.errors import NotFound
from app.models import HealthEvent
from app.services import permissions as perm

INTAKE_QUESTIONS = [
    {"id": "onset_detail", "question": "最早什么时候发现？持续多久了？"},
    {"id": "appetite", "question": "吃饭喝水与平时相比有何变化？"},
    {"id": "elimination", "question": "排尿排便有无异常？"},
    {"id": "activity", "question": "精神与活动量如何？"},
    {"id": "medication", "question": "目前或最近用过的药物？"},
]


class HealthEventCreate(BaseModel):
    """GOAL 7.4 schema safety: decision fields (diagnosis / triage_override /
    emergency_override / treatment_order) can never enter through this
    payload — unknown fields are rejected outright."""

    model_config = {"extra": "forbid"}

    chief_complaint: str = Field(min_length=1)
    onset_at: datetime | None = None
    duration_text: str = ""
    eating: str = "UNKNOWN"
    drinking: str = "UNKNOWN"
    elimination: str = "UNKNOWN"
    activity: str = "UNKNOWN"
    current_meds_text: str = ""
    relevant_history_text: str = ""
    owner_notes: str = ""
    artifact_ids: list[uuid.UUID] = Field(default_factory=list)


class AnswersIn(BaseModel):
    answers: list[dict] = Field(min_length=1)


class ObservationsIn(BaseModel):
    texts: list[str] = Field(min_length=1)
    use_ai: bool = True


class TriageIn(BaseModel):
    note: str = ""


class ShareIn(BaseModel):
    expires_in_hours: int = Field(default=72, ge=1, le=24 * 14)


class OutcomeIn(BaseModel):
    outcome: str
    notes: str = ""


async def get_health_event_for_user(db, health_event_id, user, capability):
    he = (
        await db.execute(select(HealthEvent).where(HealthEvent.id == health_event_id))
    ).scalar_one_or_none()
    if he is None:
        raise NotFound(f"Health event {health_event_id} not found.")
    pet = await perm.get_pet_or_404(db, he.pet_id)
    await perm.require_capability(db, pet, user.id, capability)
    return he, pet
