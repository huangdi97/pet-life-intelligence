from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app, raise_server_exceptions=False)


def test_health() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["service"] == "pli-api"


def test_engine_info() -> None:
    response = client.get("/api/v1/ready/engine-info")
    assert response.status_code == 200
    body = response.json()
    assert body["rule_engine"] == "pli_red_flag_engine"
    assert body["rule_count"] >= 8


def test_error_envelope_on_unknown_route() -> None:
    response = client.get("/api/v1/nonexistent")
    assert response.status_code == 404
    assert "error" in response.json()
