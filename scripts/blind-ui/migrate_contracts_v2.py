#!/usr/bin/env python3
"""migrate_contracts_v2.py — deterministic Blind Contract V2 migration.

Renames all screen contracts to the V2 dimension set and Blind Score V2
weights (§80 master goal): individualPetTruth 25 / visualComposition 20 /
informationHierarchy 15 / surfaceGovernance 10 / contentPurity 10 /
interactionTruth 10 / accessibility 5 / pixelStyleTruth 5 = 100.

Every V1 contract uses the same 8 dimensions and weights
(20/20/15/10/10/10/5/10). The single runtimeTruth check (10 pts) is split:
5 pts stay as individualPetTruth ("data from real runtime"), 5 pts become a
pixelStyleTruth placeholder/style-truth check ("no placeholder/fake content").

Hero screens (today/pet-world/life-view/twin-review) are intentionally NOT
migrated here — they are rewritten by hand with the V2 truth gates
(manifest-origin / identity / camera / pixel-style / style-truth).

Run from repo root:
  .venv\\Scripts\\python.exe scripts\\blind-ui\\migrate_contracts_v2.py
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCREENS = ROOT / "packages" / "visual-contract" / "screens"
BACKUP = ROOT / "packages" / "visual-contract" / "screens" / ".v1-backup"

DIM_MAP = {
    "petIdentity": "individualPetTruth",
    "composition": "visualComposition",
    "hierarchy": "informationHierarchy",
    "surface": "surfaceGovernance",
    "contentPurity": "contentPurity",
    "interaction": "interactionTruth",
    "accessibility": "accessibility",
    "runtimeTruth": "pixelStyleTruth",
}

V2_WEIGHTS = {
    "individualPetTruth": 25,
    "visualComposition": 20,
    "informationHierarchy": 15,
    "surfaceGovernance": 10,
    "contentPurity": 10,
    "interactionTruth": 10,
    "accessibility": 5,
    "pixelStyleTruth": 5,
}

HEROES = {"today", "pet-world", "life-view", "twin-review"}


def migrate(path: Path) -> dict:
    c = json.loads(path.read_text(encoding="utf-8"))
    screen = c["screen"]
    assert screen not in HEROES, f"{screen} is a hero contract (hand-written V2)"
    # Rename dimensions on every check.
    for chk in c["checks"]:
        chk["dimension"] = DIM_MAP[chk["dimension"]]
    # Split the runtimeTruth check (now renamed pixelStyleTruth 10 pts) into
    # 5 pts individualPetTruth + 5 pts pixelStyleTruth.
    truth_checks = [chk for chk in c["checks"] if chk["dimension"] == "pixelStyleTruth"]
    assert len(truth_checks) == 1 and abs(truth_checks[0]["points"] - 10.0) < 1e-6, f"{screen}: truth check shape unexpected"
    tc = truth_checks[0]
    tc["dimension"] = "individualPetTruth"
    tc["points"] = 5.0
    tc["description"] = tc["description"].replace("runtime", "runtime") + " (real data)"
    st = {
        "id": f"{tc['id']}.style",
        "dimension": "pixelStyleTruth",
        "points": 5.0,
        "description": "无占位/空板书风格（style truth）",
        "check": {"kind": "text-free", "tokens": ["占位", "TODO", "placeholder", "coming soon"]},
    }
    c["checks"].append(st)
    c["dimensions"] = dict(V2_WEIGHTS)
    c["version"] = 2
    return c


def main() -> int:
    BACKUP.mkdir(parents=True, exist_ok=True)
    totals: list[str] = []
    for path in sorted(SCREENS.glob("*.json")):
        c = json.loads(path.read_text(encoding="utf-8"))
        if c["screen"] in HEROES:
            totals.append(f"{c['screen']}: HERO (hand-written)")
            continue
        shutil.copy2(path, BACKUP / f"{path.stem}.v1.json")
        migrated = migrate(path)
        path.write_text(json.dumps(migrated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        total = sum(chk["points"] for chk in migrated["checks"])
        by_dim: dict[str, float] = {}
        for chk in migrated["checks"]:
            by_dim[chk["dimension"]] = by_dim.get(chk["dimension"], 0.0) + chk["points"]
        assert abs(total - 100.0) < 1e-6, f"{c['screen']}: total {total}"
        for dim, w in V2_WEIGHTS.items():
            assert abs(by_dim.get(dim, 0.0) - w) < 1e-6, f"{c['screen']}: {dim} {by_dim.get(dim)} != {w}"
        totals.append(f"{c['screen']}: v2 ok (total={total:.0f})")
    print("\n".join(totals))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
