"""Real LLM provider (OpenAI-compatible chat completions) for the AI Gateway.

Stays behind the same Provider protocol; the Gateway validates schema and
rejects decision fields. JSON output is requested via response_format
(json_object) where supported; on failure the Gateway falls back to
MockProvider so core product keeps working.

Config (env):
  AI_PROVIDER=openai_compatible
  AI_API_KEY=<secret>
  AI_MODEL=<e.g. deepseek-chat / gpt-4o-mini>
  AI_BASE_URL=https://api.openai.com/v1   (optional; default OpenAI)
  AI_TIMEOUT_SECONDS=30
  AI_MAX_RETRIES=2

Without a real key this provider raises on init/use; the app keeps running
via the Gateway's MockProvider fallback (honest: provider NOT REAL until key).
"""

from __future__ import annotations

import json
import time
from typing import Any

import httpx

from app.core.config import get_settings

CAPABILITY_PROMPTS: dict[str, str] = {
    "intake_questions": (
        "你是一个宠物健康照护助手。根据主诉与物种，生成 3-6 个用于追问的"
        "结构化问题。仅输出 JSON，不要输出其他文字。格式："
        '{"questions":[{"id":"kebab-case-id","question":"中文问题",'
        '"why":"为什么问"}],"disclaimer":"简短免责声明"}。'
    ),
    "extract_observations": (
        "你是宠物健康记录整理助手。从主人提供的文字中提取可观察事实，"
        "不得推断诊断，不得添加原文没有的内容。仅输出 JSON。格式："
        '{"observations":[{"text":"事实（中文）","category":"owner_report",'
        '"quote":"原文引用"}],"disclaimer":"简短免责声明"}。'
    ),
    "summarize_timeline": (
        "你是宠物生活记录汇总助手。根据提供的事件事实列表生成简洁中文摘要。"
        "只依据给定事实，不编造。仅输出 JSON。格式："
        '{"summary":"摘要","fact_count":<数字>,"disclaimer":"简短免责声明"}。'
    ),
    "vet_brief_draft": (
        "你是宠物就诊摘要整理助手。根据主诉与关键观察生成就诊前摘要草稿，"
        "供主人带去看兽医。明确这是信息整理而非诊断。仅输出 JSON。格式："
        '{"chief_complaint":"主诉","narrative":"叙述","key_findings":["..."],'
        '"disclaimer":"简短免责声明"}。'
    ),
    "answer_with_evidence": (
        "你是宠物生活记录问答助手。只根据提供的证据（每条约含日期、事件类型、"
        "描述）回答问题。若证据不足，必须声明不足，绝不编造。仅输出 JSON。格式："
        '{"answer":"中文回答","citations":["证据id"],"sufficient":true或false,'
        '"disclaimer":"简短免责声明"}。'
    ),
    "behavior_advice": (
        "你是宠物行为训练助手（奖励式、正向强化）。给出建议列表；"
        "对任何惩罚/暴力/危险方法必须过滤并记录理由。仅输出 JSON。格式："
        '{"advice":["..."],"filtered_reasons":["..."],"disclaimer":"简短免责声明"}。'
    ),
}

_DISCLAIMER = (
    "AI 整理自主人报告与历史记录，仅供参考，不构成诊断；"
    "紧急程度以独立规则引擎与兽医判断为准。"
)


class OpenAICompatibleProvider:
    """Real LLM provider via OpenAI-compatible chat completions API."""

    name = "openai_compatible"

    def __init__(self) -> None:
        settings = get_settings()
        self.model = settings.ai_model
        self.api_key = settings.ai_api_key
        self.base_url = settings.ai_base_url or "https://api.openai.com/v1"
        self.timeout = settings.ai_timeout_seconds
        self.max_retries = settings.ai_max_retries

    @property
    def ready(self) -> bool:
        return bool(self.api_key) and self.api_key != "CHANGE_ME"

    def invoke(self, capability: str, context: dict[str, Any]) -> dict[str, Any]:
        if not self.ready:
            raise RuntimeError(
                "OpenAICompatibleProvider not ready: AI_API_KEY missing. "
                "Falling back to MockProvider."
            )
        prompt = CAPABILITY_PROMPTS[capability]
        system = (
            "你是 Pet Life Intelligence 的 AI 助手。所有回答只基于提供的信息，"
            "绝不编造。绝不输出诊断、triage、emergency、用药变更等医疗决策字段。"
            "始终输出合法 JSON。"
        )
        user_payload = json.dumps(context, ensure_ascii=False)
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": f"{prompt}\n\n上下文数据:\n{user_payload}"},
        ]
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        body = self._post_with_retry(f"{self.base_url}/chat/completions", headers, payload)
        content = body["choices"][0]["message"]["content"]
        parsed = self._parse_json(content)
        if isinstance(parsed, dict):
            parsed.setdefault("disclaimer", _DISCLAIMER)
        return parsed

    def _post_with_retry(self, url: str, headers: dict, payload: dict) -> dict:
        last_exc: Exception | None = None
        for attempt in range(self.max_retries + 1):
            try:
                with httpx.Client(timeout=self.timeout) as client:
                    resp = client.post(url, headers=headers, json=payload)
                if resp.status_code >= 400:
                    last_exc = RuntimeError(f"LLM API {resp.status_code}: {resp.text[:200]}")
                    continue
                return resp.json()
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                if attempt < self.max_retries:
                    time.sleep(0.5 * (attempt + 1))
        raise RuntimeError(f"LLM provider failed after retries: {last_exc}")

    @staticmethod
    def _parse_json(content: str) -> dict:
        # some providers wrap JSON in ```json fences or prose
        text = content.strip()
        if text.startswith("```"):
            text = text.strip("`")
            text = text.removeprefix("json").strip()
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1:
            text = text[start : end + 1]
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"LLM output not valid JSON: {exc}") from exc


def build_gateway() -> tuple[Any, Any]:
    """Build (primary_provider, fallback_provider) from config.

    primary: OpenAICompatibleProvider when AI_PROVIDER=openai_compatible,
             else MockProvider. fallback: always MockProvider.
    The Gateway handles primary failure → fallback automatically.
    """
    from pli_ai_gateway import MockProvider

    settings = get_settings()
    if settings.ai_provider == "openai_compatible":
        return OpenAICompatibleProvider(), MockProvider()
    return MockProvider(), MockProvider()


def provider_status() -> dict:
    settings = get_settings()
    if settings.ai_provider != "openai_compatible":
        return {"provider": "mock", "real": False, "reason": "AI_PROVIDER=mock"}
    p = OpenAICompatibleProvider()
    if p.ready:
        return {"provider": "openai_compatible", "model": p.model,
                "real": True, "base_url": p.base_url}
    return {"provider": "openai_compatible", "model": p.model,
            "real": False,
            "reason": "AI_API_KEY missing (EXTERNAL_BLOCKED until real key)"}
