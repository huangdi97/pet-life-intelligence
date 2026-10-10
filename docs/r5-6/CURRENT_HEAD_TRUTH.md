# PLI — CURRENT_HEAD_TRUTH

> Verified by the local autonomous agent on **2026-10-11 (Asia/Shanghai)**.
> Rule for this file: every value is a command output or an artifact I actually
> fetched. No historical PASS, screenshot or SHA is reused as current evidence.
> Invariants kept: `NO_VISION_MODEL_USED = TRUE`, `HUMAN_VISUAL_ACCEPTANCE = PENDING`,
> `REAL_DEVICE_HUMAN_REVIEW = PENDING`.

## 1. Repository / branch / PR

| Item | Value | How it was read |
| --- | --- | --- |
| Repository | `huangdi97/pet-life-intelligence` | `git remote -v` |
| Working branch | `feat/r2p3d-r3-render-truth-ui-closure` | `git branch --show-current` |
| Remote branch HEAD | `3aacdf6cfabd105f18b9197ce65d8981a15a48f4` | `git ls-remote origin refs/heads/...` |
| Local HEAD | `3aacdf6cfabd105f18b9197ce65d8981a15a48f4` | `git rev-parse HEAD` |
| PR #2 | `state=OPEN`, `isDraft=false`, `mergedAt=null`, base `main`, head = remote branch HEAD | `gh pr view 2 --json …` |
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
