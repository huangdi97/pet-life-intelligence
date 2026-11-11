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
| `ccbd689ece2ce9e66c214dc8d7f94f2774a0029e` | `fix(pilot): keep synthetic inviters out of the invited KPI` | Pass 1 — close a real PILOT-INTEGRITY leak: `invited` counted every invite code with no isolation guard |
| `3ac8324f` | `docs(r8): current-head truth and 2026-11-10 closure report` | Pass 1 — this file + `CURRENT_HEAD_TRUTH` |
| `01e9b423` | `docs(r8): record the 3ac8324f gates, artifact ids and the disclosed capture flake` | Pass 1 — disclose the flake instead of reporting a bare green |
| `f6c8459620d7e9549ec28d5eb55643eae5ceb780` | `test(android): stop photographing an engineering identifier as the owner's pet` | Pass 2 — §9: owner-copy defect in the capture fixture + one gate hardened |

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

### 3.2 Code head `ccbd689e`

| Workflow | Run ID | Result |
| --- | --- | --- |
| CI | `42800704246` | **success** — Backend / Frontend / Blind Visual Contract / Browser E2E all `success` |
| OpenAPI Deterministic Sync | `42800704227` | **success** |
| Android + Release Artifacts | `42800704437` | **success** — Android APK / Web standalone / Android R5.6 runtime evidence all `success` |

### 3.2b Docs head `3ac8324f` (this report's commit)

`3ac8324f` = `docs(r8): current-head truth and 2026-11-10 closure report`.
It touches `docs/` only; the code tree is byte-identical to `ccbd689e`.

| Workflow | Run ID | Result |
| --- | --- | --- |
| CI | `42808320469` | **success** — Backend / Frontend / Blind Visual Contract / Browser E2E all `success` |
| OpenAPI Deterministic Sync | `42808320462` | **success** |
| Android + Release Artifacts | `42808320443` | **success after one rerun of the runtime-evidence job** — see §3.2c |

### 3.2c Disclosed flake on `3ac8324f` (not hidden, not waived)

The first attempt of job `Android R5.6 runtime evidence` on `3ac8324f` failed:

```text
CaptureError: R8 native target not actionable: pli.r8.quicklog-followup;
saw_disabled=False; observed_ids=[]
  at scripts/r5-6/capture-android-final.py:1219 (find_control)
  from capture_r8_owner_review -> quicklog_context_xml
```

Classification: `HOSTED_EMULATOR_FLAKE`. Evidence for that classification, not
an assumption: the same capture script and the same application code passed
this exact step on `ba7363c3` (run `42772779486`) and on `ccbd689e`
(run `42800704437`); `3ac8324f` changes only markdown; `observed_ids=[]` means
the dumped hierarchy contained no `pli.*` resource-ids at all, i.e. the native
surface had not painted, and `find_control` already waits for a painted
surface before failing. Re-running the failed job only (`gh run rerun --failed`,
no gate change, no assertion relaxed, no test skipped) produced `success`.

Residual risk, honestly stated: the capture script's paint wait is bounded
(21 attempts). On a slower hosted runner this step can still flake. It is
**not** proof of a product defect, and it is **not** resolved by this round —
it is recorded so a reviewer is not told "Android was simply green".

### 3.3 Artifacts at `42800704437`
### 3.3 Artifacts

At `42800704437` (`ccbd689e`):

| Artifact | ID | Size |
| --- | --- | --- |
| `pli-mobile-apk` | `13756027663` | 50,459,558 B |
| `pli-web-standalone` | `13756595899` | 48,416,484 B |
| `r5-6-android-runtime-evidence` | `13757394896` | 13,197,021 B (212 files) |

At `42808320443` (`3ac8324f`, the head carrying this report):

| Artifact | ID | Size |
| --- | --- | --- |
| `pli-mobile-apk` | `13761537081` | 50,459,557 B |
| `pli-web-standalone` | `13762120671` | 48,416,007 B |
| `r5-6-android-runtime-evidence` | `13764396930` | 12,568,921 B (212 files) |
| `r5-6-android-runtime-diagnostics` | `13762403167` | 10,010,677 B — uploaded by the *failed first attempt* (§3.2c), kept as flake evidence |

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
against the **downloaded** artifact (not against the CI checkout), at every
head captured this round:

| Head | Artifact | Validator result |
| --- | --- | --- |
| `ba7363c3` | `13743393574` | `ANDROID_RUNTIME_EVIDENCE_INTEGRITY = PASS` |
| `ccbd689e` | `13757394896` | `ANDROID_RUNTIME_EVIDENCE_INTEGRITY = PASS` |
| `3ac8324f` | `13764396930` | `ANDROID_RUNTIME_EVIDENCE_INTEGRITY = PASS` |

Facts independently re-derived from the artifact itself, not from the manifest:

