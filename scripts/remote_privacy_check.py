"""Remote public-staging privacy checks (Stage F §23).

Against https://staging.haoleilab.com/pli-api:
  - care card public share: create → view (200, minimal fields) → bogus token 404
  - vet brief share: create → public view 200
  - account export: owner gets own data; cross-user export denied
  - consent lifecycle: list, revoke AI_INFERENCE, SERVICE_ESSENTIAL cannot be
    withdrawn
  - deletion request recorded (manual confirmation required; no silent delete)
"""

import asyncio
import sys
import uuid

import httpx

BASE = "https://staging.haoleilab.com/pli-api/api/v1"
PW = "Priv!w0rd2026"


def log(results, ok, name, detail=""):
    mark = "PASS" if ok else "FAIL"
    print(f"{mark}  {name}" + (f"  ({detail})" if detail else ""))
    results.append(ok)
    return ok


async def new_user(c: httpx.AsyncClient, prefix: str):
    email = f"{prefix}-{uuid.uuid4().hex[:8]}@pli.test"
    r = await c.post("/auth/register", json={
        "email": email, "password": PW, "display_name": "远程隐私用户",
    })
    tok = r.json().get("verification_token")
    if tok:
        await c.post("/auth/verify-email", json={"token": tok})
    rl = await c.post("/auth/login", json={"email": email, "password": PW})
    H = {"Authorization": f"Bearer {rl.json()['access_token']}"}
    return H


async def make_pet(c: httpx.AsyncClient, H: dict, name: str = "隐私测试犬"):
    pet = await c.post("/pets", headers=H, json={"name": name, "species": "dog"})
    return pet.json()["id"]


async def main() -> int:
    results: list[bool] = []
    async with httpx.AsyncClient(base_url=BASE, timeout=30) as c:
        HA = await new_user(c, "priva")
        HB = await new_user(c, "privb")
        pidA = await make_pet(c, HA)
        _ = await make_pet(c, HB, "B的宠物")

        # P1 care card → public view
        cc = await c.post(f"/pets/{pidA}/care-cards", headers=HA, json={"expires_in_hours": 24})
        ccj = cc.json()
        token = ccj.get("token")
        view = await c.get(f"/care-card/{token}") if token else None
        ok_view = view is not None and view.status_code == 200 and "宠物" not in str(view.json().get("content", {}))
        log(results, cc.status_code == 201 and token and ok_view,
            "PRIV-01 care card share + public view", f"create={cc.status_code}")

        # P2 bogus token 404
        bogus = await c.get(f"/care-card/{uuid.uuid4().hex}")
        log(results, bogus.status_code in (403, 404), "PRIV-02 bogus care token denied",
            str(bogus.status_code))

        # P3 vet brief share → public view
        he = await c.post(f"/pets/{pidA}/health-events", headers=HA,
                          json={"chief_complaint": "最近有点挑食"})
        he_id = he.json()["health_event_id"]
        vb = await c.post(f"/health-events/{he_id}/vet-brief", headers=HA, json={})
        vb_id = vb.json()["vet_brief_id"]
        sh = await c.post(f"/vet-briefs/{vb_id}/share", headers=HA, json={"expires_in_hours": 24})
        st = sh.json().get("share_token")
        sbv = await c.get(f"/vet-briefs/shared/{st}") if st else None
        log(results, sh.status_code == 201 and sbv is not None and sbv.status_code == 200,
            "PRIV-03 vet brief share + public view", f"share={sh.status_code}")

        # P4 export own data
        ex = await c.get(f"/pets/{pidA}/export", headers=HA)
        exj = ex.json() if "json" in ex.headers.get("content-type", "") else {}
        log(results, ex.status_code == 200 and "隐私测试犬" in str(exj),
            "PRIV-04 owner export contains own data", f"code={ex.status_code}")

        # P5 cross-user export denied
        xex = await c.get(f"/pets/{pidA}/export", headers=HB)
        log(results, xex.status_code in (403, 404), "PRIV-05 cross-user export denied",
            str(xex.status_code))

        # P6 consent list + revoke AI_INFERENCE
        cl = await c.get(f"/pets/{pidA}/consents", headers=HA)
        rev = await c.put(f"/pets/{pidA}/consents/AI_INFERENCE", headers=HA, json={"granted": False})
        cl2 = await c.get(f"/pets/{pidA}/consents", headers=HA)
        st_ai = next((x for x in cl2.json() if x["purpose"] == "AI_INFERENCE"), None)
        log(results, cl.status_code == 200 and rev.status_code == 200 and st_ai and st_ai["granted"] is False,
            "PRIV-06 consent revoke AI_INFERENCE", f"revoke={rev.status_code}")

        # P7 SERVICE_ESSENTIAL cannot be withdrawn
        se = await c.put(f"/pets/{pidA}/consents/SERVICE_ESSENTIAL", headers=HA, json={"granted": False})
        log(results, se.status_code == 422, "PRIV-07 SERVICE_ESSENTIAL not withdrawable",
            str(se.status_code))

        # P8 deletion request recorded (requires manual confirmation)
        dr = await c.post(f"/pets/{pidA}/deletion-requests", headers=HA, json={"reason": "测试"})
        log(results, dr.status_code == 201 and "Recorded only" in str(dr.json()),
            "PRIV-08 deletion request recorded (non-destructive)", str(dr.status_code))

    return finish(results)


def finish(results):
    passed = sum(1 for ok in results if ok)
    print(f"\nREMOTE PRIVACY CHECK: {passed}/{len(results)} PASS")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
