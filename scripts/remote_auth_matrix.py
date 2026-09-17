"""Remote public-staging auth matrix (Stage F §18).

Runs the real-auth matrix against https://staging.haoleilab.com/pli-api:
register → verify → login → access-token authorized call → refresh rotation →
reuse detection → wrong password → session revoke → forgot/reset password →
rate limit → account delete → login after delete rejected.

Notes:
- /auth/whoami is cookie-session based, NOT Bearer; authorized calls below use
  /auth/sessions (CurrentUser dependency, Bearer access token).
- Refresh-token reuse detection revokes the token family, so the session/revoke
  test uses a fresh login to stay deterministic.
- EMAIL_DELIVERY=console on staging: verification/reset tokens are returned
  in-band; real SMTP delivery is separately EXTERNAL_BLOCKED.
"""

import asyncio
import sys
import uuid

import httpx

BASE = "https://staging.haoleilab.com/pli-api/api/v1"
PW = "AuthM!x2026w0rd"


def log(results, ok, name, detail=""):
    mark = "PASS" if ok else "FAIL"
    print(f"{mark}  {name}" + (f"  ({detail})" if detail else ""))
    results.append(ok)
    return ok


async def register(c: httpx.AsyncClient, email: str | None = None):
    email = email or f"authm-{uuid.uuid4().hex[:8]}@pli.test"
    r = await c.post("/auth/register", json={
        "email": email, "password": PW, "display_name": "远程Auth矩阵",
    })
    return r, email


async def login(c: httpx.AsyncClient, email: str, password: str = PW):
    return await c.post("/auth/login", json={"email": email, "password": password, "device_label": "remote-matrix"})


async def main() -> int:
    results: list[bool] = []
    async with httpx.AsyncClient(base_url=BASE, timeout=30) as c:
        # AUTH-01 register
        r, email = await register(c)
        log(results, r.status_code == 201, "AUTH-01 register", str(r.status_code))
        vtoken = r.json().get("verification_token")

        # AUTH-02 duplicate register → 409
        r2, _ = await register(c, email=email)
        log(results, r2.status_code == 409, "AUTH-02 duplicate register", str(r2.status_code))

        # AUTH-03 verify email
        rv = await c.post("/auth/verify-email", json={"token": vtoken})
        log(results, rv.status_code == 200, "AUTH-03 verify email", str(rv.status_code))

        # AUTH-04 login
        rl = await login(c, email)
        log(results, rl.status_code == 200, "AUTH-04 login", str(rl.status_code))
        if rl.status_code != 200:
            return finish(results)
        t = rl.json()
        H = {"Authorization": f"Bearer {t['access_token']}"}

        # AUTH-05 access token authorizes (CurrentUser-guarded endpoint)
        s = await c.get("/auth/sessions", headers=H)
        log(results, s.status_code == 200 and len(s.json()) >= 1,
            "AUTH-05 access token works", str(s.status_code))

        # AUTH-06 refresh rotation
        rr = await c.post("/auth/refresh", json={"refresh_token": t["refresh_token"]})
        t2 = rr.json()
        rotated = rr.status_code == 200 and t2["refresh_token"] != t["refresh_token"]
        log(results, rotated, "AUTH-06 refresh rotation", str(rr.status_code))

        # AUTH-07 reuse detection (replay old refresh → 401)
        ru = await c.post("/auth/refresh", json={"refresh_token": t["refresh_token"]})
        log(results, ru.status_code == 401, "AUTH-07 reuse detection (old refresh refused)", str(ru.status_code))

        # AUTH-08 wrong password
        rw = await login(c, email, password="WrongPass!w0rd")
        log(results, rw.status_code in (401, 403), "AUTH-08 wrong password", str(rw.status_code))

        # AUTH-09 session revoke (fresh login so revoke is deterministic)
        rl3 = await login(c, email)
        t3 = rl3.json()
        H3 = {"Authorization": f"Bearer {t3['access_token']}"}
        s3 = await c.get("/auth/sessions", headers=H3)
        sid = s3.json()[0]["session_id"]
        rev = await c.post(f"/auth/sessions/{sid}/revoke", headers=H3)
        after = await c.get("/auth/sessions", headers=H3)
        log(results, rev.status_code == 200 and after.status_code == 401,
            "AUTH-09 session revoke", f"revoke={rev.status_code} after={after.status_code}")

        # AUTH-10 forgot password
        fp = await c.post("/auth/forgot-password", json={"email": email})
        log(results, fp.status_code == 200, "AUTH-10 forgot password", str(fp.status_code))

        # AUTH-11 reset password
        rtoken = fp.json().get("reset_token")
        rp = await c.post("/auth/reset-password", json={"token": rtoken, "new_password": "NewAuth!w0rd456"})
        log(results, rp.status_code == 200, "AUTH-11 reset password", str(rp.status_code))
        rold = await login(c, email, password=PW)
        log(results, rold.status_code in (401, 403), "AUTH-11b old password rejected", str(rold.status_code))
        rnew = await login(c, email, password="NewAuth!w0rd456")
        log(results, rnew.status_code == 200, "AUTH-11c new password accepted", str(rnew.status_code))

        # AUTH-12 rate limit lockout (dedicated user; 6 bad attempts > max 5)
        rl_user, _ = await register(c)
        rl_email = rl_user.json()["email"]
        for _ in range(6):
            await login(c, rl_email, password="Wrong")
        rl_final = await login(c, rl_email)
        log(results, rl_final.status_code == 403, "AUTH-12 rate limit lockout", str(rl_final.status_code))

        # AUTH-13 delete account
        rl2 = await login(c, email, password="NewAuth!w0rd456")
        H2 = {"Authorization": f"Bearer {rl2.json()['access_token']}"}
        dl = await c.post("/auth/delete-account", json={"password": "NewAuth!w0rd456"}, headers=H2)
        rdead = await login(c, email, password="NewAuth!w0rd456")
        log(results, dl.status_code == 200 and rdead.status_code in (403, 404),
            "AUTH-13 delete account + login rejected", f"delete={dl.status_code} login={rdead.status_code}")

    return finish(results)


def finish(results):
    passed = sum(1 for ok in results if ok)
    print(f"\nREMOTE AUTH MATRIX: {passed}/{len(results)} PASS")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))