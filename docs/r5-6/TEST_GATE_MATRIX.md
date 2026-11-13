# PLI R5.6 — TEST GATE MATRIX

> Two independent executions are recorded: the **hosted CI** gates for head
> `3aacdf6cfabd105f18b9197ce65d8981a15a48f4` and the **local** re-run of the same
> commands on this workstation (Windows 11, Python 3.13.14, Node 22.15.0, pnpm 12.4.1,
> local demo Postgres/Redis/MinIO).
> Nothing here is inferred: each row is an exit code plus the summary line of the run.

## 1. Hosted CI — head `3aacdf6`

| Gate | Job | Run | Result |
| --- | --- | --- | --- |
| Backend: ruff + pytest (unit/integration/contract/safety, excludes `tests/blind_ui`) | `Backend (lint + unit + integration + safety)` | https://github.com/huangdi97/pet-life-intelligence/actions/runs/38088783213 | **PASS** |
| Frontend: ui-tokens/ui-kit builds, web typecheck + Vitest + `next build`, admin typecheck/build, mini typecheck + weapp/alipay/tt builds, mobile typecheck + `expo export` android/ios | `Frontend (web + admin + mini + mobile checks)` | same run | **PASS** |
| Blind Visual Contract (schema, known-bad calibration, anti-patterns, pixel oracle, owner purity, twin structural QA) — no vision models | `Blind Visual Contract (no vision models)` | same run | **PASS** |
| Browser E2E (Playwright functional specs) | `Browser E2E (Playwright)` | same run | **PASS** |
| OpenAPI deterministic sync | `OpenAPI Deterministic Sync` | https://github.com/huangdi97/pet-life-intelligence/actions/runs/38088783712 | **PASS** |
| Android APK (debug-signed installable) | `Android APK (…)` | https://github.com/huangdi97/pet-life-intelligence/actions/runs/38088783190 | **PASS** |
| Web standalone artifact | `Web standalone artifact` | same run | **PASS** |
| Android R5.6 runtime evidence (hosted emulator, no vision model) | `Android R5.6 runtime evidence (NO_VISION_MODEL_USED)` | same run | **PASS** (was FAIL at `6738f3c`) |

## 2. Local workstation — same commands, same head

| Gate | Command (exactly as run) | Result | Summary line |
| --- | --- | --- | --- |
| Backend pytest | `.venv\Scripts\python.exe -m pytest -q --tb=short --ignore=tests/blind_ui` | **PASS** (exit 0) | `473 passed, 1 warning in 342.65s` |
| Backend ruff | `.venv\Scripts\python.exe -m ruff check services packages tests` | **PASS** (exit 0) | `All checks passed!` |
| Blind UI contract (CI form) | `.venv\Scripts\python.exe -m pytest tests/blind_ui --confcutdir tests/blind_ui -q` | **PASS** (exit 0) | `186 passed in 104.59s` |
| Owner content purity (source scan) | `python -c "…scan_hardcoded_pet_names(Path('.'))…"` | **PASS** (exit 0) | `hardcoded pet names: []` |
| Twin structural QA | `.venv\Scripts\python.exe scripts/twin/product_twin_qa.py` | **PASS** (exit 0) | (structural report) |
| ui-kit typecheck | `pnpm --dir packages/ui-kit typecheck` | **PASS** (exit 0) | — |
| Web typecheck (cold) | `pnpm --dir apps/web exec tsc --noEmit --incremental false` | **PASS** (exit 0) | — |
| Web unit/component tests | `pnpm --dir apps/web test` | **PASS** (exit 0) | `Test Files 9 passed (9) — Tests 54 passed (54)` |
| Web build | `pnpm --dir apps/web build` | **PASS** (exit 0) | — |
| Admin typecheck | `pnpm --dir apps/admin typecheck` | **PASS** (exit 0) | — |
| Mini typecheck | `pnpm --dir apps/mini typecheck` | **PASS** (exit 0) | — |
| Mobile typecheck | `pnpm --dir apps/mobile typecheck` | **PASS** (exit 0) | — |
| New regression file | `.venv\Scripts\python.exe -m pytest tests/blind_ui/test_android_capture_dump_recovery.py -q` | **PASS** | `7 passed` (grew from 5 as the encoding and `None`-stdout cases were added) |
| Focused fix check (run inside the failing 05:3x window) | `.venv\Scripts\python.exe -m pytest tests/v10/test_final_extras.py -q` | **PASS** | `6 passed` |
| Browser E2E (Playwright), the CI command, local run | `pnpm exec playwright test --config=tests/e2e-browser/playwright.config.ts --grep-invert "STAGE-V-VISUAL\|VISUAL-V2\|VISUAL-V3"` against the local API (:8800) and the built Web app (:3100) | **PASS** (exit 0) | `55 passed (3.6m)` — includes seven-paths E2E-06/07 (behavior ABC, IDOR 403/404), stage-h-ux (welfare/social/monitoring "no fake online"/assistant ask-primary/companion honest empty state), stage-h2-3d (life-view honest state, no fake LIVE, real-photo fallback, Twin Review angle matches the runtime camera, Quick Log truthfulness + media evidence binding), stage-v-3d-runtime (GLB parse, WebGL smoke, reduced-motion guard) |
| Android debug evidence APK (local) | `gradlew -PreactNativeArchitectures=x86_64 assembleDebug` in the space-free copy + `adb install -r` | **PASS** | 175 693 686 B, `sha256 42366e79…`, install `Success`, capture `exit 0` (71 files) |
| Android `assembleRelease` (local) | `gradlew -PreactNativeArchitectures=x86_64 assembleRelease` in the space-free copy | **PASS** (BUILD SUCCESSFUL in 20m 51s, exit 0) | the release variant needs two release-only React Native AARs (`react-android-0.74.5-release.aar` 151 MB, `hermes-android-0.74.5-release.aar` 65 MB) that are not in the local Gradle cache; Gradle's own download of them died mid-transfer on this host with no error. Fixed locally by seeding a file-based Maven repository (`C:\plibuild\rn-local-repo`) and pointing the throw-away copy's `build.gradle` at it (repo files untouched). Result: fresh `app-release.apk`, 95 940 407 B, `sha256 ac4880ee419773d58c392d15dfd4e55118a21c434eed8414b92e1a162f237796`, `com.pli.mobile` vc4 vn0.2.0, debug-key signed (`fac61745…`), self-contained JS, 1576 entries — the same structure as the CI artifact |
| Local release-variant install + launch | `adb install -r app-release.apk` + launch on the API-36 emulator | **PASS** | install `Success`, process alive, no `FATAL EXCEPTION`/ANR; `uiautomator` dump = 37 203 B with **5 `pli.nav.*` ids + 4 `pli.today.anchor.*` ids + `pli.today.living-stage`**, no demo-failure/error strings, real owner content rendered ("今天，和它在一起", "今天记录了 4 件生活片段", "示例数据", pet switch 豆豆/咪咪); screenshot `artifacts/r5-6-final/android-release/release_today.png` (567 740 B, sha256 `B348B85D…`) |
| Admin production build (local) | `pnpm --dir apps/admin build` | **PASS** | first attempt failed with `EPERM: scandir … apps/admin/.next/standalone/node_modules/.pnpm/node_modules/webpack`; the stale `.next` tree was removed (`rmdir /s /q`) and the rebuild exited 0 — a local filesystem artifact, not a product issue |
| Mini production builds (local) | `pnpm --dir apps/mini build:weapp` / `build:alipay` / `build:tt` | **PASS** (all exit 0) | sass deprecation warnings only |
| Mobile bundle export (local) | `pnpm --dir apps/mobile exec expo export --platform android` | **PASS** (exit 0) | "App exported to: dist" |
| Local Android capture at the **final head** | the full capture chain via the local emulator + local demo API | **PASS** (exit 0) | `capture-manifest.json` `source_head = cfc8edca…`, three distinct Twin Review frames, 71 evidence files |

