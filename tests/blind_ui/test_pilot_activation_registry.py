"""The activation metric must read the canonical registries, not a copy of them.

# PILOT-INTEGRITY:
# Activation counts only real record facts. The event-type and source-type lists
# used to be literals inside the activation SQL, so a registry change would have
# made the dashboard silently disagree with event validation and `life_replay`
# while every test still passed. These tests pin the derivation instead.

Source-level assertions are the right shape here: the query is raw SQL, and the
thing that must not regress is where its inputs come from.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DASHBOARD = ROOT / "services/api/app/services/pilot_dashboard.py"


def _dashboard_source() -> str:
    return DASHBOARD.read_text(encoding="utf-8")


def test_activation_query_binds_the_canonical_registries() -> None:
    code = _dashboard_source()
    assert "from app.domain.event_types_daily import DAILY_EVENT_TYPES" in code
    assert "from app.services.life_replay import RECORD_FACT_SOURCES" in code
    assert "activation_event_types = tuple(DAILY_EVENT_TYPES)" in code
    assert "activation_fact_sources = tuple(RECORD_FACT_SOURCES)" in code
    assert "IN :activation_event_types" in code
    assert "IN :activation_fact_sources" in code
    assert (
        'bindparam("activation_event_types", activation_event_types, expanding=True)'
        in code
    )
    assert (
        'bindparam("activation_fact_sources", activation_fact_sources, expanding=True)'
        in code
    )


def test_activation_query_does_not_hardcode_the_daily_event_list() -> None:
    """A literal list here would drift from DAILY_EVENT_TYPES without any failure."""
    code = _dashboard_source()
    for literal in ("'daily.meal'", "'daily.drink'", "'daily.walk'", "'daily.sleep'"):
        assert literal not in code, f"hardcoded event type {literal} in activation SQL"
    for literal in ("'OWNER_REPORTED'", "'LAB_CONFIRMED'"):
        assert literal not in code, f"hardcoded source type {literal} in activation SQL"


def test_bind_parameters_are_expanding_lists() -> None:
    """`IN :param` needs expanding=True; without it SQLAlchemy would bind one value."""
    code = _dashboard_source()
    for name in ("activation_event_types", "activation_fact_sources"):
        marker = f'bindparam("{name}", {name}, expanding=True)'
        assert marker in code
