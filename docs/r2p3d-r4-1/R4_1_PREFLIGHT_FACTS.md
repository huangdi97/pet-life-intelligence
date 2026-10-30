# R4.1 Preflight / Reality Audit Facts

> Stage: R2P3D-R4.1 — Android Runtime Closure, Individual Twin Fidelity & Product Visual Candidate
> Date: 2026-10-02 (local capture) · Working tree checked before any modification.

## 1. Git facts (as executed)

```
git rev-parse HEAD     → cea60fe5add4598d7960bac36bf1e66055b37c26
git branch --show-current → feat/r2p3d-r3-render-truth-ui-closure
git status --short     → (clean, 0 lines)
git remote -v          → origin  https://github.com/huangdi97/pet-life-intelligence.git (fetch/push)
```

`git log -10 --oneline`:

```
cea60fe fix(r2p3d-r4): regression fixes + final report
ec778ba test(r2p3d-r4): web contact sheets + R3-vs-R4 hero SSIM evidence
daa4043 feat(r2p3d-r4): clean-demo completeness + web blind contract fully green
62fbd65 feat(r2p3d-r4): high-fidelity individual twin assets + warm living UI closure
cca8cae test(r2p3d-r3): evidence bundle — 7 contact sheets + web/android captures + scorecards
cb82e84 docs(r2p3d-r3): record real CI status (all green except documented VISUAL-V2/V3 baseline drift)
2934b43 docs(r2p3d-r3): final closure evidence bundle (acceptance reports + contact sheets pointer)
fcf0703 fix(r2p3d-r3): truthful life-view copy for the confirmed twin + canonical e2e assertions
d09702e feat(r2p3d-r3): android camera controls + deterministic twin evidence + extractor truth adapters
da89cf7 feat(r2p3d-r3): real individual-twin identity + aspect-aware framing on all hero surfaces
```

Remote truth check (`git ls-remote origin`):

```
refs/heads/main                                        → 2069d8a8c8b4df9752f7c65fb3ddaad831100010
refs/heads/feat/r2p3d-r3-render-truth-ui-closure       → cea60fe5add4598d7960bac36bf1e66055b37c26
```

Branch remote HEAD == local HEAD == `cea60fe…` → **no remote update**; work proceeds on the
verified HEAD. main unchanged (`2069d8a…`). PR #2 remains OPEN (not merged) — no merge/push
to main/release performed this round.

## 2. Toolchain facts (present on this host, reused — nothing installed)

| tool | version / fact |
| --- | --- |
| Node | v22.15.0 |
| pnpm | 12.4.1 |
| Python | 3.13.14 (repo venv at `.venv`) |
| JDK | Temurin 21.0.12.1 (OpenJDK 21) |
| Android SDK | ANDROID_HOME=`D:\Code\Android\SDK` (platform-tools/adb, emulator) |
| AVDs (D:\avdhome) | `main` = pixel_7, **android-36** (API 36), google_apis x86_64, 2G RAM ← the previously used PLI API 36 phone AVD; `zhishen_rc` = pixel_7, android-35 |
| adb | daemon OK, no device attached at preflight time |
| Docker Desktop | installed at `C:\Program Files\Docker\Docker\Docker Desktop.exe`, was stopped (reused, not installed) |
| Playwright / browsers | present (web capture used in R4) |

## 3. Directory audit (state at preflight)

- `docs/r2p3d-r4/` — R4 final report + twin license ledger exist.
- `docs/r2p3d-r4-1/` — created this round (this file is the first).
- `artifacts/r2p3d-r4/` — web captures (21 screens), contact-sheets, twin-sources; **no `android/`** (matches BLOCKER A).
- `reports/r2p3d-r4/web/` — scorecards present.
- `packages/pet-3d/assets/twins/` — doudou.glb + doudou.glb.manifest.json + doudou_meta.json +
  doudou_weights.json + doudou_base.obj + doudou_observed/inferred.png + doudou_baseColor.png; mimi equivalents.
- `packages/pet-3d/src/` — loader.ts (GLB loader + procedural fallback), manifest.ts, scene.ts, twinScene.ts,
  rig.ts, motion.ts, buildCorgi.ts, buildCat.ts, palette.ts, registry.ts.
- `apps/web/` — Next.js web app (hero surfaces Today / Pet World / Life View / Twin Review).
- `apps/mobile/` — React Native WebView app, embeds GLBs byte-exact at build time
  (`EXPO_PUBLIC_PLI_DEMO_ENV=1` demo deep-link navigation), package `com.pli.mobile`.
- `apps/mobile/android/` — Gradle project; `assembleRelease` previously green
  (`app-release.apk` 97,204,078 bytes built 2026-10-02 14:51).
- `.github/workflows/ci.yml` + `android.yml` — CI definitions; CI #82 was FAILURE with the
  STAGE-V-VISUAL-02 regression and frozen VISUAL-V2/V3 baselines (expected drift).
- Scripts: `scripts/r2p3d-r4/` (build_twins.py / bake_twin.py / objio.py / meshops.py /
  skinweights.py / glbwriter.py / unwrap.py / painting.py / motion_py.py / asset_qa.py),
  `scripts/blind-ui/` (capture-android.ps1 / capture-web.mjs / android_extract.py / android_tap.py /
  scorecard.py / pixel_oracle.py / contact-sheets.py).

## 4. Baseline decisions recorded

1. Android runtime closure proceeds on the existing API 36 AVD (`main`), reusing the R4
   `app-release.apk` for the first runtime-truth pass; the APK is rebuilt from the final
   R4.1 state (new geometry/UI) for the conclusive Android evidence pass.
2. No vision model is used (NO_VISION_MODEL_USED = TRUE). Evidence = runtime manifest,
   uiautomator tree, DOM/ARIA, computed styles, GLB metadata, pixel statistics, SSIM only.
3. Approved visual baselines (V2/V3) stay OLD; any UI drift is recorded as
   EXPECTED_BASELINE_DRIFT, never promoted.
4. STAGE-V-VISUAL-02 (404 vs generic error boundary) is treated as a real state-space
   question and resolved on the product-correct side (Phase F), not by editing expected strings.
5. Dou-dou remains a **Demo Individual Twin / Corgi-like demo asset**; no claim of real
   identity validation. REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED.

## 5. Machine acceptance inputs (from verified runtime facts, not memory)

- R4 web runtime manifest (Today, live): `representationQuality=HIGH_FIDELITY_SKINNED`,
  `productCandidate=true`, `triangleCount=45376`, `skinnedMeshCount=1`, `uvPresent=true`,
  `texturePresent=true`, `baseColorTextureResolution=2048`, `fallbackUsed=false`.
- R4 GLB assets: doudou 45,376 tris / 23,975 verts; mimi 51,568 tris / 28,951 verts; 16-joint
  skeleton; 12 motion clips; 2048 baseColor atlas with observed/inferred masks.
- R4 regression (2026-10-02): ruff PASS, backend pytest 446 passed, blind_ui 32 passed,
  pet-3d build+typecheck PASS, web/mini/admin/mobile typecheck PASS, vitest 33 passed,
  assembleRelease PASS. Android full capture NOT_RUN (this round closes it).
