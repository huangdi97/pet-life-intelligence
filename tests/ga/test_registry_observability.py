"""Stage D G13/G16 — capability registry + observability tests."""


from tests.conftest import auth


def test_capability_registry_seeded_and_queryable(client, seeded):
    r = client.get("/api/v1/capabilities", headers=auth(seeded["owner_id"]))
    assert r.status_code == 200
    rows = r.json()
    by_key = {(c["capability"], c["provider"]): c for c in rows}
    # sandbox must be explicitly SANDBOX and never presented as real
    sandbox = by_key[("device.telemetry", "fake")]
    assert sandbox["mode"] == "SANDBOX" and sandbox["status"] == "SANDBOX_READY"
    assert "sandbox" in sandbox["notes"].lower()
    # real vendors blocked
    real = by_key[("device.telemetry", "<real vendors>")]
    assert real["mode"] == "REAL" and real["status"] == "EXTERNAL_BLOCKED"
    # payments blocked
    assert by_key[("payments", "any")]["status"] == "EXTERNAL_BLOCKED"
    # every entry carries flag/contract/risk metadata
    for c in rows:
        assert c["contract_version"]
        assert c["risk_level"] in ("LOW", "MEDIUM", "HIGH")


def test_external_blocked_error_code(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.post(f"/api/v1/pets/{coco}/devices",
                    json={"provider": "petkit", "device_key": "x"},
                    headers=auth(owner))
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "EXTERNAL_BLOCKED"


def test_request_id_echoed_and_unique(client, seeded):
    owner = seeded["owner_id"]
    r1 = client.get("/api/v1/pets", headers={**auth(owner),
                                             "X-Request-ID": "req-fixed-1"})
    assert r1.headers["X-Request-ID"] == "req-fixed-1"
    r2 = client.get("/api/v1/pets", headers=auth(owner))
    assert r2.headers["X-Request-ID"] not in ("", "req-fixed-1")
    # error envelope carries the same request id
    err = client.get("/api/v1/pets/00000000-0000-0000-0000-00000000dead",
                     headers=auth(owner))
    assert err.json()["error"]["request_id"] == err.headers["X-Request-ID"]


def test_access_log_contains_request_id_without_sensitive_payload(
    client, seeded, caplog
):
    import logging

    owner, coco = seeded["owner_id"], seeded["coco_id"]
    with caplog.at_level(logging.INFO, logger="pli.access"):
        client.post(f"/api/v1/pets/{coco}/events",
                    json={"event_type": "daily.meal",
                          "payload": {"food_type": "鸡肉配方敏感文本", "amount": "80"},
                          "allow_duplicate": True},
                    headers=auth(owner))
    records = [r for r in caplog.records if r.name == "pli.access"]
    assert records, "access log must emit request lines"
    line = records[-1]
    assert line.request_id
    assert line.method == "POST"
    assert line.status == 201
    assert line.duration_ms >= 0
    # the log payload must not contain the request body (sensitive text rule)
    assert "鸡肉配方敏感文本" not in str(line.__dict__)


def test_error_taxonomy_codes(client, seeded):
    owner = seeded["owner_id"]
    cases = [
        ("/api/v1/pets/00000000-0000-0000-0000-00000000dead", auth(owner), 404, "NOT_FOUND"),
        ("/api/v1/pets", {}, 401, "UNAUTHENTICATED"),
    ]
    for path, headers, status, code in cases:
        r = client.get(path, headers=headers)
        assert r.status_code == status
        assert r.json()["error"]["code"] == code
    # rate limit code exists in taxonomy (429 path covered by middleware)
    from app.core.errors import RateLimited

    assert RateLimited.code == "RATE_LIMITED"
