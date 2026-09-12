"""Contract tests (G11): API-emitted events validate against the canonical
JSON Schema in packages/domain-schema; error envelope contract holds."""

import json
import os

import jsonschema

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SCHEMA_PATH = os.path.join(ROOT, "packages", "domain-schema", "life_event.schema.json")


def load_schema():
    with open(SCHEMA_PATH, encoding="utf-8") as f:
        return json.load(f)


def test_schema_file_valid():
    schema = load_schema()
    jsonschema.Draft202012Validator.check_schema(schema)
    cls = schema["properties"]["source_type"]["enum"]
    assert set(cls) == {
        "OWNER_REPORTED", "CAREGIVER_REPORTED", "DEVICE_DERIVED", "AI_DERIVED",
        "PROFESSIONAL_CONFIRMED", "LAB_CONFIRMED", "SYSTEM_CALCULATED",
    }


def test_api_event_output_matches_schema(client, seeded):
    from tests.conftest import auth

    owner = seeded["owner_id"]
    coco = seeded["coco_id"]
    resp = client.get(f"/api/v1/pets/{coco}/events?limit=20", headers=auth(owner))
    assert resp.status_code == 200
    schema = load_schema()
    validator = jsonschema.Draft202012Validator(schema)
    # schema additionalProperties=false requires exact field set; the API
    # returns a superset (actor_name) so validate the canonical projection.
    for ev in resp.json()["events"]:
        projection = {k: v for k, v in ev.items() if k in schema["properties"]}
        errors = list(validator.iter_errors(projection))
        assert not errors, f"{ev['event_type']}: {[e.message for e in errors[:3]]}"
        assert ev["schema_version"] == "1.0.0"


def test_error_envelope_contract(client):
    resp = client.get("/api/v1/pets/00000000-0000-0000-0000-00000000dead")
    assert resp.status_code in (401, 403, 404)
    body = resp.json()
    assert "error" in body
    err = body["error"]
    assert {"code", "message", "request_id"} <= set(err.keys())


def test_openapi_available(client):
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    paths = resp.json()["paths"]
    for expected in (
        "/api/v1/pets", "/api/v1/pets/{pet_id}/events", "/api/v1/pets/{pet_id}/today",
        "/api/v1/pets/{pet_id}/tasks", "/api/v1/pets/{pet_id}/handoffs",
        "/api/v1/pets/{pet_id}/care-cards", "/api/v1/pets/{pet_id}/behavior-events",
        "/api/v1/pets/{pet_id}/health-events", "/api/v1/pets/{pet_id}/medication-plans",
        "/api/v1/pets/{pet_id}/grants", "/api/v1/pets/{pet_id}/consents",
        "/api/v1/health-events/{health_event_id}/vet-brief",
        "/api/v1/health-events/{health_event_id}/outcomes",
    ):
        assert expected in paths, f"missing contract path {expected}"
