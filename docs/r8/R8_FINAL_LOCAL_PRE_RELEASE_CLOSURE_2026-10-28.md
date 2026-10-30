# PLI R8 · Final local pre-release closure (2026-10-28 Goal)

Status values in this document are what was actually observed, not predictions.
`EXTERNAL_BLOCKED_ENVIRONMENT` marks an item no local agent can satisfy on this
machine; `NOT_YET_OBSERVED` marks evidence only a real pet/human can produce.

## Branch and commits

- Branch: `feat/r2p3d-r3-render-truth-ui-closure` (PR #2, still open)
- Starting HEAD: `b5c896033d94f463e6ddb8ff4b94bae0fc7c1f9b`
- Code HEAD that produced the hosted runtime evidence:
  `07a94936bc272ffe184212bcd6bc272a5161d354`
- Final HEAD: the documentation-only commit that contains this file (see
  `git log -1`); it changes no application code, so the runtime evidence above
  applies to identical sources.

Commits in this closure:

```
fix(ci): harden gradle dependency retries and diagnostics
fix(android-evidence): make bundled debug evidence independent of Metro
fix(rate-limit): a zero-length window rate limits nothing
feat(r8cb): derive deterministic replay knowledge delta
feat(r8cb): explain replay knowledge changes on owner surfaces
test(r8cb): prove knowledge delta is bitemporal and read only
test(android): prove r8cb replay on real native runtime
docs(r8): close owner intelligence replay and knowledge delta
chore: refresh openapi artifact
test(android): prove r8cb delta on a completed day
test(android): wait for a painted owner surface before failing
test(android): assert only what the journal can prove for r8cb
test(android): refetch the withdrawn day instead of reusing cached replay
test(android): withdraw the late record without rewriting the day
test(android): make the r8ca life-view wait deterministic
docs(r8): local pre-release closure report
```

## R8 owner-intelligence chain

| Slice | Status | Evidence |
| --- | --- | --- |
| R8BV Outcome closure | PASS | `case-outcome-truth.json` (real Android taps, `CONTINUE_OBSERVING`, no recovery claim) |
| R8BW Outcome source invalidation | PASS | `case-outcome-invalidation-truth.json` (same Outcome ID preserved, `FOLLOW_UP_EVIDENCE_INVALIDATED`, new observation required) |
| R8BX Review-head concurrency | PASS | backend integration (stale `expected_latest_review_id` → 409, no silent overwrite) |
| R8BY Effective owner workflow | PASS | backend integration + `case-detail-truth.json` parity (CASE invalidated outranks workflow) |
| R8BZ Next-action routing | PASS | `case-next-action-routing-truth.json` (`RECORD_OBSERVATION`, QuickLog opened with pet/case/metric, LifeEvent saved before Review) |
| R8CA Owner intelligence replay | PASS | `case-owner-workflow-replay-truth.json` + `owner-workflow-life-replay.png` (`INVALIDATED`/`CASE`, `source_valid=false`, native card visible but not actionable, historical surface read-only) |
| R8CB Knowledge delta | PASS | `knowledge-delta-truth.json`, `knowledge-delta-ui.xml`, `knowledge-delta.png` (journal-derived, read-only, no health inference) |

### R8CB runtime facts

Native Life View on the hosted emulator rendered, for the completed day
`2026-10-28`:

```
后来发生了什么
为什么现在看到的不一样
· 10月30日 这条记录是在当天之后补录的
· 10月30日 这条记录是在当天之后补录的
· 10月30日 这条记录是在当天之后补录的
这些变化只说明记录和主人核对后来发生了什么，不代表宠物健康状态改变。
```

The section node (`pli.lifeview.replay.knowledge-delta`) is a non-clickable
`ViewGroup`; no owner action can be started from a historical day. The same
day's `as_known_then` view excludes those records (asserted), and the withdrawal
kind `SOURCE_RETRACTED_LATER` is asserted at the journal boundary for the same
day with an explicit pre-withdrawal cutoff.

Three hosted runs failed before this one and each failure was a real semantics
lesson, not infrastructure:

1. empty delta for the running day (a day that has not closed has no delta by
   design — the first capture asked for one anyway);
2. `SOURCE_RETRACTED_LATER` demanded for a record that was itself recorded
   later (a late record can never be "known then");
3. "the delta must vanish" demanded for a demo day that legitimately holds other
   later-recorded Case sources.

## Verification results

### Backend

- `pytest -q --tb=short --ignore=tests/blind_ui` → **556 passed, 0 failed**
  (disposable PostgreSQL 16, CI-equivalent URLs).
- R8 focus set (`test_r8_life_change_cases`, `test_r8ak_case_history`,
  `test_r8aq_source_supersede`, `test_r8at_case_validity_filter`) → **46 passed**.
- `pytest tests/integration/test_r8cb_knowledge_delta.py` → **6 passed**
  (late backfill, later retraction, later correction, later review, later
  outcome, follow-up invalidation, plus privacy/no-LLM/no-health/pet-scope/cutoff
  validation and the empty-delta case).
- `ruff check services packages tests scripts` → **PASS**.
- Alembic → `upgrade head`, `current`, `check`, `downgrade -1`, `upgrade head`,
  `check`, and a full `base → head → base → head` cycle on a disposable DB →
  **PASS** (`No new upgrade operations detected`).
- `python scripts/gen_openapi.py` → only the new optional `historical_cutoff`
  query parameter; artifact committed.

### Frontend / cross-client

- `pnpm --dir packages/ui-tokens build`, `ui-kit typecheck`, `pet-3d build` → PASS.
- `pnpm --dir apps/mobile build:3d-page`, `typecheck` → PASS.
- Mobile contract suites (`test:owner-intent-store`, `test:quicklog-pet-scope`,
  `test:owner-review-recovery`, `test:owner-review-primary`,
  `test:owner-review-evidence`, `test:owner-case-history`,
  `test:outcome-idempotency`, `test:knowledge-delta`) → 8/8 PASS.
- `apps/web` tsc + vitest + build → PASS (`PLIT_LOCAL_BUILD=1`, the repo's own
  Windows-local switch; standalone output for deployment is unchanged).
- `apps/admin` typecheck + build → PASS (`PLIT_LOCAL_BUILD=1`).
- `apps/mini` typecheck + `build:weapp` / `build:alipay` / `build:tt` → PASS.
- `expo export --platform android` and `--platform ios` → PASS.

### Blind UI / Twin truth

- `pytest tests/blind_ui --confcutdir tests/blind_ui` → **297 passed**.
- `scripts/twin/twin_glb_qa.py` → `pass: true`.
- `scripts/twin/product_twin_qa.py` → `pass: true`,
  `humanVisualAcceptance: PENDING`.
- `NO_VISION_MODEL_USED = TRUE` (no model loads; all checks are deterministic
  text/geometry assertions).

### Browser E2E and Web runtime evidence

- Functional specs → **60 passed**.
- Visual chain (`STAGE-V-VISUAL`, `VISUAL-V2`, `VISUAL-V3`) with
  `PLI_EXPECT_VISUAL_BASELINE_DRIFT=1` → **5 passed**, recorded as
  `EXPECTED_BASELINE_DRIFT` (60/60 V2 and 24/24 V3 captures differ on this
  Windows renderer). Baselines were **not** updated (`artifacts/*approved`
  unchanged in git); approval stays a human decision.
- `capture-web-final-bundle.mjs` (which runs `capture-web-final.mjs` and
  `capture-web-turntables-final.mjs` with the resolved demo identities) → PASS.
- `contact_sheets_ci.py --platform web` → 5 sheets produced.

### Android

- Android release APK job → SUCCESS (`pli-mobile-apk` artifact).
- Self-contained demo-evidence debug APK → built; `assets/index.android.bundle`
  assertion passed in the workflow step.
- No-Metro runtime → PASS: Metro is not started, only `tcp:8800` is reversed,
  the capture fails if Metro is reachable, the rewritten logcat check finds
  **0** occurrences of `Unable to load script` /
  `Could not connect to development server` / `JS bundle missing`
  (108k logcat lines inspected), and the runtime manifest is
  `manifestOrigin: RUNTIME` with a real skinned/rigged GLB scene.
- Emulator runtime evidence (hosted KVM runner, API 35, x86_64) → PASS;
  `r5-6-android-runtime-evidence` contains the R8 truth files above plus
  `owner-workflow-life-replay.png`, `knowledge-delta.png` and four
  `PLI_R5_6_ANDROID_*` contact sheets.
- Local (this Windows machine) — `EXTERNAL_BLOCKED_ENVIRONMENT`:
  `emulator -accel-check` returns `accel: 6` ("Android Emulator hypervisor
  driver is not installed"; WHPX inactive, installing it needs administrator
  rights), and a local Gradle APK build is blocked by AGP failing to start
  generated `prefab_command.bat` under a non-ASCII project path, then by
  `expo-av:configureCMakeDebug` "No compatible library found" in an ASCII
  mirror. Hosted CI is therefore the authoritative Android runtime evidence.

### Harness determinism (this closure)

- `gradle-retry.sh`: attempts 2+ really pass `--refresh-dependencies`; bounded
  budget (4) with 12/24/48s backoff; per-attempt logs plus a structured summary
  (task, attempts, classification, HEAD, resolution error) that is uploaded with
  failure diagnostics — verified again in the green run (`classification:
  success`, `attempts_used: 1`).
- Android workflow: `gradle/actions/setup-gradle` caching on both Gradle jobs,
  Gradle attempt logs added to the diagnostics artifact, Metro step removed.
- Capture waits now distinguish unpainted / stale / below-the-fold surfaces and
  refresh once instead of failing on a transient empty hierarchy.

## Governance state

```
NO_VISION_MODEL_USED           = TRUE
REAL_PET_IDENTITY_VALIDATION   = NOT_YET_OBSERVED
HUMAN_VISUAL_ACCEPTANCE        = PENDING
APPROVED_VISUAL_BASELINE       = OLD
PR #2                          = OPEN / NOT MERGED
TAG                            = NOT CREATED
RELEASE                        = NOT CREATED
```

Remaining work that is not the local agent's to complete:

- Human visual acceptance of the fresh Android/Web evidence.
- Promotion of an approved visual baseline (explicit human approval required).
- Real individual pet identity media/reconstruction/confirmation.
- Merge, tag and release decisions.
