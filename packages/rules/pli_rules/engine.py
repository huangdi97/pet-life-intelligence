"""Pet Life Intelligence — Red Flag Rule Engine.

Independent, deterministic, versioned. RULES FIRST: the LLM must never be
able to lower the triage level produced here (docs/05, GOAL §11.3).
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from importlib import resources
from typing import Any

TRIAGE_RANK = {"MONITOR": 0, "VET_SOON": 1, "URGENT": 2, "EMERGENCY": 3}


def max_level(a: str, b: str) -> str:
    """Return the higher of two triage levels (safety: never downgrade)."""
    if a not in TRIAGE_RANK or b not in TRIAGE_RANK:
        raise ValueError(f"Unknown triage level in ({a}, {b})")
    return a if TRIAGE_RANK[a] >= TRIAGE_RANK[b] else b


@dataclass(frozen=True)
class Rule:
    rule_id: str
    version: str
    species: tuple[str, ...]
    triage: str
    description: str
    any_keywords: tuple[str, ...]

    def matches(self, species: str, text: str) -> list[str]:
        if species not in self.species:
            return []
        lowered = text.lower()
        return [kw for kw in self.any_keywords if kw.lower() in lowered]


@dataclass
class RedFlagHit:
    rule_id: str
    rule_version: str
    triage: str
    matched_keywords: list[str]
    description: str


@dataclass
class EvaluationResult:
    triage_level: str
    hits: list[RedFlagHit] = field(default_factory=list)
    engine_name: str = "pli_red_flag_engine"
    engine_version: str = "1.0.0"

    def to_dict(self) -> dict[str, Any]:
        return {
            "triage_level": self.triage_level,
            "engine": self.engine_name,
            "engine_version": self.engine_version,
            "hits": [
                {
                    "rule_id": h.rule_id,
                    "rule_version": h.rule_version,
                    "triage": h.triage,
                    "matched_keywords": h.matched_keywords,
                    "description": h.description,
                }
                for h in self.hits
            ],
        }


class RuleEngine:
    def __init__(self, rules_payload: dict[str, Any]) -> None:
        data = rules_payload
        self.engine_name = data["engine_name"]
        self.engine_version = data["engine_version"]
        self.rules: tuple[Rule, ...] = tuple(
            Rule(
                rule_id=r["rule_id"],
                version=r["version"],
                species=tuple(r["species"]),
                triage=r["triage"],
                description=r["description"],
                any_keywords=tuple(r["any_keywords"]),
            )
            for r in data["rules"]
        )
        ids = [r.rule_id for r in self.rules]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate rule_id in rules data")

    @classmethod
    def load_default(cls) -> "RuleEngine":
        data = json.loads(
            resources.files("pli_rules").joinpath("rules_data.json").read_text("utf-8")
        )
        return cls(data)

    def evaluate(self, species: str, texts: list[str] | str) -> EvaluationResult:
        if isinstance(texts, str):
            texts = [texts]
        combined = "\n".join(t for t in texts if t)
        hits: list[RedFlagHit] = []
        level = "MONITOR"
        for rule in self.rules:
            matched = rule.matches(species, combined)
            if matched:
                hits.append(
                    RedFlagHit(
                        rule_id=rule.rule_id,
                        rule_version=rule.version,
                        triage=rule.triage,
                        matched_keywords=matched,
                        description=rule.description,
                    )
                )
                level = max_level(level, rule.triage)
        return EvaluationResult(
            triage_level=level,
            hits=hits,
            engine_name=self.engine_name,
            engine_version=self.engine_version,
        )


_engine: RuleEngine | None = None


def get_engine() -> RuleEngine:
    global _engine
    if _engine is None:
        _engine = RuleEngine.load_default()
    return _engine
