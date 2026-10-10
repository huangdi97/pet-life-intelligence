"""3D generation provider layer - Stage H.2 (GOAL PHASE F) / R.2-P3D.

Provider-agnostic interface; never binds to a specific vendor.

Contract (GOAL F1):
    generate(capture, opts) -> job_id      # enqueue generation
    status(job_id)          -> job status (+ progress)
    cancel(job_id)          -> cancel
    artifacts(job_id)       -> artifact map (glb/textures/thumbnails)
    metadata(job_id)        -> provider + model + geometry/texture/rig versions

Honesty rule (approved 2026-09-28): a real EXTERNAL generative provider
(TRELLIS / Hunyuan3D / Gaussian Splatting / SMAL-like rigs) is EXTERNAL_BLOCKED
here. The default path is TemplateLocalProvider, the in-repo deterministic
template + photo-texture pipeline that actually produces PROVISIONAL candidate
models (owner-review gated) while never claiming a real generative provider.
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
    """Deterministic local stand-in. Honest: never a real model.

    A sandbox job transitions QUEUED -> GENERATING -> FAILED (provider blocked)
    after a short delay, so the whole queue/status/cancel/failure surface is
    exercisable without a real generative provider. `real` is always False.
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
            # No real generative provider -> always fail the job honestly.
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


class TemplateLocalProvider:
    """In-repo deterministic generation provider (R.2-P3D approved path).

    Produces a PROVISIONAL candidate model reference: a template-family
    descriptor (dog/corgi, dog/spitz, cat ...) plus a surface manifest marking
    which attributes are projected from real photos (OBSERVED) vs completed by
    the template (INFERRED). `real` stays False and the external generative
    status is honestly EXTERNAL_BLOCKED, while local candidate generation
    actually completes (pipeline service drives complete()/fail()).
    """

    name = "template_local"
    real = False

    def generate(self, capture_id: str, artifact_ids: list[str], opts: dict) -> str:
        job_id = f"tmpl-{uuid.uuid4().hex[:12]}"
        self._jobs[job_id] = {
            "job_id": job_id,
            "capture_id": capture_id,
            "artifact_ids": artifact_ids,
            "opts": opts,
            "status": "QUEUED",
            "progress": 0,
            "created_at": time.time(),
            "failure_reason": None,
        }
        return job_id

    def status(self, job_id: str) -> dict:
        job = self._jobs.get(job_id)
        if not job:
            return {"job_id": job_id, "status": "UNKNOWN", "real": False}
        return {
            "job_id": job_id,
            "status": job["status"],
            "progress": job.get("progress", 0),
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
        job = self._jobs.get(job_id)
        if not job or job["status"] != "READY":
            return {"job_id": job_id, "real": False, "artifacts": {}}
        # The pipeline service stores the artifact_map on the model row; the
        # provider reports the render descriptor reference.
        return {
            "job_id": job_id,
            "real": False,
            "artifacts": {"render_descriptor": job.get("render_descriptor", "")},
        }

    def metadata(self, job_id: str) -> dict:
        job = self._jobs.get(job_id)
        if not job:
            return {"job_id": job_id, "real": False, "provider": self.name, "provider_model_version": ""}
        return {
            "job_id": job_id,
            "real": False,
            "provider": self.name,
            "provider_model_version": job.get("provider_model_version", "template-v1"),
            "geometry_version": job.get("geometry_version", ""),
            "texture_version": job.get("texture_version", ""),
            "rig_version": job.get("rig_version", ""),
        }

    def complete(self, job_id: str, *, render_descriptor: str, versions: dict) -> None:
        job = self._jobs.get(job_id)
        if not job:
            return
        job["status"] = "READY"
        job["progress"] = 100
        job["render_descriptor"] = render_descriptor
        job["provider_model_version"] = versions.get("provider_model_version", "template-v1")
        job["geometry_version"] = versions.get("geometry_version", "")
        job["texture_version"] = versions.get("texture_version", "")
        job["rig_version"] = versions.get("rig_version", "")

    def fail(self, job_id: str, reason: str) -> None:
        job = self._jobs.get(job_id)
        if not job:
            return
        job["status"] = "FAILED"
        job["failure_reason"] = reason

    _jobs: dict[str, dict] = {}


class ExternalBlockedProvider(SandboxProvider):
    """Explicit blocked provider used when the deployment forbids even template
    generation (e.g. PILOT_MODE without consent). Honest status reporting.
    """

    name = "external_blocked"
    real = False


# This is a capability/design recommendation, not an enabled provider.
# It names the currently preferred separation of concerns for a production
# individual Twin: appearance reconstruction and animation rigging are
# different jobs. Nothing here may make the owner UI claim a real Twin exists.
PRODUCTION_TWIN_PIPELINE_CANDIDATE = {
    "status": "DESIGN_ONLY_NOT_CONFIGURED",
    "appearance_reconstruction": "trellis2",
    "identity_gate": "OWNER_MEDIA_QC_PLUS_OWNER_REVIEW",
    "rigging": "unirig",
    "motion": "pli_motion_layer",
    "runtime": "dual_lod_glb",
}


_provider: VisualProvider | None = None


def get_provider() -> VisualProvider:
    """Return the configured 3D provider.

    With no REAL_3D_PROVIDER env flag this returns TemplateLocalProvider, the
    in-repo candidate-generation pipeline. A real external generative provider
    (e.g. TRELLIS.2) would register here behind a feature flag; until then the
    product must never claim live/real generative 3D while `real is False`.
    """
    global _provider
    if _provider is None:
        _provider = TemplateLocalProvider()
    return _provider


def provider_status() -> dict:
    p = get_provider()
    return {
        "provider": p.name,
        "real": p.real,
        "generative_real": False,
        # Honest: external generative providers remain blocked; the in-repo
        # template-local pipeline is what actually produces candidate models.
        "generative_status": "REAL_3D_PROVIDER_EXTERNAL_BLOCKED",
        "local_pipeline": "READY" if p.name == "template_local" else "UNSET",
        # The deterministic template path is useful for demo/fallback and
        # provenance plumbing, but it is not proof of high-fidelity identity.
        "local_candidate_fidelity": "TEMPLATE_PROVISIONAL" if p.name == "template_local" else "UNSET",
        "individual_high_fidelity_status": "NOT_YET_QUALIFIED" if not p.real else "REQUIRES_OWNER_VALIDATION",
        "production_pipeline_candidate": PRODUCTION_TWIN_PIPELINE_CANDIDATE,
        "status": "REAL_3D_PROVIDER_EXTERNAL_BLOCKED" if not p.real else "READY",
    }


def reset_provider_cache() -> None:
    """Test helper: clear cached provider between tests."""
    global _provider
    _provider = None
