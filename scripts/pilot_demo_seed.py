"""Pilot demo dataset — builds a fully-fictional demo pet via the real public
API (register → login → pet → daily → behavior → training → health → vet
brief → medication → outcome). No real user data.

Run (API must be up, dev-auth or real auth):
  .venv/Scripts/python.exe scripts/pilot_demo_seed.py
"""

import asyncio
import sys
from datetime import datetime, timedelta, timezone

import httpx

BASE = "http://localhost:8800/api/v1"
DEMO_EMAIL = "demo@pli.pilot"
DEMO_PASSWORD = "DemoPass!w0rd"


async def main() -> int:
    async with httpx.AsyncClient(base_url=BASE, timeout=30) as c:
        # 1. register (real auth) — may already exist
        try:
            r = await c.post("/auth/register", json={
                "email": DEMO_EMAIL, "password": DEMO_PASSWORD,
                "display_name": "演示用户",
            })
            if r.status_code == 201 and r.json().get("verification_token"):
                await c.post("/auth/verify-email",
                             json={"token": r.json()["verification_token"]})
        except Exception:
            pass

        login = await c.post("/auth/login", json={
            "email": DEMO_EMAIL, "password": DEMO_PASSWORD, "device_label": "demo-seed",
        })
        if login.status_code != 200:
            # fall back to dev-auth sandbox login
            dev = await c.post("/auth/dev/login", json={"email": "owner@pli.demo"})
            if dev.status_code != 200:
                print("cannot authenticate")
                return 1
            headers = {"X-Dev-User-Id": dev.json()["user_id"]}
        else:
            headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        # 2. create demo pet (idempotent by name)
        pets = (await c.get("/pets", headers=headers)).json()
        pet = next((p for p in pets if p["name"] == "豆包"), None)
        if pet is None:
            r = await c.post("/pets", headers=headers, json={
                "name": "豆包", "species": "dog", "breed": "Corgi",
                "sex": "MALE", "neutered": True, "weight_note": "11.5kg",
            })
            if r.status_code == 422:
                # demo user exists but has no household (pre-fix account) →
                # fall back to dev-auth demo household for the demo dataset
                dev = await c.post("/auth/dev/login", json={"email": "owner@pli.demo"})
                headers = {"X-Dev-User-Id": dev.json()["user_id"]}
                pets = (await c.get("/pets", headers=headers)).json()
                pet = next((p for p in pets if p["name"] == "豆包"), None)
                if pet is None:
                    r = await c.post("/pets", headers=headers, json={
                        "name": "豆包", "species": "dog", "breed": "Corgi",
                        "sex": "MALE", "neutered": True, "weight_note": "11.5kg",
                    })
                    pet = r.json()
            else:
                pet = r.json()
        pid = pet["id"]
        now = datetime.now(timezone.utc)

        # 3. daily events (2 days of life)
        today = now.replace(hour=8, minute=30, second=0, microsecond=0)
        for days_ago in (1, 0):
            day = today - timedelta(days=days_ago)
            for hour, etype, payload in (
                (8, "daily.meal", {"food_type": "狗粮", "amount": "120", "unit": "g"}),
                (9, "daily.walk", {"duration_minutes": 25, "intensity": "normal"}),
                (12, "daily.meal", {"food_type": "狗粮", "amount": "120", "unit": "g"}),
                (15, "daily.play", {"duration_minutes": 15, "activity_type": "fetch"}),
                (18, "daily.elimination", {"kind": "stool", "quality": "normal"}),
                (19, "daily.meal", {"food_type": "狗粮", "amount": "120", "unit": "g"}),
                (21, "daily.weight", {"weight_kg": "11.5"}),
            ):
                await c.post(f"/pets/{pid}/events", headers=headers, json={
                    "event_type": etype, "payload": payload,
                    "occurred_at": (day + timedelta(hours=hour)).isoformat(),
                })

        # 4. behavior ABC
        await c.post(f"/pets/{pid}/behavior-events", headers=headers, json={
            "occurred_at": (today - timedelta(days=1, hours=2)).isoformat(),
            "antecedent": "门铃响",
            "behavior": "对门铃连续吠叫约 20 秒，之后停下来看向门口",
            "consequence": "主人开门后恢复平静",
            "environment": "客厅",
        })

        # 5. training goal + session
        goals = (await c.get(f"/pets/{pid}/training-goals", headers=headers)).json()
        if not goals:
            g = await c.post(f"/pets/{pid}/training-goals", headers=headers,
                             json={"title": "学会“坐下”并保持 5 秒"})
            goal_id = g.json().get("id")
        else:
            goal_id = goals[0].get("id")
        if goal_id:
            await c.post(f"/pets/{pid}/training-sessions", headers=headers, json={
                "goal_id": goal_id,
                "session_at": (today - timedelta(hours=3)).isoformat(),
                "duration_minutes": 5,
                "focus": "坐下",
                "notes": "诱导坐下，奖励零食，成功率 4/5",
                "pet_response": "GOOD",
                "rewards_used": ["零食", "表扬"],
            })

        # 6. health event: mild → VET_SOON (deterministic rule)
        he = await c.post(f"/pets/{pid}/health-events", headers=headers, json={
            "chief_complaint": "这两天食欲下降，精神略差，没有呕吐",
            "duration_text": "2天",
            "eating": "LESS", "drinking": "NORMAL", "elimination": "NORMAL",
            "activity": "LESS",
        })
        he_id = he.json().get("health_event_id")
        if he_id:
            await c.post(f"/health-events/{he_id}/triage", headers=headers,
                         json={"owner_notes": ""})
            await c.post(f"/health-events/{he_id}/observations", headers=headers,
                         json={"kind": "owner", "text": "主人报告：食欲下降约 30%，仍愿吃零食"})
            brief = await c.post(f"/health-events/{he_id}/vet-brief", headers=headers)
            if brief.status_code == 201:
                await c.post(f"/vet-briefs/{brief.json()['vet_brief_id']}/share",
                             headers=headers, json={"expires_in_hours": 72})

        # 7. medication plan + one administration
        plans = (await c.get(f"/pets/{pid}/medication-plans", headers=headers)).json()
        if not plans:
            plan = await c.post(f"/pets/{pid}/medication-plans", headers=headers, json={
                "medicine_name": "益生菌", "dose_text": "1 袋",
                "route": "口服", "frequency_text": "每日 1 次",
                "source_type": "PROFESSIONAL_CONFIRMED",
                "source_note": "兽医建议（演示数据）",
                "duration_days": 7,
            })
            plan_id = plan.json().get("plan_id")
        else:
            plan_id = plans[0]["plan_id"]
        if plan_id:
            plan = (await c.get(f"/pets/{pid}/medication-plans", headers=headers)).json()[0]
            for dose in plan.get("doses", []):
                if dose["status"] == "PENDING":
                    await c.post(f"/medication-plans/{plan_id}/administrations",
                                 headers=headers,
                                 json={"planned_dose_id": dose["dose_id"]})
                    break

        # 8. outcome
        if he_id:
            await c.post(f"/health-events/{he_id}/outcomes", headers=headers,
                         json={"outcome": "IMPROVED", "notes": "调整饮食后恢复（演示）"})

        # 9. verify
        _ = await c.get(f"/pets/{pid}/events?limit=5", headers=headers)
        print("demo pet:", pid, "name=豆包")
        print("timeline events:", (await c.get(f"/pets/{pid}/events", headers=headers)).json().get("count"))
        print("health events:", len((await c.get(f"/pets/{pid}/health-events", headers=headers)).json()))
        print("medication plans:", len((await c.get(f"/pets/{pid}/medication-plans", headers=headers)).json()))
        print("behavior events:", len((await c.get(f"/pets/{pid}/behavior-events", headers=headers)).json()))
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
