# CI 闭环 — R2P3D-R3

- PR：https://github.com/huangdi97/pet-life-intelligence/pull/2
- 分支：`feat/r2p3d-r3-render-truth-ui-closure`（origin 已推送，`upstream` 为 main @ `2069d8a`）
- 触发：PR（CI workflow + Android workflow）

## 本地回归（提交前实测，供对照）

| 项 | 本地结果 |
| --- | --- |
| blind-ui pytest | 32/32 |
| 后端 pytest（非 blind_ui） | 446/446 |
| ruff | clean |
| web/admin/mini/packages typecheck | 通过 |
| web production build | 通过（PLIT_LOCAL_BUILD=1 跳过 standalone 组装） |
| mini weapp build | 通过 |
| twin GLB QA | 通过 |
| OpenAPI 新鲜度 | 无 diff |
| Playwright E2E | 43 通过；3 失败 = STAGE-V-VISUAL-01（本地 ENOSPC 截图写入）与 VISUAL-V2/V3（已知基线漂移 RED，基线更新需人工批准 → PENDING） |

## CI 状态（如实记录）

> 本文档随 CI 完成更新。最新状态：见本文件底部「更新日志」。

预期红项（不掩盖）：
- VISUAL-V2/V3：approved baseline vs current pixel diff 必然 RED（R3 视觉变化；`PLI_UPDATE_VISUAL_BASELINE` 输入需人工视觉批准，agent 不更新基线）。

## 更新日志
- 2026-10-01 17:55 UTC：PR #2 创建，CI + Android workflows 触发（in_progress）。

## 最终状态（2026-10-01 18:20 UTC）

- **CI workflow**（run 36903771096，提交 2934b43）：
  - Blind Visual Contract (no vision models)：✅ success
  - Backend (lint + unit + integration + safety)：✅ success
  - Frontend (web + admin + mini + mobile checks)：✅ success
  - Browser E2E（Playwright visual chain）：❌ 3 passed / 2 failed —— 仅 VISUAL-V2-01 与 VISUAL-V3-01（approved baseline vs current pixel diff；diff 例如 training-390 33.7%、welfare-390 20.7% —— R3 视觉变化的真实漂移）。**基线更新需人工视觉批准 → 保持 RED，不更新基线**。
- **Android + Release Artifacts workflow**（run 36903771094）：✅ success（Web standalone + Android APK，DEBUG_SIGNED_INSTALLABLE_APK / NOT_PLAY_STORE_SIGNED）。

结论：除已文档化的 VISUAL-V2/V3 基线漂移（PENDING 人工批准）外，CI 全绿。本地 43 通过的 Playwright 结果与 CI 一致（CI 上同套非视觉测试全部通过）。
