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


def test_correction_has_a_real_android_runtime_gate():
    script = read("scripts/r5-6/capture-android-final.py")
    capture = script.split("def capture_r8_correction", 1)[1].split("def main", 1)[0]
    assert "capture_r8_correction(" in script
    assert "pli.r8.case-detail.source.correct." in capture
    assert "pli.r8.case-detail.source.correct-input." in capture
    assert 'android.shell("input", "text", "35")' in capture
    assert 'android.shell("input", "keyevent", "111")' in capture
    assert "case-source-correction-truth.json" in capture
    assert '"corrected_by_real_android_tap": True' in capture
    assert '"original_row_unchanged": True' in capture
    # Independent fixture: correction must not reuse the retraction Case.
    assert '"name": f"R8AS Correction' in capture
