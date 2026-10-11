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
| New regression file | `.venv\Scripts\python.exe -m pytest tests/blind_ui/test_android_capture_dump_recovery.py -q` | **PASS** | `5 passed` |
| Focused fix check (run inside the failing 05:3x window) | `.venv\Scripts\python.exe -m pytest tests/v10/test_final_extras.py -q` | **PASS** | `6 passed` |

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
| Playwright browser E2E | Hosted CI runs it green for this SHA; locally it needs the Playwright browsers + the web/API stack started on the exact ports the specs expect. Time was reserved for the Android evidence chain instead. | `NOT_RUN_LOCALLY` — CI PASS is the evidence |
| Visual-regression baseline comparison | Deliberately not run with any baseline-updating flag. Candidate-only policy for this cycle. | `BASELINE_REVIEW_REQUIRED` if a human wants to compare |
| Android `assembleRelease` locally | The local debug build hit environment issues (see `ANDROID_RUNTIME_EVIDENCE.md` §4); the hosted job builds and signs the APK for this SHA. | `NOT_RUN_LOCALLY` — CI PASS is the evidence |
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
