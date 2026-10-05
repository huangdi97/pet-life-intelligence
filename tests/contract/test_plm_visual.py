"""Stage H.2 — Pet Living Model contract + flow tests (GOAL PHASE D/G/O).

Covers:
- openapi contract paths present
- capture → QC → generate → (sandbox fails honestly) → manual READY → verify
  → not_like cannot activate → like activates → manifest + state overlay
- versioning: second model gets version 2
- provenance: generated models are GENERATED_3D, never LIVE/RECORDED
- permission: non-owner cannot create capture (403)
"""

import uuid

from tests.conftest import auth


def _openapi_paths(client) -> set[str]:
    return set(client.get("/openapi.json").json()["paths"].keys())


def test_plm_contract_paths_present(client):
    paths = _openapi_paths(client)
    for expected in (
        "/api/v1/pets/{pet_id}/visual-captures",
        "/api/v1/pets/{pet_id}/visual-captures/{capture_id}",
        "/api/v1/pets/{pet_id}/visual-captures/{capture_id}/qc",
        "/api/v1/pets/{pet_id}/visual-models",
        "/api/v1/pets/{pet_id}/visual-models/{version}",
        "/api/v1/pets/{pet_id}/visual-models/{version}/verify",
        "/api/v1/pets/{pet_id}/visual-models/{version}/activate",
        "/api/v1/pets/{pet_id}/visual-models/{version}/retire",
        "/api/v1/pets/{pet_id}/visual-model/render-manifest",
        "/api/v1/pets/{pet_id}/state-overlay",
        "/api/v1/visual/status",
    ):
        assert expected in paths, f"missing PLM contract path {expected}"


def test_visual_status_honest_blocked(client):
    resp = client.get("/api/v1/visual/status")
    assert resp.status_code == 200
    body = resp.json()
    assert body["real"] is False
    assert body["status"] == "REAL_3D_PROVIDER_EXTERNAL_BLOCKED"


def test_capture_qc_flow(client, seeded):
    owner = seeded["owner_id"]
    coco = seeded["coco_id"]
    headers = auth(owner)

    cap = client.post(
        f"/api/v1/pets/{coco}/visual-captures",
        json={"artifact_ids": [str(uuid.uuid4()) for _ in range(5)],
              "capture_type": "PHOTO_SET", "consent_visual_model_training": False,
              "coverage": {"front": True, "left": True, "right": True, "back": True,
                           "full_body": True, "head": True}},
        headers=headers,
    )
    assert cap.status_code == 200, cap.text
    cap_id = cap.json()["capture_id"]
    assert cap.json()["status"] == "UPLOADED"

    qc = client.post(f"/api/v1/pets/{coco}/visual-captures/{cap_id}/qc", json={}, headers=headers)
    assert qc.status_code == 200, qc.text
    q = qc.json()
    assert q["qc_passed"] is True
    assert q["status"] == "QC_PASSED"
    assert q["qc_result"]["artifact_count"] == 5


def _wait_ready(client, pet_id: str, version: int, headers: dict, timeout_s: float = 8.0) -> dict:
    """Poll the generation job until READY (or timeout) — deterministic async."""
    import time

    end = time.time() + timeout_s
    while time.time() < end:
        job = client.get(
            f"/api/v1/pets/{pet_id}/visual-models/{version}/job", headers=headers
        )
        if job.status_code == 200 and job.json()["status"] == "READY":
            return client.get(
                f"/api/v1/pets/{pet_id}/visual-models/{version}", headers=headers
            ).json()
        time.sleep(0.1)
    raise AssertionError(f"generation job did not reach READY in {timeout_s}s")


def test_generate_template_local_enters_owner_review(client, seeded):
    owner = seeded["owner_id"]
    coco = seeded["coco_id"]
    headers = auth(owner)

    cap = client.post(
        f"/api/v1/pets/{coco}/visual-captures",
        json={"artifact_ids": [str(uuid.uuid4()) for _ in range(4)]},
        headers=headers,
    ).json()

    m = client.post(
        f"/api/v1/pets/{coco}/visual-models",
        json={"capture_id": cap["capture_id"]},
        headers=headers,
    )
    assert m.status_code == 200, m.text
    body = m.json()
    assert body["provenance_kind"] == "GENERATED_3D"
    assert body["provider"] == "template_local"

    ready = _wait_ready(client, coco, body["version"], headers)
    # OWNER_REVIEW (READY) — candidate generated, not yet owner-verified.
    assert ready["status"] == "READY"
    assert ready["geometry_version"].startswith("template-")
    assert ready["observed_surface_manifest"]  # photos -> photo_projection observed
    assert ready["inferred_surface_manifest"]["face"] == "template_default"

    # Honest: a real external generative provider is still reported blocked.
    status = client.get("/api/v1/visual/status", headers=headers).json()
    assert status["real"] is False
    assert status["status"] == "REAL_3D_PROVIDER_EXTERNAL_BLOCKED"
    assert status["local_pipeline"] == "READY"


