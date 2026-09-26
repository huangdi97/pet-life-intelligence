# R2_VISUAL_REGRESSION_V3 — 视觉回归 V3 范围与协议

> 阶段：Stage R.2 · 日期：2026-09-26 · 依据 GOAL §95-§97（VR V3）

## 1. 现状

- V2 baseline = 历史（GOAL §95：旧 V2 baseline 作为历史；新设计未人工批准前不更新 approved baseline）。
- V3 正在建立：V2 baselines 是历史；V3 按 Wave 冻结新批准的基线。
- 现有 spec：`tests/e2e-browser/specs/visual-regression-v2.spec.ts`（V2 历史链）；V3 spec/基线在建立中。

## 2. V3 范围（§96）

至少覆盖：Today / Timeline / Quick Log / Pet / Life View / Health / Behavior / Training / Welfare / Social / Assistant / Companion / Me / Offline / Empty / Attention。

宽度：360 / 390 / 768 / 1440，按 client 能力分配（mobile 390/360；web 768/1440）。

本轮 Android Emulator 实际捕获：390dp（AVD 钳制 1024x1440px ≈ 390×549dp）；360dp 捕获 today-with-data-360.png 单张。768/1440 由 web 侧承担。

## 3. Baseline Update Protocol（§97）

```text
intentional design change
→ screenshot review（波次：wave-01..wave-05 已按此执行）
→ explicit approval（人工/用户确认）
→ PLI_UPDATE_VISUAL_BASELINE=1 冻结
```

禁止：diff failed → update baseline（无人工批准不更新）。

## 4. 波次冻结记录（本轮）

| Wave | 截图 | 状态 |
|---|---|---|
| wave-01-today（with-data 390/360 · empty · attention · offline · multipet） | 6 张 | 已截图 + 文本/像素验证；V3 冻结待人工批准 |
| wave-02-pet-life-view（pet · lifeview） | 2 张 | 同上 |
| wave-03-timeline-quicklog | 2 张 | 同上 |
| wave-04-domains（Health/Behavior/Training/Welfare/Social） | 5 张 | 同上 |
| wave-05-assistant-companion-me（assistant/companion/me/monitoring） | 4 张 | 同上 |

合计 19 张已验证（accessibility-dump 文本匹配 + 像素分析）；final 16 张系列 + contact sheet 已产出（final/）。

## 5. Checklist

| 检查 | 结果 |
|---|---|
| V2 baseline 标记历史，不再作为当前方向证据 | PASS |
| 新设计未经人工批准不更新 approved baseline | PASS（冻结待人工） |
| V3 范围（§96 屏幕集）已定义 | PASS（清单见上） |
| 波次截图驱动开发（§86）已执行 | PASS（5 个 wave 均 Implement→Build→Capture→Verify→Fix） |
| 最终 contact sheet + before/after 对照已产出（§116） | PASS（final/PLI_v0.2.0_Android_Final_Contact_Sheet.png、before-v0.1.2-vs-after-v0.2.0.png） |

## 6. Remaining Issues

- **PENDING（诚实记录，不写 PASS）**：V3 基线冻结尚未完成——需要：① 用户/人工对 16 张 final 系列 + contact sheet 的视觉批准；② 批准后以 PLI_UPDATE_VISUAL_BASELINE=1 在 CI（Linux/fonts-noto-cjk）冻结 V3 基线；③ 新增 visual-regression-v3.spec.ts 覆盖 §96 范围。
- P2/ACCEPTED_DEFER：360/390/768/1440 全宽度矩阵在现有 AVD 捕获容量下不可全量复现（390dp 为主）。

## 7. 结论

VISUAL_REGRESSION_V3：**IN_PROGRESS**（范围与协议已定、波次截图已完成、基线冻结待人工批准 → 最终 PASS 需批准 + CI 冻结完成）。
