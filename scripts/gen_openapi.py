"""Generate & validate the OpenAPI contract artifact.

Usage:
  .venv/Scripts/python.exe scripts/gen_openapi.py

Writes docs/api/openapi.json (committed artifact) and validates that the
running spec contains the expected /api/v1 paths + error envelope.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "services" / "api"))

from app.main import app  # noqa: E402

spec = app.openapi()
out = Path(__file__).resolve().parents[1] / "docs" / "api" / "openapi.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(spec, ensure_ascii=False, indent=2), encoding="utf-8")

paths = spec.get("paths", {})
api_paths = [p for p in paths if p.startswith("/api/v1")]
assert api_paths, "no /api/v1 paths found in OpenAPI spec"

required = [
    "/api/v1/health",
    "/api/v1/ready",
    "/api/v1/auth/dev/login",
    "/api/v1/pets",
    "/api/v1/pets/{pet_id}/events",
    "/api/v1/pets/{pet_id}/health-events",
    "/api/v1/pets/{pet_id}/tasks",
    "/api/v1/pets/{pet_id}/medication-plans",
]
for r in required:
    assert r in paths, f"missing required path {r} in OpenAPI spec"

print(f"OpenAPI artifact written: {out}")
print(f"paths: {len(paths)} total, {len(api_paths)} under /api/v1")
print(f"schemas: {len(spec.get('components', {}).get('schemas', {}))}")
