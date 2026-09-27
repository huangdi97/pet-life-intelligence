# R2P3D Preflight Facts

> 真实核验事实，2026-09-28 00:xx 本地取证。不复制旧报告文字；所有条目来自本轮实际命令输出。

## Git 事实

- **HEAD**：`5c2707e2a28f16ed77d216bd155157dd2aaa8de3`
- **branch**：`main`（与 `origin/main` 同步）
- **origin/main**：`5c2707e2a28f16ed77d216bd155157dd2aaa8de3`
- **remote**：`https://github.com/huangdi97/pet-life-intelligence.git`（origin）
- **worktree**：`E:\AI\Pet Life Intelligence`（Windows，git-bash 语法用于路径展示）
- **tags（按创建时间）**：`v0.2.0`（最新）→ `v0.1.2` → `v0.1.1` → `v0.1.0` → `v1.2.0` → `v1.1.1` → `v1.1.0` → `v1.0.0`

## CI 事实（GitHub Actions，2026-09-27 02:09 最近一次 main push）

- 最近 5 次 main push 运行全部 `failure`。
- **Frontend（web+admin+mini+mobile checks）= PASS**（3m13s）
- **Backend（lint + unit + integration + safety）= PASS**（3m26s）
- **Browser E2E（Playwright）= FAIL**（3m47s）
  - 失败步骤：`Playwright (functional specs)`
  - 失败根因：`VISUAL-V3-01 approved baseline vs current pixel diff` 超阈值
    （当前 main 上 ci.yml 的 functional 步骤 `--grep-invert "STAGE-V-VISUAL|VISUAL-V2"` **未排除 VISUAL-V3**，导致 VISUAL-V3 在 functional 步骤运行并在 baseline 未冻结时 diff 失败）
  - 工作区已含修复草案（未提交）：functional 步骤 invert 增加 `|VISUAL-V3`，visual chain 步骤 grep 增加 `|VISUAL-V3`。
- **Android 相关检查**：`android.yml` 存在（expo prebuild + gradle assembleRelease），本次 push 未触发/未显示失败。

## Dirty worktree 事实（本轮起点，必须保留并提交）

- 修改（41 文件，+847/−394）：`.github/workflows/ci.yml`、`apps/mobile/package.json`、`apps/mobile/src/env.d.ts`、`apps/mobile/src/screens/{LifeViewScreen,PetScreen,TodayScreen,ui_labels}.tsx`、`apps/mobile/src/tokens.ts`、`apps/web/app/...`（Today/Pet/LifeView 页面与组件）、`apps/web/globals.css`、`apps/web/package.json`、`apps/web/tests/today-page.test.tsx`、`pnpm-lock.yaml`、`tests/e2e-browser/artifacts/visual-v3-current/*.png`（24 页）、`tests/e2e-browser/specs/stage-h2-3d.spec.ts`。
- 未跟踪：`.pi/goal/*`（本轮 Goal 契约）、`PRODUCT.md`、canonical 母版 `Pet_Life_Intelligence_v3.4-R1_..._2026-09-27.md`、`apps/mobile/assets/3d/`（pet-stage.html）、`apps/mobile/scripts/`、`apps/mobile/src/components/{life,pet,three}/`、`apps/mobile/src/three/`、`apps/web/components/{three,living-mode-switcher,pet-living-stage}.tsx`、`apps/web/scripts/`、`apps/web/tests/pet-3d.test.ts`、`artifacts/r2p/`、`artifacts/r2p3d/`、`artifacts/visual-reconstruction/v0.2.0/final/final.rar`、`packages/pet-3d/`、`tests/e2e-browser/artifacts/{r2p,r2p3d,visual-v3-failures}/`、`tests/e2e-browser/specs/{r2p-core,r2p3d}.spec.ts`。

## Runtime / 3D 事实

- **Android Emulator**：AVD `pdig5`（target android-36）正在运行，adb 连接 `127.0.0.1:5571`；设备 `emu64xa`，物理 1080×2340 @ 440dpi；当前 override 320×640 @ 420（R.2 全高截图需 `wm 1024x2216@420` ≈ 390×844dp）。
- **现有 3D 栈**（P0 阶段已建，未提交）：
  - `packages/pet-3d/`：three.js 程序化模板（`buildCorgi`/`buildCat`、palette、registry、scene）+ 统一 renderer contract（demo3d/real3d/photo/2.5d/fallback）。
  - Web：`apps/web/components/three/pet3d-viewer.tsx`（rotate/zoom/reset/LOD/状态上报）+ `pet-living-stage.tsx` + `living-mode-switcher.tsx`。
  - Mobile：WebView 承 three.js `apps/mobile/assets/3d/pet-stage.html`（`expo-gl` 审计结论记录于 `artifacts/r2p3d/R2P3D_3D_STAGE_ARCHITECTURE.md`）。
- **后端 PLM 层**（已存在）：`PetVisualCapture` / `PetVisualModel` / `PetVisualRenderManifest` 模型 + capture/model/overlay 路由 + `app/adapters/visual_provider.py`（SandboxProvider，`REAL_3D_PROVIDER=EXTERNAL_BLOCKED` 诚实报告）+ migration `21b4b571112a_stage_h2_pet_living_model_visual_`。
- **Demo seed**：`services/api/app/seed.py` — 豆豆（dog/Corgi）+ 咪咪（cat/DLH）+ 主人/家庭/临时照护者 + 一日日常事件 + 健康内容。无测试名字污染。

## Release 事实

- 最新 Release：`v0.2.0`（Internal / Pre-Pilot，Stage R.2 完成）。assets：Android APK + screenshots zip + SHA256SUMS（路径记录于 R.2 docs）。
- `PLAY_STORE_SIGNING = EXTERNAL_BLOCKED`；`REAL_PARTICIPANTS = 0`；`REAL_PETS = 0`；`PRODUCT_VALIDATION = NOT_YET_OBSERVED`。

## 功能基线（历史，必须恢复并只增不减）

- pytest 427 passed / ruff 0 / vitest 22/22 / mobile+web+mini typecheck 0 / Playwright functional 27/27 / Gradle assembleRelease OK / Next build OK / Taro build OK。

## 已确认 blocker（诚实状态，本轮不假装解决）

- `REAL_3D_PROVIDER = EXTERNAL_BLOCKED`：无真实生成式 3D Provider 权重/凭证；本轮主路径 = 仓内参数化模板 + 真实照片纹理投影，Provider 抽象保持就位。
