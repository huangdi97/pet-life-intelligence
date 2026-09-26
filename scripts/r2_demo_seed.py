"""R2 demo seed — richer synthetic demo data for the v0.2.0 presentation run.

Creates/extends (idempotent, DEMO/SYNTHETIC, dev-auth sandbox only):
- owner@pli.demo : 豆豆 (Corgi) + 咪咪 (cat) get a fuller 2-day daily life,
  behavior, training goal + sessions, welfare observation.
- demo-attn@pli.dev : pet 关注 with a deterministic URGENT triage health
  event (for the attention/danger Today state).
- demo-empty@pli.dev : pet 空空 with no events (for the empty Today state).

None of this enters real Pilot metrics (dev-auth sandbox, PILOT_MODE=false).
Run with the local API up:
  .venv/Scripts/python.exe scripts/r2_demo_seed.py
"""
import asyncio
import sys
from datetime import datetime, timedelta, timezone

import httpx

BASE = "http://localhost:8800/api/v1"

DAILY_TEMPLATE = [
    ("daily.meal", {"food_type": "狗粮", "amount": "120", "unit": "g"}),
    ("daily.walk", {"duration_minutes": 25, "intensity": "normal"}),
    ("daily.drink", {"amount": "180", "unit": "ml"}),
    ("daily.meal", {"food_type": "狗粮", "amount": "120", "unit": "g"}),
    ("daily.play", {"duration_minutes": 15, "activity_type": "fetch"}),
    ("daily.elimination", {"kind": "stool", "quality": "normal"}),
    ("daily.sleep", {"duration_minutes": 90}),
    ("daily.meal", {"food_type": "狗粮", "amount": "120", "unit": "g"}),
    ("daily.weight", {"weight_kg": "11.5"}),
]

CAT_TEMPLATE = [
    ("daily.meal", {"food_type": "猫粮", "amount": "60", "unit": "g"}),
    ("daily.drink", {"amount": "120", "unit": "ml"}),
    ("daily.play", {"duration_minutes": 10, "activity_type": "wand"}),
    ("daily.elimination", {"kind": "urine", "quality": "normal"}),
    ("daily.sleep", {"duration_minutes": 180}),
    ("daily.meal", {"food_type": "猫粮", "amount": "60", "unit": "g"}),
]


async def dev_session(c: httpx.AsyncClient, email: str) -> dict:
    # dev login only resolves users that already exist; register idempotently
    # (real auth sandbox) so presentation accounts can be created on the fly.
    r = await c.post("/auth/dev/login", json={"email": email})
    if r.status_code == 404:
        reg = await c.post(
            "/auth/register",
            json={"email": email, "password": "DemoPass!w0rd", "display_name": email.split("@")[0]},
        )
        if reg.status_code == 201 and reg.json().get("verification_token"):
            await c.post("/auth/verify-email", json={"token": reg.json()["verification_token"]})
        r = await c.post("/auth/dev/login", json={"email": email})
    r.raise_for_status()
    uid = r.json()["user_id"]
    return {"X-Dev-User-Id": uid}


async def get_or_create_pet(c: httpx.AsyncClient, headers: dict, name: str, species: str, breed: str) -> str:
    pets = (await c.get("/pets", headers=headers)).json()
    pet = next((p for p in pets if p["name"] == name), None)
    if pet is not None:
        return pet["id"]
    r = await c.post(
        "/pets",
        headers=headers,
        json={
            "name": name,
            "species": species,
            "breed": breed,
            "sex": "FEMALE" if species == "cat" else "MALE",
            "neutered": True,
            "weight_note": "11.5kg" if species == "dog" else "4.2kg",
            "birth_date": (datetime.now(timezone.utc) - timedelta(days=365 * 3 + 60)).date().isoformat(),
        },
    )
    r.raise_for_status()
    return r.json()["id"]


async def seed_daily(c: httpx.AsyncClient, headers: dict, pet_id: str, template, days: int = 2) -> None:
    now = datetime.now(timezone.utc)
    for d in range(days):
        day = (now - timedelta(days=d)).replace(hour=8, minute=30, second=0, microsecond=0)
        for hour, (etype, payload) in enumerate(template, start=7):
            await c.post(
                f"/pets/{pet_id}/events",
                headers=headers,
                json={"event_type": etype, "payload": payload, "occurred_at": (day + timedelta(hours=hour)).isoformat()},
            )


