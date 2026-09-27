# R2P_UIUX_AUDIT — 三屏 UX 初审（ui-ux-pro-max 工作流产出）

> 日期：2026-09-27
> 方法：加载 `C:\Users\Kaiser\.agents\skills\ui-ux-pro-max\SKILL.md`，按其 Query Contract 调用
> `search.py` 两次 `--design-system` + 两次 `--domain ux`；对 Today / Pet / Life View 三屏按
> Goal §13 问题逐项审查。审查对象 = v0.2.0 当前实现（源码 + 像素统计），不是新设计。
> 原则：搜索结果只是推荐，不覆盖 canonical（v3.4-R1 更高）。

## 0. ui-ux-pro-max 查询结果（实际调用）

```text
Q1 "pet care companion wellness app mobile" --design-system
   → Pattern=Scroll-Triggered Storytelling；Style=Claymorphism（bubbly/toy-like, 16-24px 圆角）
   → 判定：与 canonical §34.1/§46.5「避免 Cute Cartoon Toy」直接冲突 → REJECT，仅记录为反例证据。
Q2 "premium wellness calm organic spatial mobile app" --design-system --variance 4 --motion 3 --density 2
   → Style=Biomimetic/Organic（calm, natural, life-like; breathing/fluid motion）
   → 判定：部分契合「温暖/有机/自然」方向，但配色（bio red/blue）与 PLI 暖调冲突；取「organic
      calm + subtle motion + 大留白」的调性，不取色板。
Q3 "data state around subject hierarchy visual focus" --domain ux
   → Chip 需 native role/state；hover 反馈；可用键盘。→ 用于 Pet 域行与 LifeView 锚点组件评审。
Q4 "focus hierarchy first screen content prioritization" --domain ux
   → 标题层级 h1→h2→h3 顺序；语义化 HTML/ARIA；→ 用于首屏收敛与 Web 端语义评审。
```

## 1. Today — Living Canvas 审查（Goal §13 Today）

| 问题 | 结论 | 证据 |
|---|---|---|
| visual focus 是 Pet 还是 metrics？ | ⚠️ 半对：Pet 有 290dp hero，但同一屏 5 个信息段，metrics 段落总和视觉权重接近 pet | 结构堆叠 + white≈48% |
| 首屏是 Living Canvas 还是 dashboard？ | ⚠️ 介于两者：结构顺序已是 PE→NOW→CHANGE→ATTENTION→ACTION→MEMORY，但视觉呈现仍是卡片流 | open sections 纵向堆 |
| Pet 是否有存在感？ | 弱：hero 是一张卡；media 恒 fallback species glyph；宠物视觉没有「站在画面里」的感觉 | resolvePetMediaUri()=null |
| Now/Change/Attention 是否围绕 Pet 组织？ | 否：数据在 Pet 下方线性排列，与 Pet 无空间关系 | 代码顺序 PetHero → 各 section |
| action hierarchy 正确吗？ | 部分：1 主 CTA + 3 次入口正确；但任务段也出现，首屏动作有点多 | PrimaryAction + ActionRow(3) + tasks |
| 是否过度纵向堆叠？ | 是：hero + 5 段全纵向 | 源码 |
| 是否过度 utility？ | 是：段落标题（今天任务/最近）像工具机台 | copy 检查 |
| 是否过度 flat？ | 是：canvas + surface 两层，无中景/前景 | dark≈2% |
| 是否像普通宠物管理 App？ | 偏像：白卡 + 纵向信息段是通用 dashboard 语法 | 像素 + 结构 |

Today UX 结论：**structures OK / presentation not OK**。修复方向 = 把 hero 变成 stage（宠物居中、状态环绕）、
首屏收敛（≤1 注意、1 主 CTA）、减少白色 surface 比重、段落降噪。

## 2. Pet — Pet World 审查（Goal §13 Pet）

| 问题 | 结论 | 证据 |
|---|---|---|
| 是 Pet World 还是 profile？ | ⚠️ 偏 profile/hub：hero + 摘要 + 入口 + 域行 = 档案页语法 | 结构 |
| 是 Pet World 还是 navigation hub？ | 偏 hub：5 域行 + 2 入口行都是导航 | 结构 |
| Identity 是否足够强？ | 文字强、视觉弱：名称/品种/性别有，但视觉是 generic glyph | media null |
| Life Summary 属于「这个宠物」吗？ | 部分：最近一次记录/今天事件是有意义的，但表达 flat（两行 label/value） | 源码 |
| Domains 是生命侧面还是功能菜单？ | 菜单：固定 5 行 icon+label+meaning 是菜单样式 | 结构 |
| Memory 存在吗？ | 否：无「重要记忆」段 | 源码无 Memory |

Pet UX 结论：**需要把「入口列表」重排为「豆豆的此刻 + 生命周期 + 记忆」**；导航入口保留但降权、
叙事优先。Pet Stage 视觉层必须和 Today/LifeView 一致。

## 3. Life View 审查（Goal §13 Life View）

| 问题 | 结论 | 证据 |
|---|---|---|
| 页面是否首先让人「看宠物」？ | 半对：stage 是最大元素，但被标题堆和下方 section 稀释 | 结构 |
| 还是首先看数据？ | 否：数据少，但「生命轨迹」段仍是第二视觉块 | 结构 |
| visual focus 是 individual pet 吗？ | 弱：full-bleed PetMedia 显示 generic glyph，不具有个体感 | media null |
| 是否存在空间感？ | 否：stage 是矩形内大图，无锚定/环绕/层次 | dark≈2% |
| data 是否与 pet 建立视觉关系？ | 否：轨迹/3D 段在 pet 下方卡片 | 结构 |
| 3D provider state 是否抢戏？ | 反而不够明确：小卡「尚未创建」低调但生硬、孤立 | 结构 |
| 是否能自然升级到 interactive 3D？ | 否：无 renderer 占位/模式层，全页是静态 ScrollView | 结构 |

Life View UX 结论：**需重构为 PetLivingStage**：中心 pet + 环绕锚定状态 + 底部模式条；3D 诚实态并入
stage 副文案；数据锚点均可点（→详情/时间线）。

## 4. 横向 UX 评审（ui-ux-pro-max 优先级规则）

| 规则（优先级） | 当前 | 计划 |
|---|---|---|
| a11y：对比度 4.5:1 / 大文本 / 焦点可见 | 基础可用；新增 front-fix 需复查 | 保持 tokens 对比；文本等价全覆盖 |
| touch：≥44×44dp / 8px 间距 | 现有行高 ≥48dp 基本达标 | 锚点/模式条/CTA 按钮 ≥48dp |
| 导航：bottom nav ≤5 / 返回可预测 | Today/Timeline/Pet/Assistant/Me = 5 ✓ | 不动 |
| heading 层级 / 语义 | RN 用 accessibilityRole；Web 新页要 h1→h2→h3 | Web 页语义化 |
| 空/错/载：meaning+action | 已有 empty/loading 文案 | 保持 + 应用到新组件 |
| motion：reduced-motion | R2 有基础 guards | 新 motion 全部 respect |

## 5. 结论 → R2P_VISUAL_DIRECTION 输入

UX 层面 P0 必须落实：① 三屏 pet-first 空间构图（stage 语法）；② 首屏收敛（≤1 注意 / 1 主 CTA）；
③ 域叙事化（先讲豆豆）；④ 触碰/对比度/a11y 保持；⑤ Web 三页语义化实现。