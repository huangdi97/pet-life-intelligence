# R2P3D_PREFLIGHT — Stage R.2-P3D Phase P0 启动前核验

> 生成时间：2026-09-27 · 阶段：R.2-P3D P0（Today / Pet / Life View）
> 本节目的：任何 production 代码修改前，记录真实 git / runtime / CI / blocker 事实。禁止复制旧报告文本。

## 1. Git 事实（L1，本会话实测）

| 项 | 值 |
|---|---|
| HEAD | `5c2707e` docs(r2): correct v0.2.0 APK path (release outputs), list release assets |
| Branch | `main` |
| Origin main | `5c2707e2a28f16ed77d216bd155157dd2aaa8de3`（= HEAD，无领先/落后）|
| Remote | https://github.com/huangdi97/pet-life-intelligence.git |
| Worktree | 50 个已修改文件 + 若干未跟踪文件（见 §3）|
| Tags | v0.2.0, v1.0.0, v1.1.0, v1.1.1, v1.2.0（v0.2.0 为 R.2 Living Pet Experience 版本）|

## 2. Runtime / 本地栈（L0，本会话实测）

| 服务 | 端口 | 状态 |
|---|---|---|
| PLI API | :8800 | listening（pid 15764）|
| Web production (next start) | :3100 | listening（pid 32188）|
| Web dev (next dev) | :3000 | listening（pid 31588）|
| PostgreSQL | :56532 | listening |
| Redis | :56632 | listening |
| Android emulator | — | pdig5 已启动（emulator-5568），另有 emulator-5556 在线 |

工具链（实测）：node v22.15.0 · pnpm 12.4.1 · python 3.13.14 · openjdk 21 · adb 可用（需时重启 daemon）· SDK 位于 `C:\Users\Kaiser\AppData\Local\Android\Sdk` · AVD 存在：pdig5 / pdig35 / pdig36 / pdig36_tablet。

## 3. Worktree 脏清单（保留，重建在其之上）

- 已修改（R2P 在制品）：`.github/workflows/ci.yml`（functional/visual V3 隔离修复）；`apps/mobile/src/screens/{TodayScreen,PetScreen,LifeViewScreen,ui_labels}.tsx`、`tokens.ts`；`apps/web/app/globals.css`、`page.tsx`、`pets/[id]/page.tsx`、`pets/[id]/life-view/page.tsx`、`apps/web/tests/today-page.test.tsx`；`tests/e2e-browser/artifacts/visual-v3-current/*`（V3 运行产物，36 张）。
- 未跟踪：`.pi/goal/*.md`（本轮契约）；canonical v3.4-R1 母版（未提交）；`apps/mobile/src/components/life/*`（ChangeNarrative/LivingModeSwitcher/PetLivingStage/PetStateAnchor）；`apps/mobile/src/components/pet/*`（PetStageRenderer/PetTwoPointFiveD）；`apps/web/components/*`（living-mode-switcher/pet-living-stage）；`artifacts/r2p/`；`artifacts/visual-reconstruction/v0.2.0/final/final.rar`；`tests/e2e-browser/specs/r2p-core.spec.ts`；`tests/e2e-browser/artifacts/visual-v3-failures/`。
- 约束：**这些是用户未提交工作，本轮全部保留**；在其上重建三屏与 3D 呈现层，禁止破坏性 git 操作。

## 4. Release / CI 现状

- Release：v0.2.0（PLI v0.2.0 — Living Pet Experience Reconstruction），已上传 APK + 截图 zip + SHA256SUMS（见 R2P_P0_WRAPUP §1 固定资产清单）。
- Git 状态：main 无 push 领先；本轮**不 bump、不 Release、不推送**。
- CI 现状（基于 R2P_P0_WRAPUP + 本会话核对）：
  - backend / frontend jobs：上次全量运行 PASS（ruff → migration replay → pytest → OpenAPI 新鲜度 / typecheck×5 → next build → expo export）。
  - Browser E2E：functional 链已修复（ci.yml 脏版本：V3 从 functional 阶段排除并进入 clean-seed visual 链）；本地复跑 functional 29/29 PASS（R2P 轮）。
  - VISUAL-V3：diff 对 `artifacts/visual-v3-approved/` **受控红**（P0 有意的呈现层重构 vs 冻结 v0.2.0 baseline）；冻结锁成立（approve 目录未被触碰）。本轮**继续不刷新 baseline**。
- gh CLI：已认证（huangdi97，含 repo/workflow scope），本轮结束时如需读取最新 Actions 状态可使用（不触发任何写操作）。

## 5. 已知 Blocker / 边界状态

| 项 | 状态 |
|---|---|
| REAL_3D_PROVIDER | EXTERNAL_BLOCKED（真实照片→高保真 3D 重建 Provider 未接通；不代表 UI 无 3D）|
| REAL_PETS | 0（仅 DEMO/SYNTHETIC 演示宠物）|
| 3D 库 | mobile（Expo 51）与 web（Next 15）当前均未安装 3D framework；唯一 GLB 为测试三角 `tests/e2e-browser/assets/pli-test-triangle.glb` |
| Image provider | 本轮 wrap-up 记录 imagegen IMAGE_HTTP_404；不依赖生成式图片，采用程序化 3D 资产 |
| adb | 会话启动时 daemon 过期问题；重启后正常（模拟器已上线）|
| Skill 指令 | impeccable / frontend-design / ui-ux-pro-max / playwright-cli 的 SKILL.md 均已定位并读取（`~/.claude/skills` 与 `~/.agents/skills`）|

## 6. 本轮验收锚点（From goal contract）

- A1 本文档；A2 五份设计文档先于实现；A3 Web+Android 真实 3D runtime；A4 Life View 旋转/缩放证据；A5 三屏形态；A6 Android 截图产物（artifacts/r2p3d/core/）；A7 Playwright 390/1440；A8 Clean Visual Demo 术语门；A9 质量门（typecheck/vitest/build/pytest/Playwright/Android 构建+启动，visual-v3-approved 零改动）；A10 终点 `R2P3D_PHASE_P0 = WAITING_FOR_HUMAN_VISUAL_ACCEPTANCE`。