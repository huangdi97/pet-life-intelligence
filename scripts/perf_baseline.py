"""Stage D Phase 9 — performance baseline (G14).

Measures p50/p95/p99/error-rate/throughput for release-critical endpoints
against the live API (8800) with a medium fixture (seed + ~500 timeline
events on one pet). No optimization — baseline only; report obvious defects.

Run:  .venv/Scripts/python.exe scripts/perf_baseline.py
"""

import asyncio
import json
import statistics
import sys
import time
from datetime import datetime, timedelta, timezone

import httpx

BASE = "http://localhost:8800/api/v1"
N = 60  # samples per endpoint


async def make_fixture(client: httpx.AsyncClient, headers: dict) -> str:
    """Medium fixture: ensure a pet with ~500 events (idempotent by name)."""
    pets = (await client.get(f"{BASE}/pets", headers=headers)).json()
    pet = next((p for p in pets if p["name"] == "PERF-Load"), None)
    if pet is None:
        r = await client.post(
            f"{BASE}/pets", headers=headers,
            json={"name": "PERF-Load", "species": "dog", "breed": "bench"},
        )
        pet = r.json()
    pid = pet["id"]
    existing = (await client.get(f"{BASE}/pets/{pid}/events?limit=1", headers=headers)).json()
    have = existing["count"]
    target = 500
    batch_start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    async with asyncio.Semaphore(12):
        async def add(i: int):
            await client.post(
                f"{BASE}/pets/{pid}/events", headers=headers,
                json={"event_type": "daily.walk",
                      "payload": {"duration_minutes": 5 + i % 30},
                      "occurred_at": (batch_start + timedelta(hours=i)).isoformat(),
                      "allow_duplicate": True},
            )
        tasks = [add(i) for i in range(have, target)]
        await asyncio.gather(*tasks)
    return pid


async def bench(client: httpx.AsyncClient, name: str, headers: dict, path: str) -> dict:
    lat, errors = [], 0
    t0 = time.perf_counter()
    for _ in range(N):
        s = time.perf_counter()
        r = await client.get(f"{BASE}{path}", headers=headers)
        lat.append((time.perf_counter() - s) * 1000)
        if r.status_code >= 500:
            errors += 1
    total = time.perf_counter() - t0
    lat.sort()
    return {
        "endpoint": name,
        "p50_ms": round(statistics.median(lat), 1),
        "p95_ms": round(lat[int(len(lat) * 0.95)], 1),
        "p99_ms": round(lat[min(len(lat) - 1, int(len(lat) * 0.99))], 1),
        "error_rate": round(errors / N, 4),
        "throughput_rps": round(N / total, 1),
    }


async def main() -> int:
    async with httpx.AsyncClient(timeout=30) as client:
        login = (await client.post(f"{BASE}/auth/dev/login",
                                   json={"email": "owner@pli.demo"})).json()
        headers = {"X-Dev-User-Id": login["user_id"]}
        pid = await make_fixture(client, headers)

        rows = []
        rows.append(await bench(client, "GET /health", {}, "/health"))
        rows.append(await bench(client, "POST auth/dev/login (login)", {}, "/nope") if False
                    else await _bench_login(client))
        rows.append(await bench(client, "GET /pets", headers, "/pets"))
        rows.append(await bench(client, "GET pet detail", headers, f"/pets/{pid}"))
        rows.append(await bench(client, "GET today", headers, f"/pets/{pid}/today"))
        rows.append(await bench(client, "GET timeline(100)", headers,
                                f"/pets/{pid}/events?limit=100"))
        rows.append(await bench(client, "GET timeline(type filter)", headers,
                                f"/pets/{pid}/events?limit=50&event_type=daily.walk"))
        rows.append(await bench(client, "GET search", headers,
                                f"/pets/{pid}/search?q=walk"))
        rows.append(await bench(client, "GET health-events", headers,
                                f"/pets/{pid}/health-events"))
        rows.append(await bench(client, "GET notifications", headers,
                                f"/pets/{pid}/data-quality"))

        print(json.dumps({
            "environment": {"api": "localhost:8800", "db": "pg16 docker", "note": "dev machine"},
            "dataset": {"pet_id": pid, "timeline_events": 500},
            "samples_per_endpoint": N,
            "results": rows,
        }, ensure_ascii=False, indent=2))

        slow = [r for r in rows if r["p95_ms"] > 1000]
        if slow:
            print("DEFECTS: p95 > 1s on:", [r["endpoint"] for r in slow])
            return 1
        print("PERF BASELINE OK (no endpoint p95 > 1s)")
        return 0


async def _bench_login(client: httpx.AsyncClient) -> dict:
    lat, errors = [], 0
    for _ in range(N):
        s = time.perf_counter()
        r = await client.post(f"{BASE}/auth/dev/login",
                              json={"email": "owner@pli.demo"})
        lat.append((time.perf_counter() - s) * 1000)
        if r.status_code >= 500:
            errors += 1
    lat.sort()
    return {"endpoint": "POST auth/dev/login", "p50_ms": round(statistics.median(lat), 1),
            "p95_ms": round(lat[int(len(lat) * 0.95)], 1),
            "p99_ms": round(lat[min(len(lat) - 1, int(len(lat) * 0.99))], 1),
            "error_rate": round(errors / N, 4),
            "throughput_rps": round(N / (sum(lat) / 1000), 1)}


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
