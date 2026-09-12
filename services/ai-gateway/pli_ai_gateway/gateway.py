"""Pet Life Intelligence AI Gateway.

Boundary contract (docs/05):
- AI is never the source of truth; outputs are AI_DERIVED observations only.
- Output schemas contain NO triage / diagnosis / medication-change fields.
- Every invocation returns provider/model/prompt/schema version metadata.
- v0.1 ships a deterministic offline MockProvider; a real provider can be
  added without touching callers.
"""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict, Field, ValidationError


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


CAPABILITY_SCHEMAS: dict[str, type[BaseModel]] = {
    "intake_questions": IntakeQuestionsResult,
    "extract_observations": ExtractObservationsResult,
    "summarize_timeline": TimelineSummaryResult,
    "vet_brief_draft": VetBriefDraft,
}

PROMPT_VERSION = "v0.1.0"
SCHEMA_VERSION = "1.0.0"
DISCLAIMER = (
    "AI 整理自主人报告与历史记录，仅供参考，不构成诊断；"
    "紧急程度以独立规则引擎与兽医判断为准。"
)


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

    @property
    def validated(self) -> BaseModel:
        return self._validated  # type: ignore[attr-defined]


class Provider(Protocol):
    name: str
    model: str

    def invoke(self, capability: str, context: dict[str, Any]) -> dict[str, Any]:
        ...


# --- deterministic mock provider ------------------------------------------


_DURATION_TOKENS = ("天", "小时", "分钟", "周", "day", "hour", "minute", "week")
_QUANTITY_TOKENS = ("次", "毫升", "克", "公斤", "度", "ml", "kg")


def _extract_clauses(text: str) -> list[str]:
    import re

    parts = re.split(r"[。；;，,\n]+", text or "")
    return [p.strip() for p in parts if p.strip()]


class MockProvider:
    """Deterministic offline provider. Never invents facts: every observation
    is a verbatim clause from the provided text, labeled as owner report."""

    name = "mock"
    model = "mock-v1"

    def invoke(self, capability: str, context: dict[str, Any]) -> dict[str, Any]:
        if capability == "intake_questions":
            return self._intake_questions(context)
        if capability == "extract_observations":
            return self._extract_observations(context)
        if capability == "summarize_timeline":
            return self._summarize_timeline(context)
        if capability == "vet_brief_draft":
            return self._vet_brief_draft(context)
        raise GatewayError(f"Unknown capability: {capability}")

    def _intake_questions(self, ctx: dict[str, Any]) -> dict[str, Any]:
        species = str(ctx.get("species", "other"))
        complaint = str(ctx.get("chief_complaint", ""))
        questions = [
            {"id": "onset", "question": f"这个情况最早是什么时候出现的？持续多久了？", "why": "onset/duration"},
            {"id": "appetite", "question": "最近吃饭喝水和平时比有变化吗？", "why": "appetite/hydration"},
            {"id": "elimination", "question": "排尿排便是否正常？有没有异常颜色或次数变化？", "why": "elimination"},
            {"id": "activity", "question": "精神和活动量跟平时比怎么样？", "why": "activity"},
            {"id": "meds", "question": "目前正在服用或最近用过的药物有哪些？", "why": "medication history"},
        ]
        if species == "cat" and ("尿" in complaint or "砂" in complaint):
            questions.append(
                {"id": "urination_detail", "question": "它蹲猫砂盆的频率如何？每次有没有尿？大概多少？", "why": "urinary pattern"}
            )
        if "吐" in complaint or "vomit" in complaint.lower():
            questions.append(
                {"id": "vomit_detail", "question": "呕吐了几次？呕吐物里有什么（食物/黄水/血丝/异物）？", "why": "vomit characterization"}
            )
        return {"questions": questions, "disclaimer": DISCLAIMER}

    def _extract_observations(self, ctx: dict[str, Any]) -> dict[str, Any]:
        texts = list(ctx.get("texts") or [])
        observations: list[dict[str, Any]] = []
        for text in texts:
            for clause in _extract_clauses(str(text)):
                lowered = clause.lower()
                has_signal = (
                    any(t in clause for t in _DURATION_TOKENS)
                    or any(t in clause for t in _QUANTITY_TOKENS)
                    or any(k in lowered for k in (
                        "血", "吐", "泻", "尿", "抽", "喘", "肿", "不", "没有", "发烧", " violet ",
                        "bleed", "vomit", "urin", "breath", "lump", "swell",
                    ))
                )
                if has_signal and len(clause) >= 4:
                    observations.append(
                        {
                            "text": f"主人报告：{clause}",
                            "category": "owner_report",
                            "quote": clause,
                        }
                    )
        return {"observations": observations[:20], "disclaimer": DISCLAIMER}

    def _summarize_timeline(self, ctx: dict[str, Any]) -> dict[str, Any]:
        facts = list(ctx.get("facts") or [])
        if not facts:
            return {
                "summary": "没有可汇总的记录。",
                "fact_count": 0,
                "disclaimer": DISCLAIMER,
            }
        lines = [f"- {str(f)}" for f in facts[:30]]
        return {
            "summary": "近期记录（按提供的事实整理）：\n" + "\n".join(lines),
            "fact_count": len(facts),
            "disclaimer": DISCLAIMER,
        }

    def _vet_brief_draft(self, ctx: dict[str, Any]) -> dict[str, Any]:
        chief = str(ctx.get("chief_complaint", ""))
        findings = [str(f) for f in (ctx.get("findings") or [])]
        narrative_parts = [
            f"主诉：{chief}" if chief else "主诉：（未提供）",
            "关键观察：" + ("；".join(findings) if findings else "（无）"),
        ]
        return {
            "chief_complaint": chief,
            "narrative": "\n".join(narrative_parts),
            "key_findings": findings[:20],
            "disclaimer": DISCLAIMER,
        }


class AIProviderMockBroken(MockProvider):
    """Test fixture provider that always fails — used for fallback tests."""

    name = "mock-broken"
    model = "mock-broken-v1"

    def invoke(self, capability: str, context: dict[str, Any]) -> dict[str, Any]:
        raise RuntimeError("simulated provider outage")


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
        result._validated = validated  # type: ignore[attr-defined]
        return result


_default_gateway: Gateway | None = None


def get_default_gateway() -> Gateway:
    global _default_gateway
    if _default_gateway is None:
        _default_gateway = Gateway()
    return _default_gateway


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
