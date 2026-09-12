"""Package-level test helpers (importable as tests.conftest)."""


def auth(user_id: str) -> dict:
    return {"X-Dev-User-Id": user_id}
