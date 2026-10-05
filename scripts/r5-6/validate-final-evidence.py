"""Validate the complete R5.6 runtime evidence package.

No visual model is used. This is a structural/runtime truth gate only.

The capture source HEAD may be the current HEAD or an ancestor followed only by
an evidence-only commit under artifacts/r5-6-final/. Any product/source change
after capture invalidates the package and requires recapture.
"""

from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
FINAL = ROOT / "artifacts" / "r5-6-final"
WEB = FINAL / "web"
ANDROID = FINAL / "android"
MINI = FINAL / "mini"
TURNTABLE = FINAL / "turntable"
SHEETS = FINAL / "contact-sheets"

WEB_SURFACES = ("today", "timeline", "pet", "lifeview", "twinreview", "health", "assistant", "me")
WEB_STATES = ("empty", "attention", "offline", "notfound", "permission")
ANDROID_SURFACES = WEB_SURFACES
MINI_SURFACES = ("today", "timeline", "pet", "health", "assistant", "me")
WEB_TWIN_SURFACES = ("today", "pet", "lifeview", "twinreview")
ANDROID_TWIN_SURFACES = WEB_TWIN_SURFACES
PRIMARY_ANGLES = {"front": 0.0, "front-left": 0.35, "side": math.pi / 2, "rear": math.pi, "front-right": -0.35}
SECONDARY_ANGLES = {"front": 0.0, "front-left": 0.35, "side": math.pi / 2, "rear": math.pi}

REQUIRED_SHEETS = (
    "PLI_R5_6_WEB_FINAL.png",
    "PLI_R5_6_ANDROID_FINAL.png",
    "PLI_R5_6_MINI_FINAL.png",
    "PLI_R5_6_WEB_ANDROID_HERO_PARITY.png",
    "PLI_R4_2_VS_R5_6_HEROES.png",
    "PLI_R3_R4_R4_1_R4_2_R5_6_today.png",
    "PLI_R3_R4_R4_1_R4_2_R5_6_pet.png",
    "PLI_R3_R4_R4_1_R4_2_R5_6_lifeview.png",
    "PLI_R3_R4_R4_1_R4_2_R5_6_twinreview.png",
    "PLI_R5_6_STATES.png",
    "TWIN_PRIMARY_R5_6.png",
    "TWIN_SECONDARY_R5_6.png",
)


def git(*args: str, check: bool = True) -> str:
    result = subprocess.run(["git", *args], cwd=ROOT, text=True, capture_output=True)
    if check and result.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed: {result.stderr or result.stdout}")
    return result.stdout.strip()


