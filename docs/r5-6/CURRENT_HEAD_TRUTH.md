# PLI — CURRENT_HEAD_TRUTH

> Rule for this file: every value is a command output or an artifact I actually
> fetched in the round it describes. No historical PASS, screenshot or SHA is
> reused as current evidence. Older rounds are preserved verbatim at the bottom,
> explicitly labelled historical.

## Current — 2026-11-10 round (R8 / Pilot truth / Android closure)

> Verified by the local autonomous agent on **2026-11-10 (Asia/Shanghai)**.
> Full detail: `docs/r8/R8_PILOT_VISUAL_FINAL_CLOSURE_2026-11-10.md`.

| Item | Value | Verified by |
| --- | --- | --- |
| Repository / branch | `huangdi97/pet-life-intelligence` @ `feat/r2p3d-r3-render-truth-ui-closure` | `git remote -v`, `git rev-parse --abbrev-ref HEAD` |
| Start remote HEAD | `ba7363c341931a3ca91a06193698b96f2686f6ff` | `git ls-remote origin refs/heads/...` |
| Start local HEAD | `a46253255df20cd56726445287657a878e184dc6` — 41 commits behind, worktree clean | `git rev-parse HEAD`, `git rev-list --left-right --count` |
| How the gap was closed | `git merge --ff-only`; no `reset --hard`, no `clean -fdx`, no history rewrite | `git merge` output |
| Last code head verified | `f6c84596` — `test(android): stop photographing an engineering identifier as the owner's pet` (pass 2); before it `ccbd689e` — `fix(pilot): keep synthetic inviters out of the invited KPI` | `git log --oneline -4` |
| Last docs heads verified | `3ac8324f`, `01e9b423` — both `docs/` only, code tree identical to `ccbd689e` | `git show --stat` |
| Current branch head | this docs-only commit. Merge requires the *then-current* head to be green; the live run IDs sit in PR #2's description because a docs commit cannot record its own run IDs without another commit. | `gh pr view 2` |
| CI (exact head) | `ccbd689e` → `42800704246`; `3ac8324f` → `42808320469`; `01e9b423` → `42825685526`; `f6c84596` → `42847698829` — all **success** (Backend / Frontend / Blind Visual Contract / Browser E2E) | `gh run view` |
| OpenAPI Deterministic Sync | `ccbd689e` → `42800704227`; `3ac8324f` → `42808320462`; `01e9b423` → `42825685436`; `f6c84596` → `42847699124` — all **success** | `gh run view` |
| Android + Release Artifacts | `ccbd689e` → `42800704437` **success**. `3ac8324f` → `42808320443` **success after one `--failed` rerun** (first attempt: `CaptureError: … pli.r8.quicklog-followup; observed_ids=[]` on a docs-only commit ⇒ `HOSTED_EMULATOR_FLAKE`, disclosed in closure §3.2c, not waived). `01e9b423` → `42825685536` **success**. `f6c84596` → `42847698843` **success**, no rerun | `gh run view`, `gh run view --log-failed` |
| Artifacts | `ccbd689e`: apk `13756027663`, web `13756595899`, evidence `13757394896`. `3ac8324f`: apk `13761537081`, web `13762120671`, evidence `13764396930` + `r5-6-android-runtime-diagnostics` `13762403167` (failed-attempt bundle kept as flake evidence). `01e9b423`: apk `13769841784`, web `13769006900`, evidence `13771770716`. `f6c84596`: apk `13778918822`, web `13779660817`, evidence `13782360124` (247 files) | `gh api …/artifacts` |
| Runtime evidence integrity | **PASS** at all five heads verified this round (`ba7363c3`, `ccbd689e`, `3ac8324f`, `01e9b423`, `f6c84596`) — validator run by this agent against the *downloaded* artifacts; each `source_head` equals its head and each `checkout_head` resolves to `refs/pull/2/merge` (`b6060c06`, `6bdec9bd`, `a5b9e552`, `b617544e`, `cd88fad6`) | `scripts/r5-6/validate-android-runtime-evidence.py` imported and pointed at each download |
| R8CB Knowledge Delta | `late_record_delta_count 3 → 2` after withdrawal (`−1` exactly); post-withdrawal native XML contains `当天之后补录了 2 条记录` and no longer `…3 条记录`; `llm_generated=false`, `health_inference=false`, `read_only=true` | downloaded `knowledge-delta-truth.json` + `ui.xml` |
| Multi-pet A→B→A | secondary Today manifest `petId = B`, `stageRole=today`; return `petId = A`; primary Case `945d624a…` still visible | downloaded `multipet-a-b-a-truth.json` |
| Pilot metric contract | `R8_PILOT_V2` / `CURRENT_EFFECTIVE_RECORD_FACT`; `excludes = {demo, internal, synthetic_domain}`; `invited` now issuer-bound (leak fixed, tested) | `services/api/app/services/pilot_dashboard.py`, CI Backend job |
| Local gates re-run | `ruff check services packages tests scripts` PASS; mobile typecheck + 8 mobile R8 contract suites + `ui-tokens`/`pet-3d`/`build:3d-page` 12/12 PASS (via pnpm 9, the CI pin) | local runs |
| Backend pytest locally | `EXTERNAL_BLOCKED` — no Postgres/Redis/MinIO and no Docker on this machine; covered by CI run `42800704246` | port scan + `gh run view` |
| PR #2 | `OPEN`, `isDraft=false`, `mergedAt=null`, `mergeable=MERGEABLE` | `gh pr view 2 --json …` |
| Governance | `NO_VISION_MODEL_USED = TRUE`, `HUMAN_VISUAL_ACCEPTANCE = PENDING`, `APPROVED_VISUAL_BASELINE = UNCHANGED`, `NO MERGE / NO TAG / NO RELEASE` | this round's actions |
| Real-world evidence | `REAL_PARTICIPANTS = 0`; Retention / Outcome Closure / Vet Usefulness / Real Pet Identity Validation / Commercial Conversion / Companion Demand = `NOT_YET_OBSERVED` | no real participants this round |

