"""tune_corgi_morph 鈥?empirical calibration harness for corgi_morph params.

Replicates the bake_twin pre-morph steps (parse source OBJ+MTL -> vertex
colors -> Loop subdiv x2 -> normalize to 1.35) and then applies candidate
MorphParams sets, printing the deterministic morphology deltas so the R4.1
Corgi-like silhouette targets can be verified WITHOUT the slow unwrap+paint+QE
bake each time.

Run:  .venv\\Scripts\\python.exe scripts/r2p3d-r4/tune_corgi_morph.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from bake_twin import CONFIG  # noqa: E402
from corgi_morph import MorphParams, corgi_morph, metrics_delta  # noqa: E402
from meshops import loop_subdivide, normalize_mesh  # noqa: E402
from objio import parse_mtl, parse_obj  # noqa: E402


def target_ok(d: dict[str, float]) -> tuple[bool, list[str]]:
    """R4.1 silhouette targets (relative deltas)."""
    checks: list[tuple[str, bool]] = [
        ("trunk_length_ratio_delta > +0.05", d.get("trunk_length_ratio_delta", 0) > 0.05),
        ("head_width_ratio_delta > +0.08", d.get("head_width_ratio_delta", 0) > 0.08),
        ("muzzle_stickout_ratio_delta < -0.08", d.get("muzzle_stickout_ratio_delta", 0) < -0.08),
        ("leg_top_ratio_delta < -0.15", d.get("leg_top_ratio_delta", 0) < -0.15),
        ("max_y_delta magnitude < 0.02", abs(d.get("max_y_delta", 0)) < 0.02),
    ]
    ok = all(c[1] for c in checks)
    return ok, [f"{'PASS' if c[1] else 'FAIL'}  {c[0]}" for c in checks]


def main() -> None:
    cfg = CONFIG["dog"]
    kd = parse_mtl(cfg["src_mtl"])
    data = parse_obj(cfg["src_obj"], mtl_kd=kd)
    V = data["verts"].astype(np.float64)
    F = data["faces"].astype(np.int64)
    FM = data["face_mat"].astype(np.int64)
    MC = data["mat_colors"].astype(np.float64)
    if FM.min() < 0:
        FM = np.maximum(FM, 0)

    # vertex colors (same as bake)
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    wsum = np.linalg.norm(fn, axis=1) + 1e-9
    colors = np.zeros((V.shape[0], 3))
    weight = np.zeros(V.shape[0])
    for k in range(3):
        np.add.at(colors, F[:, k], MC[FM] * wsum[:, None])
        np.add.at(weight, F[:, k], wsum)
    w = weight[:, None]
    colors = colors / np.where(w > 1e-9, w, 1.0)
    for _ in range(cfg["subdiv"]):
        V, F, colors = loop_subdivide(V, F, colors)
    V, _m = normalize_mesh(V, cfg["height"], rotate_y_deg=cfg["rotate_y_deg"])

    candidates = [
        ("base", MorphParams()),
        ("muzzle-strong", MorphParams(muzzle_length_scale=0.60, head_width_scale=1.20, body_length_scale=1.20)),
        ("muzzle-strong2", MorphParams(muzzle_length_scale=0.55, head_width_scale=1.22, body_length_scale=1.22, leg_height_scale=0.62)),
    ]
    for name, p in candidates:
        _, before, after = corgi_morph(V, colors, p)
        d = metrics_delta(before, after)
        ok, lines = target_ok(d)
        print(f"\n=== candidate: {name} ({'GOOD' if ok else 'FAIL'}) ===")
        for ln in lines:
            print(f"  {ln}")
        for k in sorted(d):
            print(f"  {k:38s} {d[k]:+.3f}")


if __name__ == "__main__":
    main()
