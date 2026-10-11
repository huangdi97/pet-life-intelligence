"""The CI crop gate checks actual projected geometry against its canvas."""
import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("pli_ci_bounds", ROOT / "scripts/r5-6/contact_sheets_ci.py")
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_canonical_projection_fits_its_canvas(tmp_path: Path) -> None:
    import json
    path = tmp_path / "3d.json"
    value = {"manifest": {
        "manifestOrigin": "RUNTIME",
        "screenBounds": {"x": 12, "y": 100, "width": 360, "height": 400},
        "projectedPetBounds": {"x": 45, "y": 140, "width": 290, "height": 330},
    }}
    path.write_text(json.dumps(value), encoding="utf-8")
    module.require_uncropped_product_twin(path, "test/good")
    value["manifest"]["projectedPetBounds"]["y"] = 75
    path.write_text(json.dumps(value), encoding="utf-8")
    with pytest.raises(ValueError, match="cropped 3D Twin"):
        module.require_uncropped_product_twin(path, "test/cropped")
