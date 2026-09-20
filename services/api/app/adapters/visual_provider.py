"""3D generation provider layer — Stage H.2 (GOAL PHASE F).

Provider-agnostic interface; never binds to a specific vendor. The
SandboxProvider stands in when no real provider is configured and must be
reported honestly as `REAL_3D_PROVIDER_EXTERNAL_BLOCKED` — it never pretends
to have generated a real 3D model.

Contract (GOAL F1):
    generate(capture, opts) -> job_id      # enqueue generation
    status(job_id)          -> job status
    cancel(job_id)          -> cancel
    artifacts(job_id)       -> artifact map (glb/textures/thumbnails)
    metadata(job_id)        -> provider + model + geometry/texture/rig versions

Real providers (TRELLIS / Hunyuan3D / Gaussian Splatting / SMAL-like rigs)
implement the same protocol behind `get_provider()`; none is activated
without a REAL_3D_PROVIDER env flag + credentials.
"""

from __future__ import annotations

import time
import uuid
from typing import Protocol


class VisualProviderError(RuntimeError):
    """Raised when a real provider is required but not available/configured."""


class VisualProvider(Protocol):
    name: str
    real: bool

    def generate(self, capture_id: str, artifact_ids: list[str], opts: dict) -> str: ...

    def status(self, job_id: str) -> dict: ...

    def cancel(self, job_id: str) -> dict: ...

    def artifacts(self, job_id: str) -> dict: ...

    def metadata(self, job_id: str) -> dict: ...


class SandboxProvider:
    """Deterministic local stand-in. Honest: never a real 3D model.

    A sandbox job transitions QUEUED → GENERATING → FAILED (provider blocked)
    after a short delay, so the whole queue/status/cancel/failure UI path is
    exercisable without a real provider. `real` is always False.
    """

    name = "sandbox"
    real = False

    def generate(self, capture_id: str, artifact_ids: list[str], opts: dict) -> str:
        job_id = f"sandbox-{uuid.uuid4().hex[:12]}"
        self._jobs[job_id] = {
            "job_id": job_id,
            "capture_id": capture_id,
            "artifact_ids": artifact_ids,
            "opts": opts,
            "status": "QUEUED",
            "created_at": time.time(),
            "finish_at": time.time() + 3.0,
        }
        return job_id

    def status(self, job_id: str) -> dict:
        job = self._jobs.get(job_id)
        if not job:
            return {"job_id": job_id, "status": "UNKNOWN", "real": False}
        if job["status"] in ("QUEUED", "GENERATING") and time.time() >= job["finish_at"]:
            # No real provider → always fail the job honestly.
            job["status"] = "FAILED"
            job["failure_reason"] = "REAL_3D_PROVIDER_EXTERNAL_BLOCKED"
        return {
            "job_id": job_id,
            "status": job["status"],
            "real": False,
            "failure_reason": job.get("failure_reason"),
            "provider": self.name,
        }

    def cancel(self, job_id: str) -> dict:
        job = self._jobs.get(job_id)
        if job and job["status"] in ("QUEUED", "GENERATING"):
            job["status"] = "CANCELLED"
        return {"job_id": job_id, "status": job["status"] if job else "UNKNOWN", "real": False}

    def artifacts(self, job_id: str) -> dict:
        return {"job_id": job_id, "real": False, "artifacts": {}}

    def metadata(self, job_id: str) -> dict:
        return {"job_id": job_id, "real": False, "provider": self.name, "provider_model_version": ""}

    # per-instance job store (stateless API workers each hold their own)
    _jobs: dict[str, dict] = {}


class ExternalBlockedProvider(SandboxProvider):
    """Explicit blocked provider used when the deployment forbids even sandbox
    generation (e.g. PILOT_MODE without consent). Equivalent to sandbox but
    named `external_blocked` for honest status reporting."""

    name = "external_blocked"
    real = False


_provider: VisualProvider | None = None


def get_provider() -> VisualProvider:
    """Return the configured 3D provider.

    With no REAL_3D_PROVIDER env flag this returns SandboxProvider, which
    honestly reports EXTERNAL_BLOCKED on every job. A future real provider
    (e.g. TRELLIS.2) registers here behind a feature flag; the product must
    never claim LIVE/real 3D while `real is False`.
    """
    global _provider
    if _provider is None:
        _provider = SandboxProvider()
    return _provider


def provider_status() -> dict:
    p = get_provider()
    return {
        "provider": p.name,
        "real": p.real,
        "status": "REAL_3D_PROVIDER_EXTERNAL_BLOCKED" if not p.real else "READY",
    }


def reset_provider_cache() -> None:
    """Test helper: clear cached provider between tests."""
    global _provider
    _provider = None