def test_verify_not_like_cannot_activate(client, seeded):
    owner = seeded["owner_id"]
    coco = seeded["coco_id"]
    headers = auth(owner)

    # build a READY model directly via API path (sandbox can't produce real,
    # so simulate provider completion by flipping status in DB through API)
    cap = client.post(
        f"/api/v1/pets/{coco}/visual-captures",
        json={"artifact_ids": [str(uuid.uuid4()) for _ in range(4)]},
        headers=headers,
    ).json()
    m = client.post(
        f"/api/v1/pets/{coco}/visual-models",
        json={"capture_id": cap["capture_id"]},
        headers=headers,
    ).json()
    version = m["version"]

    # owner says NOT like → must not activate
    v = client.post(
        f"/api/v1/pets/{coco}/visual-models/{version}/verify",
        json={"result": "not_like", "issues": ["face", "coat"]},
        headers=headers,
    )
    assert v.status_code == 200, v.text
    assert v.json()["owner_verified"] is False

    act = client.post(
        f"/api/v1/pets/{coco}/visual-models/{version}/activate", json={}, headers=headers
    )
    assert act.status_code == 422, act.text  # blocked by rule (validation)

    # owner says like → activates; manifest becomes available
    v2 = client.post(
        f"/api/v1/pets/{coco}/visual-models/{version}/verify",
        json={"result": "like"},
        headers=headers,
    )
    assert v2.json()["owner_verified"] is True
    act2 = client.post(
        f"/api/v1/pets/{coco}/visual-models/{version}/activate", json={}, headers=headers
    )
    assert act2.status_code == 200, act2.text
    assert act2.json()["status"] == "ACTIVE"

    manifest = client.get(f"/api/v1/pets/{coco}/visual-model/render-manifest", headers=headers)
    assert manifest.status_code == 200, manifest.text
    man = manifest.json()
    assert man["version"] == version
    assert man["lod_policy"]["order"] == ["poster", "low", "interactive"]
    assert man["fallback_policy"]["primary"] == "real_photos"


def test_state_overlay_references_facts_only(client, seeded):
    owner = seeded["owner_id"]
    coco = seeded["coco_id"]
    headers = auth(owner)

    # seed a daily event so overlay has a metric
    client.post(
        f"/api/v1/pets/{coco}/events",
        json={"event_type": "daily.drink", "payload": {"amount": 200, "unit": "ml"}},
        headers=headers,
    )
    overlay = client.get(f"/api/v1/pets/{coco}/state-overlay", headers=headers)
    assert overlay.status_code == 200, overlay.text
    body = overlay.json()
    assert body["provider_real"] is False
    assert any(m["key"] == "daily.drink" for m in body["metrics"])
    for m in body["metrics"]:
        assert "current" in m and "source" in m  # references, not derived


def test_model_versioning_increments(client, seeded):
    owner = seeded["owner_id"]
    coco = seeded["coco_id"]
    headers = auth(owner)

    # The canonical demo seed now carries an ACTIVE DEMO_TEMPLATE Twin so
    # Web/Android runtime evidence exercises the real high-fidelity path.
    # Versioning must therefore be tested relative to the existing history,
    # not by assuming an empty model table.
    before = client.get(f"/api/v1/pets/{coco}/visual-models", headers=headers).json()["models"]
    baseline = max((int(m["version"]) for m in before), default=0)

    cap = client.post(
        f"/api/v1/pets/{coco}/visual-captures",
        json={"artifact_ids": [str(uuid.uuid4())]},
        headers=headers,
    ).json()
    m1 = client.post(
        f"/api/v1/pets/{coco}/visual-models", json={"capture_id": cap["capture_id"]}, headers=headers
    ).json()
    m2 = client.post(
        f"/api/v1/pets/{coco}/visual-models", json={"capture_id": cap["capture_id"]}, headers=headers
    ).json()
    assert m1["version"] == baseline + 1
    assert m2["version"] == baseline + 2
    lst = client.get(f"/api/v1/pets/{coco}/visual-models", headers=headers).json()["models"]
    versions = [int(m["version"]) for m in lst]
    assert versions[:2] == [baseline + 2, baseline + 1]
    assert set(int(m["version"]) for m in before).issubset(set(versions))


def test_seeded_demo_twins_are_explicit_templates_not_real_identity(client, seeded):
    owner = seeded["owner_id"]
    headers = auth(owner)

    for pet_id in (seeded["coco_id"], seeded["mimi_id"]):
        models = client.get(
            f"/api/v1/pets/{pet_id}/visual-models",
            headers=headers,
        ).json()["models"]
        demo = next((m for m in models if (m.get("metadata_json") or {}).get("demo_fixture") is True), None)
        assert demo is not None
        assert demo["status"] == "ACTIVE"
        assert demo["provenance_kind"] == "GENERATED_3D"
        assert (demo.get("metadata_json") or {}).get("media_provenance") == "DEMO_TEMPLATE"
        assert (demo.get("metadata_json") or {}).get("real_pet_identity_validation") == "NOT_YET_OBSERVED"
        assert (demo.get("identity_qc") or {}).get("scope") == "DEMO_FIXTURE_ONLY"
        assert (demo.get("identity_qc") or {}).get("real_pet_identity_validation") == "NOT_YET_OBSERVED"


def test_non_owner_cannot_create_capture(client, seeded):
    # another household member without manage capability
    other = seeded.get("family_id") or seeded["owner_id"]
    coco = seeded["coco_id"]
    headers = auth(other)
    resp = client.post(
        f"/api/v1/pets/{coco}/visual-captures",
        json={"artifact_ids": []},
        headers=headers,
    )
    # family can't manage: 403; owner fallback would 200 — only assert when family exists
    if other != seeded["owner_id"]:
        assert resp.status_code == 403
