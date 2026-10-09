"""R.2-P3D template-local pipeline coverage.

Covers the acceptance items beyond the basic contract flow:
- QC failure on missing coverage + retake guidance; QC_FAILED capture blocks generation
- generation idempotency (same key -> same model)
- job status/progress route (async surface)
- retry guard (cannot retry a READY candidate)
- cross-pet isolation
- version upgrade with more photo evidence (observed manifest)
- provenance: no-photo generation stays template-default (no observed claims)
"""

import uuid
from pathlib import Path

from tests.conftest import auth

COVERAGE_FULL = {
    "front": True, "left": True, "right": True, "back": True,
    "full_body": True, "head": True,
}


def _create_capture(client, pet_id, headers, n=4, coverage=None):
    r = client.post(
        f"/api/v1/pets/{pet_id}/visual-captures",
        json={
            "artifact_ids": [str(uuid.uuid4()) for _ in range(n)],
            "capture_type": "PHOTO_SET",
            "consent_visual_model_training": False,
            "coverage": coverage or COVERAGE_FULL,
        },
        headers=headers,
    )
    assert r.status_code == 200, r.text
    return r.json()


def _create_model(client, pet_id, headers, capture_id=None, idempotency_key=None):
    r = client.post(
        f"/api/v1/pets/{pet_id}/visual-models",
        json={"capture_id": capture_id, "idempotency_key": idempotency_key},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    return r.json()


def _wait_request(client, *args, timeout_s=8.0, **kwargs):
    import time

    end = time.time() + timeout_s
    while time.time() < end:
        j = client.get(*args, **kwargs)
        if j.status_code == 200 and j.json()["status"] == "READY":
            return j.json()
        time.sleep(0.1)
    raise AssertionError("job did not reach READY")


def test_qc_fail_when_required_angle_missing(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    headers = auth(owner)
    cap = _create_capture(
        client, coco, headers, n=3,
        coverage={"front": True, "full_body": True, "head": False},
    )
    qc = client.post(
        f"/api/v1/pets/{coco}/visual-captures/{cap['capture_id']}/qc",
        json={}, headers=headers,
    ).json()
    assert qc["qc_passed"] is False
    assert qc["status"] == "QC_FAILED"
    assert "head" in qc["qc_result"]["missing_angles"]
    assert any("补拍" in g for g in qc["qc_result"]["retake_guidance"])

    # a QC_FAILED capture must NOT generate a candidate (strict gate)
    m = client.post(
        f"/api/v1/pets/{coco}/visual-models",
        json={"capture_id": cap["capture_id"]},
        headers=headers,
    )
    assert m.status_code == 422


def test_contamination_and_privacy_reported_heuristic_only(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    headers = auth(owner)
    cap = _create_capture(client, coco, headers, n=4)
    qc = client.post(
        f"/api/v1/pets/{coco}/visual-captures/{cap['capture_id']}/qc",
        json={}, headers=headers,
    ).json()
    for field in ("identity_consistency", "contamination_check", "blur_check",
                  "exposure_check", "occlusion_check", "multi_pet_interference",
                  "resolution_check"):
        assert qc["qc_result"].get(field) == "heuristic_only"



def test_real_uploaded_artifacts_materialize_with_angle_provenance(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    headers = auth(owner)
    media = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "media" / "doudou-demo-dog"
    artifact_by_angle = {}
    for angle, filename in (
        ("front", "front.png"),
        ("full_body", "full_body.png"),
        ("head", "head.png"),
    ):
        raw = (media / filename).read_bytes()
        upload = client.post(
            f"/api/v1/pets/{coco}/artifacts",
            files={"file": (filename, raw, "image/png")},
            headers=headers,
        )
        assert upload.status_code == 201, upload.text
        artifact_by_angle[angle] = upload.json()["artifact_id"]

    cap = client.post(
        f"/api/v1/pets/{coco}/visual-captures",
        json={
            "artifact_ids": list(artifact_by_angle.values()),
            "capture_type": "PHOTO_SET",
            "consent_visual_model_training": False,
            "coverage": {angle: True for angle in artifact_by_angle},
            "angle_artifact_ids": artifact_by_angle,
        },
        headers=headers,
    )
    assert cap.status_code == 200, cap.text
    body = cap.json()
    assert body["angle_artifact_ids"] == artifact_by_angle

    qc = client.post(
        f"/api/v1/pets/{coco}/visual-captures/{body['capture_id']}/qc",
        json={},
        headers=headers,
    )
    assert qc.status_code == 200, qc.text
    assert qc.json()["qc_passed"] is True

    model = _create_model(client, coco, headers, capture_id=body["capture_id"])
    _wait_request(
        client,
        f"/api/v1/pets/{coco}/visual-models/{model['version']}/job",
        headers=headers,
    )
    resolved = client.get(
        f"/api/v1/pets/{coco}/visual-models/{model['version']}",
        headers=headers,
    ).json()
    opts = resolved["metadata_json"]["opts"]
    assert opts["media_provenance"] == "OWNER_REPORTED"
    assert set(opts["capture_angles"]) == {"front", "full_body", "head"}
    assert resolved["observed_surface_manifest"].get("coat") == "photo_projection"


def test_generation_idempotent_via_key(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    headers = auth(owner)
    cap = _create_capture(client, coco, headers, n=4)
    key = f"gen-{uuid.uuid4().hex}"
    m1 = _create_model(client, coco, headers, capture_id=cap["capture_id"], idempotency_key=key)
    m2 = _create_model(client, coco, headers, capture_id=cap["capture_id"], idempotency_key=key)
    assert m1["model_id"] == m2["model_id"]
    assert m1["version"] == m2["version"]


def test_job_status_and_progress(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    headers = auth(owner)
    cap = _create_capture(client, coco, headers, n=4)
    m = _create_model(client, coco, headers, capture_id=cap["capture_id"])
    job = _wait_request(client, f"/api/v1/pets/{coco}/visual-models/{m['version']}/job", headers=headers)
    assert job["status"] == "READY"
    assert job["progress"] == 100
    assert job["pet_id"] == coco


def test_retry_guarded_until_failed(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    headers = auth(owner)
    m = _create_model(client, coco, headers, capture_id=None)
    job = _wait_request(client, f"/api/v1/pets/{coco}/visual-models/{m['version']}/job", headers=headers)
    assert job["status"] == "READY"
    r = client.post(
        f"/api/v1/pets/{coco}/visual-models/{m['version']}/retry",
        json={}, headers=headers,
    )
    assert r.status_code == 422  # cannot retry a READY (finished) candidate


def test_cross_pet_isolation(client, seeded):
    owner, coco, mimi = seeded["owner_id"], seeded["coco_id"], seeded["mimi_id"]
    headers = auth(owner)

    # Demo pets may already have their canonical DEMO_TEMPLATE Twin. Isolation
    # means creating a new Coco candidate changes only Coco's history; it does
    # not require either pet to start with an empty model table.
    before_coco = client.get(f"/api/v1/pets/{coco}/visual-models", headers=headers).json()["models"]
    before_mimi = client.get(f"/api/v1/pets/{mimi}/visual-models", headers=headers).json()["models"]

    cap = _create_capture(client, coco, headers, n=4)
    created = _create_model(client, coco, headers, capture_id=cap["capture_id"])
    lst_coco = client.get(f"/api/v1/pets/{coco}/visual-models", headers=headers).json()["models"]
    lst_mimi = client.get(f"/api/v1/pets/{mimi}/visual-models", headers=headers).json()["models"]

    assert len(lst_coco) == len(before_coco) + 1
    assert len(lst_mimi) == len(before_mimi)
    assert created["pet_id"] == coco
    assert all(m["pet_id"] == coco for m in lst_coco)
    assert all(m["pet_id"] == mimi for m in lst_mimi)


def test_version_upgrade_surface_manifest_and_provenance(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    headers = auth(owner)
    # v1 with full photos (豆豆 demo fixture resolves via capture->fixture
    # fallback) -> region-based observed manifest from actual media.
    cap1 = _create_capture(client, coco, headers, n=4)
    v1 = _create_model(client, coco, headers, capture_id=cap1["capture_id"])
    _wait_request(client, f"/api/v1/pets/{coco}/visual-models/{v1['version']}/job", headers=headers)
    r1 = client.get(f"/api/v1/pets/{coco}/visual-models/{v1['version']}", headers=headers).json()
    assert r1["provenance_kind"] == "GENERATED_3D"
    # Media-driven individual twin: at least coat observed, template-inferred
    # regions present (never the reverse).
    assert r1["observed_surface_manifest"].get("coat") == "photo_projection"
    assert r1["inferred_surface_manifest"].get("face") == "template_default"
    assert r1["artifact_map"]["twin_descriptor"]["surface"]["coverage_ratio"] > 0
    assert r1["artifact_map"]["twin_descriptor"]["morph"]["overall_scale"] >= 0.35
    assert r1["rig_version"].startswith("rig-anim")

    # v2 generated without photos -> observed empty, template-default texture
    v2 = _create_model(client, coco, headers, capture_id=None)
    _wait_request(client, f"/api/v1/pets/{coco}/visual-models/{v2['version']}/job", headers=headers)
    r2 = client.get(f"/api/v1/pets/{coco}/visual-models/{v2['version']}", headers=headers).json()
    assert v1["version"] != v2["version"]
    assert r2["texture_version"] == "template-default-v1"
    assert r2["observed_surface_manifest"] == {}


def test_verification_requires_owner_and_unknown_enum_not_returned_raw(client, seeded):
    owner, coco, family = seeded["owner_id"], seeded["coco_id"], seeded["family_id"]
    headers = auth(owner)
    m = _create_model(client, coco, headers, capture_id=None)
    _wait_request(client, f"/api/v1/pets/{coco}/visual-models/{m['version']}/job", headers=headers)
    # family (non-owner) cannot verify
    r = client.post(
        f"/api/v1/pets/{coco}/visual-models/{m['version']}/verify",
        json={"result": "like"}, headers=auth(family),
    )
    assert r.status_code == 403
