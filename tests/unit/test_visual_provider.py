"""Visual (3D) provider adapter contract tests — Stage H.2 (GOAL PHASE F/O1).

Any real 3D provider added later must pass the same contract: honest `real`
flag, queue/status/cancel/artifacts/metadata surface, and NEVER pretend a job
succeeded while REAL_3D_PROVIDER_EXTERNAL_BLOCKED.
"""

import time

from app.adapters.visual_provider import (
    SandboxProvider,
    get_provider,
    provider_status,
    reset_provider_cache,
)


def test_sandbox_provider_contract():
    provider = SandboxProvider()
    assert provider.name == "sandbox"
    assert provider.real is False

    job_id = provider.generate("cap-1", ["art-1", "art-2"], {"quality": "high"})
    assert job_id.startswith("sandbox-")
    # initially queued, then honestly fails because no real provider
    st = provider.status(job_id)
    assert st["status"] in ("QUEUED", "GENERATING", "FAILED")
    assert st["real"] is False
    assert st["provider"] == "sandbox"


def test_sandbox_job_ends_failed_not_success():
    provider = SandboxProvider()
    job_id = provider.generate("cap-1", ["art-1"], {})
    # force past the finish time
    provider._jobs[job_id]["finish_at"] = time.time() - 1
    st = provider.status(job_id)
    assert st["status"] == "FAILED"
    assert st["failure_reason"] == "REAL_3D_PROVIDER_EXTERNAL_BLOCKED"


def test_sandbox_cancel():
    provider = SandboxProvider()
    job_id = provider.generate("cap-1", ["art-1"], {})
    res = provider.cancel(job_id)
    assert res["status"] == "CANCELLED"
    # cancelling an unknown job is honest UNKNOWN, not a fake success
    res2 = provider.cancel("sandbox-missing")
    assert res2["status"] == "UNKNOWN"
    assert res2["real"] is False


def test_sandbox_artifacts_and_metadata_honest():
    provider = SandboxProvider()
    job_id = provider.generate("cap-1", ["art-1"], {})
    art = provider.artifacts(job_id)
    assert art["real"] is False
    assert art["artifacts"] == {}  # no real 3D artifacts ever
    meta = provider.metadata(job_id)
    assert meta["provider"] == "sandbox"
    assert meta["provider_model_version"] == ""
    assert meta["real"] is False


def test_provider_status_honest_blocked():
    reset_provider_cache()
    status = provider_status()
    assert status["real"] is False
    assert status["status"] == "REAL_3D_PROVIDER_EXTERNAL_BLOCKED"
    assert status["provider"] == "sandbox"


def test_get_provider_singleton():
    reset_provider_cache()
    a = get_provider()
    b = get_provider()
    assert a is b
