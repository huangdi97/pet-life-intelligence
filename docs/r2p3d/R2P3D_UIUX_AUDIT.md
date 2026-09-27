# R2P3D UI/UX Audit

> 责任技能：ui-ux-pro-max。阶段：Phase A（实现前基线审计）。证据：P0 三屏 3D 实装 + v0.2.0 全量页面 + 本轮 Preflight 事实。最终复审记录于 `R2P3D_VISUAL_ACCEPTANCE_REPORT.md`。

## 1. Skill 使用记录（诚实）

- `search.py` 查询 1：`pet companion care app warm premium mobile`（--design-system）→ 返回 Claymorphism（玩具感暖橙）——**与 pinned 视觉方向冲突，未采用**。
- `search.py` 查询 2：`warm premium calm spatial minimal wellness lifestyle`（--design-system）→ 返回 Neumorphism + 营销落地页 pattern——**同样偏离 Operate/Experience 混合模式，未采用**。
- 结论：本地 design-system 库无与「Warm Living Holographic / 克制智能 / 空间存在感」匹配的现成 pattern；按 skill 规则将其视为 recommendation 而非指令，视觉以 pinned brief（总 Goal §7/§8/§52/§53）为准。以下 UX 规则来自 ui-ux-pro-max 优先级表（a11y、touch 44px、导航 ≤5、reduced-motion、form feedback、error-state 完整性）。

## 2. IA 审计（对 pinned Owner IA）

- 一级导航 5 Tab：今天 / 时间线 / **当前宠物名（豆豆）+ 头像** / 助手 / 我的 —— P0 已实现为宠物头像+自定义名，中心 Tab 非固定「宠物」。✅
- 中间 Tab 点击 → Pet World（身份门户）；顶部头像+名字下拉 → 多宠切换（豆豆/咪咪）。需在 A6 全量页验证「任何 Pet context 不允许串宠」。
- 不得把 16 业务域展开为 16 一级 Tab。Pet World 内六域（生活/健康/行为/训练/福利/社交）为二级入口，且每个入口必须回答「这个域对这只宠物现在意味着什么」——P0 Pet 页已按此构建，需复核其余页面是否引入 raw 域列表。

## 3. 移动 UX 审计（Android 主客户端）

- **单手使用**：Today 上半屏 = Twin + 四大基础状态；下半屏 = 叙事流（今天 → 与自己相比 → Attention → Action → 最近生活）。四大状态在 Twin 周围空间排布（上/中/下轨），非 grid dashboard。✅
- **Touch target**：QuickAction / 状态锚点 / 底部 Tab 需 ≥44×44dp；本阶段页面复核时逐项检查。
- **认知负荷**：禁止三四张同权大 Card；以 AttentionPanel（只强化一个主要 Attention）+ OpenSection + InlineMetric 为主。P0 已引入 OpenSection/AttentionPanel/StoryRow 等非 Card 容器（`components/feedback/OpenSection.tsx`、`components/life/AttentionPanel.tsx`）。
- **特殊状态**：Loading / Empty / Offline / Error / Permission / No-Device / Feature-Disabled / External-Blocked / Safety-Blocked / Stale / Partial 全套需在 A6 复核并真实实现；Offline 页 web 已存在（`apps/web/app/offline/page.tsx`），需验证 mobile 与文案（当前离线 / 缓存范围 / 上次同步 / 重试）。

## 4. 交互层级审计

- **Today**：Presence（Twin idle 呼吸式中性起伏）→ 数据到达（事件同步时锚点轻变化）→ 记忆（回到那一天淡入历史）→ Live（Twin→Camera 明确来源切换）。reduced-motion 关闭非必要动画（P0 viewer 已实现 matchMedia 处理）。
- **Life View**：此刻模式完整（rotate/zoom/reset/姿态切换/状态锚点/来源/更新时间/证据）；趋势/时间线/外观 = 真实 minimal 或显式 disabled（禁止 dead button）。P0 已建 `LivingModeSwitcher`，需验证非此刻模式为真实 minimal 而非死按钮。
- **Truth Model**（§24）：pose 必须区分 AMBIENT / REPRESENTATIVE / OBSERVED；metadata 带 source/confidence/updated_at；禁止健康推断驱动病态姿势。P0 `PetLivingStage` 需确认 pose 绑定来自真实已记录事件。

## 5. 无障碍审计

- 3D 信息必须有文本等价物（无 3D 时文字/数据/操作可用 —— 架构已保证）。
- 高对比度：健康 Attention 警示色必须满足 4.5:1；安全信息不得仅视觉呈现。
- 键盘/焦点/ARIA：web 页面复核时检查 focus ring 与语义标注；reduced-motion 全局生效。
- 屏幕阅读器等价：状态锚点与 Attention 文案需有可读文本（非纯 canvas）。

## 6. 多宠审计

- 顶部「当前宠物头像 + 名字」，切换清晰；demo 双宠豆豆（dog/Corgi）/咪咪（cat/DLH）均须有独立 3D 资产（registry 断言豆豆≠咪咪，P0 已实现）。
- 任何页面 pet context 不得串宠：API 层按 pet_id 过滤 + UI 层 currentPet 单一来源。

## 7. 移动端密度与文案

- 屏幕密度 390×844dp 下：Today 上半屏 Twin 不被遮挡，锚点可点击且不覆盖宠物。
- Owner 文案全部 localized；禁止 raw enum（`OPEN`/`OWNER_REPORTED`/`STRESS_RECOVERY`）直出；未知 enum 不得 return raw value（A7 全量 grep 复核）。
