"""Validate hosted Android runtime evidence before artifact upload.

This is a structural/runtime truth gate only. It deliberately does not perform
visual judgement and therefore cannot close Human Visual Acceptance.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


def load_json(path: Path) -> dict:
    if not path.is_file():
        raise FileNotFoundError(f"required JSON evidence missing: {path}")
    value = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(value, dict):
        raise ValueError(f"expected JSON object: {path}")
    return value


def require_file(path: Path, *, minimum_size: int = 1) -> Path:
    if not path.is_file() or path.stat().st_size < minimum_size:
        raise FileNotFoundError(f"required evidence file missing/invalid: {path}")
    return path


def require_truth_posture(value: dict, label: str) -> None:
    if value.get("no_vision_model") is not True:
        raise ValueError(f"{label} must record no_vision_model=true")
    if value.get("human_visual_acceptance") != "PENDING":
        raise ValueError(f"{label} must keep human_visual_acceptance=PENDING")


def referenced_file(base: Path, truth: dict, key: str, *, minimum_size: int = 1) -> Path:
    name = truth.get(key)
    if not isinstance(name, str) or not name.strip():
        raise ValueError(f"truth manifest is missing a non-empty {key}")
    candidate = Path(name)
    if candidate.is_absolute() or ".." in candidate.parts:
        raise ValueError(f"truth manifest {key} must be a local relative path: {name}")
    return require_file(base / candidate, minimum_size=minimum_size)


def require_text(path: Path, expected: str, *, label: str) -> None:
    if expected not in path.read_text(encoding="utf-8", errors="replace"):
        raise ValueError(f"{label} not found in native UI XML {path.name}: {expected!r}")


def validate(android: Path) -> None:
    capture = load_json(android / "capture-manifest.json")
    if capture.get("vision_model_used") is not False:
        raise ValueError("capture manifest must record vision_model_used=false")

    primary_pet_id = str(capture.get("primary_pet_id") or "")
    secondary_pet_id = str(capture.get("secondary_pet_id") or "")
    if not primary_pet_id or not secondary_pet_id or primary_pet_id == secondary_pet_id:
        raise ValueError("capture manifest must contain distinct primary/secondary pet IDs")

    owner_review = android / "r8-owner-review"
    delta = load_json(owner_review / "knowledge-delta-truth.json")
    require_truth_posture(delta, "knowledge-delta-truth")
    if str(delta.get("pet_id") or "") != primary_pet_id:
        raise ValueError("knowledge-delta truth is not bound to the primary pet")
    for key in (
        "derived_from_journal",
        "native_refetched_after_retraction",
        "as_known_then_excludes_late_record",
        "withdrawn_record_no_longer_explained",
        "native_section_visible_when_changed",
        "native_section_read_only",
        "read_only",
    ):
        if delta.get(key) is not True:
            raise ValueError(f"knowledge-delta truth must record {key}=true")
    if delta.get("llm_generated") is not False or delta.get("health_inference") is not False:
        raise ValueError("knowledge delta must remain deterministic/no-LLM/no-health-inference")

    before_count = int(delta.get("late_record_delta_count") or 0)
    after_count = int(delta.get("after_retraction_late_record_delta_count") or -1)
    if before_count < 1 or after_count != before_count - 1:
        raise ValueError(
            "knowledge-delta withdrawal must remove exactly one late-record item: "
            f"before={before_count} after={after_count}"
        )

    before_wording = str(delta.get("ui_wording_asserted") or "")
    after_wording = str(delta.get("ui_wording_after_retraction") or "")
    if not before_wording:
        raise ValueError("knowledge-delta truth is missing ui_wording_asserted")
    if after_count > 0 and not after_wording:
        raise ValueError("remaining late records require ui_wording_after_retraction")

    before_xml = referenced_file(owner_review, delta, "ui_xml", minimum_size=100)
    after_xml = referenced_file(owner_review, delta, "ui_xml_after_retraction", minimum_size=100)
    referenced_file(owner_review, delta, "screenshot", minimum_size=1024)
    referenced_file(owner_review, delta, "screenshot_after_retraction", minimum_size=1024)
    require_text(before_xml, before_wording, label="pre-withdrawal owner wording")
    if after_wording:
        require_text(after_xml, after_wording, label="post-withdrawal owner wording")
    elif before_wording in after_xml.read_text(encoding="utf-8", errors="replace"):
        raise ValueError("withdrawn grouped wording survived after the native refetch")

    multipet_dir = android / "multipet-return"
    multipet = load_json(multipet_dir / "multipet-a-b-a-truth.json")
    require_truth_posture(multipet, "multipet-a-b-a-truth")
    if str(multipet.get("primary_pet_id") or "") != primary_pet_id:
        raise ValueError("A→B→A truth primary pet does not match capture manifest")
    if str(multipet.get("secondary_pet_id") or "") != secondary_pet_id:
        raise ValueError("A→B→A truth secondary pet does not match capture manifest")
    if multipet.get("primary_case_visible_after_return") is not True:
        raise ValueError("primary Case is not proven visible after A→B→A return")
    if multipet.get("today_stage_role") != "today":
        raise ValueError("A→B→A return did not prove the Today stage role")
    if str(multipet.get("today_manifest_pet_id") or "") != primary_pet_id:
        raise ValueError("A→B→A returned Today manifest is not bound to the primary pet")
    referenced_file(multipet_dir, multipet, "screenshot", minimum_size=1024)

    secondary_dir = android / "secondary-sanity"
    secondary = load_json(secondary_dir / "3d.json")
    if secondary.get("manifestOrigin") != "RUNTIME" or secondary.get("fallbackUsed") is True:
        raise ValueError("secondary Today evidence is not a non-fallback runtime manifest")
    if str(secondary.get("petId") or "") != secondary_pet_id:
        raise ValueError("secondary Today runtime manifest is bound to the wrong pet")
    if secondary.get("stageRole") != "today":
        raise ValueError("secondary runtime manifest is not a Today-stage capture")
    require_file(secondary_dir / "secondary_today.png", minimum_size=1024)


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    android = root / "artifacts" / "r5-6-final" / "android"
    try:
        validate(android)
    except Exception as exc:
        print(f"ANDROID_RUNTIME_EVIDENCE_INTEGRITY = FAIL: {exc}", file=sys.stderr)
        return 1
    print("ANDROID_RUNTIME_EVIDENCE_INTEGRITY = PASS")
    print("NO_VISION_MODEL_USED = TRUE")
    print("HUMAN_VISUAL_ACCEPTANCE = PENDING")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
