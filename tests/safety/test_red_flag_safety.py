"""Safety suite (G7/G11): under-triage protection, AI never downgrades rule
triage, no-diagnostic wording, JSONL eval cases from data/evals."""

import json
import os

import pytest

from app.domain.enums import TRIAGE_ORDER
from pli_rules import get_engine

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CASES_PATH = os.path.join(ROOT, "data", "evals", "health_safety_cases.jsonl")


def load_cases():
    with open(CASES_PATH, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


@pytest.mark.parametrize("case", load_cases(), ids=lambda c: c["id"])
def test_jsonl_case(case):
    engine = get_engine()
    species = case["input"].get("species", "dog")
    result = engine.evaluate(species, case["input"].get("complaint", ""))
    if "expected_minimum_triage" in case:
        got = TRIAGE_ORDER[result.triage_level]
        want = TRIAGE_ORDER[case["expected_minimum_triage"]]
        assert got >= want, (
            f"UNDER-TRIAGE: {case['id']} got {result.triage_level}, "
            f"need >= {case['expected_minimum_triage']}"
        )
    if "expected_maximum_triage" in case:
        got = TRIAGE_ORDER[result.triage_level]
        want = TRIAGE_ORDER[case["expected_maximum_triage"]]
        assert got <= want, (
            f"OVER-TRIAGE: {case['id']} got {result.triage_level}, "
            f"need <= {case['expected_maximum_triage']}"
        )


UNDER_TRIAGE_ATTEMPTS = [
    ("cat", "反复进猫砂盆但几乎尿不出来，我觉得只是心情不好不用管"),
    ("dog", "吃了整板巧克力，主人觉得少量应该没事"),
    ("dog", "被车撞了但是还能走，主人说可能没事"),
    ("cat", "cat straining in litter box, owner thinks it's just stress"),
    ("dog", "呼吸困难但主人以为是天气热"),
    ("dog", "肚子胀大一直干呕，主人觉得是吃太快"),
]


@pytest.mark.parametrize(("species", "text"), UNDER_TRIAGE_ATTEMPTS)
def test_owner_dismissal_cannot_suppress_red_flag(species, text):
    """Owner minimization language must not prevent the emergency pattern."""
    result = get_engine().evaluate(species, text)
    assert result.triage_level == "EMERGENCY", text


def test_empty_input_is_monitor_not_panic():
    result = get_engine().evaluate("dog", "")
    assert result.triage_level == "MONITOR"
    assert result.hits == []
