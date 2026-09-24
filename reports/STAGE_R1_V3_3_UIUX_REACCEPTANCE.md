# STAGE R.1 V3.3 UI/UX RE-ACCEPTANCE — 依据 v3.3-R1 复验收

> Stage: R.1 · 日期：2026-09-24 · 验收基准：`docs/canonical/PLI_v3.3-R1.md`（CURRENT）
> + `docs/ui/PLI_DESIGN_SYSTEM_V3.md` + 实际 runtime（production 模式复跑）。
> 状态：`UI_UX_V3_3_ACCEPTED`（真实通过；依据为复跑证据，非文档转述）。

## 0. 背景与基准升级

Stage R 验收使用 v3.1-R1（当时 v3.3-R1 不在 repo，已在 STAGE_R_UIUX_ACCEPTANCE
登记为文档漂移）。Stage R.1 已把 v3.3-R1 正式入库
（`docs/canonical/PLI_v3.3-R1.md`）并完成 Delta Audit
（`reports/V3_3_CANONICAL_DELTA_AUDIT.md`，`V3_3_MISSING_CRITICAL=0`）。
本报告按 v3.3-R1 新增/强调的体验主轴逐屏复核。

## 1. 复核方式

- 逐屏核对：Today / Timeline / Pet / 3D Life View / Assistant / Companion；
- 证据来源：
  - `tests/e2e-browser/specs/stage-v-visual.spec.ts`：12 页 × 5 宽度截图（360/390/768/1024/1440）+ state-space probes（empty/error/permission-denied/offline）；
  - `tests/e2e-browser/specs/visual-regression-v2.spec.ts`：approved baseline vs current 逐像素 diff = 0（60/60，0.0000%）；
  - `tests/e2e-browser/specs/stage-h2-3d.spec.ts`：3D 诚实 blocked、real-photos fallback、capture wizard、back-to-that-day、GENERATED_3D≠LIVE、Today 生命视图入口（6 测试）；
  - `tests/e2e-browser/specs/stage-h-ux.spec.ts`：welfare / social / monitoring / agent 5 tab / companion PROTOTYPE gate（5 测试）；
  - `tests/e2e-browser/specs/stage-v-3d-runtime.spec.ts`：glTF/WebGL/runtime（4 测试）；
  - DESIGN_SYSTEM_V3 §6 已落地面与 §8 验证基线（Stage H 已冻结，本轮复核未回退）。

## 2. 逐屏复核表

| # | 屏幕 | v3.3 关键要求（章节） | Runtime 证据 | 判定 |
|---|---|---|---|---|
| 1 | **Today (Living Canvas)** | 主轴 Pet→Now→Change→Attention→Action；点击宠物视觉进入 3D Life View；非游戏面板视觉（§34.1/34.2） | `today` 5 宽度截图；LifeViewCard 整卡可点击（stage-h2-3d «today living canvas shows pet life-view entry» PASS）；state-probe 正常 | 通过 |
| 2 | **Timeline** | 生活流非日志表：时间/来源/actor/媒体/事件类型/outcome；back-to-that-day 不得用当天数据伪造历史（§28/§41） | `timeline` 5 宽度截图；back-to-that-day chip 过滤（stage-h2-3d «timeline back-to-that-day filter renders» PASS）；空/error 态正常 | 通过 |
| 3 | **Pet** | Profile + 3D Life View 入口 + 各域汇总；多宠切换不串宠（§8.5/§18） | `pet` 5 宽度截图；seven-paths E2E-01/02 双宠+权限；Today/Timeline 按 petId 隔离 | 通过 |
| 4 | **3D Life View** | PLM 主页面：ProviderStatus + ModelVersions + StateOverlay（current+baseline_range+delta+freshness）+ RealPhoto fallback；无 Provider 时诚实 blocked（§26-30） | `3d-life-view`/`3d-verification` 5 宽度截图；stage-h2-3d «honest blocked state» + «real-photos fallback» PASS；state-probe 无权限态正确；旋转/缩放=LOD 保持 EXTERNAL_BLOCKED（如实标注） | 通过 |
| 5 | **Assistant** | 5 能力：Ask / Brief / Find / Plan / Explain；上下文解释（Why/View evidence/Source/Compared with itself）（§8.5/§21） | `assistant` 5 宽度截图；stage-h-ux «agent renders 5 assistant tabs» PASS；ExplainPanel 已接 Timeline [为什么]/Today [查看依据]（Delta Audit §9） | 通过 |
| 6 | **Companion** | Zero-cognition / Observation-first / Welfare-first / Privacy-first / Human-in-Control；禁止「想你了/打电话」；GENERATED_3D ≠ LIVE（§22-24/§26） | `companion` 5 宽度截图；stage-h2-3d «companion declares GENERATED_3D is not LIVE» PASS；硬件能力（Camera/Two-way Audio/Treat）均 EXTERNAL_BLOCKED/DESIGN_ONLY | 通过 |

## 3. 状态全覆盖（DESIGN_SYSTEM_V3 §8 / AGENTS.md §41）

| 状态 | 证据 |
|---|---|
| Loading / Empty | state-space probes + Stage H UX（welfare/social/monitoring/training 无 fatal） |
| Normal / Dense | 12 页截图 + 双宠/多事件场景 |
| Error / 404 | stage-v-visual probe：unknown pet → 404 页（非崩溃） |
| Offline | `/offline` 200 + sw.js fallback（pwa-share E2E-08） |
| Permission Denied | stage-v-visual：sitter 无 grant → 明确「无权限/拒绝」 |
| External Blocked | life-view ProviderStatus + companion PROTOTYPE gate |
| Safety Blocked | seven-paths E2E-03：EMERGENCY 前端不降级、刷新一致、无伪诊断 |

## 4. 结论

```text
UI_UX_V3_3_ACCEPTED = TRUE
  - v3.3-R1 canonical in repo（docs/canonical/PLI_v3.3-R1.md，CURRENT）
  - Delta Audit: V3_3_MISSING_CRITICAL = 0（reports/V3_3_CANONICAL_DELTA_AUDIT.md）
  - 6 屏逐屏复核：全部通过（含诚实 EXTERNAL_BLOCKED 态，无假成功）
  - 视觉基线：production 模式 60/60 diff = 0.0000%（VISUAL_REGRESSION_V2_PASS）
  - 状态全覆盖：Loading/Empty/Normal/Dense/Error/Offline/Permission
    Denied/External Blocked/Safety Blocked 均有真实运行时证据
```

未通过即不标 ACCEPTED 的条目：纯 3D 真实渲染 / 真实 Companion 硬件 / 公网可访问，
均如实标注 `EXTERNAL_BLOCKED`（见 WEB_REAL_ACCESS_REPORT / ANDROID_REAL_DEVICE_QA）。