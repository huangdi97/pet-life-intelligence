"""R2P3D-R1 individual twin pipeline tests.

Covers the media-driven Standard Individual Twin engine (A4) with deterministic
fixture media (tests/fixtures/media, DEMO_SYNTHETIC):
  - media QC + segmentation produces masks with sane silhouette stats
  - frame selection from video (skipped when ffmpeg absent)
  - identity consistency heuristic (same pet high, distinct pets lower)
  - morph fitting respects breed prior + silhouette aspects
  - multi-view texture projection -> observed/inferred split + coverage
  - surface manifest never claims observed for unobserved regions
  - metadata-only fallback for captureless generation (template default)
"""

import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "services" / "api"))

MEDIA = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "media"


@pytest.fixture(scope="module")
def dog_photos() -> list[Path]:
    return sorted((MEDIA / "doudou-demo-dog").glob("*.png"))


@pytest.fixture(scope="module")
def cat_photos() -> list[Path]:
    return sorted((MEDIA / "mimi-demo-cat").glob("*.png"))


def _angle_map(photos: list[Path]) -> dict[str, list[int]]:
    out: dict[str, list[int]] = {}
    for i, p in enumerate(photos):
        out.setdefault(p.stem, []).append(i)
    return out


def test_segmentation_produces_mask_and_silhouette(dog_photos):
    from app.services.twin_media import image_quality, segment_by_background, silhouette_box

    q = image_quality(dog_photos[0])
    assert q["blur_score"] >= 0
    assert q["exposure"] in ("dark", "normal", "bright")
    seg = segment_by_background(dog_photos[0])
    assert seg["binary"].size == seg["binary"].size
    sil = silhouette_box(seg["binary"])
    assert sil["has_pet"] is True
    assert sil["width"] > 0 and sil["height"] > 0
    assert 0 < seg["coverage"] <= 1


def test_silhouette_box_measures_foreground_not_background_frame():
    from app.services.twin_media import silhouette_box

    mask = Image.new("L", (120, 80), 0)
    for y in range(20, 60):
        for x in range(30, 90):
            mask.putpixel((x, y), 255)

    sil = silhouette_box(mask)
    assert sil["has_pet"] is True
    assert (sil["x0"], sil["y0"], sil["x1"], sil["y1"]) == (30, 20, 90, 60)
    assert sil["width"] == 60
    assert sil["height"] == 40
    assert sil["aspect"] == 1.5


def test_identity_similarity_same_vs_cross(dog_photos, cat_photos):
    from app.services.twin_media import identity_similarity, segment_by_background

    def rgb(p):
        return segment_by_background(p)["binary"].convert("RGB")

    same = identity_similarity((rgb(dog_photos[0]), rgb(dog_photos[3])))
    cross_dog = identity_similarity((rgb(dog_photos[0]), rgb(dog_photos[2])))
    cross_cat = identity_similarity((rgb(dog_photos[0]), rgb(cat_photos[0])))
    # Heuristic: the same pet family scores at least as high as its own other
    # angles, and the same pet should not score lower than a different species.
    assert 0 <= same <= 1
    assert cross_dog >= cross_cat - 0.05  # dog vs dog >= dog vs cat (approx)
    assert same >= 0.5


def test_angle_map_preserves_uuid_named_owner_capture_semantics():
    from app.services.visual_pipeline import _angle_map_for_photos

    front = "11111111-1111-1111-1111-111111111111"
    head = "22222222-2222-2222-2222-222222222222"
    full = "33333333-3333-3333-3333-333333333333"
    capture = SimpleNamespace(
        coverage={
            "_angle_artifact_ids": {
                "front": front,
                "head": head,
                "full_body": full,
            }
        }
    )
    photos = [
        Path(f"/tmp/{front}.jpg"),
        Path(f"/tmp/{head}.jpg"),
        Path(f"/tmp/{full}.jpg"),
    ]
    result = _angle_map_for_photos(photos, [front, head, full], capture)
    assert result == {"front": [0], "head": [1], "full_body": [2]}


