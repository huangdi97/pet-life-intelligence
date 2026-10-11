"""anti_patterns.py — deterministic detectors for known UI anti-patterns.

No vision, no OCR: everything comes from DOM/accessibility text, source files
or machine snapshots.

Detectors:
  - scan_text_terms(texts, tokens): raw internal term occurrences.
  - scan_hardcoded_pet_names(root): 豆豆/咪咪 in production source outside
    demo seed / fixture / test / story paths (comment-aware).
  - detect_fake_3d(snapshot): a pet-twin element implemented as a static
    image while the 3D manifest claims ready -> FAKE_3D.
  - detect_generic_species_hero(snapshot): hero role replaced by a species
    glyph (type == "species-glyph") on a hero screen.
"""
from __future__ import annotations

import re
from pathlib import Path

RAW_TOKENS = ["BW-", "OWNER_REPORTED", "STRESS_RECOVERY", "OPEN", "provider_", "model_id", "event_key", "PLI-"]
HARDCODED_PET_NAMES = ["豆豆", "咪咪"]
ALLOWED_CONTEXTS = ("demo", "fixture", "test", "story", "seed", "evals", "scripts/r2_demo_seed", "artifacts")
SOURCE_EXTS = {".ts", ".tsx", ".js", ".jsx", ".py", ".kt", ".json"}


def scan_text_terms(texts: list[str], tokens: list[str] | None = None) -> list[str]:
    """Return tokens found in the combined text (owner runtime purity gate)."""
    tokens = tokens or RAW_TOKENS
    all_text = "\n".join(texts)
    return [t for t in tokens if t in all_text]


def _code_lines_have_names(text: str, names: list[str]) -> bool:
    """Match names only in non-comment code lines (JS/TS/Python comments)."""
    in_block = False
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        if in_block:
            if "*/" in line:
                in_block = False
            continue
        if line.startswith("/*"):
            if "*/" not in line:
                in_block = True
            continue
        if line.startswith("//") or line.startswith("*") or line.startswith("#"):
            continue
        if any(name in line for name in names):
            return True
    return False


def scan_hardcoded_pet_names(root: Path) -> list[str]:
    """Return file paths containing hard-coded pet names outside allowed contexts.

    Only actual code/string content is scanned — doc comments that merely
    reference the demo assets are not user-facing hardcodes. Excluded by
    design: backend demo identity fixtures/maps, the blind-ui tool's own data,
    and ops smoke scripts. Production/shared 3D source is scanned too.
    """
    hits: list[str] = []
    if not root.exists():
        return hits
    for path in root.rglob("*"):
        if path.suffix not in SOURCE_EXTS:
            continue
        rel = path.relative_to(root).as_posix()
        if any(seg in rel.lower() for seg in ALLOWED_CONTEXTS):
            continue
        if any(p in rel.lower() for p in ("node_modules", ".next", "dist", "__pycache__", "android/", ".git")):
            continue
        if any(p in rel for p in (
            "scripts/blind-ui",
            "packages/visual-contract",
            "scripts/staging_smoke.py",
            "services/api/app/services/visual_pipeline.py",
        )):
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        if _code_lines_have_names(text, HARDCODED_PET_NAMES):
            hits.append(rel)
    return hits


_STATIC_TYPES = {"img", "image", "static-png", "css-background", "svg-illustration", "species-glyph"}


def detect_fake_3d(snapshot: dict) -> list[str]:
    """FAKE_3D: role pet-twin implemented as static image while manifest ready."""
    manifest = snapshot.get("manifest") or {}
    if not manifest.get("ready"):
        return []
    hits: list[str] = []
    for el in snapshot.get("elements", []):
        if "pet-twin" not in el.get("id", "") and "twin" not in el.get("role", ""):
            continue
        if el.get("type") in _STATIC_TYPES:
            hits.append(el.get("id", "?") + ":static-image-while-3d-ready")
    return hits


def detect_generic_species_hero(
    snapshot: dict,
    hero_prefixes: tuple[str, ...] = ("pli.today.pet-twin", "pli.pet.pet-twin", "pli.lifeview.twin", "pli.twinreview.twin"),
) -> list[str]:
    """Generic species glyph/letter used as hero while twin should be individual."""
    hits: list[str] = []
    for el in snapshot.get("elements", []):
        if el.get("type") != "species-glyph":
            continue
        if any(el.get("id", "").startswith(p) for p in hero_prefixes):
            hits.append(el.get("id", "?") + ":generic-species-hero")
    return hits


def detect_wireframe_source(root: Path) -> list[str]:
    """Scan 3D source for wireframe/mesh-overlay/scanline enabled in production mode."""
    hits: list[str] = []
    targets = [p for p in (root / "packages/pet-3d/src").rglob("*.ts")] if (root / "packages/pet-3d/src").exists() else []
    for path in targets:
        text = path.read_text(encoding="utf-8", errors="ignore")
        if re.search(r"wireframe\s*[:=]\s*true", text):
            hits.append(f"{path.relative_to(root)}:wireframe=true")
    return hits
