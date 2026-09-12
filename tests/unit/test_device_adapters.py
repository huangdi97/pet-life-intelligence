"""Device adapter contract tests (Stage C gate: provider adapter contract
tests). Any real provider added later must pass the same suite."""

import pytest
from app.adapters.devices import (
    AdapterError,
    FakeDeviceProvider,
    NormalizedEvent,
    get_provider,
    quality_check,
    register_provider,
)


def test_sandbox_provider_contract():
    provider = FakeDeviceProvider()
    events = provider.fetch_recent("dev-1")
    assert len(events) == 3
    for e in events:
        assert e.provider == "fake"
        assert e.provider_event_id
        assert e.event_kind in {"ACTIVITY", "FEEDER_PORTION"}
        assert e.occurred_at.tzinfo is not None
        assert e.payload.get("sandbox") is True, "sandbox data must be marked"


def test_registry_rejects_unknown_and_real_vendors():
    with pytest.raises(AdapterError):
        get_provider("petkit")  # real vendor without agreement → blocked
    with pytest.raises(AdapterError):
        get_provider("tractive")


def test_custom_provider_registration():
    class MyProvider:
        name = "test-vendor"
        external = True

        def fetch_recent(self, device_key):
            return []

    register_provider(MyProvider())
    assert get_provider("test-vendor").name == "test-vendor"


def test_quality_check_bounds():
    def ev(kind, payload):
        return NormalizedEvent("fake", "x", kind,
                               datetime.now(timezone.utc), payload)

    from datetime import datetime, timezone

    ok = quality_check(ev("FEEDER_PORTION", {"value": 120}))
    assert ok == ("OK", "")
    bad = quality_check(ev("FEEDER_PORTION", {"value": 999999}))
    assert bad[0] == "REJECTED"
    nonnum = quality_check(ev("WEIGHT", {"value": "heavy"}))
    assert nonnum[0] == "REJECTED"
