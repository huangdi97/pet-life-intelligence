# VISUAL REGRESSION REPORT（Stage V）
- 报告日期：2026-09-23
- 实现：`tests/e2e-browser/specs/stage-v-visual.spec.ts` + `artifacts/visual-baseline/`
- 证据：Playwright 29/29 全绿（2026-09-23 实测）；截图基线 60 张（5 宽度 × 12 页面）

## 1. 基线截图（已生成并入库 `tests/e2e-browser/artifacts/visual-baseline/`）

| 宽度 | 页面 | 文件 |
|---|---|---|
| 360 / 390 / 768 / 1024 / 1440 | Today / Timeline / Pet / Health / Behavior / Training / Assistant / Me / Companion / 3D Life View / Capture Wizard / 3D Verification | `{width}_{key}.png`（60 张，本 Stage 实测生成） |

## 2. 状态空间探针（STAGE-V-VISUAL-02，全部 PASS）

| 状态 | 覆盖页面 | 结果 |
|---|---|---|
| Empty | Today（无宠）、Timeline | 显示空态文案与 CTA，无崩溃 |
| Error | 触发失败请求 | 人类语言错误提示（不暴露内部错误码），可重试 |
| Permission Denied | 跨用户页面 | 403 状态 UI + 授权说明 |
| Offline | 离线占位 | offline 页可访问 |
| Loading | 初始骨架 | 不闪烁、有 role=status |
| Normal / Dense / Partial / Stale / Feature Disabled / External Blocked / Safety Blocked | 核心页抽样 | 均有对应状态呈现（Companion Prototype 门、3D blocked、safety 提示已验证） |

## 3. 说明
- 截图基线为**文档级 QA 证据**（非像素 diff 门禁）；页面迭代时由人工/后续 E2E 复核，不引入快照式 CI 门禁（避免 snapshot 滥用，TEST_QUALITY §1）。
- 状态空间探针在真实 dev 栈 + seeded demo 数据上运行（synthetic 隔离保证不污染指标）。

## 4. 结论
`VISUAL_REGRESSION_PASS`：12 核心页 × 5 宽度基线建立；状态空间关键路径探针通过；与 ACCESSIBILITY/RESPONSIVE 审计一致。
