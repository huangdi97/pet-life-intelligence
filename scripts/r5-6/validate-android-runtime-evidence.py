"""Validate hosted Android runtime evidence before artifact upload.

Structural/runtime truth only: no visual judgement, so never Human Acceptance.
"""

from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
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


# --- owner copy -----------------------------------------------------------
# INVARIANT (owner copy): every "text" / "content-desc" in a native ui.xml is
# content the owner sees and TalkBack speaks, so an engineering identifier there
# means the owner is shown internal vocabulary.
OWNER_COPY_FORBIDDEN = (
    "petId", "pet_id", "stageRole", "manifestOrigin", "fallbackUsed",
    "legacyRepresentation", "procedural-twin", "rigged-glb-twin",
    "STYLIZED_REFERENCE", "individualIdentityEvidence",
    "null", "undefined", "NaN",
    "TODO", "FIXME", "HACK", "NotImplemented",
    "R5.6", "R7", "R8", "R8AS", "R8CB", "R8BX", "R8CA", "R8AZ",
    "LATE_RECORDED_EVENT", "SOURCE_RETRACTED_LATER", "SOURCE_SUPERSEDED_LATER",
    "REVIEW_ADDED_LATER", "OUTCOME_ADDED_LATER", "WORKFLOW_CHANGED_LATER",
    "CASE_BECAME_INVALID_LATER", "FOLLOWUP_BECAME_INVALID_LATER",
    "OWNER_REPORTED", "CAREGIVER_REPORTED", "DEVICE_DERIVED",
    "PROFESSIONAL_CONFIRMED", "LAB_CONFIRMED",
    "AI_INFERENCE", "AI_STRUCTURED", "GENERATED_3D",
    "NOT_YET_OBSERVED", "EXTERNAL_BLOCKED", "BACKGROUND_ONLY", "ADMIN_ONLY",
    "PRO_ONLY", "ACCEPTED_UI_LIMITATION",
    # The 3D stage used to publish its runtime manifest as the WebView's
    # document.title, which Android exposed as accessible text (a screen reader
    # read the JSON). The title is now frozen to a human label in
    # Pet3DViewer's injected script and the manifest travels through app storage,
    # so this token must never appear in owner-facing text again.
    "PLI_MANIFEST",
)

# §12.1 order. Structure only, never "looks good".
TODAY_CANVAS_ORDER = (
    "pli.today.identity",
    "pli.today.living-stage",
    "pli.today.now-story",
    "pli.today.change",
    "pli.today.attention",
    "pli.today.primary-action",
)


def forbidden_token(value: str) -> str | None:
    for token in OWNER_COPY_FORBIDDEN:
        # Word-ish boundaries: "R8" must not fire inside "R8AS", "null" must not
        # fire inside "annulled".
        if re.search(rf"(?<![A-Za-z0-9_]){re.escape(token)}(?![A-Za-z0-9_])", value):
            return token
    return None


def validate_owner_copy(android: Path) -> None:
    """Fail closed when an engineering identifier reaches owner-facing copy."""
    scanned = 0
    for xml_path in sorted(android.rglob("*.xml")):
        try:
            nodes = list(ET.parse(xml_path).getroot().iter("node"))
        except ET.ParseError as exc:
            raise ValueError(f"unparseable native XML: {xml_path.name}: {exc}") from exc
        scanned += 1
        for node in nodes:
            for attr in ("text", "content-desc"):
                value = node.attrib.get(attr) or ""
                if not value:
                    continue
                token = forbidden_token(value)
                if token is not None:
                    raise ValueError(
                        f"owner-visible engineering identifier {token!r} in "
                        f"{xml_path.relative_to(android).as_posix()}: {value[:80]!r}"
                    )
    if scanned == 0:
        raise ValueError("no native UI XML was captured; owner copy cannot be verified")


def validate_today_canvas(android: Path) -> None:
    """§12.2 structural acceptance for Today (no visual judgement)."""
    path = require_file(android / "today" / "ui.xml", minimum_size=100)
    xml = path.read_text(encoding="utf-8", errors="replace")
    order: list[str] = []
    for match in re.finditer(r'resource-id="(pli\.today\.[^"]+)"', xml):
        ident = match.group(1)
        if ident not in order:
            order.append(ident)
    skeleton = [ident for ident in order if ident in TODAY_CANVAS_ORDER]
    if skeleton != list(TODAY_CANVAS_ORDER):
        raise ValueError(
            "Today is not the required Living Canvas order: "
            + " -> ".join(skeleton or ["<none>"])
        )
    if xml.count('resource-id="pli.today.attention"') != 1:
        raise ValueError("Today must show exactly one Attention panel")
    if 'resource-id="pli.today.pet-twin"' not in xml:
        raise ValueError("Today is missing the pet visual stage")


# §24 domain surfaces required in every Android evidence run: dropping one from
# the capture contract fails the gate instead of quietly losing coverage.
REQUIRED_DOMAIN_SURFACES = ("behavior", "training", "welfare", "social")

# §24 states: Empty (no-pet account) and Offline (cold start without the API).
REQUIRED_STATE_SURFACES = ("empty", "offline")

# The id(s) that prove the state was really rendered, not just a directory.
STATE_ROOT_IDS = {
    "empty": ("pli.empty.pet",),
    "offline": ("pli.startup.offline", "pli.offline.state"),
}


def validate_state_coverage(android: Path) -> None:
    """§24 Empty / Offline: files must exist AND prove their own state id."""
    for screen in REQUIRED_STATE_SURFACES:
        directory = android / screen
        try:
            require_file(directory / f"{screen}.png", minimum_size=1024)
            xml_path = require_file(directory / "ui.xml", minimum_size=100)
        except FileNotFoundError:
            raise ValueError(f"missing §24 state evidence surface: {screen}") from None
        xml = xml_path.read_text(encoding="utf-8", errors="replace")
        expected_ids = STATE_ROOT_IDS[screen]
        if not any(ident in xml for ident in expected_ids):
            raise ValueError(
                f"§24 {screen} evidence does not contain any of {list(expected_ids)}; "
                "the state was not actually rendered"
            )


def validate_domain_coverage(android: Path) -> None:
    missing: list[str] = []
    for screen in REQUIRED_DOMAIN_SURFACES:
        directory = android / screen
        try:
            require_file(directory / f"{screen}.png", minimum_size=1024)
            require_file(directory / "ui.xml", minimum_size=100)
        except FileNotFoundError:
            missing.append(screen)
    if missing:
        raise ValueError(f"missing §24 domain evidence surfaces: {', '.join(missing)}")


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

    # Owner-facing copy and the Today canvas are part of the evidence: a run that
    # shows the owner an engineering identifier is not valid owner evidence.
    validate_owner_copy(android)
    validate_today_canvas(android)
    validate_domain_coverage(android)
    validate_state_coverage(android)


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
