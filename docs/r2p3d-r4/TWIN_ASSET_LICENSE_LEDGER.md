# R2P3D-R4 Twin Asset License Ledger

> PROVENANCE: every external asset used to build the R4 high-fidelity demo
> twins (豆豆 / 咪咪) is listed here with source, license, commercial use,
> redistribution and attribution. R4 rule (§13): no external asset may enter
> the product assets without a ledger entry. Internal/generated assets
> (UV atlas, masks, skeleton binding, animation clips, GLB assembly) are
> authored in-repo and need no external license.

## Entry 1 — 豆豆 (dog) base mesh

| field | value |
| --- | --- |
| asset | `dog_jackrussell_release.obj` / `.mtl` (from `OBJ.zip`) |
| title | Dog Low Poly Rigged — "Dog (Jack russel)" |
| source | OpenGameArt `https://opengameart.org/content/dog-low-poly-rigged` |
| author | crownjoshua (OGA user) |
| license | CC0 1.0 (Public Domain Dedication) |
| commercial use | yes (unrestricted) |
| redistribution | yes (unrestricted) |
| attribution | not required (CC0); credit recorded here for provenance |
| retrieved | 2026-10-02 |
| local copy | `artifacts/r2p3d-r4/twin-sources/doudou-jackrussell-dog/` |
| applied to | 豆豆 `doudou.glb` base geometry (subdivided + re-painted) |

## Entry 2 — 咪咪 (cat) base mesh

| field | value |
| --- | --- |
| asset | `Cat.obj` / `Cat.mtl` from "Animal Pack Vol.2 by @Quaternius.zip" |
| title | Animal Pack Vol.2 (Cat) |
| source | OpenGameArt `https://opengameart.org/content/animated-animales-low-poly` |
| author | Quaternius (`https://quaternius.com`) |
| license | CC0 1.0 (Public Domain Dedication) |
| commercial use | yes (unrestricted) |
| redistribution | yes (unrestricted) |
| attribution | not required (CC0); credit recorded here for provenance |
| retrieved | 2026-10-02 |
| local copy | `artifacts/r2p3d-r4/twin-sources/mimi-quaternius-cat/` |
| applied to | 咪咪 `mimi.glb` base geometry (subdivided + re-painted) |

## Generated / internal assets (no external license required)

| asset | description |
| --- | --- |
| `{doudou,mimi}_baseColor.png` | multi-view UV atlas painted in-repo (front/left/right/rear/head projection) |
| `{doudou,mimi}_observed.png` / `_inferred.png` | observed/inferred provenance masks for the atlas |
| `{doudou,mimi}_weights.json` | per-vertex skin weights computed in-repo for the PLI rig |
| `doudou.glb` / `mimi.glb` | final skinned GLB assembled in-repo (PLI rig + clips + textures) |
| `packages/pet-3d` rig/motion/manifest code | in-repo MIT |

## Downloaded-at-build-time assets

None. All external sources were downloaded once, reviewed and committed
under `artifacts/r2p3d-r4/twin-sources/`; the bake pipeline consumes only the
committed copies (`NO_RUNTIME_DOWNLOADS = TRUE`).

## Re-verification

To reproduce the fetch (network not required at build time):

```powershell
# OGA file URLs (recorded 2026-10-02):
# - https://opengameart.org/sites/default/files/OBJ.zip            (dog; jack russel)
# - https://opengameart.org/sites/default/files/Animal%20Pack%20Vol.2%20by%20%40Quaternius.zip (cat)
```

SHA-256 of the committed source copies is recorded in
`artifacts/r2p3d-r4/twin-sources/SHA256SUMS.txt` (generated at bake time by
`scripts/r2p3d-r4/bake_twin.py --write-sums`).

## Entry 3 — R4.1 deterministic Corgi-like morphology (in-repo authored)

| field | value |
| --- | --- |
| asset | `doudou_base.obj` re-baked geometry (positions only) |
| what | `scripts/r2p3d-r4/corgi_morph.py` — deterministic, region-aware,
  smooth-ramp vertex transform (long back, short legs, wider head, shorter
  muzzle, upright ear pinna, thick chest, low CG) applied in the bake
  pipeline BEFORE unwrap+paint so the texture projection conforms to the new
  silhouette |
| provenance | authored in-repo; derives from Entry 1's CC0 base (CC0-derived;
  no new external asset, no new license obligation) |
| record | `packages/pet-3d/assets/twins/doudou_meta.json → morphology`
  {params, before, after, delta} — deterministic and auditable |
| applied to | 豆豆 `doudou.glb` (twin_version `r4-1.1.0`, still 45,376 tris) |
| honesty | demo Corgi-like product asset; NOT a claim of the real pet's
  morphology (REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED) |