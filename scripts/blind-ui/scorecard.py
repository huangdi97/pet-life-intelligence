"""scorecard.py — run the visual contract evaluator over captured screens.

For each screen snapshot (visual.json produced by capture-web / android
extractor) evaluate the matching screen contract via the Node bridge and
write <screen>.score.json + a consolidated report.

V2 (R2P3D-R3): fills snapshot.styleTruth from the pixel oracle (classical
statistics only) using the stage element bounds + stage screenshot so the
warm-living-field / dark-viewer gates are computed from real pixels, never
from a vision model.

Usage:
  python scripts/blind-ui/scorecard.py <captures-dir> <platform> [--out reports/blind-ui]
  # captures-dir contains <screen>/visual.json files
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CONTRACTS = REPO / "packages/visual-contract" / "screens"
BRIDGE = REPO / "scripts" / "blind-ui" / "eval-contract.mjs"
PIXEL = REPO / "scripts" / "blind-ui" / "pixel_oracle.py"

SCREEN_TO_CONTRACT = {
    "today": "today.json",
    "timeline": "timeline.json",
    "pet": "pet-world.json",
    "lifeview": "life-view.json",
    "assistant": "assistant.json",
    "me": "me.json",
    "quicklog": "quick-log.json",
    "health": "health.json",
    "behavior": "behavior.json",
    "training": "training.json",
    "welfare": "welfare.json",
    "social": "social.json",
    "companion": "companion.json",
    "monitoring": "monitoring.json",
    "twincapture": "twin-capture.json",
    "twinreview": "twin-review.json",
    "twinversion": "twin-version.json",
    "empty": "special-empty.json",
    "attention": "special-attention.json",
    "offline": "special-offline.json",
    "multipet": "special-multipet.json",
}

STAGE_IDS = (
    "pli.today.living-stage",
    "pli.pet.hero-stage",
    "pli.lifeview.stage",
    "pli.twinreview.stage",
)


def _run_pixel(args: list[str]) -> dict | None:
    proc = subprocess.run(
        [str(REPO / ".venv" / "Scripts" / "python.exe") if (REPO / ".venv" / "Scripts" / "python.exe").exists() else "python", str(PIXEL), *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
    )
    if proc.returncode != 0:
        return None
    try:
        return json.loads(proc.stdout)
    except Exception:
        return None


def _fill_style_truth(screen_dir: Path, visual: dict) -> dict:
    """Compute styleTruth from the stage screenshot + stage layout bounds.

    Deterministic pixel statistics only (pixel_oracle): stage mean luma,
    dark ratio, warm/cool ratios, white-card ratio. The evaluator's
    pixel-style checks consume this field.
    """
    already = visual.get("styleTruth") or {}
    result = dict(already)
    shot = screen_dir / "screenshot.png"
    if not shot.exists():
        return result
    # Stage element bounds from layout.json (real DOM/accessibility geometry).
    layout = screen_dir / "layout.json"
    bounds = None
    if layout.exists():
        try:
            lj = json.loads(layout.read_text(encoding="utf-8"))
            for el in lj.get("elements", []):
                if el.get("id") in STAGE_IDS and el.get("width") and el.get("height"):
                    bounds = (el["x"], el["y"], el["width"], el["height"])
                    break
        except Exception:
            bounds = None
    if bounds:
        stats = _run_pixel([str(shot)]) or {}
        # pixel_regions needs explicit coordinates — run via python -c shim.
        code = (
            "import sys, json; from pathlib import Path; from pixel_oracle import pixel_regions;"
            f" r = pixel_regions(Path(sys.argv[1]), ({bounds[0]},{bounds[1]},{bounds[2]},{bounds[3]}));"
            " print(json.dumps(r))"
        )
        proc = subprocess.run(
            [str(REPO / ".venv" / "Scripts" / "python.exe"), "-c", code, str(shot)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=False,
            cwd=str(REPO / "scripts" / "blind-ui"),
        )
        region = None
        if proc.returncode == 0:
            try:
                region = json.loads(proc.stdout)
            except Exception:
                region = None
        if region:
            result["stageLuma"] = region.get("region_mean_luma")
            result["darkViewer"] = (region.get("region_dark_ratio") or 1.0) > 0.5
            result["stageBgLuma"] = result.get("stageBgLuma")
            result["realityFieldMedia"] = bool(result.get("realityFieldMedia"))
        if stats:
            result.setdefault("whiteCardRatio", stats.get("white_surface_ratio"))
            result.setdefault("coolAccentRatio", stats.get("cool_accent_ratio"))
    return result


def evaluate(contract: Path, snapshot: Path, platform: str) -> dict:
    proc = subprocess.run(
        ["node", BRIDGE, str(contract), str(snapshot), platform],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
    )
    if proc.returncode != 0:
        return {"error": proc.stderr[:500]}
    return json.loads(proc.stdout)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="blind UI scorecard V2")
    ap.add_argument("captures", type=Path, help="dir containing <screen>/visual.json")
    ap.add_argument("platform", choices=["web", "android"])
    ap.add_argument("--out", type=Path, default=REPO / "artifacts" / "blind-ui" / "reports")
    args = ap.parse_args(argv)

    args.out.mkdir(parents=True, exist_ok=True)
    results: dict[str, dict] = {}
    missing: list[str] = []
    for screen, contract_name in sorted(SCREEN_TO_CONTRACT.items()):
        snap = args.captures / screen / "visual.json"
        contract = CONTRACTS / contract_name
        if not snap.exists() or not contract.exists():
            missing.append(screen)
            continue
        visual: dict = json.loads(snap.read_text(encoding="utf-8"))
        if args.platform == "web":
            visual["styleTruth"] = _fill_style_truth(args.captures / screen, visual)
        elif "styleTruth" not in visual:
            visual["styleTruth"] = _fill_style_truth(args.captures / screen, visual)
        snap.write_text(json.dumps(visual, ensure_ascii=False), encoding="utf-8")
        score = evaluate(contract, snap, args.platform)
        if "error" in score:
            results[screen] = {"error": score["error"]}
            continue
        (args.out / f"{screen}.score.json").write_text(json.dumps(score, ensure_ascii=False, indent=2), encoding="utf-8")
        results[screen] = {
            "total": score["total"],
            "max": score["max"],
            "pass": score["pass"],
            "heroPass": score["heroPass"],
            "criticalFailed": score["criticalFailed"],
        }

    summary = {
        "platform": args.platform,
        "date": __import__("datetime").date.today().isoformat(),
        "screens": results,
        "missing_captures": missing,
    }
    (args.out / f"scorecard-{args.platform}.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
