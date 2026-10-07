from __future__ import annotations

import importlib.util
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
MODULE = ROOT / "scripts" / "r2p3d-r4" / "painting.py"
SPEC = importlib.util.spec_from_file_location("pli_painting", MODULE)
assert SPEC is not None and SPEC.loader is not None
painting = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(painting)


LANDMARKS = {
    "eye_y": 0.74,
    "eye_dx": 0.13,
    "muzzle_z": 0.63,
    "nose_y": 0.60,
    "nose_z": 0.65,
    "ear_y": 0.90,
    "ear_dx": 0.18,
    "belly_y": 0.20,
    "head_min_z": -0.63,
    "head_max_z": 0.65,
    "head_min_y": 0.55,
}


def _paint(point: tuple[float, float, float]) -> np.ndarray:
    painter = painting.make_cat_painter(LANDMARKS)
    color, _observed = painter(
        np.asarray(point, dtype=np.float64),
        np.asarray([0.0, 0.0, 1.0], dtype=np.float64),
        np.asarray([0.65, 0.65, 0.65], dtype=np.float64),
    )
    return color


def test_cat_base_coat_is_neutral_not_brown() -> None:
    coat = _paint((0.0, 0.50, 0.0))
    assert abs(float(coat[0]) - float(coat[2])) < 0.10


def test_cat_iris_mask_is_centered_on_eye_not_an_annulus() -> None:
    # Sample off the narrow pupil but inside the iris.
    eye = _paint((LANDMARKS["eye_dx"] + 0.035, LANDMARKS["eye_y"], 0.64))
    assert float(eye[1]) > float(eye[0])
    assert float(eye[1]) > float(eye[2])


def test_cat_nose_mask_marks_the_actual_muzzle_center() -> None:
    nose = _paint((0.0, LANDMARKS["nose_y"], LANDMARKS["nose_z"]))
    nearby = _paint((0.12, LANDMARKS["nose_y"], LANDMARKS["nose_z"] - 0.08))
    assert float(nose[0]) < float(nearby[0])
    assert float(nose[1]) < float(nearby[1])
