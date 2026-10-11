"""Known-bad calibration V2: the blind harness MUST FAIL known-bad screens
(Android glyph/synthetic fallback included), the known-good fixture must PASS
(ORACLE_INVALID != TRUE), and the V2 truth gates must reject generic/synthetic/
static-image candidates."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BRIDGE = ROOT / "scripts" / "blind-ui" / "eval-contract.mjs"
CONTRACTS = ROOT / "packages" / "visual-contract" / "screens"


def _evaluate(contract_name: str, snapshot: Path | str, platform: str = "web") -> dict:
    proc = subprocess.run(
        ["node", str(BRIDGE), str(CONTRACTS / contract_name), str(snapshot), platform],
        capture_output=True,
        text=True, encoding="utf-8",
        check=False,
    )
    assert proc.returncode == 0, proc.stderr[:500]
    return json.loads(proc.stdout)


def _load_fixture(name: str) -> dict:
    return json.loads((Path(__file__).resolve().parent / "fixtures" / "known-bad" / f"{name}.json").read_text(encoding="utf-8"))


def _fixture(name: str) -> Path:
    return Path(__file__).resolve().parent / "fixtures" / "known-bad" / f"{name}.json"


def _good(name: str) -> Path:
    return Path(__file__).resolve().parent / "fixtures" / "known-good" / f"{name}.json"


def failed_ids(score: dict) -> set[str]:
    return {r["id"] for r in score["failed"]}


def test_known_bad_today_fails() -> None:
    score = _evaluate("today.json", _fixture("known_bad_today"))
    assert not score["pass"], "known-bad Today must FAIL"
    # raw OPEN detected + anchors incomplete + static image twin pretending 3D
    assert "today.content.purity" in score["criticalFailed"]
    assert "today.anchor.activity" in score["criticalFailed"] or "today.anchor.sleep" in score["criticalFailed"]
    from anti_patterns import detect_fake_3d
    assert detect_fake_3d(_load_fixture("known_bad_today")), "static image twin while manifest ready must be FAKE_3D"


def test_known_bad_pet_fails() -> None:
    score = _evaluate("pet-world.json", _fixture("known_bad_pet"))
    assert not score["pass"]
    assert "pet.twin.present" in score["criticalFailed"]
    assert "pet.friends" in score["criticalFailed"]
    assert "pet.domain.meaning" in score["criticalFailed"]


def test_known_bad_lifeview_fails() -> None:
    score = _evaluate("life-view.json", _fixture("known_bad_lifeview"))
    assert not score["pass"]
    # content purity: OWNER_REPORTED leaked
    assert "life.content.purity" in score["criticalFailed"]
    # stage ratio below 52% (300/764=0.39)
    assert "life.stage.ratio" in failed_ids(score)


def test_known_bad_twinreview_fails() -> None:
    score = _evaluate("twin-review.json", _fixture("known_bad_twinreview"))
    assert not score["pass"]
    # static image twin while manifest absent -> V2 manifest-origin gate fails
    assert "review.3d.origin" in failed_ids(score)
    assert "review.twin.present" in score["criticalFailed"] or score["total"] < 92


def test_known_bad_synthetic_manifest_rejected_on_android() -> None:
    """V2: a synthetic extractor fallback manifest (manifestOrigin != RUNTIME)
    must NOT satisfy the Android product gate (B2/B3)."""
    snap = _load_fixture("known_bad_twinreview")
    snap["platform"] = "android"
    snap["manifest"] = {
        "ready": False,
        "manifestOrigin": "SYNTHETIC_FALLBACK_EVIDENCE",
        "representation": "2.5d-photo-fallback",
        "fallbackUsed": True,
        "wireframe": False,
    }
    (Path(__file__).resolve().parent / "fixtures" / "known-bad" / "known_bad_synthetic.json").write_text(
        json.dumps(snap, ensure_ascii=False), encoding="utf-8"
    )
    for contract in ("today.json", "pet-world.json", "life-view.json", "twin-review.json"):
        score = _evaluate(contract, _fixture("known_bad_synthetic"), platform="android")
        assert not score["pass"], f"{contract}: synthetic fallback must FAIL on Android"
        assert "manifest-origin" in str(score["failed"]), f"{contract}: manifest-origin gate must fail"


def test_known_bad_generic_demo_rejected_as_product_candidate() -> None:
    """V2: procedural-demo-stage/generic must be rejected as a FINAL product
    candidate on Web AND Android (B3/B4)."""
    snap = _load_fixture("known_bad_today")
    snap["platform"] = "web"
    snap["manifest"] = {
        "ready": True,
        "manifestOrigin": "RUNTIME",
        "representation": "procedural-demo-stage",
        "generic": True,
        "petId": "pet-1",
        "sourceMediaCount": 0,
        "assetVersion": "demo-v1",
        "fallbackUsed": False,
        "wireframe": False,
    }
    (Path(__file__).resolve().parent / "fixtures" / "known-bad" / "known_bad_generic_demo.json").write_text(
        json.dumps(snap, ensure_ascii=False), encoding="utf-8"
    )
    score = _evaluate("today.json", _fixture("known_bad_generic_demo"))
    assert not score["pass"], "generic demo 3D as final candidate must FAIL"
    assert "today.identity.gate" in score["criticalFailed"], "identity gate must reject generic demo"


def test_known_bad_android_glyph_fails_hero_contracts() -> None:
    """B4 known-bad: Android generic glyph Today/Pet/LifeView/TwinReview must
    FAIL even though platform=android (no platform escape hatch anymore)."""
    base = {"platform": "android", "viewport": {"width": 1080, "height": 2400}, "text": [], "elements": []}
    for contract, needs in {
        "today.json": ("pli.today.pet-twin",),
        "pet-world.json": ("pli.pet.pet-twin",),
        "life-view.json": ("pli.lifeview.twin",),
        "twin-review.json": ("pli.twinreview.twin",),
    }.items():
        snap = dict(base)
        snap["elements"] = [
            {"id": t, "role": "img", "type": "species-glyph", "x": 400, "y": 300, "width": 220, "height": 220, "visible": True, "text": "species glyph"}
            for t in needs
        ]
        snap["manifest"] = {
            "ready": False,
            "manifestOrigin": "SYNTHETIC_FALLBACK_EVIDENCE",
            "representation": "2.5d-photo-fallback",
            "fallbackUsed": True,
            "wireframe": False,
        }
        (Path(__file__).resolve().parent / "fixtures" / "known-bad" / f"known_bad_android_glyph_{Path(contract).stem}.json").write_text(
            json.dumps(snap, ensure_ascii=False), encoding="utf-8"
        )
        score = _evaluate(contract, Path(__file__).resolve().parent / "fixtures" / "known-bad" / f"known_bad_android_glyph_{Path(contract).stem}.json", platform="android")
        assert not score["pass"], f"{contract}: Android glyph must FAIL (no unlessPlatform)"
        assert "manifest-origin" in str(score["failed"]) or "identity" in str(score["failed"])


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
    score = _evaluate("today.json", _good("known_good_today"))
    assert score["pass"], f"known-good Today must PASS: {score['total']}/100 failed={[r['id'] for r in score['failed']]}"
    assert score["criticalFailed"] == []


def test_known_good_today_camera_zoom_rotate_gates_pass() -> None:
    snap = json.loads(_good("known_good_today").read_text(encoding="utf-8"))
    # known-good today has no lifeview; assert the evaluator yields pass for the
    # camera-aware contract only when cameras exist.
    if snap.get("cameras") is None:
        evil = dict(snap)
        evil["cameras"] = {
            "rotateA": {"yaw": 0.35, "pitch": 0.28, "distance": 4.6},
            "rotateB": {"yaw": 0.3501, "pitch": 0.28, "distance": 4.6},
            "zoomA": {"distance": 4.6},
            "zoomB": {"distance": 4.61},
            "reset": {"yaw": 0.38},
        }
        (Path(__file__).resolve().parent / "fixtures" / "known-bad" / "known_bad_no_rotation.json").write_text(
            json.dumps(evil, ensure_ascii=False), encoding="utf-8"
        )
        evil_score = _evaluate("life-view.json", _fixture("known_bad_no_rotation"))
        evil_fail = {r["id"] for r in evil_score["failed"]}
        assert "life.camera.rotate" in evil_fail, "rotation with |Δyaw| below threshold must FAIL"


def test_oracle_not_invalid() -> None:
    """ORACLE_INVALID would be TRUE if the known-good fixture also failed."""
    score = _evaluate("today.json", _good("known_good_today"))
    assert score["pass"], "ORACLE_INVALID=TRUE (known-good fixture failed)"
