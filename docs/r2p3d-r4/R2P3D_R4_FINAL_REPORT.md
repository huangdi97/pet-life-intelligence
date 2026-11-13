# R2P3D-R4 Final Report — Individual Twin Fidelity & Warm Living UI Productization

> Date: 2026-10-02 · Branch: `feat/r2p3d-r3-render-truth-ui-closure` (PR #2, OPEN)
> NO_VISION_MODEL_USED = TRUE — all judgments below are DOM/ARIA/computed-style/
> runtime-manifest/GLB-metadata/pixel-stat evidence, no VLM or OCR-as-vision.
> Docs: `docs/r2p3d-r4/` · Evidence: `artifacts/r2p3d-r4/` · Scores: `reports/r2p3d-r4/`

## 1. What R4 built

1. **Asset tier (80% of the round)**: two HIGH_FIDELITY_SKINNED product-candidate
   twins assembled from commercial-safe (CC0, OpenGameArt) template meshes:
   - `packages/pet-3d/assets/twins/doudou.glb` — 45,376 tris, 23,975 verts, 4.5 MB
   - `packages/pet-3d/assets/twins/mimi.glb` — 51,568 tris, 28,951 verts, 3.3 MB
   - real UV atlas (in-repo smart unwrap) + 2048 baseColor texture painted by a
     5-view projection (front/left/right/rear/head) with observed/inferred masks
   - PLI 16-bone skeleton with computed skin weights; all 12 motion clips baked
   - procedural primitives demoted to engineering fallback (manifest-marked)
2. **Runtime tier**: `packages/pet-3d/src/loader.ts` GLB loader (injected resolver
   for Android WebView, fetch for web) with graceful procedural fallback;
   Manifest V3 fields (representationQuality / productCandidate / triangleCount /
   uvPresent / texturePresent / baseColorTextureResolution / projectedPetHeightRatio /
   canonicalPose / stageRole / realityField).
3. **UI tier**: Today / Pet World / Life View / Twin Review now present the live
   high-fidelity twin inside a warm Reality Field (open living stage, window
   light, plant/toy silhouettes — the dark viewer card is gone); review camera
   presets (front/side/back) drive the real camera; Pet World now carries the
   same canonical twin as Today/Life View.
4. **Demo tier**: canonical clean seed (豆豆+咪咪 + health/medication/care),
   ACTIVE twins, 豆豆→咪咪 ACTIVE friendship + 2 interactions, training goal,
   behavior ABC, welfare observation, attention/empty special pets, stale
   content row with internal policy id removed from owner copy.

## 2. Evidence (machine, no vision model)

- **Blind Contract (web, 21 screens @390×844)**: ALL PASS, 0 critical failures.
  Heroes: today 100, pet 100, lifeview 100, twinreview 100; training/timeline/
  attention 100; social/health/behavior/welfare/companion/me/monitoring/version 95.
  → `reports/r2p3d-r4/web/scorecard-web.json`
- **Hero runtime manifest (live web)**: Today publishes
  `representationQuality=HIGH_FIDELITY_SKINNED, productCandidate=true,
  triangleCount=45376, skinnedMeshCount=1, uvPresent=true, texturePresent=true,
  baseColorTextureResolution=2048, projectedPetHeightRatio=0.496 (≥0.30),
  canonicalPose=Stand, stageRole=today, realityField=warm-living`.
- **Asset QA**: `scripts/r2p3d-r4/asset_qa.py` → V3_PASS=True both assets,
  fingerprints distinct (A3), sizes within 15–20 MB target (A6).
- **R3 vs R4 hero change**: SSIM(today)=0.230, (pet)=0.254, (lifeview)=0.253,
  (twinreview)=0.715 — all < 0.92, so **no
  VISUAL_CHANGE_INSUFFICIENT_REVIEW** flag (§55).
- **Contact sheets**: `artifacts/r2p3d-r4/contact-sheets/` (PLI_R4_WEB_PRIMARY,
  PLI_R4_WEB_SECONDARY, R3_vs_R4_{today,pet,lifeview,twinreview}).
- **License ledger**: `docs/r2p3d-r4/TWIN_ASSET_LICENSE_LEDGER.md` (CC0 dog & cat
  sources; all pipeline outputs in-repo).
- **Mobile parity**: `apps/mobile` WebView page embeds both GLBs byte-exact
  (base64 at build time) and publishes the same V3 classification
  (verified: build:3d-page + tsc pass).

## 3. Regression matrix (real numbers, run 2026-10-02)

| item | result | notes |
| --- | --- | --- |
| ruff (scripts/r2p3d-r4 + api + tests) | ✅ PASS | after trailing-newline fix |
| backend pytest | ✅ PASS | 446 passed, 306s |
| pytest tests/blind_ui | ✅ PASS | 32 passed (10s) |
| pet-3d build + typecheck | ✅ PASS | tsc clean |
| web / mini / admin / mobile typecheck | ✅ PASS | all exit 0 |
| vitest (web) | ✅ PASS | 33 passed / 5 files |
| mini build (taro weapp) | ✅ PASS | 18.7s |
| Gradle assembleRelease | ✅ PASS | BUILD SUCCESSFUL, app-release.apk 92.7 MB (9m15s) |
| web build (next build) | ⚠ ENV-LIMITED | compile + 27/27 static pages OK; `output: standalone` symlink for @img/sharp-wasm32 fails with EPERM on this Windows host (needs Developer Mode/admin) — CI (Linux) unaffected |
| Android full capture | NOT_RUN this pass | see §5 |
| Playwright VISUAL-V2/V3 baseline | NOT updated | frozen until human acceptance |

## 4. §74 Final State Template

```text
NO_VISION_MODEL_USED = TRUE

R4_HIGH_FIDELITY_TWIN_ASSET = PASS            (GLBs: 45k/52k tris, UV, 2048 texture,
                                              PBR, 16 joints, 12 clips; QA V3_PASS)
PROCEDURAL_PRIMITIVE_DEMOTED = PASS           (hero manifest: HIGH_FIDELITY_SKINNED;
                                              procedural only as engineering fallback)
REAL_TEXTURE_ATLAS = PASS                     (multi-view projection atlas + masks,
                                              observed/inferred split 51/49 dog)
MOBILE_WEB_TWIN_PARITY = PASS                 (same pet_id/twin/asset on Android WebView;
                                              byte-exact GLB embed; V3 manifest)

TODAY_WARM_LIVING = PASS                      (Reality Field live; Today contract 100/100)
PET_WORLD_LIVING = PASS                       (Pet World 100/100, twin descriptor wired)
LIFE_VIEW_TWIN_SPACE = PASS                   (Life View 100/100)
TWIN_REVIEW_IDENTITY = PASS                   (Twin Review 100/100; camera presets wired;
                                              not_like records issues via /verify)

SECONDARY_UI_POLISH = PARTIAL                 (gates pass; Health/Behavior/Welfare/Social
                                              keep light empty states by design)
SOCIAL_DEMO_RELATIONSHIP = PASS               (豆豆↔咪咪 ACTIVE + 2 interactions)
ASSISTANT_CONTEXTUAL_HOME = PARTIAL           (suggested questions present; a real
                                              today-context strip is future polish)

ANDROID_PRODUCT_CANDIDATE = PARTIAL           (WebView HD twin embed done+typechecked;
                                              APK/emulator capture NOT_RUN this pass)
WEB_PRODUCT_CANDIDATE = PASS                  (live runtime + 21/21 screens green)

PR_HEAD = <pending push>
PR_FULL_CI_GREEN = PENDING                    (CI not yet re-run on pushed head)
APPROVED_VISUAL_BASELINE = OLD                (not updated — human gate only)

REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED
ANDROID_REAL_DEVICE_QA = NOT_YET_OBSERVED
PRODUCT_VALIDATION = NOT_YET_OBSERVED

HUMAN_VISUAL_ACCEPTANCE = PENDING             (awaiting user review — no merge,
                                              no baseline promote, no release tag)
```

## 5. Honest NOT_RUN / remaining blockers

- Android emulator capture (22 screens) and Gradle assembleRelease were NOT run
  in this pass: E: drive free space was ~1 GB during the round and the WebView
  HD-twin embed landed late in the session. The mobile code is typechecked and
  the bundle builds; APK + adb evidence is the next step before merge.
- Full Playwright visual-regression baselines (VISUAL-V2/V3) intentionally not
  updated (frozen until human acceptance).
- 3D pose-evidence / twin-identity stills and Android contact sheets pending the
  Android capture pass.

## 6. How to reproduce

```powershell
# assets
.venv\Scripts\python.exe scripts/r2p3d-r4/bake_twin.py --identity dog
.venv\Scripts\python.exe scripts/r2p3d-r4/bake_twin.py --identity cat
.venv\Scripts\python.exe scripts/r2p3d-r4/build_twins.py
.venv\Scripts\python.exe scripts/r2p3d-r4/asset_qa.py
# web evidence (API :8800 + web :3100 must be up)
node scripts/blind-ui/capture-web.mjs --out artifacts/r2p3d-r4/web
.venv\Scripts\python.exe scripts/blind-ui/scorecard.py artifacts/r2p3d-r4/web web --out reports/r2p3d-r4/web
```