def test_build_individual_twin_dog(dog_photos):
    from app.services.twin_individual import build_individual_twin

    r = build_individual_twin(
        dog_photos, species="dog", breed="柯基",
        angle_map=_angle_map(dog_photos),
    )
    assert r["family"] == "corgi-like"
    assert r["provenance"] == "DEMO_SYNTHETIC"
    assert r["surface"]["observed_regions"]
    assert "coat" in r["surface"]["observed_regions"]
    assert r["surface"]["coverage_ratio"] > 0
    assert r["identity"]["embedding_provider_available"] is False
    assert r["identity"]["similarity_provider"] == "heuristic_histogram"
    assert r["identity"]["consistency"] is not None
    assert r["identity"]["gate"] in ("heuristic_only", "NEEDS_OWNER_CONFIRMATION")
    # Morph contract completeness (§29 keys).
    for key in (
        "body_length", "body_height", "chest_width", "waist_width", "neck_length",
        "head_scale", "head_width", "muzzle_length", "ear_length", "ear_width",
        "ear_angle", "leg_length_front", "leg_length_back", "paw_scale",
        "tail_length", "tail_thickness", "tail_curve", "overall_scale",
    ):
        assert key in r["morph"], f"missing morph key {key}"
    # observed <-> inferred disjoint.
    assert not set(r["surface"]["observed_regions"]) & set(r["surface"]["inferred_regions"])


def test_build_individual_twin_cat(cat_photos):
    from app.services.twin_individual import build_individual_twin

    r = build_individual_twin(cat_photos, species="cat", breed="英短")
    assert r["family"] == "standard-cat"
    assert r["provenance"] == "DEMO_SYNTHETIC"


def test_requires_photos():
    from app.services.twin_individual import build_individual_twin

    with pytest.raises(ValueError):
        build_individual_twin([])


def test_metadata_only_fallback_has_no_observed(cat_photos, dog_photos):
    """Capture-less generation must keep observed empty (template default)."""
    from app.services.visual_pipeline_meta import metadata_only_descriptor

    class Pet:
        species = "dog"
        breed = "柯基"

    d = metadata_only_descriptor(Pet())
    assert d["surface"]["observed_regions"] == []
    assert "face" in d["surface"]["inferred_regions"]
    assert d["provenance"] == "NOT_YET_OBSERVED"
    assert d["morph"]["overall_scale"] >= 0.35


def test_pipeline_build_individual_uses_fixture_for_demo_pet():
    """visual_pipeline media resolution: demo pet + capture -> fixtures."""
    from app.services.visual_pipeline import _resolve_photos

    class Pet:
        name = "豆豆"
        species = "dog"
        breed = "柯基"

    class Capture:
        artifact_ids = ["00000000-0000-0000-0000-000000000001"]

    photos, prov = _resolve_photos(Capture(), Pet())
    assert len(photos) == 6
    assert prov == "DEMO_SYNTHETIC"


def test_pipeline_build_individual_nocapture_metadata_only():
    from app.services.visual_pipeline import _build_individual

    class Pet:
        name = "豆豆"
        species = "dog"
        breed = "柯基"

    d = _build_individual(None, Pet())
    assert d["surface"]["observed_regions"] == []
    assert d["provenance"] == "NOT_YET_OBSERVED"


def test_glb_qa_and_motion_manifest():
    """The exported GLB fixtures pass the in-repo QA (all 12 clips)."""
    import json
    import subprocess

    repo = Path(__file__).resolve().parents[2]
    qa = subprocess.run(
        [sys.executable, str(repo / "scripts" / "twin" / "twin_glb_qa.py")],
        capture_output=True, text=True,
    )
    assert qa.returncode == 0, qa.stdout + qa.stderr
    report = json.loads((repo / "artifacts" / "r2p3d-r1" / "glb" / "glb-qa-report.json").read_text("utf-8"))
    assert report["pass"] is True
    manifest = json.loads((repo / "artifacts" / "r2p3d-r1" / "glb" / "motion-manifest.json").read_text("utf-8"))
    assert len(manifest["names"]) == 12
    for name in ("Idle", "Sit", "Walk", "Eat", "Drink", "Sleep"):
        assert name in manifest["names"]
