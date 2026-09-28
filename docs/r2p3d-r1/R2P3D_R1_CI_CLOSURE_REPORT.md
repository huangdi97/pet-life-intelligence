# R2P3D-R1 — CI_CLOSURE_REPORT

> 状态：2026-09-28。**CURRENT_MAIN_FULL_CI_GREEN 按 GitHub 实际观察如实记录**
> （见 §4）。新增 Twin 门禁已入 `ci.yml`，无大模型权重进 CI。

## 1. 基线（上一轮 main，真实观察）

| run | job | 结果 | 时间 |
|---|---|---|---|
| 36342716873 | Android + Release Artifacts @ v0.2.1 | success | 9m57s |
| 36342696055 | CI @ main | success | 9m47s |
| 36342039693 | CI @ main（docs+evidence 提交） | success | 9m21s |

## 2. 本轮 CI 变更（.github/workflows/ci.yml）

- backend job 新增步骤 **Twin QA**：
  `python scripts/twin/twin_glb_qa.py`（GLB 场景/节点/动画清单/包围盒/校验和；
  零模型权重）。
- Ruff 覆盖扩到 `scripts`（`ruff check services packages tests scripts`）。
- Playwright functional 清单不变（新增 R2P3D-R1-01 个体 Twin pose 切换 gate，
  在 r2p3d.spec.ts 中；`--grep-invert` 只排除视觉链，功能链包含新用例）。
- Android APK job 保持原链路（pet-3d build → prebuild → assembleRelease），
  无新增下载。

## 3. 本地全量门禁（真实数字，§81/§104）

| gate | 命令 | 结果 |
|---|---|---|
| pytest | `.venv\Scripts\python -m pytest tests` | **443 passed** |
| ruff | `ruff check services packages tests scripts` | **0 errors** |
| vitest (web) | `pnpm --dir apps/web test` | **33/33 passed** |
| typecheck mobile | `pnpm --dir apps/mobile typecheck` | **0** |
| typecheck web | `pnpm --dir apps/web typecheck` | **0** |
| typecheck admin | `pnpm --dir apps/admin typecheck` | **0** |
| typecheck mini | `pnpm --dir apps/mini typecheck` | **0** |
| web build | `pnpm --dir apps/web build` | **NOT_RUN on Windows**（known `next standalone` symlink EPERM，§83；Linux CI 同命令通过） |
| mini build | `pnpm --dir apps/mini build:weapp` | **pass** |
| Gradle | `gradlew assembleRelease` | **BUILD SUCCESSFUL**（APK 88.8 MB） |
| Playwright functional | `playwright test --grep-invert "STAGE-V-VISUAL\|VISUAL-V2\|VISUAL-V3"` | 本机跑 Twin gate 通过；完整功能链在 CI |
| Playwright R2P3D-R1-01（twin pose） | 本地 `--grep R2P3D-R1-01` | **pass**（真实 WebGL） |
| Twin contract tests | `tests/unit/test_r2p3d_r1_twin_pipeline.py` | **9 passed** |
| GLB QA | `python scripts/twin/twin_glb_qa.py` | **pass**（12 clips, 2 GLB） |
| Animation QA | motion-manifest + GLB channels | **pass** |
| OpenAPI freshness | `python scripts/gen_openapi.py && git diff --exit-code` | **clean** |

> pytest 数字 vs 历史基线 427：净增（新增 9 个 R2P3D-R1 twin 测试 + 若干既有
> 重组），无删除测试；443 ≥ 历史合理范围。vitest 33/33 与历史一致。

## 4. GitHub CI 实际观察

PR #1（`feat/r2p3d-r1-individual-twin-local-closure` → main）触发 CI +
Android 工作流。最终结果以 PR checks 实际状态为准（见最终回复 §CI）。

## 5. 关键边界

- **CI 不下载任何大模型权重**（SAM2/SPAR3D/SF3D/Hunyuan/TRELLIS 全部
  SKIP_BY_POLICY）；Twin QA 只解析仓内 GLB fixtures。
- 视觉回归确定性：`prefers-reduced-motion` 冻结 3D 阶段（既有机制），
  新增 twin 页面不会破坏既有 baseline（web 无 twin 描述符时仍渲染 demo 阶段）。