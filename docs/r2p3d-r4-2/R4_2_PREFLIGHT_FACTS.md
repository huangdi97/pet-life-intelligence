# R4.2 Preflight Facts

> Stage: R2P3D-R4.2 — Visual Reality Correction, Android Warm Living & Pet Identity Closure
 > Recorded: 2026-10-03 (initial) — updated 2026-10-03 (收口/验证模式复核)
 > Source: `git`, `gh` CLI, local scans. NO_VISION_MODEL_USED = TRUE.
 
 ## 1b. 收口复核后的 git 状态（当前真实）
 
 | Fact | Value |
 | --- | --- |
 | Local & remote branch HEAD | `5065526`（收口轮最终推送；证据头 `808f677` 的 CI run 已完成复核） |
 | 复核前 remote HEAD | `83072b611871cd889f1c57c5c645e069a7775eca` |
 | 本轮新增 commits | `43f8484`（纳入 2 个未提交文件）→ `a1b9e59`（收口轮文档）→ `066b664`/`ac9431c`/`e1e26ab`/`808f677`/`5065526`（docs 同步） |
 | Local main | `2069d8a8c8b4df9752f7c65fb3ddaad831100010`（未动） |
 | Remote main | `2069d8a8c8b4df9752f7c65fb3ddaad831100010`（未动） |
 | PR #2 | OPEN / NOT MERGED / MERGEABLE；headRefOid=`5065526` |
 | 工作区 | 提交两个未提交文件后 clean（复核时无其他改动） |
 
 ## 1c. 收口复核后的 PR / CI 状态
 
 - PR #2：`state=OPEN`、`baseRefName=main`、`mergeable=MERGEABLE`、
   headRefOid=`5065526`（收口轮最终推送）。
 - remote CI（证据头 `808f677`，run 37117011861 / 37117011900）：Backend ✓ /
   Frontend ✓ / Blind Visual Contract ✓ / Android APK ✓ / Web standalone ✓；
   `Browser E2E (Playwright)` 仅 `Playwright (visual chain)` 步失败
   （EXPECTED_BASELINE_DRIFT：OLD APPROVED BASELINE vs R4.2 twin 资产变更；
   functional specs 步 SUCCESS，42 passed）。
 - 最终推送 `5065526`（docs-only）后等待该 run 复核（AC4 收口）。
 
 ## 1d. Android 捕获结果（收口轮后续会话突破，Goal §40）
 
 先前 3 次全新启动失败（环境层），随后定位真正根因：**adb daemon 在工具调用间
 死亡，每次重启丢掉 `adb reverse` 规则与设备连接**，导致应用无法访问
 `127.0.0.1:8800`（空宠物态）且流程反复中断。修复：
 
 - WMI 启动模拟器（脱离工具会话进程树清理）；
 - root / reverse / 安装 / 启动 / 截图 / 读 manifest 全部放在同一条命令内；
 - 宠物切换 chip 按 `pli.multipet.switch.<petId>` 精确 bounds tap。
 
 结果：`ANDROID_RUNTIME_CAPTURE = PASS`。捕获豆豆 Today/Pet/Life View/Twin
 Review + 咪咪 Today/Review 真实 RUNTIME 证据（high-fidelity-glb-twin /
 fallback=false / warm-living-field / neutral-identity-studio），全部
 contact sheets 生成，manifest 54/54 sha256 一致。详见
 `docs/r2p3d-r4-2/ANDROID_CAPTURE_BLOCKED.md` RESOLVED 部分。→
 `R4_2_PRODUCT_VISUAL_CANDIDATE = READY_FOR_HUMAN_REVIEW`。
 
 ## 1e. 本轮修复的环境问题（证据前置）
 
 - PLI 本地 Postgres（`DATABASE_URL` 指向 `localhost:56532/pli`）重新启动，
   种子 4 只宠物（豆豆/Corgi、咪咪/DLH 等）。
 - 本地 API（127.0.0.1:8800 uvicorn）重启并成功连接该 DB：
   `/api/v1/health` OK；`/api/v1/pets` 返回豆豆 + 咪咪。
   （复核开始时 API 因 DB 停机而 pets/dev-login 500，现已恢复。）
 
## 1. Git state (before any change)

| Fact | Value |
| --- | --- |
| Local HEAD | `9509832b4c608c54b7018cd0956a55191f8270e8` |
| Remote branch HEAD (`origin/feat/r2p3d-r3-render-truth-ui-closure`) | `9509832b4c608c54b7018cd0956a55191f8270e8` |
| Local main | `2069d8a8c8b4df9752f7c65fb3ddaad831100010` |
| Remote main | `2069d8a8c8b4df9752f7c65fb3ddaad831100010` |
| Working tree | clean (`git status --short` empty) |
| Local vs remote branch | identical HEAD (fast-forward state, no divergence) |

## 2. PR #2 status

- Number: 2
- State: `OPEN` (NOT MERGED)
- Head ref: `feat/r2p3d-r3-render-truth-ui-closure`
- Base ref: `main`
- Head OID: `9509832b4c608c54b7018cd0956a55191f8270e8`
- Mergeable: `MERGEABLE`
- Latest public release: `v0.2.2` (unchanged, not re-verified this round)

## 3. Current CI (remote GitHub Actions)

Latest CI run on the PR (run 37020335064, completed 2026-10-02T14:31Z):

| Job | Result |
| --- | --- |
| Backend (lint + unit + integration + safety) | FAIL (Ruff step failed) |
| Frontend (web + admin + mini + mobile checks) | PASS |
| Blind Visual Contract (no vision models) | FAIL (contract/anti-pattern step failed) |
| Browser E2E (Playwright) | SKIPPED (depends on failed jobs) |

