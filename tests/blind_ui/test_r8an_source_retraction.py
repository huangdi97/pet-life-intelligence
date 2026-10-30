"""R8AN: original-source retraction is owner-only, two-step and server-derived."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_web_retraction_is_two_step_owner_only_and_retains_reviews():
    page = read("apps/web/app/pets/[id]/history/[caseId]/page.tsx")
    spec = read("tests/e2e-browser/specs/r8-followup.spec.ts")
    events = read("services/api/app/api/routes/events.py")

    # Only an owner view with a still-valid source can start the action.
    assert "detail.owner_can_review && source.valid" in page
    assert "if (!detail?.owner_can_review || retracting) return;" in page
    # Two explicit steps: the first only arms the target.
    assert "setRetractTarget(source.event_id)" in page
    assert "retract-confirm" in page
    assert "retract-yes" in page
    # The real retraction endpoint is the server's audited capability check.
    assert "/events/${eventId}/retract" in page
    assert "enums.Capability.MANAGE_PET" in events
    # No local rewrite of history: stale source rows are dropped, Case reloaded.
    assert "setSources([]);" in page
    assert "请重新核对档案" in page
    assert "load();" in page

    # Browser regression proves the DERIVED state, not a client-side label.
    assert 'expect(page.getByTestId("pli.r8.web-case.status")).toContainText("原始记录已变更")' in spec
    assert 'expect(invalidBody.state).toBe("INVALIDATED")' in spec
    assert "expect(invalidBody.reviews).toHaveLength(observations.length)" in spec


def test_retraction_copy_never_claims_recovery_or_deletes_owner_reviews():
    page = read("apps/web/app/pets/[id]/history/[caseId]/page.tsx")
    assert "旧对比失效，主人历史反馈仍保留" in page
    assert "已撤回这条原始记录" in page
    assert "删除" not in page.split("const retractSource", 1)[1].split("const review", 1)[0]


def test_android_retraction_is_two_step_and_reloads_server_state():
    sources = read("apps/mobile/src/components/life/CaseSourceList.tsx")
    screen = read("apps/mobile/src/screens/LifeChangeCaseScreen.tsx")
    script = read("scripts/r5-6/capture-android-final.py")

    assert "ownerCanRetract: boolean;" in sources
    assert "ownerCanRetract && source.valid" in sources
    assert "api.post(`/events/${eventId}/retract`, {})" in sources
    assert "setRows([]);" in sources
    assert "onRetracted();" in sources
    assert "ownerCanRetract={detail.owner_can_review === true}" in screen
    assert "onRetracted={() => setReload((n) => n + 1)}" in screen

    # Real runtime proof requires the native status, the server-derived state
    # and an unchanged append-only Review count — not just a 200 response.
    assert "R8AO" in script
    assert 'if "原始记录已变更" not in retracted_status' in script
    assert 'retraction_api.get("source_valid") is not False' in script
    assert '"reviews_preserved": True' in script
    assert "case-source-retraction-truth.json" in script


def test_mini_retraction_is_two_step_owner_only_and_never_local():
    detail = read("apps/mini/src/pages/observations/detail/index.tsx")
    assert "detail.owner_can_review && source.valid" in detail
    assert "if (!detail?.owner_can_review || retracting) return;" in detail
    assert "/events/${eventId}/retract" in detail
    assert "setRetractTarget(source.event_id)" in detail
    assert "pli.r8.mini-source-retract-confirm" in detail
    assert "pli.r8.mini-source-retract-yes" in detail
    # No client rewrite of the derived state; drop stale rows and reload.
    assert "setSources([]);" in detail
    assert "请重新核对档案" in detail
    assert "load();" in detail