---

## Historical — 2026-10-11 round (preserved verbatim, NOT current)

> Verified by the local autonomous agent on **2026-10-11 (Asia/Shanghai)**.
> Rule for this file: every value is a command output or an artifact I actually
> fetched. No historical PASS, screenshot or SHA is reused as current evidence.
> Invariants kept: `NO_VISION_MODEL_USED = TRUE`, `HUMAN_VISUAL_ACCEPTANCE = PENDING`,
> `REAL_DEVICE_HUMAN_REVIEW = PENDING`.

| Commits pushed by this agent | `a03295c7` (evidence recovery + diagnostics), `3aacdf6c` (v10 time-window test), `253ffa55` (UTF-8 decode + §13 deliverable set), `fc334c63` (Life View mode-rail poll), `1be8888e` (requested-pet manifest before accepting a Today frame), `87eec64d` (docs sync), `e5d38e80` (no two identical Twin Review view frames) |
| Final branch head | `e5d38e80f647d8d42c2c32e347a3922bf0685d77` — CI ✅ (run 38108483530), OpenAPI ✅ (38108483529), Android + Release Artifacts ✅ incl. runtime evidence (38108483572); artifacts `pli-mobile-apk` id 11690916840, `pli-web-standalone` id 11691215951, `r5-6-android-runtime-evidence` id 11690821647 (none expired), APK sha256 `c81dd474c7b414d87fa57acf33ac3d3b8ec91f2e1c2332a17e4d27f11fca1892` |
## 1b. Head of this round's first green verification (`3aacdf6c`)



| Item | Value | How it was read |
| --- | --- | --- |
| Repository | `huangdi97/pet-life-intelligence` | `git remote -v` |
| Working branch | `feat/r2p3d-r3-render-truth-ui-closure` | `git branch --show-current` |
| Remote branch HEAD at that verification | `3aacdf6cfabd105f18b9197ce65d8981a15a48f4` | `git ls-remote origin refs/heads/...` |
| Local HEAD at that verification | `3aacdf6cfabd105f18b9197ce65d8981a15a48f4` | `git rev-parse HEAD` |
| PR #2 | `state=OPEN`, `isDraft=false`, `mergedAt=null`, base `main`; its `headRefOid` always equals the live branch head (re-checked after every push) | `gh pr view 2 --json …` |
| `main` | `2069d8a8c8b4df9752f7c65fb3ddaad831100010` — untouched by this agent | `git ls-remote origin refs/heads/main` |
| Tags | 16 refs before and after this round (none created/modified) | `git ls-remote --tags origin` |
| Releases | none created | `gh release list` |

Start of round (recorded before any change): remote `6738f3cc56982dd841f993aeab28d7ac4b948571`,
local `46c0c3f9ed21b7e292a6d12b9d1be93f6de678ef` (7 days stale, fast-forwarded to the
remote head before any edit; `git merge-base --is-ancestor 6738f3c HEAD` still holds,
so no history was rewritten).

Commits pushed by this agent:

| SHA | Subject |
| --- | --- |
| `a03295c73e328af30bd3bd42a3aa90ea8224a346` | fix(android-evidence): make hosted UIAutomator dump failures recoverable and diagnosable |
| `3aacdf6cfabd105f18b9197ce65d8981a15a48f4` | test(v10): make abnormal-day-hint expectation follow the same-clock rule |

## 2. CI at the starting head `6738f3c` (pre-fix baseline)

