"""inspect_glb — deterministic GLB geometry/skinning/animation inspection (R4.2).

NO vision model. Pure glTF/GLB parsing (JSON chunk + BIN chunk) + numpy math.

Reports, for a given GLB:
  - scene/node graph: root/mesh/joint node local transforms
  - skin: joints, inverseBindMatrices
  - bind-pose POSITION bbox + dimension ratios
  - per-joint skin weight stats (vertex count, mean, max; concentrated-weight check)
  - posed bbox after evaluating Idle / Stand clips at given times (skinned
    deformation via skinMatrix = jointWorld * inverseBind * vertex, per
    glTF 2.0 skinning), including vertex displacement bounds

Usage:
  .venv\\Scripts\\python.exe scripts/r2p3d-r4-2/inspect_glb.py \
      --glb packages/pet-3d/assets/twins/mimi.glb \
      --poses Idle Stand --time 1.0
"""
from __future__ import annotations

import argparse
import json
import struct
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]


def _r32(data: bytes, off: int, count: int) -> np.ndarray:
    return np.frombuffer(data, dtype="<f4", count=count, offset=off).astype(np.float64)


def _u8(data: bytes, off: int, count: int) -> np.ndarray:
    return np.frombuffer(data, dtype="<u1", count=count, offset=off).astype(np.int64)


def _component_size(ct: int) -> int:
    return {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}[ct]


def _type_size(t: str) -> int:
    return {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}[t]


def read_glb(path: Path) -> tuple[dict, bytes]:
    raw = path.read_bytes()
    assert raw[:4] == b"glTF", f"{path}: not a GLB"
    json_len = struct.unpack("<I", raw[12:16])[0]
    json_type = raw[16:20]
    assert json_type == b"JSON", f"{path}: first chunk not JSON ({json_type!r})"
    json_bytes = raw[20 : 20 + json_len]
    gltf = json.loads(json_bytes.decode("utf-8"))
    bin_off = 20 + json_len
    bin_len = struct.unpack("<I", raw[bin_off : bin_off + 4])[0]
    bin_type = raw[bin_off + 4 : bin_off + 8]
    assert bin_type == b"BIN\x00", f"{path}: second chunk not BIN ({bin_type!r})"
    bin_data = raw[bin_off + 8 : bin_off + 8 + bin_len]
    return gltf, bin_data


def _accessor_array(gltf: dict, bin_data: bytes, idx: int) -> np.ndarray:
    acc = gltf["accessors"][idx]
    bv = gltf["bufferViews"][acc["bufferView"]]
    ct = acc["componentType"]
    comp = _component_size(ct)
    elem = _type_size(acc["type"])
    stride = bv.get("byteStride", comp * elem)
    start = bv["byteOffset"] + acc.get("byteOffset", 0)
    count = acc["count"]
    if acc["type"] == "MAT4":
        # inverse bind matrices are usually tightly packed; stride==64 assumed
        out = np.zeros((count, 4, 4), dtype=np.float64)
        for i in range(count):
            out[i] = np.frombuffer(bin_data, dtype="<f4", count=16, offset=start + i * stride).reshape(4, 4)
        return out
    out = np.zeros((count, elem), dtype=np.float64)
    for i in range(count):
        base = start + i * stride
        if ct == 5126:
            row = _r32(bin_data, base, elem)
        elif ct == 5121:
            row = _u8(bin_data, base, elem)
        else:  # 5123 uint16 etc.
            row = np.frombuffer(bin_data, dtype="<u2", count=elem, offset=base).astype(np.float64)
        out[i] = row
    return out


def _mat_from_trs(t: list[float], r: list[float] | None, s: list[float] | None) -> np.ndarray:
    m = np.eye(4)
    if t is not None:
        m[:3, 3] = t
    # rotations in our GLB are quaternion (VEC4); GLB writer only emits translation
    if r is not None and len(r) == 4:
        x, y, z, w = r
        n = np.sqrt(x * x + y * y + z * z + w * w) or 1.0
        x, y, z, w = x / n, y / n, z / n, w / n
        rm = np.array(
            [
                [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 0],
                [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 0],
                [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y), 0],
                [0, 0, 0, 1],
            ]
        )
        m = rm
    if s is not None:
        m[:3, :3] *= np.asarray(s)
    return m


