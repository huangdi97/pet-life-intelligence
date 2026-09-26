# LIVING_CANVAS_UX — Living Canvas（Today）体验规范

> 阶段：Stage R.2（v0.2.0）· 日期：2026-09-26 · 状态：MOBILE + WEB + MINI IMPLEMENTED
> 更新说明：由 Stage H.2 版升级为 R.2 版（§18-§27）；实现：apps/mobile/src/screens/TodayScreen.tsx、apps/web/app/page.tsx、apps/mini/src/pages/index/

## 1. 体验主轴（§6，禁止 Banner + 宫格 + Dashboard 范式）

```
PET → NOW → CHANGE → ATTENTION → ACTION → MEMORY
```

- PET = 这是谁；NOW = 此刻怎样；CHANGE = 与它自己的过去相比发生了什么；ATTENTION = 现在最值得留意的一件事；ACTION = 现在能做什么；MEMORY = 这一天如何进入长期生命记录。
- 不是每屏机械显示六块，这是信息优先级，不是组件模板。

## 2. Above-the-fold 结构（390dp 推荐，§19）

```text
[Pet Hero / 宠物视觉]          ← 第一视觉焦点，占首屏高 30%–45%
豆豆
今天怎么样？
[Now / 此刻生活摘要]           ← InlineMetric：进食/饮水/活动（真实 API 计数）
[One Attention OR Calm]        ← 一条关注或平静态
[Primary Action: 快速记录]      ← 一级 CTA
```

禁止首屏先出现：Current State Card、Today Tasks Card、Recent Card 堆叠。

## 3. Pet Hero（§20）

- 全宽宠物视觉（照片 > 物种视觉），底部 scrim；必须显示宠物名、基本身份、当前时间/时段上下文。
- 可显示数据摘要，但不要把照片盖满。
- 本轮无生成 Demo 照片，PetHero 使用 warm species-visual（ACCEPTED_LIMITATION，2026-09-26）；photo 管道保留。

## 4. Hero Copy 规则（§21，文案必须来自确定数据）

允许：

- 「今天还没有新的记录」「上午记录了 3 件事」「今天有 1 件事值得关注」「最近一次记录在 12 分钟前」

禁止：

- 「豆豆今天很开心」「豆豆心情不错」「豆豆想出去玩」（除非有独立、有效、明确的观察来源，且以观察事实表达）。

## 5. Now Layer（§22）

将「最后活动 + 今天事件数」表格 Card 重构为生活状态摘要（进食 2 次 · 饮水 198 ml · 活动 42 分钟）。前提是 API 真有这些数据；没有则显示「今天还没有足够记录」，不编造。

## 6. Change Layer（§23）

真正利用 Personal Baseline：

- 允许「今天饮水比自己的近期基线少 18%」；必须同时可查看「为什么 / 查看依据 / 来源 / 与它自己相比」。
- baseline 不足时显示「数据还不足以比较」。
- 实现：apps/mobile/src/components/life/BaselineChange.tsx（abnormal-day-hint + rule 说明，来源为今日计数 vs 近期基线）。

## 7. Attention Layer（§24）：One Attention 规则

- 一屏最多突出一条 Attention；普通情况显示「目前没有需要特别关注的变化。」（Calm）。
- 只有 deterministic safety rule（backend triage URGENT/EMERGENCY）才使用强 danger 视觉；不得为视觉制造焦虑。
- 实现：apps/mobile/src/components/life/AttentionPanel.tsx（TodayScreen 中 health URGENT/EMERGENCY → danger；abnormal-day-hint → attention；否则 calm）。

## 8. Action Layer（§25）

- Primary Action：**快速记录**（QuickLog modal）。
- Secondary：问助手 / 看看它（Life View）/ 在家（Monitoring）。
- 禁止用 4 个 Ghost Button 横排作为导航替代品。

## 9. Memory Layer（§26）

Recent 不是 Event Card 列表，而是 compact life stream preview（时间 + 事件 + 来源/媒体），最多 3–5 条。实现：apps/mobile/src/components/timeline/LifeStream.tsx。

## 10. Card Budget（§10）

- Today 首屏最多 1 个主要 Hero Surface + 1 个 Attention/Action Surface；不得出现 4–6 张同级白卡。
- Border Budget：Today 主要靠间距/图片/背景分层；验收记录 BEFORE/AFTER bordered surfaces（明显下降）。

## 11. 多宠物

- 宠物切换使用顶部轻量 chips（不占 Hero 空间）；切换后整页以该宠物重渲染。
- 截图证据：wave-01-today/after/today-multipet-390.png。

## 12. 验收

- §78 Gate：PET_VISUAL_PRESENT=YES · PET_IS_PRIMARY_FOCUS=YES · LIVING_CANVAS=YES · CARD_DASHBOARD_PATTERN=NO · ONE_ATTENTION=YES · PRIMARY_ACTION_CLEAR=YES · OWNER_INTERNAL_TERMS=0。
- §90 量化护栏：宠物 visible above fold=YES；real/demo media when available=YES（本轮 species visual，ACCEPTED_LIMITATION）；首屏同权卡片 ≤2；primary CTA ≤2；internal terms=0。
- 截图：artifacts/visual-reconstruction/v0.2.0/wave-01-today/after/（with-data 390+360 / empty / attention / offline / multipet）。
