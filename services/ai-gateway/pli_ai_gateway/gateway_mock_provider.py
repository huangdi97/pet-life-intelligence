"""Deterministic offline mock provider for the PLI AI Gateway.

The mock's output shapes are contract-tested: they mirror what a real
provider must return for each capability. Never change the shapes or the
DISCLAIMER / UNSAFE_ADVICE_PATTERNS constants without updating the
contract tests.
"""

from __future__ import annotations

from typing import Any

# SAFETY:
# PLI-084 forbidden advice patterns (punishment/aversive/dangerous methods).
# This is the mock path's safety filter: candidates matching any pattern are
# dropped from behavior advice and reported in filtered_reasons instead.
UNSAFE_ADVICE_PATTERNS = (
    "电击", "打骂", "惩罚", "揍", "暴力", " dominance", "_alpha", "shock collar",
    "prong collar", "choke chain", "punish", "hit the dog", "alpha roll",
    "断食", "禁水", "starve",
)

DISCLAIMER = (
    "AI 整理自主人报告与历史记录，仅供参考，不构成诊断；"
    "紧急程度以独立规则引擎与兽医判断为准。"
)

_DURATION_TOKENS = ("多天", "天没", "天了", "小时", "分钟", "周", "day", "hour", "minute", "week")
_QUANTITY_TOKENS = ("次", "毫升", "克", "公斤", "度", "ml", "kg")


def _extract_clauses(text: str) -> list[str]:
    import re

    parts = re.split(r"[。；;，,\n]+", text or "")
    return [p.strip() for p in parts if p.strip()]


# PROVIDER:
# Deterministic offline provider — the default fallback for every Gateway.
# A real provider adapter can be added without touching callers.
class MockProvider:
    """Deterministic offline provider. Never invents facts: every observation
    is a verbatim clause from the provided text, labeled as owner report."""

    name = "mock"
    model = "mock-v1"

    def invoke(self, capability: str, context: dict[str, Any]) -> dict[str, Any]:
        # Imported at call time only: pli_ai_gateway.gateway imports this
        # module at module level and re-exports it, so a module-level import
        # here would create an import cycle.
        from pli_ai_gateway.gateway import GatewayError

        if capability == "intake_questions":
            return self._intake_questions(context)
        if capability == "extract_observations":
            return self._extract_observations(context)
        if capability == "summarize_timeline":
            return self._summarize_timeline(context)
        if capability == "vet_brief_draft":
            return self._vet_brief_draft(context)
        if capability == "answer_with_evidence":
            return self._answer_with_evidence(context)
        if capability == "behavior_advice":
            return self._behavior_advice(context)
        raise GatewayError(f"Unknown capability: {capability}")

    def _intake_questions(self, ctx: dict[str, Any]) -> dict[str, Any]:
        species = str(ctx.get("species", "other"))
        complaint = str(ctx.get("chief_complaint", ""))
        questions = [
            {"id": "onset", "question": "这个情况最早是什么时候出现的？持续多久了？", "why": "onset/duration"},
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
                        "血", "吐", "泻", "尿", "抽", "喘", "肿", "痛", "咳",
                        "不吃", "不喝", "没有", "异常", "发烧", "发烧",
                        "bleed", "vomit", "urin", "breath", "lump", "swell",
                        "pain", "cough", "fever",
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

    def _answer_with_evidence(self, ctx: dict[str, Any]) -> dict[str, Any]:
        """Personal QA (PLI-197): answers strictly from provided evidence
        chunks (each already a canonical event summary). If nothing matches
        the question keywords, declares insufficiency — never invents."""
        import re

        question = str(ctx.get("question", ""))
        evidence = list(ctx.get("evidence") or [])  # [{id, text}]
        # crude zh/en tokenisation: drop common function words, keep >=2 char tokens
        particles = (
            "最近|有什么|什么|怎么|怎么样|如何|请问|一下|一些|情况|使用|过程|"
            "历史|记录|吗|呢|吧|啊|的|了|是|在|有|和|与|我|它|他|她|请|这|那"
        )
        tokens = [t for t in re.sub(particles, "|", question).split("|") if len(t) >= 2]
        if not tokens:
            tokens = [question.strip()[:4]] if question.strip() else []
        matched = []
        for ev in evidence:
            text = str(ev.get("text", ""))
            if any(tok in text for tok in tokens):
                matched.append(ev)
        if not matched:
            return {
                "answer": "在现有记录中没有找到与问题相关的证据，无法回答。"
                          "请补充记录后再试。",
                "citations": [],
                "sufficient": False,
                "disclaimer": DISCLAIMER,
            }
        citations = [str(ev.get("id")) for ev in matched[:5]]
        lines = [str(ev.get("text")) for ev in matched[:5]]
        return {
            "answer": "根据以下记录：" + "；".join(lines),
            "citations": citations,
            "sufficient": True,
            "disclaimer": DISCLAIMER,
        }

    def _behavior_advice(self, ctx: dict[str, Any]) -> dict[str, Any]:
        """PLI-084: reward-based advice candidates + safety filter verdicts.
        Unsafe candidates are dropped and reasons recorded."""
        candidates = [str(c) for c in (ctx.get("advice_candidates") or [])]
        kept: list[str] = []
        reasons: list[str] = []
        lowered = [c.lower() for c in candidates]
        for cand, low in zip(candidates, lowered, strict=False):
            hit = next((p for p in UNSAFE_ADVICE_PATTERNS
                        if p.lower() in low), None)
            if hit:
                reasons.append(f"blocked unsafe advice (matched '{hit}')")
            else:
                kept.append(cand)
        base = [
            "使用奖励（零食/玩具/表扬）在安静环境中逐步建立目标行为。",
            "每次训练保持短时多次（3-5分钟），以宠物自愿参与为前提。",
        ]
        advice = (kept + base)[:6]
        return {"advice": advice, "filtered_reasons": reasons, "disclaimer": DISCLAIMER}


class AIProviderMockBroken(MockProvider):
    """Test fixture provider that always fails — used for fallback tests."""

    name = "mock-broken"
    model = "mock-broken-v1"

    def invoke(self, capability: str, context: dict[str, Any]) -> dict[str, Any]:
        raise RuntimeError("simulated provider outage")