async def seed_owner(c: httpx.AsyncClient) -> None:
    headers = await dev_session(c, "owner@pli.demo")
    pets = (await c.get("/pets", headers=headers)).json()
    doudou = next((p for p in pets if p["name"] == "豆豆"), None)
    mimi = next((p for p in pets if p["name"] == "咪咪"), None)
    doudou_id = await get_or_create_pet(c, headers, "豆豆", "dog", "柯基") if doudou is None else doudou["id"]
    mimi_id = await get_or_create_pet(c, headers, "咪咪", "cat", "英短") if mimi is None else mimi["id"]

    await seed_daily(c, headers, doudou_id, DAILY_TEMPLATE)
    await seed_daily(c, headers, mimi_id, CAT_TEMPLATE)

    # behavior (ABC) for 豆豆
    be = await c.get(f"/pets/{doudou_id}/behavior-events", headers=headers)
    if len(be.json()) == 0:
        await c.post(
            f"/pets/{doudou_id}/behavior-events",
            headers=headers,
            json={
                "occurred_at": (datetime.now(timezone.utc) - timedelta(days=1, hours=3)).isoformat(),
                "antecedent": "门铃响",
                "behavior": "对门铃连续吠叫约 20 秒，之后停下来看向门口",
                "consequence": "主人开门后恢复平静",
                "environment": "客厅",
            },
        )

    # training goal + one session for 豆豆
    goals = (await c.get(f"/pets/{doudou_id}/training-goals", headers=headers)).json()
    goal_id = goals[0]["goal_id"] if goals else None
    if goal_id is None:
        g = await c.post(f"/pets/{doudou_id}/training-goals", headers=headers, json={"title": "学会“坐下”并保持 5 秒"})
        goal_id = g.json().get("goal_id") or g.json().get("id")
    if goal_id:
        await c.post(
            f"/pets/{doudou_id}/training-sessions",
            headers=headers,
            json={
                "goal_id": goal_id,
                "session_at": (datetime.now(timezone.utc) - timedelta(hours=4)).isoformat(),
                "duration_minutes": 5,
                "focus": "坐下",
                "notes": "诱导坐下，奖励零食，成功率 4/5",
                "pet_response": "GOOD",
                "rewards_used": ["零食", "表扬"],
            },
        )

    # welfare observation for 豆豆
    await c.post(
        f"/pets/{doudou_id}/welfare-observations",
        headers=headers,
        json={"kind": "STRESS_RECOVERY", "data": {"recorded_from": "r2-demo", "note": "演示观察"}, "source_type": "OWNER_REPORTED"},
    )


async def seed_attention(c: httpx.AsyncClient) -> None:
    headers = await dev_session(c, "demo-attn@pli.dev")
    pet_id = await get_or_create_pet(c, headers, "关注", "dog", "柯基")
    existing = (await c.get(f"/pets/{pet_id}/health-events", headers=headers)).json()
    if len(existing) > 0:
        return
    complaints = [
        "今天开始精神很差，完全不吃东西，反复呕吐 4 次",
        "精神萎靡、食欲全无、持续呕吐，走路不稳",
    ]
    for complaint in complaints:
        r = await c.post(f"/pets/{pet_id}/health-events", headers=headers, json={"chief_complaint": complaint})
        if r.status_code != 201:
            continue
        he_id = r.json().get("health_event_id")
        tr = await c.post(f"/health-events/{he_id}/triage", headers=headers, json={"owner_notes": ""})
        level = tr.json().get("level") or tr.json().get("triage", {}).get("level")
        if level in ("URGENT", "EMERGENCY"):
            print("attention pet triage:", level)
            return
    print("WARNING: no URGENT/EMERGENCY triage produced for attention pet")


async def seed_empty(c: httpx.AsyncClient) -> None:
    headers = await dev_session(c, "demo-empty@pli.dev")
    await get_or_create_pet(c, headers, "空空", "cat", "田园猫")


async def main() -> int:
    async with httpx.AsyncClient(base_url=BASE, timeout=30, trust_env=False) as c:
        await seed_owner(c)
        await seed_attention(c)
        await seed_empty(c)
        print("R2 demo seed complete (DEMO/SYNTHETIC, dev sandbox)")
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
