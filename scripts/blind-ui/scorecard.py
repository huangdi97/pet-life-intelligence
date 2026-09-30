"""scorecard.py — run the visual contract evaluator over captured screens.

For each screen snapshot (visual.json produced by capture-web / android
extractor) evaluate the matching screen contract via the Node bridge and
write <screen>.score.json + a consolidated report.

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
    ap = argparse.ArgumentParser(description="blind UI scorecard")
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
