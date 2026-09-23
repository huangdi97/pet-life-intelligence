"""Care event payloads (PLI-211).

Strict care-workflow payload schemas: extra fields are rejected server-side
(AGENTS.md §3).
"""

from app.domain.event_types import _Strict


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
