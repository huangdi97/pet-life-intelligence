# PLI R5.6 — TWIN PROVENANCE AND REVIEW AUDIT

> Scope: individual 3D identity — real photo priority, candidate vs active assets,
> `not_like` safety, three-view review, and the honest quality of what is actually
> rendered. No vision model is used; every statement below is a value read from the
> runtime manifest, a source contract or a test result.
>
> Head: `3aacdf6cfabd105f18b9197ce65d8981a15a48f4`
> (artifact `r5-6-android-runtime-evidence`, id 11683881923; local run: see
> `ANDROID_RUNTIME_EVIDENCE.md`).

## 1. What the runtime actually reports (observed, not marketed)

From `android/lifeview/3d.json` and `android/twinreview/3d.json` of this exact run:

| Field | Value | Reading |
| --- | --- | --- |
| `manifestOrigin` | `RUNTIME` | produced by the live WebView stage, not a fixture |
| `representation` | `rigged-glb-twin` | rigged GLB, not the legacy procedural twin |
| `generic` | `false` | not a species-generic placeholder |
| `fallbackUsed` | `false` | no silent downgrade was used to pass the gate |
| `sourceMediaCount` | `0` | **no owner media** in this demo seed |
| `individualIdentityEvidence` | `false` | the asset is **not** evidence of this individual |
| `visualFidelityTier` | `STYLIZED_REFERENCE` | honest identity tier |
| `technicalRepresentationQuality` | `RIGGED_PBR_SKINNED` | technical pipeline quality only |
| `representationQuality` | `HIGH_FIDELITY_SKINNED` | rendering-pipeline class; **must never be quoted as identity fidelity** |
| `triangleCount` / `uvPresent` / `baseColorTextureResolution` | `32512` / `true` / `2048` | real geometry/texture facts |
| `skin` (skinned mesh + skeleton) | `skinnedMeshCount = 1`, `skeleton = true` | rigged, not a static mesh |
| `pose` / `canonicalPose` | `Idle` (Life View), `Stand` (Twin Review) | matches `stageRole` |
| `reducedMotion` | `true` | the emulator requests reduced motion; the stage still renders |
| `surfaceVariant` / `realityField` | `warm-living-field` / `warm-living`, `neutral-identity-studio` / `review-studio` | warm life field for Living View, neutral studio for review |

**`3D_ASSET_QUALITY = BLOCKED_BY_SOURCE_ASSET`** — no owner photos exist for this seed, so
no individual reconstruction can be claimed. Nothing in the manifest, and no CSS or
lighting change, was used to upgrade this claim.

## 2. Real photo priority and honest fallback

| Rule | Implementation | Evidence |
| --- | --- | --- |
| If a trusted individual asset exists, the 3D identity may lead | `PetLivingStage` mounts the WebView twin only with a `RUNTIME` rigged manifest whose fidelity tier is internally consistent | capture script `_is_product_manifest()` refuses `ready != true`, non-`RUNTIME` origin, generic/fallback flags, or tier/media mismatches |
| If no trusted twin exists, prefer the pet's real photo or an explicit upload/setup path | `PetAvatar` + owner-media paths; `apps/web/app/pets/[id]/edit/page.tsx` (new this cycle) lets the owner add media | `tests/blind_ui/test_r5_owner_hierarchy.py::test_pet_photo_priority…` contracts |
| An engineering demo asset must be recognisable as a demo | content-desc on the Today stage: "豆豆的 3D 形象（演示）。基于 CC0 柯基模板的演示 3D 形象；只有经过真实宠物素材与主人确认后才可代表个体。" | CI `today/visual.json` element text |
| The demo source must be licence-clean | `artifacts/r2p3d-r5/twin-sources/doudou-gobkit-corgi/{SOURCE.md,LICENSE-CC0.txt}` + `docs/r2p3d-r4/TWIN_ASSET_LICENSE_LEDGER.md` | repository |

## 3. Candidate vs active, and the `not_like` invariant

- `tests/contract/test_plm_visual.py::test_verify_not_like_cannot_activate`:
  `POST …/verify {"result": "not_like", "issues": ["face","coat"]}` →
  `owner_verified == false`, and the following `POST …/activate` returns **422** — a
  rejected candidate cannot become the active asset. A later `like` verification does
  activate it, proving the block is about the verdict, not a broken endpoint.
- `services/api/app/api/routes/visual.py` documents the rule: activation requires
  `owner_verified`; a model whose identity QC result is `not_like` is excluded.
- `GET /api/v1/visual/status` reports `real = false`,
  `status = REAL_3D_PROVIDER_EXTERNAL_BLOCKED`, `local_pipeline = READY` — the absence of a
  real generation provider is surfaced, never faked (asserted in the same contract test).

## 4. Three-view review — measured, not assumed

| View | Control id | Runtime yaw | Screenshot size | Screenshot SHA-256 (prefix) |
| --- | --- | --- | --- | --- |
| 正面 front | `pli.twinreview.view.front` | `0` | 308 431 B | `4C327C638FB33D86…` |
| 侧面 side | `pli.twinreview.view.side` | `1.5707963267949` (π/2) | 274 416 B | `329C586AC7919602…` |
| 背面 back | `pli.twinreview.view.back` | `3.14159265358979` (π) | 286 726 B | `FDF7373305BCEA8E…` |

- All three screenshots differ in content hash **and** the runtime camera yaw differs per
  view, so the control genuinely re-orients the scene instead of only highlighting.
- `pli.twinreview.camera-controls` and all three view ids are present in
  `twinreview/ui.xml`, and the capture script **fails** the run if any of them is missing —
  i.e. the gate would have caught a hidden control.
- The same three-view check ran for the secondary pet (`secondary-review/3d_view_*.json`,
  `secondary_front/side/back.png`) to prove review is per-pet, not a shared stage.

## 5. Where the review verdicts live

`pli.twinreview.verify.like` / `pli.twinreview.verify.near` / `pli.twinreview.verify.not_like`
(first-screen buttons) plus `pli.twinreview.issue.*` for 脸 / 耳朵 / 毛色 / 花纹 / 体型 / 尾巴 /
四肢 feedback, and `pli.twinreview.action.feedback` / `pli.twinreview.action.activate`.
Verdicts are owner-scoped API calls, so the audit trail is a canonical event, not local UI state.

## 6. Outstanding

| Item | Status |
| --- | --- |
| Real individual reconstruction from owner media | `BLOCKED_BY_SOURCE_ASSET` (needs the owner's photos or a licensed provider) |
| Owner judgement of the rendered identity ("很像/基本像/不像") | `HUMAN_VISUAL_ACCEPTANCE = PENDING` — only the owner may close it |
| Emulator rendering fidelity vs a physical device | Emulator only; `REAL_DEVICE_HUMAN_REVIEW = PENDING` |
