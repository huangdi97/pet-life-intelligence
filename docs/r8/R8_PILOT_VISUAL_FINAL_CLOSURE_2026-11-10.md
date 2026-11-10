# PLI — R8 / Pilot Truth / Android Final Closure (this round)

> Produced by the local autonomous agent on **2026-11-10 (Asia/Shanghai)**.
>
> Rule for this file: every value is a command output, an API read, or an artifact
> I actually downloaded and inspected in this round. No historical PASS, run ID,
> screenshot or SHA is reused as current evidence.
>
> Invariants held at the end of this round:
> `NO_VISION_MODEL_USED = TRUE`,
> `HUMAN_VISUAL_ACCEPTANCE = PENDING`,
> `APPROVED_VISUAL_BASELINE = UNCHANGED`,
> `MERGE = NOT PERFORMED`, `TAG = NOT CREATED`, `RELEASE = NOT CREATED`.
>
> This file does not rewrite any historical report. Earlier snapshots
> (`docs/r5-6/CURRENT_HEAD_TRUTH.md` history sections, `R8_RUNTIME_CLOSURE_2026-11-03.md`,
> old Stage G reports) keep their original SHAs and remain historical.

## 1. Repository truth

| Item | Value | How it was read |
| --- | --- | --- |
| Repository | `huangdi97/pet-life-intelligence` | `git remote -v` |
| Branch | `feat/r2p3d-r3-render-truth-ui-closure` | `git rev-parse --abbrev-ref HEAD` |
| Start remote HEAD (before any change) | `ba7363c341931a3ca91a06193698b96f2686f6ff` | `git ls-remote origin refs/heads/...` |
| Start local HEAD | `a46253255df20cd56726445287657a878e184dc6` (41 commits behind, worktree clean) | `git rev-parse HEAD`, `git rev-list --left-right --count` |
| Sync performed | `git merge --ff-only origin/...` → fast-forward to `ba7363c3`; no history rewritten, no `reset --hard`, no `clean -fdx` | `git merge` output |
| Final remote HEAD | `ccbd689ece2ce9e66c214dc8d7f94f2774a0029e` | `git ls-remote`, `git rev-parse HEAD` |
| local/remote parity at end | 0 ahead / 0 behind, worktree clean | `git rev-list --left-right --count` |
| PR #2 | `state=OPEN`, `isDraft=false`, `mergedAt=null`, `mergeable=MERGEABLE`, `headRefOid` tracks the live branch head | `gh pr view 2 --json …` |

## 2. Commits created this round

| SHA | Subject | Purpose |
| --- | --- | --- |
| `ccbd689ece2ce9e66c214dc8d7f94f2774a0029e` | `fix(pilot): keep synthetic inviters out of the invited KPI` | Close a real PILOT-INTEGRITY leak: `invited` counted every invite code with no isolation guard |

Files changed by that commit (4):

```text
services/api/app/services/pilot_dashboard.py   # invited bound to issuer, synthetic/demo excluded
tests/v10/test_stage_g_wave0.py               # new contract test for the exclusion
scripts/remote_pilot_check.py                 # invited became a 7th asserted-unchanged KPI
docs/pilot/PILOT_METRIC_DEFINITIONS.md        # M-01 Invited Users definition now states the rule
```

## 3. Exact-head gates

All three workflows were re-read at `ccbd689e` after the push. The Android
run that had been `IN_PROGRESS` at the start of this round (`ba7363c3`)
completed as `success` before any edit was made.

### 3.1 Start head `ba7363c3` (pre-change, re-read this round)

| Workflow | Run ID | Result |
| --- | --- | --- |
| CI | `42772779367` | success |
| OpenAPI Deterministic Sync | `42772779406` | success |
| Android + Release Artifacts | `42772779486` | success |

Correction to the task-book snapshot: the snapshot recorded Android as
`IN_PROGRESS`; it finished green, so no exact-head failure existed to fix.

The one observed Android failure was on the *previous* commit `95419afa`
(run `42772553798`, 1m51s) and was already resolved by `ba7363c3`
(`fix(ci): pin Android Gradle jobs to JDK 17`). Classification:
`CI_ENVIRONMENT_FAILURE` (hosted-runner JDK drift), not `PRODUCT_LOGIC_FAILURE`.

### 3.2 Final head `ccbd689e`

| Workflow | Run ID | Result |
| --- | --- | --- |
| CI | `42800704246` | **success** — Backend / Frontend / Blind Visual Contract / Browser E2E all `success` |
| OpenAPI Deterministic Sync | `42800704227` | **success** |
| Android + Release Artifacts | `42800704437` | **success** — Android APK / Web standalone / Android R5.6 runtime evidence all `success` |

