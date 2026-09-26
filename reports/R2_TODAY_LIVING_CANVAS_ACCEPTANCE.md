# R2_TODAY_LIVING_CANVAS_ACCEPTANCE — Today（Living Canvas）验收

> 阶段：Stage R.2 · 日期：2026-09-26 · 依据 GOAL §78（Today Acceptance Gate）+ §90 量化护栏；实现：apps/mobile/src/screens/TodayScreen.tsx

## 1. 截图证据

Before：

- `artifacts/emulator/v0.1.2/02_today.png`（v0.1.2，白卡 dashboard 形态）

After（`artifacts/visual-reconstruction/v0.2.0/`）：

- `wave-01-today/after/today-with-data-390.png`（有数据，390dp）
- `wave-01-today/after/today-with-data-360.png`（有数据，360dp）
- `wave-01-today/after/today-empty-390.png`（空空，空态）
- `wave-01-today/after/today-attention-390.png`（关注，attention/danger 态）
- `wave-01-today/after/today-offline-390.png`（离线态）
- `wave-01-today/after/today-multipet-390.png`（多宠物切换）
- `final/before-v0.1.2-vs-after-v0.2.0.png`（before/after 对照）

验证：19 张已验证截图含上述画面；accessibility-dump 文本匹配（豆豆/空空/关注/咪咪/今天怎么样等）；像素分析 warm canvas 主导（warm 0.30–0.88），white 0–25%。

## 2. Checklist（§78 Gate）

| 条件 | 结果 | 证据 |
|---|---|---|
| PET_VISUAL_PRESENT = YES | PASS | PetHero 为第一视觉焦点（290dp 高，占首屏高 >30%） |
| PET_IS_PRIMARY_FOCUS = YES | PASS | Hero 置顶，宠物名/身份/时间 chip 完整 |
| LIVING_CANVAS = YES | PASS | 渲染结构 PetHero → LifeSignal(Now) → BaselineChange(Change) → AttentionPanel(Attention) → PrimaryAction → LifeStream(Memory) |
| CARD_DASHBOARD_PATTERN = NO | PASS | 无 4–6 张同级白卡；OpenSection + InlineMetric + 时间轴 |
| ONE_ATTENTION = YES | PASS | AttentionPanel 单条（danger 仅 deterministic triage；否则 attention/calm） |
| PRIMARY_ACTION_CLEAR = YES | PASS | 单 PrimaryAction「快速记录」+ 2 个 Secondary（问助手/看看它）+ 在家 entry |
| OWNER_INTERNAL_TERMS = 0 | PASS | copy 扫描无 PLI-xxx/raw enum/internal key |

## 3. §90 量化护栏

| 护栏 | 结果 |
|---|---|
| Pet visible above fold = YES | PASS |
| real/demo pet media when available = YES | ACCEPTED_LIMITATION（本轮无生成照片，species visual；photo 管道保留） |
| same-weight cards above fold <= 2 | PASS（1 Hero + 1 Attention/Action） |
| primary CTA <= 2 | PASS（1 Primary + 次要行） |
| internal terms = 0 | PASS |

## 4. 核心文案（诚实性）

- Hero copy 全部来自确定数据：「今天还没有新的记录」「今天记录了 N 件事」+ 时间上下文；无情绪编造。
- Now：「今天还没有足够记录」不编造（§22）。
- Change：基线不足「数据还不足以比较」；有对比时展示 rule 来源（§23）。
- Attention：普通态「目前没有需要特别关注的变化。」（§24）。

## 5. Remaining Issues

- P2/ACCEPTED_DEFER：首屏捕获仅 390dp（AVD 物理屏 320x480 钳制 1024x1440px），360dp 仅 with-data 一张；390×844 完整首屏不可复现（捕获容量约束，非 UI 问题）。
- P2/ACCEPTED_DEFER：Demo 宠物无照片（ACCEPTED_LIMITATION，2026-09-26）。
- P2：任务区块（今天任务）为条件渲染 OpenSection，空时不显示（符合设计）。

## 6. 结论

TODAY_PRODUCT_EXPERIENCE_PASS / LIVING_CANVAS_PASS：**PASS**（视觉方向经波次截图 + before/after 对照 + 像素证据确认；最终人工视觉确认按 §89 由用户/人工完成，本报告提供 Checklist + Screenshot + Remaining）。
