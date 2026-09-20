# STAGE_H1_PREFLIGHT_CURRENT — Repository Reality Audit（PHASE A）

> 日期：2026-09-20 · 阶段：Stage H.1（128 PARTIAL_UI Code-level Audit）前哨
> 依据：GOAL `PLI_v3.3-R1_从当前状态到完整设计实现收口_总执行GOAL_2026-09-20` PHASE A
> 原则：不信历史数字，全部在当前 repo 重新实测（L0 > L1 > L2 > L3）

## 1. Git / Worktree（A1）

```text
branch     : main
HEAD       : 23581dfc22820f7b1f2bb7c61914438d7db230ac
           : test+docs(stage-h): fix legacy ruff ... [PLI-STAGEH]
status     : 干净，唯一未跟踪 .pi/（历史 GOAL 归档，未丢弃）
remote     : 无（GIT_REMOTE_EXTERNAL_BLOCKED 保持）
recent     : a85c6b8 (Stage G-W0) → af9661d (H design freeze) → 4d4c478 → 23581df (H complete)
```

## 2. Repository Map（A2）

```text
apps/       web admin mini mobile pro          —— 五端前端（Taro mini / Expo mobile）
packages/   api-client domain-schema rules ui-kit ui-tokens
services/   api ai-gateway worker
tests/      unit contract integration safety e2e e2e-browser multi-client ai-evals ga v02 v10
docs/       product/ ui/ architecture/ safety/ reference/ pilot/ decisions/ ...
reports/    STAGE_H_* · pilot/ · G* …
```

## 3. Canonical Docs（A3）

已读：FEATURE_EXPERIENCE_MATRIX / MASTER_PAGE_INVENTORY / INFORMATION_ARCHITECTURE /
NAVIGATION_MODEL / DESIGN_SYSTEM_V1 / COMPONENT_INVENTORY / COPY_GUIDELINES /
RESPONSIVE_GUIDELINES / ACCESSIBILITY_GUIDELINES / COMPANION_UX / MONITORING_UX /
MULTI_CLIENT_EXPERIENCE_MATRIX / STAGE_H_FINAL_REPORT / STAGE_H_UX_ACCEPTANCE_MATRIX /
STAGE_H_MULTI_CLIENT_AUDIT / STAGE_H_FEATURE_UI_AUDIT / PARTIAL_TRIAGE（Stage D 旧稿，仅参考）。

### 3.1 文档 vs Repo 差异记录（GOAL §1.3 必须显式）

| 项 | 文档预期 | repo/runtime 实际 | 处理 |
|---|---|---|---|
| L3 母版版本 | GOAL 引用 `Pet_Life_Intelligence_v3.3-R1_…_2026-09-20.md` | repo 无 v3.3-R1；最新母版为 v3.1-R1（2026-09-18，根目录） | 以 repo 实际为准执行；差异已记录；是否需要回写 canonical 由后续报告结论决定 |
| Feature 计数 | GOAL §2.4 说 PARTIAL_UI=128 | 实测矩阵 128（与 GOAL 一致） | 一致 |
| Stage H 质量数字 | 273 passed / ruff 0 / typecheck 0 / build OK / vitest 22 / PW 17 | 本轮全部复跑复核（见 §5），**一致** | 一致 |

## 4. 环境前提（本轮实测发现）

- 本地 PG：`petlifeintelligence-postgres-1` healthy，映射 `localhost:55679`。
- 测试库：`pli_test` 存在；`conftest.py` 默认 `TEST_DATABASE_URL` 指向旧端口 55432 —— **必须显式传 `TEST_DATABASE_URL=…:55679/pli_test`**，否则 pytest 全量 OperationalError（本轮实测 273 ERROR → 修正后 273 passed）。
- API（8800）与 dev-auth 环境就绪；Playwright 依赖 `http://localhost:3100` 的 web dev server。
- **环境风险（已修复一次）**：`next build`（web）与运行中的 `next dev` 共享 `apps/web/.next`，build 会破坏 dev 运行时 webpack 产物（Server Error `Cannot find module './757.js'`），导致 E2E 大面积误报。本轮已通过「清理 .next → 重启 dev server → 重跑」修复；后续在本轮内 build 与 E2E 之间必须串行并清理。

## 5. Baseline Test Run（A4，本轮真实数字）

| 门槛 | 命令 | 结果 |
|---|---|---|
| ruff | `.venv\Scripts\python.exe -m ruff check .` | **All checks passed（0）** |
| pytest | `.venv\Scripts\python.exe -m pytest -q`（TEST_DATABASE_URL→55679） | **273 passed, 1 warning**（324s） |
| typecheck web | `pnpm --dir apps/web typecheck` | **0 error** |
| typecheck admin | `pnpm --dir apps/admin typecheck` | **0 error** |
| typecheck mini | `pnpm --dir apps/mini typecheck` | **0 error** |
| typecheck mobile | `pnpm --dir apps/mobile typecheck` | **0 error** |
| typecheck pro | `pnpm --dir apps/pro typecheck` | **0 error** |
| build web | `pnpm --dir apps/web build` | **OK**（114s） |
| build admin | `pnpm --dir apps/admin build` | **OK**（首次 EPERM=stale .next 文件锁，清理后通过） |
| build pro | `pnpm --dir apps/pro build` | **OK**（同上） |
| build mini | `pnpm --dir apps/mini build`（weapp） | **Compiled successfully** |
| vitest | `pnpm --dir apps/web test` | **22 passed（4 files）** |
| Playwright | `npx playwright test --config tests/e2e-browser/playwright.config.ts`（baseURL 3100） | **17 passed（1.2m）** |

> 附：首次 Playwright 跑出 15 failed 系 dev server 被 build 污染（§4），非代码回归；修复环境后 17/17。

## 6. H.1 输入基线

- 228 Feature 当前矩阵：`FULL_UI=30 / PARTIAL_UI=128 / BACKGROUND_ONLY=17 / EXTERNAL_BLOCKED=11 / FUTURE=42`。
- 128 PARTIAL_UI 分布（按 Domain）：01×11 / 02×7 / 03×9 / 04×9 / 05×16 / 06×14 / 07×9 / 08×9 / 09×9 / 10×10 / 12×7 / 14×7 / 15×11。
- Stage H 已给每个 PARTIAL_UI 标注 Entry/Page/Component（多数组件级入口已存在）；**缺 PARTIAL_REASON 标准分类**（GOAL B2），本轮逐项补。
- 已知必修缺陷：`prefers-reduced-motion` 未全局实现（STAGE_H_FINAL_REPORT limitation #1；GOAL B5 明确为 H.1 必修，非外部 blocker）。

## 7. 结论

- PHASE A 完成：repo 当前真实状态与 Stage H 声称一致（所有质量门槛复跑通过）。
- 下一阶段：PHASE B — 128 PARTIAL_UI 逐项 code-level audit（B1–B6），输出 FEATURE_UI_AUDIT / UX_ACCEPTANCE / RESPONSIVE / ACCESSIBILITY / MULTI_CLIENT 更新与 STAGE_H1_FEATURE_CLOSURE_AUDIT。
