"""Case computed_at is the recorded-fact calculation's own as_of instant."""
from datetime import UTC, datetime

import pytest

from app.api.routes.life_changes import _frozen_comparison_as_of
from app.core.errors import ConflictError


def test_case_comparison_freeze_preserves_last_minute_of_local_day():
    hinted = "2026-10-13T23:59:59.999900+08:00"
    anchored = _frozen_comparison_as_of({"as_of": hinted})
    assert anchored == datetime.fromisoformat(hinted).astimezone(UTC)
    assert anchored.isoformat() == "2026-10-13T15:59:59.999900+00:00"


def test_case_anchor_does_not_shift_to_creation_day():
    hinted = "2026-10-13T23:59:59+08:00"
    later_create = datetime.fromisoformat("2026-10-14T00:00:02+08:00")
    anchored = _frozen_comparison_as_of({"as_of": hinted})
    assert anchored < later_create
    assert anchored.astimezone(UTC).isoformat() == "2026-10-13T15:59:59+00:00"


def test_case_comparison_refuses_naive_source_clock():
    with pytest.raises(ConflictError, match="unzoned timestamp"):
        _frozen_comparison_as_of({"as_of": "2026-10-13T23:59:59"})
