"""Guard owner-local calendar-day semantics for historical Twin identity.

A fixed offset can surface yesterday's or tomorrow's Twin when the owner
opens Life View from another timezone; date inputs represent device-local days.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIFE_VIEW_PATHS = (
    "apps/web/app/pets/[id]/life-view/page.tsx",
    "apps/mobile/src/screens/LifeViewScreen.tsx",
)


def test_historical_twin_uses_owner_local_calendar_boundaries() -> None:
    for path in LIFE_VIEW_PATHS:
        source = (ROOT / path).read_text(encoding="utf-8")
        assert 'new Date(`${selectedDate}T00:00:00`).getTime()' in source, path
        assert 'new Date(`${selectedDate}T23:59:59.999`).getTime()' in source, path
        assert "T00:00:00+08:00" not in source, path
        assert "T23:59:59.999+08:00" not in source, path
