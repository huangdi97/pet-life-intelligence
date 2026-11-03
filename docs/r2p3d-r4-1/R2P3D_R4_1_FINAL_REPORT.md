# R2P3D-R4.1 Final Report 鈥?Android Runtime Closure, Individual Twin Fidelity & Product Visual Candidate

> Date: 2026-10-02 路 Branch: `feat/r2p3d-r3-render-truth-ui-closure` (PR #2, OPEN, not merged)
> NO_VISION_MODEL_USED = TRUE 鈥?all machine judgments below come from runtime
> manifests (RUNTIME origin), GLB/asset metadata, DOM/ARIA/computed styles,
> uiautomator trees, and deterministic pixel/mesh statistics. The agent does
> NOT declare visual pass; that is the user's call via the contact sheets.
> Docs: `docs/r2p3d-r4-1/` 路 Evidence: `artifacts/r2p3d-r4-1/`

## 1. What R4.1 closed

1. **BLOCKER A 鈥?Android runtime truth (highest priority).**
   - Built a **demo-capable APK** (the previous artifact embedded no API URL
     and no demo env, so it could never actually run the demo household 鈥?     this was the real gap behind "no Android visual evidence").
     `EXPO_PUBLIC_PLI_API_URL=http://10.0.2.2:8800`, `EXPO_PUBLIC_PLI_DEMO_ENV=1`.
   - On the existing **API 36 AVD (`main`)**, installed and drove the app with
     real deep links; created + verified + activated the demo visual models for
     璞嗚眴/鍜挭 through the API; the WebView publishes a **RUNTIME** manifest.
   - All four hero surfaces (Today / Pet World / Life View / Twin Review) prove
     `manifestOrigin=RUNTIME, ready=true, fallbackUsed=false,
     representationQuality=HIGH_FIDELITY_SKINNED, productCandidate=true,
     skinnedMeshCount=1, uvPresent=true, texturePresent=true,
     baseColorTextureResolution=2048, sourceMediaCount=2, petId=<pet>,
     animationClips=12`.
   - Real interactions on-device: rotate (yaw 0.35鈫?.059), zoom (radius
     1.879鈫?.565, yaw constant), reset (yaw 0.35 / radius 1.864 restored),
     Twin Review front鈫抯ide鈫抌ack yaw 0.35鈫捪€/2鈫捪€, `not_like` 鈫?activate
     `enabled=false`. Evidence: `artifacts/r2p3d-r4-1/android/` (per-hero
     screenshot.png / ui.xml / layout.json / visual.json / 3d.json / report.md,
     plus 3d_rotate_a/b, 3d_zoom_a/b, 3d_reset, 3d_view_front/side/back).
2. **BLOCKER B 鈥?individual twin fidelity (morphology, not color).**
   - Added `scripts/r2p3d-r4/corgi_morph.py`: a deterministic, region-aware,
     smooth-ramp geometry transform applied in the bake pipeline **before**
     unwrap+paint, so the 5-view texture projection conforms to the new
     silhouette. Positions-only editing; topology/UV/rig regenerated downstream.
   - Measured silhouette deltas (twin unit space, height-budgeted):
     trunk (back) length ratio **+18.2%**, head width ratio **+14.4%**,
     muzzle stickout ratio **鈭?2.6%**, leg-top ratio **鈭?8.5%**, belly
     clearance ratio **鈭?6%**; total height budgeted (鈮?~1.34, rig aligned).
     Recorded in `doudou_meta.json 鈫?morphology {params,before,after,delta}`.
   - Re-baked + rebuilt `doudou.glb` (45,376 tris, 16 joints, 12 clips, 2048
     atlas); `asset_qa.py` V3_PASS for both assets; fingerprints distinct.
   - **Honesty preserved**: family stays `corgi-like`; metadata says demo
     Corgi-like asset; no real-identity claim (REAL_PET_IDENTITY_VALIDATION =
     NOT_YET_OBSERVED).
3. **BLOCKER C 鈥?warm living hero composition.**
   - Web stage: larger twin (Today/review 300脳352, Life 300脳372, Pet 286脳335;
     desktop up to 380脳410; stage min-height 430), plant/toy silhouette
     weakened and enlarged (reads as an environment silhouette, not a blurred
     blob), HUD anchor pills slimmed (padding/min-height/icon/font reduced).
   - Mobile stage constants raised for pet dominance (today 372/228, pet
     396/246, life 492/268, review 502/268).
4. **BLOCKER D 鈥?404 / error-boundary state contract.** Fixed on the correct
   side (runtime): React hook-order violation in the Pet World page made any
   unknown-pet id hit the generic error boundary. All hooks now precede the
   early returns; the dedicated 404 state renders. No test edits, no weakened
   assertions. See `docs/r2p3d-r4-1/STATE_SPACE_CONTRACT_AUDIT.md`.
5. **Phase E 鈥?manifest semantic cleanup.**
   - Canonical `representation` now names the asset really on screen
     (`high-fidelity-glb-twin`); the R3-era label survives as
     `legacyRepresentation` (web viewer, mobile pet-stage-entry, GLB sidecar
     manifests, twin meta). No auditor sees HIGH_FIDELITY_SKINNED +
     procedural-* unqualified.
6. **Phase C4 鈥?Twin Review presets drive the real camera (both platforms).**
   - **Web**: the review page rebuilt the twin object every render (spread),
     which remounted the 3D scene and reset the camera; memoized the twin
     object (`useMemo`) 鈫?side/back now move the real camera
     (probe: yaw 0.35 鈫?1.571 鈫?3.142 鈫?0).
   - **Mobile**: wired `view` prop through PetLivingStage 鈫?Pet3DViewer 鈫?     `window.__PLI_SET_VIEW`; on-device manifest yaw proves front/side/back
     (0.35 / 1.571 / 3.142).

## 2. Regression matrix (real numbers, run 2026-10-02)

| item | result | notes |
| --- | --- | --- |
| ruff (scripts + services + tests) | PASS | import-order fix included |
| backend pytest | **443 passed** | 271s, 1 warning |
| pytest tests/blind_ui | **32 passed** | 26s (after local PG port pinning) |
| pet-3d build + typecheck | PASS | |
| web / mobile / mini / admin typecheck | PASS | |
| vitest (web) | **33 passed** | 5 files |
| Playwright functional e2e (42) | **42 passed** | 3.9m (incl. 3D runtime, H2 honest-state, IDOR) |
| STAGE-V-VISUAL-02 (404) | **PASS** | runtime fix, test unchanged |
| Gradle assembleRelease (R4.1 APK) | PASS | 1m11s incremental |
| next build | pages **27/27 compiled**; standalone ENV-LIMITED | Windows EPERM on `@img/sharp-wasm32` symlink (same as R4; CI Linux unaffected) |
| Android runtime capture (API36 AVD) | PASS | heroes + interactions + mimi parity |
| asset QA | V3_PASS both, distinct fingerprints | |

## 3. Evidence summary

- **Web heroes (R4.1)**: all four `high-fidelity-glb-twin` +
  `HIGH_FIDELITY_SKINNED` + 45,376 tris + `projectedPetHeightRatio` 0.49鈥?.62;
  Life View cameras rotate/zoom/reset real (rotateB yaw 鈮?rotateA, zoomB
  radius < zoomA, reset yaw 0.35); Twin Review not_like 鈫?activate disabled.
- **Android heroes (R4.1)**: same manifest truth on-device; Twin Review view
  presets proven via camera yaw; not_like 鈫?activate `enabled=false` (real
  verify POST, ACTIVE restored afterward).
- **Mimi parity**: mimi.glb 51,568 tris, HIGH_FIDELITY_SKINNED, runtime
  manifest on Android (mimi-sanity) 鈥?the dog pipeline change did not break
  the cat pipeline.
- **Contact sheets (for the human)**: `artifacts/r2p3d-r4-1/contact-sheets/`
  鈥?WEB_HEROES, ANDROID_HEROES, R4_VS_R4_1, R3_VS_R4_VS_R4_1_{today,pet,
  lifeview,twinreview}, TWIN_TURNTABLE_DOU_DOU, TWIN_TURNTABLE_MIMI.
- **Machine morphology record**: `doudou_meta.json 鈫?morphology` (params +
  before/after/delta) 鈥?deterministic, auditable.

## 4. Final state template

```text
NO_VISION_MODEL_USED = TRUE

R4_1_DOG_CONTINUOUS_MESH = PASS            (45,376 tris continuous skinned mesh)
R4_1_DOG_CORGI_MORPHOLOGY = PASS          (trunk +18.2%, head width +14.4%,
                                           muzzle 鈭?2.6%, leg-top 鈭?8.5%,
                                           belly 鈭?6%; deterministic, recorded)
R4_1_DOG_UV_TEXTURE = PASS                (2048 atlas, observed/inferred masks)
R4_1_DOG_SKINNED = PASS                   (16 joints, 12 clips, QA V3_PASS)
R4_1_DOG_MOTION = PASS                    (12 clips)

R4_1_CAT_RUNTIME_PARITY = PASS            (mimi 51,568 tris, RUNTIME, sanity shot)

WEB_HIGH_FIDELITY_RUNTIME = PASS          (4 heroes: high-fidelity-glb-twin,
                                           HIGH_FIDELITY_SKINNED, 45376 tris)
ANDROID_HIGH_FIDELITY_RUNTIME = PASS      (API 36 AVD: same manifest truth)
ANDROID_HERO_CAPTURE = PASS               (today/pet/lifeview/twinreview + views
                                           + not_like + mimi)
WEB_HERO_CAPTURE = PASS                   (today/pet/lifeview/twinreview + cameras)

TODAY_WARM_LIVING = PASS (machine)        (pet-dominant stage, slim HUD,
                                           environment silhouette) 鈥?visual
                                           verdict = HUMAN PENDING
PET_WORLD_LIVING = PASS (machine)         (same; real twin on Pet World)
LIFE_VIEW_TWIN_SPACE = PASS (machine)     (real camera rotate/zoom/reset)
TWIN_REVIEW_IDENTITY = PASS (machine)     (front/side/back real camera)

STATE_SPACE_CONTRACT = PASS               (unknown pet 鈫?dedicated 404;
                                           STAGE-V-VISUAL-02 green, no test edits)
FUNCTIONAL_E2E = PASS                     (42 passed)
BLIND_CONTRACT = PASS                     (blind_ui 32 passed)
VISUAL_V2 = EXPECTED_BASELINE_DRIFT       (approved baseline kept OLD)
VISUAL_V3 = EXPECTED_BASELINE_DRIFT       (approved baseline kept OLD)
APPROVED_VISUAL_BASELINE = OLD            (not promoted)

PR_HEAD = a587be92876c55f9ee69a5100f93531ff4f8c8f4
PR_FULL_CI_GREEN = ?                      (local full-functional green; CI run
                                           remains the source of truth)

REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED
ANDROID_REAL_DEVICE_QA = NOT_YET_OBSERVED
PRODUCT_VALIDATION = NOT_YET_OBSERVED

R4_PRODUCT_VISUAL_CANDIDATE = READY_FOR_HUMAN_REVIEW
HUMAN_VISUAL_ACCEPTANCE = PENDING         (the user, via contact sheets)
```

## 5. Open items (recorded, not blockers)

- **Mobile Life View fit baseline variance**: the auto-fit radius measured
  4.15 on some page loads and ~1.87 on others (same target 0.27). Within a
  single page instance, rotate/zoom/reset are fully deterministic (verified
  on-device and on web). Cause hypothesis: fitted radius depends on the
  projected bounds at the exact fit moment (animation state / viewport
  settle). Tracked for follow-up; does not affect the interaction gates.
- **Next standalone artifact** remains ENV-LIMITED on this Windows host
  (EPERM symlink for `@img/sharp-wasm32`), identical to R4; CI (Linux) is the
  reference for the standalone artifact.
- Environment note: local dev DB now runs on Windows portable PostgreSQL
  (55432) because Docker Desktop's engine could not start on this host and WSL
  networking is admin-gated; `.env`/`.env.local` point at historical ports
  (56532/55679) 鈥?regression commands pin `DATABASE_URL`/`TEST_DATABASE_URL`
  to 55432 explicitly (recorded, no repo change needed).

## 6. Boundaries honored

- No merge of PR #2; no push to main; no release/tag.
- Approved visual baselines V2/V3 NOT updated (stays OLD).
- No vision model used; final visual verdict left to the user.
- No deletion/weakening of tests; no `ts-ignore`/lint gates disabled.
- Only existing local tooling + documented supplement (portable PostgreSQL
  zip; Docker engine unavailable on this host).

