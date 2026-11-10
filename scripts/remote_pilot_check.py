"""Remote public-staging pilot verification (Stage F §26).

Against https://staging.haoleilab.com/pli-api:
  - /pilot/status & north star present
  - admin(owner) creates single-use invite code
  - fresh real-auth user redeems the code
  - code becomes single-use (second redeem rejected)
  - user creates pet + event, submits feedback
  - pilot dashboard reflects north-star metrics

Registration gating (PILOT_MODE=true rejection without code) is verified in the
staged remote pilot-mode enabling exercise (scripts/remote_pilot_gating.py), not
here — staging currently runs PILOT_MODE=false so public smoke still works.
"""

import asyncio
import sys
import uuid

import httpx

BASE = "https://staging.haoleilab.com/pli-api/api/v1"
PW = "Pilot!w0rd2026"


def log(results, ok, name, detail=""):
    mark = "PASS" if ok else "FAIL"
    print(f"{mark}  {name}" + (f"  ({detail})" if detail else ""))
    results.append(ok)
    return ok


async def new_user(c: httpx.AsyncClient, prefix: str) -> tuple[str, str]:
    email = f"{prefix}-{uuid.uuid4().hex[:8]}@pli.test"
    r = await c.post("/auth/register", json={
        "email": email, "password": PW, "display_name": "远程试点用户",
    })
    tok = r.json().get("verification_token")
    if tok:
        await c.post("/auth/verify-email", json={"token": tok})
    rl = await c.post("/auth/login", json={"email": email, "password": PW})
    return rl.json()["access_token"], email


async def main() -> int:
    results: list[bool] = []
    async with httpx.AsyncClient(base_url=BASE, timeout=30) as c:
        # P1 status endpoint
        st = await c.get("/pilot/status")
        body = st.json()
        baseline = dict(body)
        log(results, st.status_code == 200 and "north_star" in body,
            "PILOT-01 status + north star", str(body.get("north_star")))

        # P2 owner creates invite
        admin_token, _ = await new_user(c, "pilotadm")
        HA = {"Authorization": f"Bearer {admin_token}"}
        inv = await c.post("/pilot/invites", headers=HA,
                           json={"purpose": "pilot", "max_uses": 1, "expires_hours": 24})
        code = inv.json().get("code")
        log(results, inv.status_code == 201 and code and len(code) >= 6,
            "PILOT-02 admin creates invite code", str(code))

        # P3 fresh user redeems
        user_token, _ = await new_user(c, "pilotusr")
        HU = {"Authorization": f"Bearer {user_token}"}
        red = await c.post("/pilot/redeem", headers=HU, json={"code": code})
        log(results, red.status_code == 200, "PILOT-03 redeem invite", str(red.status_code))

        # P4 single-use enforced
        red2 = await c.post("/pilot/redeem", headers=HU, json={"code": code})
        log(results, red2.status_code == 422, "PILOT-04 code single-use enforced",
            str(red2.status_code))

        # P5 pilot user creates pet + event
        pet = await c.post("/pets", headers=HU,
                           json={"name": "试点宠物", "species": "dog", "breed": "Corgi"})
        pid = pet.json()["id"]
        ev = await c.post(f"/pets/{pid}/events", headers=HU,
                          json={"event_type": "daily.meal", "payload": {"amount": "80", "unit": "g"}})
        log(results, pet.status_code == 201 and ev.status_code == 201,
            "PILOT-05 pilot user pet + event", f"pet={pet.status_code} event={ev.status_code}")

        # P6 feedback
        fb = await c.post("/pilot/feedback", headers=HU, json={
            "category": "feature_request", "message": "希望支持体重趋势图。", "page_url": "/today",
        })
        log(results, fb.status_code == 201 and fb.json().get("feedback_id"),
            "PILOT-06 feedback submitted", str(fb.status_code))

        # P7 this script deliberately uses @pli.test identities. Those rows
        # exercise the API path but MUST NOT move any real-participant metric.
        db = (await c.get("/pilot/status")).json()
        real_metric_keys = (
            "pets_total",
            "active_pets_3d",
            "active_pets_7d",
            "registered",
            "activated_owners",
            "feedback_count",
        )
        unchanged = all(db.get(key) == baseline.get(key) for key in real_metric_keys)
        contract_ok = (
            db.get("metric_contract_version") == "R8_PILOT_V2"
            and db.get("active_event_contract") == "CURRENT_EFFECTIVE_RECORD_FACT"
        )
        log(
            results,
            unchanged and contract_ok,
            "PILOT-07 synthetic dry-run excluded from real metrics",
            str({key: db.get(key) for key in real_metric_keys}),
        )

        # P8 status must advertise the same isolation boundary that the query
        # actually enforces. Do not infer isolation from a boolean pilot_mode.
        excludes = set(db.get("excludes") or [])
        required_excludes = {"demo", "internal", "synthetic_domain"}
        log(
            results,
            required_excludes.issubset(excludes),
            "PILOT-08 metric isolation contract advertised",
            str(sorted(excludes)),
        )

    return finish(results)


def finish(results):
    passed = sum(1 for ok in results if ok)
    print(f"\nREMOTE PILOT CHECK: {passed}/{len(results)} PASS")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