def load_json(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(f"required evidence metadata missing: {path}")
    value = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(value, dict):
        raise ValueError(f"expected JSON object: {path}")
    return value


def require_image(path: Path) -> None:
    if not path.exists() or path.stat().st_size < 1024:
        raise FileNotFoundError(f"required screenshot missing/invalid: {path}")
    with Image.open(path) as image:
        if image.width < 100 or image.height < 100:
            raise ValueError(f"invalid screenshot dimensions: {path} -> {image.size}")


def require_product_manifest(path: Path, *, expected_pet_id: str | None = None) -> dict:
    manifest = load_json(path)
    if manifest.get("ready") is not True:
        raise ValueError(f"runtime manifest is not ready: {path}")
    if manifest.get("manifestOrigin") != "RUNTIME":
        raise ValueError(f"manifest is not runtime-origin: {path}")
    if manifest.get("representation") != "high-fidelity-glb-twin":
        raise ValueError(f"manifest is not high-fidelity GLB: {path}")
    if manifest.get("generic") is True:
        raise ValueError(f"manifest is generic rather than an individual/demo Twin: {path}")
    if manifest.get("fallbackUsed") is True:
        raise ValueError(f"fallback was used on required product evidence: {path}")
    if expected_pet_id and manifest.get("petId") != expected_pet_id:
        raise ValueError(f"pet identity mismatch: {path}")
    return manifest


def yaw_error(actual: float, expected: float) -> float:
    return abs(math.atan2(math.sin(actual - expected), math.cos(actual - expected)))


def validate_capture_source(manifests: list[dict]) -> str:
    heads = {str(m.get("source_head") or "") for m in manifests}
    if "" in heads or len(heads) != 1:
        raise ValueError(f"capture source HEADs must be identical and non-empty: {heads}")
    source_head = next(iter(heads))
    current_head = git("rev-parse", "HEAD")
    if source_head == current_head:
        return source_head

    ancestor = subprocess.run(
        ["git", "merge-base", "--is-ancestor", source_head, current_head],
        cwd=ROOT,
        capture_output=True,
    )
    if ancestor.returncode != 0:
        raise ValueError(f"capture source HEAD is not an ancestor of current HEAD: {source_head}")

    changed = [p for p in git("diff", "--name-only", f"{source_head}..{current_head}").splitlines() if p]
    illegal = [p for p in changed if not p.startswith("artifacts/r5-6-final/")]
    if illegal:
        raise ValueError(
            "source changed after capture; recapture is required. "
            f"Non-evidence paths changed: {illegal[:12]}"
        )
    return source_head


def main() -> None:
    web_capture = load_json(WEB / "capture-manifest.json")
    android_capture = load_json(ANDROID / "capture-manifest.json")
    mini_capture = load_json(MINI / "capture-manifest.json")
    turntable_capture = load_json(TURNTABLE / "capture-manifest.json")
    source_head = validate_capture_source([web_capture, android_capture, mini_capture, turntable_capture])

    web_primary_pet_id = str(web_capture.get("primary_pet_id") or "")
    android_primary_pet_id = str(android_capture.get("primary_pet_id") or "")
    android_secondary_pet_id = str(android_capture.get("secondary_pet_id") or "")
    turntable_primary_pet_id = str(turntable_capture.get("primary_pet_id") or "")
    turntable_secondary_pet_id = str(turntable_capture.get("secondary_pet_id") or "")
    if not web_primary_pet_id:
        raise ValueError("Web final capture must record an explicit primary_pet_id")
    if web_primary_pet_id != android_primary_pet_id or web_primary_pet_id != turntable_primary_pet_id:
        raise ValueError("primary pet identity differs across Web / Android / turntable evidence")
    if not android_secondary_pet_id or android_secondary_pet_id != turntable_secondary_pet_id:
        raise ValueError("secondary pet identity differs across Android / turntable evidence")
    if web_primary_pet_id == android_secondary_pet_id:
        raise ValueError("primary and secondary evidence identities must be distinct")

    for surface in WEB_SURFACES:
        require_image(WEB / surface / "screenshot.png")
    for state in WEB_STATES:
        require_image(WEB / state / "screenshot.png")
    for surface in WEB_TWIN_SURFACES:
        visual = load_json(WEB / surface / "visual.json")
        manifest = visual.get("manifest")
        if not isinstance(manifest, dict):
            raise ValueError(f"Web runtime manifest missing: {surface}")
        temp = WEB / surface / ".runtime-manifest-validation.json"
        temp.write_text(json.dumps(manifest), encoding="utf-8")
        try:
            require_product_manifest(temp, expected_pet_id=web_primary_pet_id)
        finally:
            temp.unlink(missing_ok=True)

    # Human Twin Review frame must stay neutral; the negative path is required
    # as separate machine evidence so it cannot obscure the identity studio.
    review_interaction = load_json(WEB / "twinreview" / "interaction_not_like.json")
    if review_interaction.get("selected") is not True or review_interaction.get("activateDisabled") is not True:
        raise ValueError("Web Twin Review not_like -> activate disabled evidence is invalid")
    if review_interaction.get("selectedValue") != "not_like":
        raise ValueError("Web Twin Review selected value is not not_like")
    require_image(WEB / "twinreview" / "not_like.png")

    for surface in ANDROID_SURFACES:
        require_image(ANDROID / surface / f"{surface}.png")
    for surface in ANDROID_TWIN_SURFACES:
        require_product_manifest(
            ANDROID / surface / "3d.json",
            expected_pet_id=android_primary_pet_id,
        )

    require_image(ANDROID / "secondary-sanity" / "secondary_today.png")
    secondary_today = require_product_manifest(
        ANDROID / "secondary-sanity" / "3d.json",
        expected_pet_id=android_secondary_pet_id,
    )
    require_image(ANDROID / "secondary-review" / "secondary_twinreview.png")
    secondary_review = require_product_manifest(
        ANDROID / "secondary-review" / "3d.json",
        expected_pet_id=android_secondary_pet_id,
    )
    if secondary_today.get("petId") != secondary_review.get("petId"):
        raise ValueError("secondary-pet Today/Review manifests refer to different pets")

    for view, expected in {"front": 0.0, "side": math.pi / 2, "back": math.pi}.items():
        manifest = require_product_manifest(
            ANDROID / "twinreview" / f"3d_view_{view}.json",
            expected_pet_id=android_primary_pet_id,
        )
        actual = float((manifest.get("camera") or {}).get("yaw"))
        if yaw_error(actual, expected) > 0.08:
            raise ValueError(f"Android primary review camera mismatch: {view} -> {actual}")
        require_image(ANDROID / "twinreview" / f"twin_{view}.png")

        secondary = require_product_manifest(
            ANDROID / "secondary-review" / f"3d_view_{view}.json",
            expected_pet_id=android_secondary_pet_id,
        )
        actual_secondary = float((secondary.get("camera") or {}).get("yaw"))
        if yaw_error(actual_secondary, expected) > 0.08:
            raise ValueError(f"Android secondary review camera mismatch: {view} -> {actual_secondary}")
        require_image(ANDROID / "secondary-review" / f"secondary_{view}.png")

    for surface in MINI_SURFACES:
        require_image(MINI / f"{surface}.png")

    primary_pet_id = str(turntable_capture.get("primary_pet_id") or "")
    secondary_pet_id = str(turntable_capture.get("secondary_pet_id") or "")
    if not primary_pet_id or not secondary_pet_id or primary_pet_id == secondary_pet_id:
        raise ValueError("turntable primary/secondary pet IDs must be distinct and explicit")

    for angle, expected in PRIMARY_ANGLES.items():
        require_image(TURNTABLE / "primary" / f"{angle}.png")
        manifest = require_product_manifest(
            TURNTABLE / "primary" / f"{angle}.json",
            expected_pet_id=primary_pet_id,
        )
        actual = float((manifest.get("camera") or {}).get("yaw"))
        if yaw_error(actual, expected) > 0.08:
            raise ValueError(f"primary turntable camera mismatch: {angle} -> {actual}")

    for angle, expected in SECONDARY_ANGLES.items():
        require_image(TURNTABLE / "secondary" / f"{angle}.png")
        manifest = require_product_manifest(
            TURNTABLE / "secondary" / f"{angle}.json",
            expected_pet_id=secondary_pet_id,
        )
        actual = float((manifest.get("camera") or {}).get("yaw"))
        if yaw_error(actual, expected) > 0.08:
            raise ValueError(f"secondary turntable camera mismatch: {angle} -> {actual}")

    sheet_manifest = load_json(SHEETS / "manifest.json")
    if sheet_manifest.get("source_head") != source_head:
        raise ValueError("contact-sheet source HEAD does not match capture source HEAD")
    if (sheet_manifest.get("policy") or {}).get("vision_model_used") is not False:
        raise ValueError("contact-sheet policy must record vision_model_used=false")
    for name in REQUIRED_SHEETS:
        require_image(SHEETS / name)

    print("R5_6_FINAL_EVIDENCE_VALIDATION = PASS")
    print(f"SOURCE_HEAD = {source_head}")
    print("NO_VISION_MODEL_USED = TRUE")
    print("HUMAN_VISUAL_ACCEPTANCE = PENDING")


if __name__ == "__main__":
    main()
