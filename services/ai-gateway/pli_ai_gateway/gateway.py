"""Pet Life Intelligence AI Gateway.

Boundary contract (docs/05):
- AI is never the source of truth; outputs are AI_DERIVED observations only.
- Output schemas contain NO triage / diagnosis / medication-change fields.
- Every invocation returns provider/model/prompt/schema version metadata.
- v0.1 ships a deterministic offline MockProvider (see gateway_mock_provider);
  a real provider can be added without touching callers.
"""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from .gateway_mock_provider import (
    DISCLAIMER,
    UNSAFE_ADVICE_PATTERNS,
    AIProviderMockBroken,
    MockProvider,
)

__all__ = [
    "AIProviderMockBroken",
    "CAPABILITY_SCHEMAS",
    "DISCLAIMER",
    "Gateway",
    "GatewayError",
    "GatewayMetadata",
    "GatewayResult",
    "MockProvider",
    "OutputSchemaError",
    "PROMPT_VERSION",
    "Provider",
    "SCHEMA_VERSION",
    "UNSAFE_ADVICE_PATTERNS",
    "get_default_gateway",
    "utc_now_iso",
]


class GatewayError(Exception):
    pass


class OutputSchemaError(GatewayError):
    pass


# --- output schemas (strict: no medical decision fields) ------------------


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class IntakeQuestion(_Strict):
    id: str
    question: str
    why: str


class IntakeQuestionsResult(_Strict):
    questions: list[IntakeQuestion] = Field(default_factory=list)
    disclaimer: str = ""


class ExtractedObservation(_Strict):
    text: str
    category: str = "general"
    quote: str = ""


class ExtractObservationsResult(_Strict):
    observations: list[ExtractedObservation] = Field(default_factory=list)
    disclaimer: str = ""


class TimelineSummaryResult(_Strict):
    summary: str
    fact_count: int = 0
    disclaimer: str = ""


class VetBriefDraft(_Strict):
    chief_complaint: str = ""
    narrative: str = ""
    key_findings: list[str] = Field(default_factory=list)
    disclaimer: str = ""


class EvidenceAnswer(_Strict):
    """PLI-197/190: answer must cite provided evidence; when nothing matches,
    says so instead of inventing history."""

    answer: str
    citations: list[str] = Field(default_factory=list)
    sufficient: bool = True
    disclaimer: str = ""


class BehaviorAdvice(_Strict):
    """PLI-084: advice lines + safety filter verdicts. Reward-based only."""

    advice: list[str] = Field(default_factory=list)
    filtered_reasons: list[str] = Field(default_factory=list)
    disclaimer: str = ""


CAPABILITY_SCHEMAS: dict[str, type[BaseModel]] = {
    "intake_questions": IntakeQuestionsResult,
    "extract_observations": ExtractObservationsResult,
    "summarize_timeline": TimelineSummaryResult,
    "vet_brief_draft": VetBriefDraft,
    "answer_with_evidence": EvidenceAnswer,
    "behavior_advice": BehaviorAdvice,
}

PROMPT_VERSION = "v0.2.0"
SCHEMA_VERSION = "1.0.0"


class GatewayMetadata(BaseModel):
    provider: str
    model: str
    prompt_version: str
    schema_version: str
    trace_id: str
    capability: str
    latency_ms: int
    fallback_used: bool = False
    safety_flags: list[str] = Field(default_factory=list)


class GatewayResult(BaseModel):
    result: dict[str, Any]
    metadata: GatewayMetadata


class Provider(Protocol):
    name: str
    model: str

    def invoke(self, capability: str, context: dict[str, Any]) -> dict[str, Any]:
        ...


# --- gateway ---------------------------------------------------------------


class Gateway:
    """Validates provider output against capability schema and attaches
    metadata. If the primary provider raises, falls back to the fallback
    provider (default: MockProvider) and marks fallback_used=True."""

    def __init__(self, provider: Provider | None = None,
                 fallback: Provider | None = None) -> None:
        self.provider = provider or MockProvider()
        self.fallback = fallback or MockProvider()

    def invoke(self, capability: str, context: dict[str, Any]) -> GatewayResult:
        schema = CAPABILITY_SCHEMAS.get(capability)
        if schema is None:
            raise GatewayError(f"Unknown capability: {capability}")

        started = time.perf_counter()
        fallback_used = False
        try:
            raw = self.provider.invoke(capability, context)
        except Exception:
            fallback_used = True
            raw = self.fallback.invoke(capability, context)
        latency_ms = int((time.perf_counter() - started) * 1000)

        try:
            validated = schema.model_validate(raw)
        except ValidationError as exc:
            raise OutputSchemaError(
                f"Provider output failed schema validation for {capability}: {exc.errors()[:5]}"
            ) from exc

        # Safety invariant: output must not contain decision fields.
        dumped = validated.model_dump()
        forbidden = {"triage", "diagnosis", "emergency", "medication_change", "stop_medication"}
        leaked = forbidden & set(dumped.keys())
        if leaked:
            raise OutputSchemaError(f"Provider output contains forbidden decision fields: {leaked}")

        meta = GatewayMetadata(
            provider=self.provider.name if not fallback_used else self.fallback.name,
            model=self.provider.model if not fallback_used else self.fallback.model,
            prompt_version=PROMPT_VERSION,
            schema_version=SCHEMA_VERSION,
            trace_id=uuid.uuid4().hex,
            capability=capability,
            latency_ms=latency_ms,
            fallback_used=fallback_used,
            safety_flags=[],
        )
        result = GatewayResult(result=dumped, metadata=meta)
        return result


_default_gateway: Gateway | None = None


def get_default_gateway() -> Gateway:
    global _default_gateway
    if _default_gateway is None:
        _default_gateway = Gateway()
    return _default_gateway


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