| Check | Observed |
| --- | --- |
| `capture-manifest.source_head` | equals the head being verified (`ba7363c3…`, `ccbd689e…`, `3ac8324f…` respectively) |
| `capture-manifest.checkout_head` | `refs/pull/2/merge` each time (`b6060c06…`, `6bdec9bd…`, `a5b9e552…`) — resolved with `git ls-remote`, i.e. the PR merge ref of that head, not a stale checkout |
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

### 5.4 Final-head evidence (`3ac8324f`)

The artifact of the head that carries this report (`13764396930`, 212 files) was
downloaded and re-validated with the same validator, from this machine:

```text
ANDROID_RUNTIME_EVIDENCE_INTEGRITY = PASS
capture-manifest.source_head       = 3ac8324fb3701078eb3a16083a81e24733e6c029
capture-manifest.checkout_head     = a5b9e552245d6f16470d985673184df00f056c33
vision_model_used                  = false
late_record_delta_count            = 3
after_retraction count             = 2   (post-withdrawal XML: 2-record wording present, 3-record wording absent)
A→B→A                              = Today manifest back on pet A, primary Case still visible
```

`a5b9e552` was resolved with `git ls-remote` to `refs/pull/2/merge`, whose head
is `3ac8324f` — the evidence build checked out the merge ref of this exact head,
not a stale or foreign commit. The same three checks produced the same result at
`ccbd689e` (`6bdec9bd` merge ref) and at `ba7363c3` (`b6060c06` merge ref), so
the evidence is not a one-off success.

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

## 9. Pass 2 — owner-copy defect, evidence inventory, human review package

Pass 2 did what §24 asks for without pretending that a machine can judge looks:
it inventoried the fresh artifact, scanned every native XML deterministically, and
fixed the one real owner-facing defect that scan exposed.

### 9.1 Defect found and fixed (`f6c84596`)

The R8AS correction fixture was created as a pet literally named
`R8AS Correction <epoch>` (`scripts/r5-6/capture-android-final.py`). Fixture
pets are photographed on owner surfaces, so that string was rendered and
announced as owner content:

```text
today/ui.xml (multipet identity)  primary_identity_label = "豆豆 · 咪咪 · R8AS Correction 1794319053"
r8-owner-correction/correction-today.xml  ImageView content-desc = "R8AS Correction 1794319059 …"
```

`content-desc` is not decorative: it is what TalkBack reads out. A fixture name
is owner-visible content (§12.2 `OWNER_INTERNAL_TERMS = 0`), so it now reads
`小虎` via the module-level constant `FIXTURE_PET_NAME_CORRECTION`, which carries
the invariant in a comment. Determinism is untouched: the harness discovers the
fixture by the returned `pet_id` and never by name.

The blind-UI gate that had pinned the old string was retargeted from the display
name to the actual intent (a `POST /api/v1/pets` inside `capture_r8_correction`
plus `pet_id = str(pet["id"])`) and additionally asserts the old f-string cannot
come back. That is a strengthened gate, not a relaxed one.

Measured effect on the same scanner, old artifact vs new artifact:

| Artifact | Native XML scanned | `R8AS` hits | total internal-term hits |
| --- | --- | --- | --- |
| `01e9b423` (`13771770716`) | 96 | 7 | 14 |
| `f6c84596` (`13782360124`) | 129 | **0** | 9 |

### 9.2 Remaining disclosed limitation (not silently changed)

The 9 remaining hits are all the same string: `PLI_MANIFEST:{…}`, which is the
3D stage WebView's `document.title` and therefore the `text` UIAutomator exposes
for that WebView. It is a deliberate no-vision-model evidence channel, and the
harness also has a `files/pli_manifest.json` path. Changing it means changing
the evidence pipeline and re-proving it on an emulator, so it is recorded here
as an accessibility limitation with a known remediation (move the beacon out of
`document.title` and give the stage an owner-language `content-desc`), not
patched blind in a documentation round.

### 9.3 Deterministic Layout proof for Today (§12.1)

Native document order in `today/ui.xml` at `f6c84596`:

```text
pli.today.identity → pli.today.living-stage → pli.today.pet-twin
→ pli.today.anchor.{food,water,activity,sleep} → pli.today.now-story
→ pli.today.change → pli.today.attention → pli.today.primary-action
→ pli.today.support
```

`ORDER_MATCHES_PET_NOW_CHANGE_ATTENTION_ACTION = TRUE`, with exactly one
`pli.today.attention` node (one attention, not a wall of alerts). This proves
structure and ordering only — it says nothing about whether it looks good.

### 9.4 §24 evidence coverage inventory

20 of the 26 §24 items have fresh evidence at `f6c84596`
(`OK` = screenshot + native XML, `XML_ONLY` = native tree proves it, no separate
screenshot). Never captured by the current capture contract:

```text
Behavior, Training, Welfare, Social, Empty, Offline
```

Notes that keep this number honest: `Attention` is proven as a panel inside
Today (`pli.today.attention`); `R8 Outcome` is proven by
`case-detail-outcome-*.xml`; the Knowledge Delta before-withdrawal screenshot is
required *and present* (`knowledge-delta.png`, enforced by the validator).
The six gaps are a coverage gap, not a claim that those screens are broken:
`SURFACES` in the capture script has only the 9 base screens plus the R8 sets,
and adding surfaces is a capture-contract expansion needing its own emulator
iteration.

