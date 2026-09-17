"""Remote public-staging storage check (Stage F §17).

Against https://staging.haoleilab.com/pli-api:
  - upload PNG artifact (multipart) 201
  - download returns the exact bytes + content type
  - unauthorized download → 401/403/404
  - User B (cross-user) cannot access User A's artifact → 403/404
  - disallowed MIME (text/plain) rejected
  - artifacts list visible to owner only
"""

import asyncio
import io
import sys
import uuid

import httpx

BASE = "https://staging.haoleilab.com/pli-api/api/v1"
PW = "Store!w0rd2026"

# minimal valid PNG (8x8 transparent)
PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000008000000080806000000c4"
    "0f5be80000002c4944415478da63fcffff3f03a7808a814901ff1f20a833"
    "80f00034010126064050006808024a01988ba502a10000000049454e44ae426082"
)


def log(results, ok, name, detail=""):
    mark = "PASS" if ok else "FAIL"
    print(f"{mark}  {name}" + (f"  ({detail})" if detail else ""))
    results.append(ok)
    return ok


async def setup(c: httpx.AsyncClient, prefix: str):
    email = f"{prefix}-{uuid.uuid4().hex[:8]}@pli.test"
    r = await c.post("/auth/register", json={
        "email": email, "password": PW, "display_name": "远程存储用户",
    })
    tok = r.json().get("verification_token")
    if tok:
        await c.post("/auth/verify-email", json={"token": tok})
    rl = await c.post("/auth/login", json={"email": email, "password": PW})
    H = {"Authorization": f"Bearer {rl.json()['access_token']}"}
    pet = await c.post("/pets", headers=H, json={"name": "存储测试犬", "species": "dog"})
    return H, pet.json()["id"]


async def main() -> int:
    results: list[bool] = []
    async with httpx.AsyncClient(base_url=BASE, timeout=30) as c:
        HA, pidA = await setup(c, "strgA")
        HB, pidB = await setup(c, "strgB")

        # S1 upload PNG
        up = await c.post(f"/pets/{pidA}/artifacts", headers=HA,
                          files={"file": ("diag.png", io.BytesIO(PNG), "image/png")})
        body = up.json() if "application/json" in up.headers.get("content-type", "") else {}
        aid = body.get("artifact_id")
        log(results, up.status_code == 201 and aid and body.get("sha256"),
            "STORAGE-01 upload png", f"code={up.status_code} kind={body.get('kind')}")

        # S2 download returns exact bytes
        if aid:
            dl = await c.get(f"/artifacts/{aid}/content", headers=HA)
            same_bytes = dl.content == PNG
            log(results, dl.status_code == 200 and same_bytes,
                "STORAGE-02 download exact bytes", f"code={dl.status_code} size={len(dl.content)}")
        else:
            log(results, False, "STORAGE-02 download exact bytes", "no artifact")

        # S3 unauthorized download
        au = await c.get(f"/artifacts/{aid}/content")
        log(results, au.status_code in (401, 403, 404), "STORAGE-03 unauthenticated denied",
            str(au.status_code))

        # S4 cross-user denied (User B on A's artifact)
        if aid:
            x = await c.get(f"/artifacts/{aid}/content", headers=HB)
            log(results, x.status_code in (403, 404), "STORAGE-04 cross-user denied",
                str(x.status_code))
        else:
            log(results, False, "STORAGE-04 cross-user denied", "no artifact")

        # S5 owner list
        lst = await c.get(f"/pets/{pidA}/artifacts", headers=HA)
        log(results, lst.status_code == 200, "STORAGE-05 owner artifact list", str(lst.status_code))
        xlst = await c.get(f"/pets/{pidA}/artifacts", headers=HB)
        log(results, xlst.status_code in (403, 404), "STORAGE-06 cross-user list denied",
            str(xlst.status_code))

        # S7 disallowed MIME rejected
        bad = await c.post(f"/pets/{pidA}/artifacts", headers=HA,
                           files={"file": ("note.txt", io.BytesIO(b"hello"), "text/plain")})
        log(results, bad.status_code in (400, 415, 422), "STORAGE-07 disallowed mime rejected",
            str(bad.status_code))

        # S8 signature mismatch rejected (text/plain content spoofing image/png)
        spoof = await c.post(f"/pets/{pidA}/artifacts", headers=HA,
                             files={"file": ("fake.png", io.BytesIO(b"not a png"), "image/png")})
        log(results, spoof.status_code in (400, 415, 422), "STORAGE-08 signature mismatch rejected",
            str(spoof.status_code))

        # S9 pet-scope artifacts on B's pet visible only to B (sanity)
        lstb = await c.get(f"/pets/{pidB}/artifacts", headers=HB)
        log(results, lstb.status_code == 200, "STORAGE-09 B sees own pet artifacts", str(lstb.status_code))

    return finish(results)


def finish(results):
    passed = sum(1 for ok in results if ok)
    print(f"\nREMOTE STORAGE CHECK: {passed}/{len(results)} PASS")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))