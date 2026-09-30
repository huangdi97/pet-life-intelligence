"""Known-bad calibration: the blind harness MUST FAIL the current known-bad
screens, and the known-good fixture must PASS (ORACLE_INVALID != TRUE)."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BRIDGE = ROOT / "scripts" / "blind-ui" / "eval-contract.mjs"
CONTRACTS = ROOT / "packages" / "visual-contract" / "screens"


def _evaluate(contract_name: str, snapshot: Path, platform: str = "web") -> dict:
    proc = subprocess.run(
        ["node", str(BRIDGE), str(CONTRACTS / contract_name), str(snapshot), platform],
        capture_output=True,
        text=True, encoding="utf-8",
        check=False,
    )
    assert proc.returncode == 0, proc.stderr[:500]
    return json.loads(proc.stdout)


def _load(name: str) -> dict:
    return json.loads((Path(__file__).resolve().parent / "fixtures" / "known-bad" / f"{name}.json").read_text(encoding="utf-8"))


def test_known_bad_today_fails() -> None:
    score = _evaluate("today.json", Path(__file__).resolve().parent / "fixtures" / "known-bad" / "known_bad_today.json")
    assert not score["pass"], "known-bad Today must FAIL"
    # raw OPEN detected + anchors incomplete + static image twin pretending 3D
    assert "today.content.purity" in score["criticalFailed"]
    assert "today.anchor.activity" in score["criticalFailed"] or "today.anchor.sleep" in score["criticalFailed"]
    from anti_patterns import detect_fake_3d
    assert detect_fake_3d(_load("known_bad_today")), "static image twin while manifest ready must be FAKE_3D"

def test_known_bad_pet_fails() -> None:
    score = _evaluate("pet-world.json", Path(__file__).resolve().parent / "fixtures" / "known-bad" / "known_bad_pet.json")
    assert not score["pass"]
    assert "pet.twin.present" in score["criticalFailed"]
    assert "pet.friends" in score["criticalFailed"]
    assert "pet.domain.meaning" in score["criticalFailed"]


def test_known_bad_lifeview_fails() -> None:
    score = _evaluate("life-view.json", Path(__file__).resolve().parent / "fixtures" / "known-bad" / "known_bad_lifeview.json")
    assert not score["pass"]
    # content purity: OWNER_REPORTED leaked
    assert "life.content.purity" in score["criticalFailed"]
    # stage ratio below 52% (300/764=0.39)
    assert "life.stage.ratio" in [r["id"] for r in score["failed"]]


def test_known_bad_twinreview_fails() -> None:
    score = _evaluate("twin-review.json", Path(__file__).resolve().parent / "fixtures" / "known-bad" / "known_bad_twinreview.json")
    assert not score["pass"]
    # static image twin while manifest absent -> manifest truth checks fail
    assert "review.3d.manifest" in [r["id"] for r in score["failed"]]
    assert "review.twin.present" in score["criticalFailed"] or score["total"] < 92


def test_known_bad_training_open_detected() -> None:
    from anti_patterns import scan_text_terms

    hits = scan_text_terms(["目标状态：OPEN"], ["OPEN"])
    assert hits == ["OPEN"]


def test_known_bad_welfare_stress_detected() -> None:
    from anti_patterns import scan_text_terms

    hits = scan_text_terms(["状态：STRESS_RECOVERY", "来源：OWNER_REPORTED"], ["STRESS_RECOVERY", "OWNER_REPORTED"])
    assert "STRESS_RECOVERY" in hits
    assert "OWNER_REPORTED" in hits


def test_known_good_today_passes() -> None:
    score = _evaluate("today.json", Path(__file__).resolve().parent / "fixtures" / "known-good" / "known_good_today.json")
    assert score["pass"], f"known-good Today must PASS: {score['total']}/100 failed={[r['id'] for r in score['failed']]}"
    assert score["criticalFailed"] == []


def test_oracle_not_invalid() -> None:
    """ORACLE_INVALID would be TRUE if the known-good fixture also failed."""
    score = _evaluate("today.json", Path(__file__).resolve().parent / "fixtures" / "known-good" / "known_good_today.json")
    assert score["pass"], "ORACLE_INVALID=TRUE (known-good fixture failed)"
