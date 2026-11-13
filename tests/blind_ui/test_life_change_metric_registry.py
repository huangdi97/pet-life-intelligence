"""One metric registry, four consumers, no copies.

# INVARIANT:
# `meal_count_per_day`, `walk_minutes_per_day` and `sleep_minutes_per_day` each map
# to exactly one daily event type. That mapping lived in four places - two API route
# modules, the change workflow and a SQL `CASE` - and agreed only by maintenance.
# These tests make the single source of truth checkable: every consumer must import
# the registry, and none may re-type the mapping or the record-fact source list.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / "services/api/app"

REGISTRY = APP / "domain/life_change_metrics.py"
CONSUMERS = (
    APP / "api/routes/life_changes.py",
    APP / "api/routes/v02_identity_daily_baseline.py",
    APP / "services/life_change_workflow.py",
    APP / "services/life_change_history.py",
)
SQL_CONSUMER = APP / "services/life_change_history.py"

FORBIDDEN_LITERALS = (
    "'daily.meal'",
    "'daily.walk'",
    "'daily.sleep'",
    "'OWNER_REPORTED'",
    "'LAB_CONFIRMED'",
)


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_registry_is_the_only_place_that_names_the_mappings() -> None:
    registry = _read(REGISTRY)
    for metric in ("meal_count_per_day", "walk_minutes_per_day", "sleep_minutes_per_day"):
        assert f'"{metric}"' in registry
    for event_type in ("daily.meal", "daily.walk", "daily.sleep"):
        assert f'"{event_type}"' in registry


def test_no_consumer_retypes_the_mapping_or_the_source_list() -> None:
    for path in CONSUMERS:
        code = _read(path)
        for literal in FORBIDDEN_LITERALS:
            assert literal not in code, f"{path.name} re-types {literal}"


def test_every_consumer_imports_the_registry() -> None:
    for path in CONSUMERS:
        code = _read(path)
        assert "app.domain.life_change_metrics" in code, f"{path.name} does not import the registry"


def test_sql_case_is_rendered_from_the_registry() -> None:
    code = _read(SQL_CONSUMER)
    assert 'metric_event_type_sql("life_change_cases.metric")' in code
    assert "__METRIC_EVENT_CASE__" in code
    assert "__RECORD_FACT_SOURCES__" in code
    assert "RECORD_FACT_SOURCES" in code


def test_registry_module_renders_every_metric_into_sql() -> None:
    """Import the module itself (stdlib only) and check the rendered CASE."""
    sys.path.insert(0, str(APP))
    try:
        from domain.life_change_metrics import (  # noqa: PLC0415 - deliberate local import
            METRIC_EVENT_TYPES,
            METRIC_UNITS,
            metric_event_type_sql,
        )
    finally:
        sys.path.remove(str(APP))

    assert set(METRIC_EVENT_TYPES) == set(METRIC_UNITS)
    rendered = metric_event_type_sql("life_change_cases.metric")
    for metric, event_type in METRIC_EVENT_TYPES.items():
        assert f"WHEN '{metric}' THEN '{event_type}'" in rendered
    assert "ELSE NULL END" in rendered


def _registry_metrics() -> set[str]:
    """Metric names straight from the registry module (stdlib-only import)."""
    sys.path.insert(0, str(APP))
    try:
        from domain.life_change_metrics import METRIC_EVENT_TYPES  # noqa: PLC0415
    finally:
        sys.path.remove(str(APP))
    return set(METRIC_EVENT_TYPES)


def test_search_terms_cover_exactly_the_registry_metrics() -> None:
    """A metric with no search keywords is unreachable; a stale keyword is dead code."""
    import ast  # noqa: PLC0415 - only this test needs to parse source

    tree = ast.parse(_read(SQL_CONSUMER))
    terms: dict[str, object] | None = None
    for node in tree.body:
        target = getattr(node, "target", None)
        if isinstance(node, ast.AnnAssign) and isinstance(target, ast.Name):
            if target.id == "METRIC_SEARCH_TERMS":
                terms = ast.literal_eval(node.value)
    assert terms is not None, "METRIC_SEARCH_TERMS disappeared from the history module"
    assert set(terms) == _registry_metrics()
