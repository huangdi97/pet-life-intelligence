"""All screen contracts validate against the screen-contract JSON schema and
each screen's check points sum to its declared dimension weights (100)."""
from __future__ import annotations

import json
from pathlib import Path

from jsonschema import Draft7Validator

SCHEMA = (
    Path(__file__).resolve().parents[2]
    / "packages/visual-contract/schema/screen-contract.schema.json"
)


def _contracts() -> list[tuple[str, dict]]:
    screens = Path(__file__).resolve().parents[2] / "packages/visual-contract/screens"
    out = []
    for path in sorted(screens.glob("*.json")):
        out.append((path.name, json.loads(path.read_text(encoding="utf-8"))))
    return out


def test_all_contracts_match_schema() -> None:
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    validator = Draft7Validator(schema)
    for name, contract in _contracts():
        errors = list(validator.iter_errors(contract))
        assert not errors, f"{name}: {[e.message for e in errors]}"


def test_dimension_points_sum_to_declared_weights() -> None:
    for name, contract in _contracts():
        by_dim: dict[str, float] = {}
        for check in contract["checks"]:
            by_dim[check["dimension"]] = by_dim.get(check["dimension"], 0.0) + check["points"]
        for dim, weight in contract["dimensions"].items():
            assert abs(by_dim.get(dim, 0.0) - weight) < 1e-6, (
                f"{name}: dimension {dim} points {by_dim.get(dim)} != declared {weight}"
            )
        total = sum(contract["checks"][i]["points"] for i in range(len(contract["checks"])))
        assert abs(total - 100.0) < 1e-6, f"{name}: total points {total} != 100"


def test_critical_ids_exist_in_checks() -> None:
    for name, contract in _contracts():
        ids = {c["id"] for c in contract["checks"]}
        for critical in contract["critical"]:
            assert critical in ids, f"{name}: critical {critical} not in checks"


def test_screens_count() -> None:
    names = {p.name for p in (Path(__file__).resolve().parents[2] / "packages/visual-contract/screens").glob("*.json")}
    required = {
        "today.json", "timeline.json", "pet-world.json", "life-view.json", "assistant.json",
        "me.json", "quick-log.json", "health.json", "behavior.json", "training.json",
        "welfare.json", "social.json", "companion.json", "monitoring.json",
        "twin-capture.json", "twin-review.json", "twin-version.json", "special-states.json",
    }
    assert required <= names, f"missing contracts: {required - names}"
