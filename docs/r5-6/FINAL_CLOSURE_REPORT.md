# PLI R5.6 — FINAL CLOSURE REPORT

> Scope: the autonomous local execution on branch `feat/r2p3d-r3-render-truth-ui-closure`
> (PR #2, never merged). Statuses use only PASS / FAIL / BLOCKED / PENDING /
> NOT_YET_OBSERVED / EXTERNAL_BLOCKED / NOT_RUN_LOCALLY.
>
> Permanently preserved invariants: `NO_VISION_MODEL_USED = TRUE`,
> `HUMAN_VISUAL_ACCEPTANCE = PENDING`, `REAL_DEVICE_HUMAN_REVIEW = PENDING`.

## 1. Code-verified head and its evidence

| Item | Value |
| --- | --- |
| Code head with full green CI + attached artifacts | `3aacdf6cfabd105f18b9197ce65d8981a15a48f4` |
| CI | https://github.com/huangdi97/pet-life-intelligence/actions/runs/38088783213 — Backend, Frontend, Blind Visual Contract, Playwright all **PASS** |
| OpenAPI sync | run 38088783712 — **PASS** |
| Android + Release Artifacts | run 38088783190 — APK, Web standalone, **runtime evidence all PASS** |
| APK artifact | `pli-mobile-apk` id 11683936155, `sha256 31269f9970523f67997a8ec64777f5d98c168e3f0a1ef7f457aee402f8c9a5fe`, debug-signed, self-contained |
| Runtime evidence | `r5-6-android-runtime-evidence` id 11683881923, manifest `source_head = 3aacdf6c…` |
| Local emulator evidence | `artifacts/r5-6-final/android/` (71 files, `source_head = checkout_head = 3aacdf6c…`) |
| Local debug APK | `sha256 42366e79c5212e78c8f6c2c573dbe6b3d15cfd68a1ce9643c95c07771b933823`, installed and driven on the local API-36 emulator |
| Documentation commit on top | docs-only (`docs/r5-6/**` + the capture-script hardening); it changes no app code and does not invalidate the artifacts above. CI for it is reported in the accompanying chat report |

## 2. Gate matrix

### Git / CI

| Gate | Status | Evidence |
| --- | --- | --- |
| Branch HEAD == PR #2 head | **PASS** | `git ls-remote` + `gh pr view 2` at every push |
| PR #2 not merged, `main` untouched, no tag/release | **PASS** | PR OPEN `mergedAt=null`; `main` = `2069d8a8…`; 16 tags |
| No force push / history rewrite | **PASS** | `6738f3c` remains an ancestor of HEAD |
| Backend / Frontend / Blind Visual Contract / Playwright at head | **PASS** | run 38088783213 |
| Android build + Web artifact + runtime evidence at head | **PASS** | run 38088783190 |
| APK downloadable, sha256 verified, installable, launchable | **PASS** | artifact verified locally with `aapt2`/`apksigner`; installed on the local emulator (`Success`), process alive, no `FATAL EXCEPTION` |
| Runtime screenshots tied to the head | **PASS** | CI artifact manifest + local manifest both `3aacdf6c…` |
| CI green for the documentation commit | **PENDING** | recorded in the chat report after the final push |

### Product / UX (deterministic)

| Gate | Status | Evidence |
| --- | --- | --- |
| Five tabs `今天/时间线/宠物/助手/我的` visible, reachable, active state correct | **PASS** | CI dumps with 5 `pli.nav.*` ids on `pet/timeline/me/assistant/secondary-sanity`; **local Today dump has all five**; blind contract asserts the label set |
| Android Back returns to the parent, not Today | **PASS** | blind owner-hierarchy contract (source + navigation policy) |
| Today: pet identity first, pet as visual subject | **PASS** | `today/visual.json` identity at `y=0…143`, stage 1 210 px, `projectedAreaRatio 0.557` |
| Today: 吃/喝/活动/睡眠/关注 as life anchors, not four KPI cards | **PASS** | `pli.today.anchor.{food,water,activity,sleep}` + `pli.today.attention`; anchor contract test; four anchors present in the local Today dump |
| Timeline is a life stream, not a log table | **PASS** | `TimelineScreen` life-stream components + blind contract + captured surface |
| Pet World is a life space | **PASS** | `pli.pet.hero-stage` + layered domain entry; hero-stage-only certification contract |
| Life View: warm life field, no black box/HUD, honest fallback | **PASS** | `lifeview/3d.json` (`warm-living-field`), warm-cream palette contract, honest demo labelling |
| Twin Review front/side/back on the first screen and really re-orienting | **PASS** | four ids present; runtime yaw `0 / π/2 / π`; three distinct screenshot hashes (CI **and** local) |
| `not_like` can never activate a candidate | **PASS** | `tests/contract/test_plm_visual.py::test_verify_not_like_cannot_activate` (activate → 422) |
| Assistant asks first | **PASS** | `useState<Tab>("ask")`; tools are secondary |
| Health: unknown ≠ normal | **PASS** | `HealthScreen` copy + observed live text "仅表示当前已记录事实未触发规则，不等同于健康正常" |
| Multi-pet isolation (photo/health/events/assistant/3D/cache) | **PASS** | request-version guards + `cross-pet-async.test.tsx` + separate primary/secondary captures and manifests in this run |
| No horizontal overflow / hidden controls on phone viewports | **PASS** | layout bounds within 1080 × 2340; controls verified reachable in UI XML |
| Low-poly never marketed as high fidelity | **PASS** | runtime `STYLIZED_REFERENCE`, `individualIdentityEvidence=false`, `示例数据`/示例形象 copy |
| Real individual 3D reconstruction | **BLOCKED** | `3D_ASSET_QUALITY = BLOCKED_BY_SOURCE_ASSET` — needs the owner's media or a licensed provider |

### Truthfulness / external

| Gate | Status |
| --- | --- |
| `NO_VISION_MODEL_USED` | **TRUE** (no vision model was used for any acceptance decision) |
| `HUMAN_VISUAL_ACCEPTANCE` | **PENDING** |
| `REAL_DEVICE_HUMAN_REVIEW` / `REAL_DEVICE_QA_PENDING_USER` | **PENDING** — no authorised phone |
| Mini WeChat native screenshots | **EXTERNAL_BLOCKED** |
| Real AI provider | **EXTERNAL_BLOCKED** (sandbox answers; `/visual/status` reports `REAL_3D_PROVIDER_EXTERNAL_BLOCKED`) |
| Real Pilot metrics / user validation | **NOT_YET_OBSERVED** |
| Local Playwright re-run, local `assembleRelease` | **NOT_RUN_LOCALLY** — CI PASS is the evidence |

## 3. What changed for the better in this round

1. The only failing CI job for the branch (hosted Android runtime evidence) now **passes**, and
   its failure mode is recoverable and diagnosable instead of silent
   (`dump-diagnostics.txt`, bounded adb calls, liveness probe).
2. A time-window CI flake in `test_abnormal_day_hint_uses_same_clock_duration_not_event_count`
   was root-caused to the endpoint's documented same-clock rule and fixed in the test.
3. The capture tooling now works on a Windows/GBK host at all (UTF-8 pinned decoding,
   `None`-safe stdout), which is what made the independent local run possible.
4. An independent **local** evidence set for the same commit exists, including a locally built,
   locally installed debug APK and a complete Today surface with all five tabs and four anchors.

## 4. What only the owner can do next

1. Look at the four contact sheets in `r5-6-android-runtime-evidence` (or the local
   `artifacts/r5-6-final/android/`) and judge the Living Pet Experience — that is the only
   thing that can move `HUMAN_VISUAL_ACCEPTANCE` off `PENDING`.
2. If a real phone is available: `adb install -r release/app-release.apk` and record the result
   (`ANDROID_INSTALL_AND_HUMAN_REVIEW.md` §4).
3. Provide owner photos (or approve a licensed 3D provider) to leave
   `BLOCKED_BY_SOURCE_ASSET`; otherwise the honest fallback stays as designed.
4. Run the WeChat DevTools capture for the Mini native gate when convenient — that gate is
   currently the only platform-level evidence hole.

## 5. Not proven by anything in this report

- That owners find the product valuable, or retain — **NOT_YET_OBSERVED**.
- That the individual 3D identity resembles any real pet — **NOT_YET_OBSERVED**
  (`sourceMediaCount = 0`).
- That the AI answers are clinically or behaviourally good — sandbox only.
- That a release-flavour APK is production-ready — signing is debug/internal.
