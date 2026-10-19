"""R8AS: Android correction appends a supersede; it never edits history."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_android_correction_is_owner_only_numeric_and_append_only():
    sources = read("apps/mobile/src/components/life/CaseSourceList.tsx")
    screen = read("apps/mobile/src/screens/LifeChangeCaseScreen.tsx")

    assert "metric: string;" in sources
    assert "ownerCanRetract && source.valid && canCorrect" in sources
    assert 'metric === "walk_minutes_per_day" || metric === "sleep_minutes_per_day"' in sources
    assert "/events/${eventId}/supersede" in sources
    assert "r8-android-correction-${eventId}-${value}" in sources
    assert "payload: { duration_minutes: value }" in sources
    assert "发生时间与原始记录保持不变" in sources
    # No local rewrite: stale rows dropped, server-derived Case reloaded.
    assert "setRows([]);" in sources
    assert "await load(0);" in sources
    assert "metric={detail.metric}" in screen


def test_android_correction_failure_never_claims_a_correction():
    sources = read("apps/mobile/src/components/life/CaseSourceList.tsx")
    block = sources.split("const correct = async", 1)[1].split("const toggle", 1)[0]
    assert "humanizeError(e)" in block
    assert "康复" not in block
    assert "已修正" not in block
    # The submit label only exists before/while the request runs, not as an
    # unconfirmed success claim.
    assert 'correcting ? "正在提交…" : "提交修正"' in sources
