"""Validation response must be JSON-safe and must not echo private input."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel, model_validator

from app.core.errors import install_error_handlers


class _DiaryRequest(BaseModel):
    text: str

    @model_validator(mode="after")
    def _nonempty(self) -> "_DiaryRequest":
        if not self.text.strip():
            raise ValueError("Diary requires text or an audio artifact.")
        return self


def test_model_validator_valueerror_returns_safe_422() -> None:
    app = FastAPI()
    install_error_handlers(app)

    @app.post("/diary")
    def add_diary(body: _DiaryRequest) -> dict:
        return {"accepted": True}

    with TestClient(app) as client:
        response = client.post("/diary", json={"text": "   ", "extra": "private"})
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert error["details"]["errors"]
    assert error["details"]["errors"][0]["type"] == "value_error"
    assert set(error["details"]["errors"][0]) == {"loc", "type", "msg"}
    # In Pydantic v2 the raw error context holds an actual ValueError and
    # the input contains the submitted body; neither may be exposed.
    assert "private" not in response.text
    assert '"ctx"' not in response.text
    assert '"input"' not in response.text


def test_field_validation_error_preserves_safe_location() -> None:
    app = FastAPI()
    install_error_handlers(app)

    @app.post("/diary")
    def add_diary(body: _DiaryRequest) -> dict:
        return {"accepted": True}

    with TestClient(app) as client:
        response = client.post("/diary", json={"text": 123})
    assert response.status_code == 422
    details = response.json()["error"]["details"]["errors"]
    assert details[0]["loc"] == ["body", "text"]
    assert details[0]["type"] == "string_type"