### 3.3 Artifacts at `42800704437`

| Artifact | ID | Size |
| --- | --- | --- |
| `pli-mobile-apk` | `13756027663` | 50,459,558 B |
| `pli-web-standalone` | `13756595899` | 48,416,484 B |
| `r5-6-android-runtime-evidence` | `13757394896` | 13,197,021 B |

## 4. Local gates re-run by this agent

| Gate | Result | Note |
| --- | --- | --- |
| `ruff check services packages tests scripts` | PASS | `ruff 0.17.4`, one pre-existing `noqa` warning in `scan_codebase_scale.py` (same warning CI emits) |
| `py_compile` on every changed Python file | PASS | |
| `pnpm --dir packages/ui-tokens build` | PASS | via `pnpm 9` (CI pin); local `pnpm 11` aborts on the store layout |
| `pnpm --dir packages/pet-3d build` | PASS | |
| `pnpm --dir apps/mobile build:3d-page` | PASS | |
| `pnpm --dir apps/mobile typecheck` | PASS | |
| `test:owner-intent-store` / `test:quicklog-pet-scope` / `test:owner-review-recovery` / `test:owner-review-primary` / `test:owner-review-evidence` / `test:owner-case-history` / `test:outcome-idempotency` / `test:knowledge-delta` | 8/8 PASS | all mobile R8 contract suites |
| `pytest` (backend) | NOT RUN LOCALLY — `EXTERNAL_BLOCKED` | no Postgres/Redis/MinIO on this machine and no Docker; verified instead by CI run `42800704246` job `Backend` |

## 5. Android runtime evidence integrity

`scripts/r5-6/validate-android-runtime-evidence.py` was executed by this agent
against the **downloaded** artifact (not against the CI checkout), for both
heads:

| Head | Validator result |
| --- | --- |
| `ba7363c3` (artifact `13743393574`) | `ANDROID_RUNTIME_EVIDENCE_INTEGRITY = PASS` |
| `ccbd689e` (artifact `13757394896`) | `ANDROID_RUNTIME_EVIDENCE_INTEGRITY = PASS` (see §5.4) |

Facts independently re-derived from the artifact itself, not from the manifest:

| Check | Observed |
| --- | --- |
| `capture-manifest.source_head` | `ba7363c3…` (and `ccbd689e…` at final head) |
| `capture-manifest.checkout_head` | `refs/pull/2/merge` — resolved via `git ls-remote`, i.e. the PR merge ref, not a stale checkout |
| `vision_model_used` | `false` |
| primary / secondary pet id | distinct (`7c8c722f…` / `2d18b05d…`) |
| `late_record_delta_count` (before withdrawal) | `3` |
| `after_retraction_late_record_delta_count` | `2` (exactly −1) |
| native pre-withdrawal XML contains `当天之后补录了 3 条记录` | true / contains `…2 条记录`: false |
| native post-withdrawal XML contains `当天之后补录了 2 条记录` | true / contains `…3 条记录`: **false** (no stale grouped wording) |
| pre/post XML + screenshot SHA-256 | different (not re-uploaded duplicates) |
| `derived_from_journal` / `llm_generated` / `health_inference` | `true` / `false` / `false` |
| A→B→A | secondary Today manifest `petId = B`, `stageRole=today`; return manifest `petId = A`; primary Case `945d624a…` still visible |
| `no_vision_model` / `human_visual_acceptance` in every truth JSON | `true` / `PENDING` |

### 5.4 Final-head evidence

The final-head artifact (`13757394896`, 212 files) was downloaded and
re-validated with the same validator, from this machine, after the round:

```text
ANDROID_RUNTIME_EVIDENCE_INTEGRITY = PASS
capture-manifest.source_head       = ccbd689ece2ce9e66c214dc8d7f94f2774a0029e
capture-manifest.checkout_head     = 6bdec9bd209cafb95d27092472d561d7fa45876b
```

`6bdec9bd` was resolved with `git ls-remote` to `refs/pull/2/merge`, whose head
is `ccbd689e` — so the evidence build checked out the PR merge ref of this
exact head, not a stale or foreign commit. The delta counts and the native
wording repeated exactly: `3 → 2`, post-withdrawal XML contains
`当天之后补录了 2 条记录` and no longer contains `…3 条记录`, and A→B→A
returned the Today manifest to pet A with the primary Case still visible.

## 6. Pilot metric truth

