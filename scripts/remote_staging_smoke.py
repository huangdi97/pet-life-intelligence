"""Remote staging smoke (Stage F §37) — full real-user journey over public HTTPS.

Runs against https://staging.haoleilab.com (PLI deployed on the haoleilab server).

Journey:
  register → verify → login → create pet → quick log → timeline → task →
  behavior → training → health intake → triage → vet brief → medication →
  outcome → search → logout → login again → data persists → cross-user deny.
"""

import json
import sys
import uuid

import httpx

BASE = "https://staging.haoleilab.com/pli-api/api/v1"


def log(ok, name, detail=""):
    mark = "PASS" if ok else "FAIL"
    print(f"{mark}  {name}" + (f"  ({detail})" if detail else ""))
    return ok


async def main() -> int:
    results = []
    async with httpx.AsyncClient(base_url=BASE, timeout=30) as c:
        email = f"smoke-{uuid.uuid4().hex[:8]}@pli.test"
        pw = "SmokePass!w0rd"

        # 01 register
        r = await c.post("/auth/register", json={
            "email": email, "password": pw, "display_name": "远程冒烟用户",
        })
        results.append(log(r.status_code == 201, "REMOTE-01 register", str(r.status_code)))

        # 02 verify email (console token returned in staging)
        body = r.json()
        if body.get("verification_token"):
            rv = await c.post("/auth/verify-email", json={"token": body["verification_token"]})
            results.append(log(rv.status_code == 200, "REMOTE-02 verify email", str(rv.status_code)))
        else:
            results.append(log(True, "REMOTE-02 verify email", "no token (already verified)"))

        # 03 login
        r = await c.post("/auth/login", json={"email": email, "password": pw})
        results.append(log(r.status_code == 200, "REMOTE-03 login", str(r.status_code)))
        if r.status_code != 200:
            return finish(results)
        tokens = r.json()
        H = {"Authorization": f"Bearer {tokens['access_token']}"}

        # 04 create pet
        r = await c.post("/pets", headers=H, json={"name": "远程狗狗", "species": "dog", "breed": "Labrador"})
        results.append(log(r.status_code == 201, "REMOTE-04 create pet", str(r.status_code)))
        pid = r.json()["id"]

        # 05 quick log
        r = await c.post(f"/pets/{pid}/events", headers=H,
                         json={"event_type": "daily.meal", "payload": {"amount": "100", "unit": "g"}})
        results.append(log(r.status_code == 201, "REMOTE-05 quick log", str(r.status_code)))

        # 06 timeline
        r = await c.get(f"/pets/{pid}/events", headers=H)
        results.append(log(r.status_code == 200 and r.json()["count"] >= 1,
                           "REMOTE-06 timeline", f"count={r.json().get('count')}"))

        # 07 task
        r = await c.post(f"/pets/{pid}/tasks", headers=H, json={"title": "远程任务", "task_type": "OTHER"})
        results.append(log(r.status_code == 201, "REMOTE-07 task", str(r.status_code)))

        # 08 behavior
        r = await c.post(f"/pets/{pid}/behavior-events", headers=H, json={
            "occurred_at": "2026-09-16T08:00:00Z",
            "antecedent": "门铃响", "behavior": "吠叫 10 秒", "consequence": "主人开门后安静",
        })
        results.append(log(r.status_code == 201, "REMOTE-08 behavior", str(r.status_code)))

        # 09 training goal
        r = await c.post(f"/pets/{pid}/training-goals", headers=H, json={"title": "学会坐下"})
        results.append(log(r.status_code == 201, "REMOTE-09 training goal", str(r.status_code)))

        # 10 health intake
        r = await c.post(f"/pets/{pid}/health-events", headers=H,
                         json={"chief_complaint": "食欲下降，精神略差", "duration_text": "1天"})
        results.append(log(r.status_code == 201, "REMOTE-10 health intake", str(r.status_code)))
        he_id = r.json().get("health_event_id")

        # 11 triage (deterministic rule)
        if he_id:
            r = await c.post(f"/health-events/{he_id}/triage", headers=H, json={"owner_notes": ""})
            results.append(log(r.status_code == 200 and r.json().get("level"),
                               "REMOTE-11 triage", str(r.json().get("level"))))

            # 12 vet brief
            r = await c.post(f"/health-events/{he_id}/vet-brief", headers=H)
            results.append(log(r.status_code == 201, "REMOTE-12 vet brief", str(r.status_code)))
            if r.status_code == 201:
                # 13 share
                rs = await c.post(f"/vet-briefs/{r.json()['vet_brief_id']}/share", headers=H,
                                  json={"expires_in_hours": 24})
                results.append(log(rs.status_code == 201, "REMOTE-13 vet brief share", str(rs.status_code)))

        # 14 medication
        r = await c.post(f"/pets/{pid}/medication-plans", headers=H, json={
            "medicine_name": "益生菌", "dose_text": "1袋", "route": "口服",
            "frequency_text": "每日1次", "source_type": "OWNER_REPORTED", "duration_days": 7,
        })
        results.append(log(r.status_code == 201, "REMOTE-14 medication", str(r.status_code)))

        # 15 outcome
        if he_id:
            r = await c.post(f"/health-events/{he_id}/outcomes", headers=H,
                             json={"outcome": "IMPROVED", "notes": "远程冒烟"})
            results.append(log(r.status_code == 201, "REMOTE-15 outcome", str(r.status_code)))

        # 16 search
        r = await c.get(f"/pets/{pid}/search?q=食欲", headers=H)
        results.append(log(r.status_code == 200, "REMOTE-16 search", str(r.status_code)))

        # 17 logout (revoke)
        r = await c.post("/auth/logout", headers=H, json={"refresh_token": tokens["refresh_token"]})
        results.append(log(r.status_code == 200, "REMOTE-17 logout", str(r.status_code)))

        # 18 login again → data persists
        r = await c.post("/auth/login", json={"email": email, "password": pw})
        results.append(log(r.status_code == 200, "REMOTE-18 re-login", str(r.status_code)))
        H2 = {"Authorization": f"Bearer {r.json()['access_token']}"}
        r = await c.get(f"/pets/{pid}/events", headers=H2)
        results.append(log(r.status_code == 200 and r.json()["count"] >= 1,
                           "REMOTE-19 data persists", f"count={r.json().get('count')}"))

        # 20 cross-user deny: user B cannot see A's pet
        email_b = f"smokeB-{uuid.uuid4().hex[:8]}@pli.test"
        await c.post("/auth/register", json={"email": email_b, "password": pw, "display_name": "用户B"})
        rb = await c.post("/auth/login", json={"email": email_b, "password": pw})
        HB = {"Authorization": f"Bearer {rb.json()['access_token']}"}
        rc = await c.get(f"/pets/{pid}", headers=HB)
        results.append(log(rc.status_code in (403, 404), "REMOTE-20 cross-user deny",
                           str(rc.status_code)))

    return finish(results)


def finish(results):
    passed = sum(1 for ok in results if ok)
    print(f"\nREMOTE STAGING SMOKE: {passed}/{len(results)} PASS")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    import asyncio

    sys.exit(asyncio.run(main()))