Confirmed locally:

- `ruff check scripts/r2p3d-r4-1/contact_sheets_r4_1.py` → `W292 No newline at end of file` (line 128).
- `anti_patterns.scan_hardcoded_pet_names(Path('.'))` → hits `['scripts/r2p3d-r4-1/contact_sheets_r4_1.py']` (source hard-codes 豆豆 / 咪咪 labels).

So `PR_FULL_CI_GREEN = FALSE` before R4.2 work.

## 4. Android workflow

- File: `.github/workflows/android.yml` ("Android + Release Artifacts")
- Jobs: `android-apk` (expo prebuild + `gradlew assembleRelease`, uploads APK), `web-standalone`.
- Triggers: PR paths `apps/mobile/**`, `.github/workflows/android.yml`; tags `v*`; workflow_dispatch.
- Local Android tooling available:
  - ANDROID_HOME = `D:\Code\Android\SDK` (platform-tools/adb present).
  - Existing AVDs: `main`, `zhishen_rc`.
  - No emulator currently running (`adb devices` empty) — runtime capture will boot an existing AVD.

## 5. Current visual artifacts (R4.1, stale for R4.2)

- Web captures: `artifacts/r2p3d-r4-1/web/{today,pet,lifeview,twinreview}/screenshot.png` (+ many other pages).
- Android captures: `artifacts/r2p3d-r4-1/android/{today,pet,lifeview,twinreview}/` contain `today.png` / `pet.png` / `lifeview.png` / `twinreview.png` (NOT `screenshot.png`) plus `3d.json` / `layout.json` / `visual.json` / `report.md`.
  - `today/`: today.png, 3d.json, layout.json, report.md, ui.xml, visual.json
  - `pet/`: pet.png, 3d.json, layout.json, report.md, ui.xml, visual.json
  - `lifeview/`: lifeview.png, lifeview_b.png, lifeview_canonical.png, lifeview_rotated.png, lifeview_zoom.png, 3d.json, 3d_rotate_a/b.json, 3d_reset.json, 3d_zoom_a/b.json, report.md, visual.json
  - `twinreview/`: twinreview.png, twinreview_b.png, twin_front.png, twin_side.png, twin_back.png, 3d.json, 3d_view_front/side/back.json, report.md, visual.json
  - `mimi-sanity/`: mimi_today.png, mimi-sanity.png, 3d.json, layout.json, report.md, ui.xml, visual.json
- Contact sheets (R4.1): `artifacts/r2p3d-r4-1/contact-sheets/` — 9 PNGs. Known defects: Android hero sheet reads `screenshot.png` (missing → grey placeholders); Mimi turntable has only 2 source angles (1 valid + placeholder).
- R4 sheets: `artifacts/r2p3d-r4/contact-sheets/` (web-only comparisons).
- `docs/r2p3d-r4-2/` and `artifacts/r2p3d-r4-2/` do not exist yet (new R4.2 outputs).

## 6. Known blockers (R4.2 scope)

1. **BLOCKER A — Android dark viewer**: Android Today/Pet/Life View/Twin Review render as dark/black viewer rectangles despite HIGH_FIDELITY_SKINNED GLB. `ANDROID_WARM_LIVING_PRODUCT_UI = FAIL`.
2. **BLOCKER B — Doudou not Corgi-like**: R4.1 morphology numbers exist but final screenshots read as generic terrier/shaggy dog. `R4_1_DOG_CORGI_VISUAL_FIDELITY = FAIL`.
3. **BLOCKER C — Mimi distorted**: manifest PASS but Android screenshot shows thin/vertical/twisted brown spike. `CAT_VISUAL_RENDERING = FAIL`, `CAT_PRODUCT_PARITY = FAIL`. Root cause unknown (must investigate GLB geometry/skinning/animation; `rotate_y_deg = -90` needs double-rotation verification).
4. **BLOCKER D — Android contact sheet broken**: `contact_sheets_r4_1.py` reads `screenshot.png` but actual Android files are `today.png` etc. → `_open()` exception → grey placeholder.
5. **BLOCKER E — Mimi turntable fake/incomplete**: only 1 valid angle + grey placeholder.
6. **BLOCKER F — CI red**: Backend Ruff W292 + Blind contract hard-coded pet names (both in `scripts/r2p3d-r4-1/contact_sheets_r4_1.py`).

## 7. Environment / tooling inventory

- Python venv: `.venv` at repo root (used for ruff/pytest/scripts).
- Node/pnpm workspace root with `packages/pet-3d`, `packages/ui-tokens`, `packages/visual-contract`, `packages/ui-kit`, apps `web|mobile|mini|admin|pro`.
- Embedded Android stage: `apps/mobile/assets/3d/pet-stage.html`.
- Blind contract tests: `tests/blind_ui` + `scripts/blind-ui/anti_patterns.py`.
- 3D pipeline scripts: `scripts/r2p3d-r4/{bake_twin,build_twins,corgi_morph,glbwriter,meshops,motion_py,objio,painting,skinweights,tune_corgi_morph,unwrap,asset_qa}.py`.
- Twin QA: `scripts/twin/twin_glb_qa.py`.

## 8. Execution posture

- Continue same branch `feat/r2p3d-r3-render-truth-ui-closure`; do not merge PR #2; do not push main; do not promote visual baselines; no release.
- NO vision/multimodal model will be used; machine checks only (GLB metadata, bbox, transforms, weights, pixels, DOM/computed styles).
- Evidence-script hygiene: new `scripts/r2p3d-r4-2/` code must read display labels from metadata/CLI, not source hard-code owner content.