| Contract item | Status |
| --- | --- |
| `metric_contract_version` | `R8_PILOT_V2` |
| `active_event_contract` | `CURRENT_EFFECTIVE_RECORD_FACT` |
| canonical daily fact registry | `DAILY_EVENT_TYPES` (7 types) + `RECORD_FACT_SOURCES` (5 sources), read from source |
| page view / `today.viewed` counted as activity | no — bound to the canonical registry, not a name prefix |
| correction chain | one fact identity (`COALESCE(supersedes_event_id, id)`) |
| activation window | `min(now, pet.created_at + 24h)`, result frozen after the deadline |
| `excludes` advertised | `{demo, internal, synthetic_domain}` |
| synthetic dry-run | `@pli.test` identities; now asserts **7** metrics unchanged (was 6) |

Defect found and fixed this round: `invited` was the only metric on the same
`/pilot/status` payload with **no** isolation guard, so the `@pli.test`
synthetic dry-run minted an invite code and moved a real Pilot KPI while the
drill reported that real metrics were flat. `invited` is now bound to the code
issuer (`created_by_user_id`), excluding demo/internal/synthetic-domain actors;
codes with an unattributable issuer stay counted because the issuance was a real
administrative act. Covered by `test_pilot_invites_ignore_synthetic_domain_issuers`.

## 7. R8 semantics audit (no feature expansion)

| Invariant | Verdict |
| --- | --- |
| `occurred_at != recorded_at` | preserved |
| correction != in-place edit (original row untouched, successor carries `supersedes_event_id`) | preserved |
| retraction != deletion (row remains, projection excludes it) | preserved |
| `as_known_then` does not inherit later withdrawal | preserved — `events.py` clears a `retracted_at` that is `>= cutoff` in the historical view |
| activation subquery semantics vs `current_events.scope_current_event_stmt` | equivalent (same 4 conditions, per-pet cutoff `LEAST(created+24h, now)`) |
| Knowledge Delta delta kinds | unchanged set of 8; no new kind added |
| delta wording == native XML | proven in §5 |
| historical surfaces read-only | preserved (`read_only` recorded in every delta truth) |

Known maintainability debt (reported, not refactored this round):

1. The canonical registries (`DAILY_EVENT_TYPES`, `RECORD_FACT_SOURCES`) are
   re-typed as string literals in raw SQL in `pilot_dashboard.py` (activation
   subquery) and `life_change_history.py` (evidence validity). They match the
   canonical registries today, but a future registry change would silently
   diverge — the exact drift class §9.3 of the task book warns about.
2. `services/api/app/api/routes/events.py` is 592 lines and
   `pilot_dashboard.py` 350 lines, both over the ≤300-line rule in `AGENTS.md`.
   Splitting a route that carries safety-critical write paths is a separate,
   separately-verified change.
3. `pnpm --dir apps/mobile build:3d-page` is not reproducible across local
   toolchains: running it locally rewrote the tracked generated outputs
   (`apps/mobile/assets/3d/pet-stage.html`, `apps/mobile/src/three/petStageHtml.ts`)
   with a 725-line diff vs the committed file, and no CI gate diffs that output.
   The generated files were restored to HEAD and are not part of this round's
   commit.

## 8. Round outcome

```text
PLI_R8_FEATURE_EXPANSION              = FROZEN (no feature added)
PLI_R8_ENGINEERING_TRUTH              = CLOSED
PLI_PILOT_METRIC_TRUTH                = CLOSED (one synthetic leak fixed and tested)
PLI_ANDROID_RUNTIME_EVIDENCE          = CLOSED (artifact downloaded + validator PASS)
PLI_RUNTIME_ARTIFACT_INTEGRITY        = PASS
PLI_OWNER_EXPERIENCE_IMPLEMENTATION   = READY_FOR_HUMAN_REVIEW
REAL_PET_IDENTITY_VALIDATION          = NOT_YET_OBSERVED
REAL_PILOT_PRODUCT_VALIDATION         = NOT_YET_OBSERVED
REAL_PARTICIPANTS                     = 0
NO_VISION_MODEL_USED                  = TRUE
HUMAN_VISUAL_ACCEPTANCE               = PENDING
APPROVED_VISUAL_BASELINE              = UNCHANGED
PR_2                                  = OPEN
MERGE                                 = NOT PERFORMED
TAG                                   = NOT CREATED
RELEASE                               = NOT CREATED
```

Real-world evidence remains absent by design of this round: no real
participants, no real device session, no owner review. Retention, Outcome
Closure, Vet Usefulness, Real Pet Identity Validation, Commercial Conversion
and Companion Demand all remain `NOT_YET_OBSERVED`; none of them is inferred
from demo data, synthetic dry-runs, hosted-emulator runs or automated E2E.