| Workflow | Run | Conclusion |
| --- | --- | --- |
| CI | https://github.com/huangdi97/pet-life-intelligence/actions/runs/38063682555 | success (Backend / Frontend / Blind Visual Contract / Playwright) |
| OpenAPI Deterministic Sync | https://github.com/huangdi97/pet-life-intelligence/actions/runs/38063682591 | success |
| Android + Release Artifacts | https://github.com/huangdi97/pet-life-intelligence/actions/runs/38063682536 | **failure** — `Android R5.6 runtime evidence` step 14 `CaptureError: unable to obtain unobscured UIAutomator XML …/_primary-select/ui.xml`; contact sheet + evidence upload skipped |

Diagnostic artifact of that failure (`r5-6-android-runtime-diagnostics`, id `11674606294`)
contained a **0-byte `ui.xml`**, a 0-byte app diagnostic file and a `logcat` buffer that
stops at emulator boot, while `pli-api.log` shows the app itself healthy and polling
`/today` — i.e. the hosted emulator stalled, and the capture script could neither
recover nor explain it. Root cause and fix: see `IMPLEMENTATION_CHANGELOG.md`.

## 3. CI at the current head `3aacdf6`

| Workflow | Run URL | Head SHA | Jobs |
| --- | --- | --- | --- |
| CI | https://github.com/huangdi97/pet-life-intelligence/actions/runs/38088783213 | `3aacdf6…` | Backend ✅ / Frontend ✅ / Blind Visual Contract ✅ / Browser E2E (Playwright) ✅ |
| OpenAPI Deterministic Sync | https://github.com/huangdi97/pet-life-intelligence/actions/runs/38088783712 | `3aacdf6…` | ✅ |
| Android + Release Artifacts | https://github.com/huangdi97/pet-life-intelligence/actions/runs/38088783190 | `3aacdf6…` | Android APK ✅ / Web standalone artifact ✅ / **Android R5.6 runtime evidence ✅** |

### Artifacts of run `38088783190` (all `expired=false` at read time)

| Artifact | Id / URL | Size |
| --- | --- | --- |
| `pli-mobile-apk` | https://github.com/huangdi97/pet-life-intelligence/actions/runs/38088783190/artifacts/11683936155 | 50 404 091 B (zip) |
| `pli-web-standalone` | https://github.com/huangdi97/pet-life-intelligence/actions/runs/38088783190/artifacts/11683935667 | 48 401 072 B (zip) |
| `r5-6-android-runtime-evidence` | https://github.com/huangdi97/pet-life-intelligence/actions/runs/38088783190/artifacts/11683881923 | 5 820 051 B (zip) |

Downloaded and verified locally:

- `release/app-release.apk` → 99 080 040 bytes, `sha256 = 31269f9970523f67997a8ec64777f5d98c168e3f0a1ef7f457aee402f8c9a5fe`
- `android/capture-manifest.json` → `source_head = 3aacdf6cfabd105f18b9197ce65d8981a15a48f4`,
  `source_branch = feat/r2p3d-r3-render-truth-ui-closure`, `vision_model_used = false`.

Commands used (repeatable):

```powershell
gh run list --repo huangdi97/pet-life-intelligence --branch feat/r2p3d-r3-render-truth-ui-closure --limit 8 `
  --json databaseId,workflowName,headSha,status,conclusion,url
gh run download 38088783190 --repo huangdi97/pet-life-intelligence -n pli-mobile-apk -D <dir>
gh run download 38088783190 --repo huangdi97/pet-life-intelligence -n r5-6-android-runtime-evidence -D <dir>
```

## 4. Provenance of the CI build (important)

`actions/checkout` on a `pull_request` event builds GitHub's synthetic merge ref. For
`a03295c7` that merge commit was `8e504470bd0d848d86059e9c67f768022816494d`
(parents `2069d8a…` = main, `a03295c7…` = PR head) and its **tree is `a3961c85b906d4c128593a2afef5e5eb7e5a30dd`,
byte-identical to the PR head's tree** — the merge is trivial because the PR already
contains `main`. The APK/evidence therefore correspond to the branch content, not to
merge-only content. The same check must be re-run for any later head.

## 5. Known blockers / honest gaps at this head

| Item | Status |
| --- | --- |
| Real owner visual acceptance | `HUMAN_VISUAL_ACCEPTANCE = PENDING` (only the owner can close it) |
| Physical-device QA | `REAL_DEVICE_QA_PENDING_USER` — no authorised phone reachable over adb on this host |
| Mini WeChat **native** screenshot gate | `EXTERNAL_BLOCKED` — needs the owner's WeChat DevTools desktop session (`docs/product/R5_6_MINI_NATIVE_VISUAL_EVIDENCE_GATE.md`) |
| `3D_ASSET_QUALITY` | `BLOCKED_BY_SOURCE_ASSET` — no owner media; runtime reports `STYLIZED_REFERENCE` |
| Local Windows APK build | See `ANDROID_RUNTIME_EVIDENCE.md` §4 — local toolchain conditions (spaces in the repo path / JDK 17 toolchain) handled; result recorded there |