def inspect(path: Path, poses: list[str], times: list[float]) -> None:
    gltf, bin_data = read_glb(path)
    print(f"=== {path.name} ({(path.stat().st_size / 1024):.0f} KB) ===")
    nodes = gltf["nodes"]
    scene = gltf.get("scenes", [{}])[0]
    roots = scene.get("nodes", [])
    print(f"scene roots: {roots}")
    for i, n in enumerate(nodes):
        nm = n.get("name", f"node{i}")
        tr = " ".join(f"{v:.4f}" for v in n.get("translation", []))
        print(f"  node[{i}] {nm}: trans=[{tr}] mesh={n.get('mesh')} skin={n.get('skin')} children={n.get('children', [])}")

    skins = gltf.get("skins", [])
    if skins:
        sk = skins[0]
        ibm = _accessor_array(gltf, bin_data, sk["inverseBindMatrices"])
        joints = [nodes[j].get("name", f"j{j}") for j in sk["joints"]]
        print(f"skin joints ({len(joints)}): {joints}")
        print("inverseBindMatrices[0..3] (row-major):")
        for j in range(min(4, len(ibm))):
            print(f"  {joints[j]:12s} {np.round(ibm[j].flatten(), 3).tolist()}")

    # --- mesh + skin weights ---
    meshes = gltf.get("meshes", [])
    prim = meshes[0]["primitives"][0]
    attrs = prim["attributes"]
    pos = _accessor_array(gltf, bin_data, attrs["POSITION"])
    joints_u8 = _accessor_array(gltf, bin_data, attrs.get("JOINTS_0", -1)).astype(np.int64)
    weights = _accessor_array(gltf, bin_data, attrs.get("WEIGHTS_0", -1))
    nv = pos.shape[0]
    bmin, bmax = pos.min(axis=0), pos.max(axis=0)
    size = bmax - bmin
    print(f"\nvertices={nv} tris={prim.get('indices', 0) and gltf['accessors'][prim['indices']]['count'] // 3}")
    print("bind bbox:")
    print(f"  min={np.round(bmin, 4).tolist()} max={np.round(bmax, 4).tolist()} size={np.round(size, 4).tolist()}")
    ratios = {"h/w": size[1] / max(size[0], 1e-9), "h/l": size[1] / max(size[2], 1e-9), "w/l": size[0] / max(size[2], 1e-9)}
    print("  ratios: " + ", ".join(f"{k}={v:.3f}" for k, v in ratios.items()))

    # --- per-joint weight stats ---
    jn = len(skins[0]["joints"]) if skins else 16
    print("\nper-joint skin weight stats (vertex count / mean / max):")
    for j in range(jn):
        sel = joints_u8 == j
        vals = weights[sel] if sel.any() else np.zeros(1)
        print(f"  {joints[j]:12s} count={int(sel.sum()):6d} mean={vals.mean():.4f} max={vals.max():.4f}")

    # --- posed bbox (skinning evaluation) ---
    if skins and poses:
        joints_idx = sk["joints"]
        parent = {}
        for i, n in enumerate(nodes):
            for c in n.get("children", []):
                parent[c] = i
        print("\nposed bbox evaluation:")
        for pose in poses:
            for t in times:
                local: dict[int, np.ndarray] = {}
                for j in joints_idx:
                    local[j] = _mat_from_trs(nodes[j].get("translation"), None, None)
                anims = gltf.get("animations", [])
                anim = next((a for a in anims if a.get("name", "").lower() == pose.lower()), None)
                if anim is None:
                    print(f"  {pose} @ t={t}: clip not found in GLB")
                    continue
                for ch in anim["channels"]:
                    node = ch["target"]["node"]
                    sam = anim["samplers"][ch["sampler"]]
                    inp = _accessor_array(gltf, bin_data, sam["input"]).flatten()
                    outp = _accessor_array(gltf, bin_data, sam["output"])
                    path = ch["target"]["path"]
                    # linear track evaluation (our GLB writer emits LINEAR only)
                    # simple linear evaluation on the track times
                    idx0 = max(0, int(np.searchsorted(inp, t) - 1))
                    idx0 = min(idx0, len(inp) - 2) if len(inp) > 1 else 0
                    f = (t - inp[idx0]) / max(inp[idx0 + 1] - inp[idx0], 1e-9) if len(inp) > 1 else 0.0
                    f = min(1.0, max(0.0, f))
                    if path == "rotation":
                        q0, q1 = outp[idx0], outp[min(idx0 + 1, len(outp) - 1)]
                        q = q0 + (q1 - q0) * f
                        q = q / (np.linalg.norm(q) or 1.0)
                        local[node] = _mat_from_trs(None, q.tolist(), None)
                    elif path == "translation":
                        p = outp[idx0] + (outp[min(idx0 + 1, len(outp) - 1)] - outp[idx0]) * f
                        local[node] = _mat_from_trs(p.tolist(), None, None)
                world: dict[int, np.ndarray] = {}
                for j in joints_idx:
                    chain = []
                    cur = j
                    while cur in parent:
                        chain.append(cur)
                        cur = parent[cur]
                    m = np.eye(4)
                    for c in reversed(chain):
                        m = m @ local[c]
                    world[j] = m
                deformed = np.zeros_like(pos)
                # WEIGHTS_0 stores max 4 influences per vertex; each slot's joint
                # id comes from JOINTS_0. Sum skinMatrix * vertex per slot.
                for c in range(weights.shape[1]):
                    wc = weights[:, c]
                    for j in range(jn):
                        mask = joints_u8[:, c] == j
                        if not mask.any():
                            continue
                        jm = world[joints_idx[j]] @ ibm[j]
                        deformed[mask] += wc[mask, None] * (pos[mask] @ jm[:3, :3].T + jm[:3, 3])
                dmin, dmax = deformed.min(axis=0), deformed.max(axis=0)
                dsize = dmax - dmin
                dratio_hw = dsize[1] / max(dsize[0], 1e-9)
                dratio_hl = dsize[1] / max(dsize[2], 1e-9)
                disp = np.abs(deformed - pos).max(axis=0)
                print(f"  {pose} @ t={t}: min={np.round(dmin, 4).tolist()} max={np.round(dmax, 4).tolist()} "
                      f"size={np.round(dsize, 4).tolist()} h/w={dratio_hw:.3f} h/l={dratio_hl:.3f} "
                      f"max|disp|={np.round(disp, 4).tolist()}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--glb", required=True, type=Path)
    ap.add_argument("--poses", nargs="+", default=["Idle", "Stand"])
    ap.add_argument("--times", nargs="+", type=float, default=[1.0])
    args = ap.parse_args()
    inspect(args.glb, args.poses, args.times)


if __name__ == "__main__":
    main()
