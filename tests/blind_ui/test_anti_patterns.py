"""Anti-pattern detectors + hard-coded pet name source scan (drives refactors)."""
from __future__ import annotations

from pathlib import Path

from anti_patterns import (
    detect_fake_3d,
    detect_generic_species_hero,
    scan_hardcoded_pet_names,
    scan_text_terms,
)


def test_scan_text_terms_finds_raw_tokens() -> None:
    hits = scan_text_terms(["训练目标：OPEN", "福利状态：STRESS_RECOVERY", "provider_x", "model_id: abc"])
    assert "OPEN" in hits
    assert "STRESS_RECOVERY" in hits
    assert "provider_" in hits
    assert "model_id" in hits


def test_scan_text_terms_clean_text_no_hits() -> None:
    hits = scan_text_terms(["今天整体稳定", "最近记录 3 分钟前", "健康状态：总体稳定"])
    assert hits == []


def test_fake_3d_detector_fails_static_image_with_ready_manifest() -> None:
    snap = {
        "manifest": {"ready": True},
        "elements": [{"id": "pli.today.pet-twin", "type": "img"}],
    }
    hits = detect_fake_3d(snap)
    assert hits, "static image pretending 3D while manifest ready must be FAKE_3D"


def test_fake_3d_detector_passes_real_twin() -> None:
    snap = {
        "manifest": {"ready": True},
        "elements": [{"id": "pli.today.pet-twin", "type": "twin"}],
    }
    assert detect_fake_3d(snap) == []


def test_generic_species_hero_detected() -> None:
    snap = {"elements": [{"id": "pli.pet.pet-twin", "type": "species-glyph"}]}
    hits = detect_generic_species_hero(snap)
    assert hits, "generic species glyph as hero must be flagged"


def test_hardcoded_pet_names_absent_in_production_sources(repo_root: Path) -> None:
    """Production UI must read currentPet.name; 豆豆/咪咪 only in seed/fixture/test."""
    hits = scan_hardcoded_pet_names(repo_root)
    assert hits == [], f"hard-coded pet names in production sources: {hits}"
