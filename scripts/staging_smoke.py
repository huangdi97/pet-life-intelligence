"""Staging smoke (authoritative): full-stack flow against running API:8800.
Python is used because PowerShell 5.1 mangles UTF-8 request bodies."""

import sys
from datetime import datetime, timezone

import httpx

BASE = "http://localhost:8800/api/v1"
failures = []


def check(name, actual, expected):
    ok = actual == expected
    print(("PASS  " if ok else "FAIL  ") + name + ("" if ok else f" (got {actual!r}, want {expected!r})"))
    if not ok:
        failures.append(name)


def main() -> int:
    health = httpx.get(f"{BASE}/health").json()
    check("health", health["status"], "ok")
    ready = httpx.get(f"{BASE}/ready").json()
    check("ready.postgres", ready["checks"]["postgres"], "ok")
    check("ready.redis", ready["checks"]["redis"], "ok")

    login = httpx.post(f"{BASE}/auth/dev/login", json={"email": "owner@pli.demo"}).json()
    headers = {"X-Dev-User-Id": login["user_id"]}
    check("login", bool(login.get("user_id")), True)

    pets = httpx.get(f"{BASE}/pets", headers=headers).json()
    check("pets.count>=2", len(pets) >= 2, True)
    coco = next(p for p in pets if p["name"] == "豆豆")
    mimi = next(p for p in pets if p["name"] == "咪咪")

    meal = httpx.post(
        f"{BASE}/pets/{coco['id']}/events",
        headers=headers,
        json={"event_type": "daily.meal", "payload": {"amount": "90", "unit": "g"},
              "allow_duplicate": True},
    ).json()
    check("quicklog.meal", meal.get("event_type"), "daily.meal")

    he = httpx.post(
        f"{BASE}/pets/{mimi['id']}/health-events",
        headers=headers,
        json={"chief_complaint": "反复进猫砂盆但几乎尿不出来"},
    ).json()
    check("triage.emergency", he.get("triage", {}).get("level"), "EMERGENCY")

    brief = httpx.post(
        f"{BASE}/health-events/{he['health_event_id']}/vet-brief",
        headers=headers, json={},
    ).json()
    check("vetbrief", bool(brief.get("vet_brief_id")), True)

    export = httpx.get(f"{BASE}/pets/{coco['id']}/export", headers=headers).json()
    check("export.events>0", len(export.get("life_events", [])) > 0, True)

    dev = httpx.post(
        f"{BASE}/pets/{coco['id']}/devices",
        headers=headers,
        json={"provider": "fake", "device_key": f"smoke-{datetime.now(timezone.utc).timestamp():.0f}", "display_name": "Smoke"},
    ).json()
    sync1 = httpx.post(
        f"{BASE}/pets/{coco['id']}/devices/{dev['device_id']}/sync",
        headers=headers, json={},
    ).json()
    check("device.sync.ingested", sync1.get("ingested"), 3)

    agent = httpx.post(
        f"{BASE}/agent/actions",
        headers=headers,
        json={"action_class": "BOOKING", "proposal": {"note": "smoke"},
              "pet_id": coco["id"]},
    ).json()
    check("agent.booking.refused", agent.get("policy_result"), "REFUSED")
    check("agent.booking.executed", agent.get("executed"), False)

    print()
    if failures:
        print(f"STAGING SMOKE FAIL ({len(failures)} failures)")
        return 1
    print("STAGING SMOKE PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
