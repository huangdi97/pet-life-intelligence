"""R7 evidence must come from a real emulator, not mock screenshots."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_r7_life_replay_capture_exercises_real_api_and_android_ui():
    runner = (ROOT / "scripts/r5-6/capture-android-final.py").read_text(encoding="utf-8")
    app = (ROOT / "apps/mobile/App.tsx").read_text(encoding="utf-8")
    nav = (ROOT / "apps/mobile/src/demoNav.ts").read_text(encoding="utf-8")
    assert "def capture_r7_life_replay(" in runner
    assert 'method="POST",' in runner
    assert '"occurred_at": occurred_at.isoformat()' in runner
    assert 'replay_query("verified_now")' in runner
    assert 'replay_query("as_known_then")' in runner
    assert 'event_id not in current_ids or event_id in prior_ids' in runner
    assert 'android.start_link(f"pli-demo://nav?screen=lifeview&pet={pet_id}&date={recorded_day}")' in runner
    assert 'android.tap(verified_xml, "pli.lifeview.replay.as_known_then", "id")' in runner
    assert 'android.screenshot(evidence / "verified-now.png")' in runner
    assert 'android.screenshot(evidence / "as-known-then.png")' in runner
    assert 'capture_r7_life_replay(' in runner.split("def main() -> None:", 1)[1]
    assert "demoDateFromUrl(url)" in app
    assert 'stack === "LifeView" && date ? { date } : undefined' in nav
    assert "vision_model_used" in runner
