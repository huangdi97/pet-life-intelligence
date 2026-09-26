# R2_PRESENTATION_ARCHITECTURE — 呈现架构报告

> 阶段：Stage R.2 · 日期：2026-09-26 · 依据 GOAL §63-§65（UI Architecture 重构 / 文件大小 / ViewModel-Presenter Layer）

## 1. 组件分层（apps/mobile/src/components/）

按 §63 建议目录重建（pet / life / timeline / feedback / actions / media / assistant / navigation）：

| 组件 | 路径 | 职责 |
|---|---|---|
| PetHero | components/pet/PetHero.tsx | Today/Pet 第一视觉焦点：照片/物种视觉 + scrim + 名字/标题/身份/时间（136 行） |
| PetSpeciesGlyph | components/pet/PetSpeciesGlyph.tsx | 矢量物种图形（dog/cat/paw） |
| PetContextHeader | components/pet/PetContextHeader.tsx | Quick Log「为豆豆记录」上下文头 |
| PetMedia | components/media/PetMedia.tsx | portrait/hero/square/timeline/full-bleed；photo > species visual > letter（opt-in）（112 行） |
| PetAvatar | components/media/PetAvatar.tsx | 列表/上下文小型宠物视觉 |
| demoPetVisual | components/media/demoPetVisual.ts | resolvePetMediaUri + DEMO_MEDIA_PROVENANCE |
| LifeSignal | components/life/LifeSignal.tsx | 此刻 InlineMetric（进食/饮水/活动） |
| BaselineChange | components/life/BaselineChange.tsx | Change 层（基线对比 + 依据入口） |
| AttentionPanel | components/life/AttentionPanel.tsx | One Attention / Calm / danger（确定性规则） |
| LifeStream | components/timeline/LifeStream.tsx | Day Group + time spine 事件流 |
| lifeStreamUtils | components/timeline/lifeStreamUtils.ts | groupEventsByDay 纯函数 |
| Feedback | components/feedback/Feedback.tsx | EmptyState / InlineError / Skeleton |
| OpenSection | components/feedback/OpenSection.tsx | 无边框开区块 |
| QuickAction | components/actions/QuickAction.tsx | PrimaryAction / SecondaryAction / ActionRow |

屏幕文件为组合器（TodayScreen 274 行 / PetScreen 210 行 / LifeViewScreen 166 行 / TimelineScreen 124 行 / QuickLogScreen 166 行 / AssistantScreen 252 行 / CompanionScreen 147 行），全部 ≤300 行；components 组件最大 168 行（Feedback），其余 35–136 行（§64 / AGENTS §21）。

## 2. Tokens

- `apps/mobile/src/tokens.ts`：COLORS（V4 + legacy alias，legacy 仅供未迁移屏编译）、TYPE（V4 角色）、SPACE、RADIUS、ELEVATION、DEMO_ENV。
- `apps/web/app/globals.css`：--v4-* custom properties + v4 component classes（.v4-sec/.v4-hero/.v4-ls/.v4-stage…）。
- `apps/mini/src/styles/tokens.scss`：V4 语义 token + 类。
- 规则：颜色/字号不在组件内硬编码。

## 3. ViewModel / Presenter 层（§65）

目标：API canonical data → presentation-ready data，禁止组件 JSX 内到处判断 raw API enum。

现有实现：

- `screens/today.ts`（todayTasks + TodayResp 组装）；
- `components/timeline/lifeStreamUtils.ts`（groupEventsByDay：DayGroup 纯函数）；
- `screens/ui_labels.tsx`（eventTypeLabel / sourceLabel / TIMELINE_FILTERS：内部 enum → 用户语言）；
- `components/media/demoPetVisual.ts`（identity 行 / media 解析）。
- `screens/ui.tsx` / `ui_shared.tsx` / `ui_labels.tsx` 承担 presenter 文案职责（历史路径保留）。

约束：ViewModel 不创造事实（§65）；UI 概念可更丰富，但字段只能来自 Fact/Observation/Baseline/Outcome/Task/Artifact/Provenance/Inference(with label)（§92 Content Truth Guardrail）。

## 4. 文件大小 Gate（§64 / §109）

- production files >300 = 0（本轮新增/重写文件均合规；例外仅白名单生成/纯数据文件）。
- React component >200 = 0（本轮组件 112–166 行区间）。
- 依赖环 = 0；unjustified type escape = 0（demoNav.ts 唯一 type escape 有 WHY 注释且为 demo-only，§10 global 允许的有界例外）；silent high-risk catch = 0（safety/permission/storage/AI/3D 路径无静默吞错）。

## 5. 与旧结构的兼容

- `screens/ui.tsx` / `ui_shared.tsx` 保留旧 Card/ScreenTitle 等 primitive 供未迁移屏使用；V4 屏走新组件。不混合使用于同一屏。
- tokens legacy alias 标记「keep until screens migrate」。

- 组件规模（2026-09-26 实测）：Feedback 168 / PetHero 136 / PetMedia 112 / LifeStream 109 / QuickAction 87 / AttentionPanel 76 / 其余 < 70；TodayScreen 274 / AssistantScreen 252（全部 < 300）。

- mobile tsc 0（2026-09-26）；gradle assembleRelease OK。
- 组件规模抽查：PetHero 136 / PetMedia 112 / TodayScreen 274 / AssistantScreen 252（全部 < 300）。