### 9.5 Gates and artifact at `f6c84596`

| Item | Value |
| --- | --- |
| CI | run `42847698829` — **success** (Backend / Frontend / Blind Visual Contract / Browser E2E) |
| OpenAPI Artifact Sync | run `42847699124` — **success** |
| Android + Release Artifacts | run `42847698843` — **success**, no rerun needed |
| runtime evidence artifact | `13782360124` (13,723,476 B, 247 files) |
| APK / web | `13778918822` / `13779660817` |
| validator (run by this agent on the download) | `ANDROID_RUNTIME_EVIDENCE_INTEGRITY = PASS`, `source_head = f6c8459620d7e9549ec28d5eb55643eae5ceb780`, `checkout_head = cd88fad672b29565ef3020f149e4f033a2f45456` = `refs/pull/2/merge` |
| local gates | `ruff` PASS; `pytest tests/blind_ui` 275/275 PASS (excluding one file whose autouse fixture needs the backend DB, unavailable here); the two source-reading tests that broke on a GBK-locale host now pass |

Human review package: a self-contained page built from this artifact's four CI
contact sheets plus the deterministic findings above
(`pli-human-visual-review.html` in the session scratch/visualization directory).
It states the facts and asks the questions; it answers none of them.

`HUMAN_VISUAL_ACCEPTANCE` remains `PENDING`.

## 10. Pass 3 — the owner-copy rule became a gate (`709859d1`)

Pass 2 found the leak with a one-off scanner in the session scratch directory.
That is exactly the kind of knowledge this repository is supposed to encode in
CI instead of in a human's memory, so it moved into
`scripts/r5-6/validate-android-runtime-evidence.py` (259 lines, fail closed):

| New gate | Rule |
| --- | --- |
| `validate_owner_copy` | Every `text` / `content-desc` in every captured native XML is owner-facing copy. An engineering identifier there (`petId`, `stageRole`, `manifestOrigin`, `legacyRepresentation`, `R5.6`/`R7`/`R8*`, delta kinds, provenance enums, `NOT_YET_OBSERVED`/`EXTERNAL_BLOCKED`…, `null`/`undefined`/`NaN`, `PLI_MANIFEST`) invalidates the whole evidence run. Word boundaries keep `annulled`/`R80` clean. |
| beacon exemption | `PLI_MANIFEST:{…}` is allowed **only** on `class="android.webkit.WebView"` **and only** as a prefix — the documented no-vision-model manifest channel (§9.2). Tested to be narrow: the same string on a `TextView` fails. |
| `validate_today_canvas` | Today must appear in the §12.1 order `identity → living-stage → now-story → change → attention → primary-action`, contain the pet stage, and carry exactly one Attention panel. |

13 tests pin the behaviour in `tests/blind_ui/test_android_evidence_owner_copy.py`
(clean pass, visible-text reject, `content-desc` reject, beacon allowed, beacon
narrow, no false positives, wrong order, two Attentions, missing pet stage,
empty artifact fails closed). They run in the `Blind Visual Contract` job and
locally: `288 passed` for the whole suite here.

### 10.1 Discriminating power, proven on the real artifacts

The same extended validator, run by this agent against the five artifacts
downloaded this round:

```text
ccbd689e  FAIL  owner-visible engineering identifier 'R8AS' in multipet-return/today-primary-return.xml
3ac8324f  FAIL  owner-visible engineering identifier 'R8AS' in …
01e9b423  FAIL  owner-visible engineering identifier 'R8AS' in …
f6c84596  PASS
0a04a38e  PASS
```

The three heads *before* the fixture fix fail with the exact offender; the two
*after* it pass, which is also the proof that the beacon exemption is neither
dead code nor over-broad. The gate would have caught this leak on its own.

### 10.2 Gates and artifact at `709859d1`

| Item | Value |
| --- | --- |
| CI | run `42945801026` — **success** (Backend / Frontend / Blind Visual Contract / Browser E2E) |
| OpenAPI Artifact Sync | run `42945801446` — **success** |
| Android + Release Artifacts | run `42945801200` — **success**, no rerun |
| runtime evidence artifact | `13823708303` (12,787,271 B, 244 files) |
| APK / web | `13823152629` / `13822557094` |
| CI log proof the gate really ran | `ANDROID_RUNTIME_EVIDENCE_INTEGRITY = PASS` printed by the job at `02:51:23Z` |
| local re-validation (this agent, on the download) | `PASS`, `source_head = 709859d1bf75a36e93d89186ad8d18503e48ea92`, `checkout_head = daa32e78…` = `refs/pull/2/merge`, 129 native XML scanned |

`HUMAN_VISUAL_ACCEPTANCE` remains `PENDING`; this pass changed what the
automation can refuse, not what it can judge.
