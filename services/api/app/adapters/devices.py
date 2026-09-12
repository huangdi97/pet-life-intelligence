"""Device adapter layer (Stage C, PLI-125..135).

Contract: providers normalise vendor payloads into canonical device events.
Only the sandbox provider ships in v1.0; real vendor APIs are
EXTERNAL_BLOCKED until business/technical agreements exist. All adapter
implementations must pass the same contract tests.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Protocol


class AdapterError(Exception):
    pass


@dataclass(frozen=True)
class NormalizedEvent:
    provider: str
    provider_event_id: str
    event_kind: str  # FEEDER_PORTION | WATER_INTAKE | ACTIVITY | WEIGHT | CAMERA_CLIP | LITTER_VISIT
    occurred_at: datetime
    payload: dict[str, Any]


class DeviceProvider(Protocol):
    """Every provider (sandbox or future real) implements this contract."""

    name: str
    external: bool  # True → requires real credentials/agreements

    def fetch_recent(self, device_key: str) -> list[NormalizedEvent]: ...


class FakeDeviceProvider:
    """Sandbox provider: deterministic synthetic events for demos/tests.
    Clearly marked as sandbox — never presented as real device data."""

    name = "fake"
    external = False

    def fetch_recent(self, device_key: str) -> list[NormalizedEvent]:
        base = device_key.encode()
        events: list[NormalizedEvent] = []
        for i in range(3):
            events.append(
                NormalizedEvent(
                    provider=self.name,
                    provider_event_id=f"{device_key}-{i}",
                    event_kind="ACTIVITY" if i % 2 == 0 else "FEEDER_PORTION",
                    occurred_at=datetime.now(timezone.utc) - timedelta_minutes(i * 37),
                    payload={"minutes": 5 + (sum(base) + i) % 30, "sandbox": True},
                )
            )
        return events


def timedelta_minutes(m: int):
    from datetime import timedelta

    return timedelta(minutes=m)


_REGISTRY: dict[str, DeviceProvider] = {"fake": FakeDeviceProvider()}


def get_provider(name: str) -> DeviceProvider:
    provider = _REGISTRY.get(name)
    if provider is None:
        raise AdapterError(
            f"Unknown device provider '{name}'. Real vendors are EXTERNAL_BLOCKED "
            "until agreements + credentials exist (GOAL Stage C)."
        )
    return provider


def register_provider(provider: DeviceProvider) -> None:
    _REGISTRY[provider.name] = provider


# --- quality + attribution rules (PLI-128/129) -------------------------------

QUALITY_BOUNDS: dict[str, tuple[float, float]] = {
    # event_kind -> (min, max) plausible numeric payload value under "value"/"minutes"
    "ACTIVITY": (0, 24 * 60),
    "FEEDER_PORTION": (0, 2000),  # grams
    "WATER_INTAKE": (0, 5000),  # ml
    "WEIGHT": (0.1, 200),  # kg
}


def quality_check(event: NormalizedEvent) -> tuple[str, str]:
    """Deterministic plausibility gate. Returns (status, note)."""
    bounds = QUALITY_BOUNDS.get(event.event_kind)
    if bounds is None:
        return "OK", ""
    raw = event.payload.get("value", event.payload.get("minutes"))
    try:
        value = float(raw) if raw is not None else None
    except (TypeError, ValueError):
        return "REJECTED", "non-numeric measurement"
    if value is None:
        return "OK", ""
    if value < bounds[0] or value > bounds[1]:
        return "REJECTED", f"value {value} outside plausible bounds {bounds}"
    return "OK", ""