Environment used for the local runs (the local demo stack, not production):

```text
DATABASE_URL      postgresql+asyncpg://pli:***@localhost:15532/pli        (SSH reverse tunnel -> WSL Docker)
TEST_DATABASE_URL postgresql+asyncpg://pli:***@localhost:15532/pli_test
REDIS_URL         redis://localhost:16381/0
S3_ENDPOINT       http://localhost:19000
STORAGE_BACKEND   minio
```

## 3. Not executed locally (honest gaps)

| Gate | Why | Status |
| --- | --- | --- |
| Playwright browser E2E | Runs the CI command locally against the local API (:8800) and the built Web app (:3100). | **PASS** — `55 passed (3.6m)` |
| Visual-regression baseline comparison | Deliberately not run with any baseline-updating flag. Candidate-only policy for this cycle. | `BASELINE_REVIEW_REQUIRED` if a human wants to compare |
| Android `assembleRelease` locally | **PASS** after unblocking the dependency path — the release variant needs two release-only RN AARs that Gradle could not download on this host; they were seeded from Maven Central into a local file repository and the build then completed (`BUILD SUCCESSFUL`, fresh `app-release.apk` `ac4880ee…`), installed and launched with no crash. See `TEST_GATE_MATRIX.md` §2 |
| Local release-variant render | **PASS** — 5 tabs + 4 life anchors + the living stage in the release build's UI dump (real owner content, no error states) |
| WeChat DevTools native Mini screenshots | Needs the owner's desktop DevTools session. | `EXTERNAL_BLOCKED` |
| Physical-device run | No authorised phone. | `REAL_DEVICE_QA_PENDING_USER` |

## 4. Anti-regression checks on this round's diff

| Check | Command | Result |
| --- | --- | --- |
| No test deleted or skipped in the diff | `git diff 6738f3c..3aacdf6 --stat` + review | only `scripts/r5-6/capture-android-final.py`, `tests/blind_ui/test_android_capture_dump_recovery.py` (new), `tests/v10/test_final_extras.py` |
| No baseline update flag introduced | search for `--update-snapshots`, `-u`, `PLI_UPDATE_VISUAL_BASELINE` in the diff | none added |
| No lint/type/safety gate relaxed | review of `.github/workflows/*` in the diff | unchanged |
| Deterministic safety suites still pass with their coverage | backend pytest (473 passed) includes red-flag, medication, permission, isolation and synthetic-exclusion suites | PASS |
| `tests/blind_ui` count did not shrink | 181 → 186 (5 added) | PASS |
