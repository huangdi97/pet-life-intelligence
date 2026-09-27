# R2P3D_CI_CLOSURE_REPORT

> 总 Goal §71/§72/§73/§74。2026-09-28。

## 最终状态

`CURRENT_MAIN_FULL_CI_GREEN = TRUE` — main@`3ef6c18`（及后续）CI 全绿：

| Job | 结果 |
|---|---|
| Frontend (web + admin + mini + mobile checks) | PASS |
| Backend (lint + unit + integration + safety) | PASS |
| Browser E2E — Playwright (functional specs) | PASS（含 r2p3d / stage-h2-3d / seven-paths 等） |
| Browser E2E — Playwright (visual chain: STAGE-V-VISUAL + VISUAL-V2 + VISUAL-V3) | PASS |
| Android + Release Artifacts 工作流 | 见 v0.2.1 Release（tag 触发） |

## 本轮修复的 CI 问题

1. **VISUAL-V3 误入 functional 步骤**：ci.yml functional grep-invert 未排除 VISUAL-V3（历史 #51 FAILURE 根因）。
   修复：functional 步骤 invert 增加 `|VISUAL-V3`，visual chain grep 增加 `|VISUAL-V3`。
2. **@pli/pet-3d 在全新 checkout 缺失**（dist gitignore）：新增 `pnpm --dir packages/pet-3d build` 到
   frontend / e2e / android 三个 job。
3. **3D 页面视觉不稳定（运行间漂移）**：capture spec 增加 `emulateMedia({ reducedMotion: "reduce" })`，
   viewer 在 reduced-motion 下冻结 idle 漂移/呼吸 → baseline 可复现。
4. **Visual baseline 迁移（显式协议 §73）**：R2-P3D UI 全量改版 → 以 workflow_dispatch
   `update-visual-baseline=true` 显式刷新 V2+V3 approved baselines（Linux/CJK 环境）；
   baseline 更新原因 = 本轮有意视觉重建 + 截图复核 + 显式刷新，已记录 routes（24 页 web + 60 页 V2）。
   **HUMAN_VISUAL_ACCEPTANCE 保持 PENDING，本迁移不代表人工验收。**
5. baseline upload 路径扩展为同时上传 `visual-v3-approved/`，使刷新结果可回填仓库。

## 本地与 CI 差异（诚实记录）

- Windows 本地 `next build`（web/admin）在「Collecting build traces / standalone」阶段出现
  `sharp / react node_modules symlink EPERM`（Windows 权限限制）——**非代码问题**；Linux CI 同命令 PASS。
  本地等价验证：typecheck 全绿 + Next 编译/页面生成全通过。
- 验证基线：pytest 437 passed（历史 427+10）、ruff 0、vitest 33/33（历史 22+11）、
  mobile/web/admin/mini typecheck 0。