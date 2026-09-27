# R2P3D_UIUX_AUDIT — UX 层级 / 交互模型 / 移动层级审计（ui-ux-pro-max 职责）

> 阶段：R.2-P3D P0 · 方法：ui-ux-pro-max skill（`search.py` design-system ×2 + `--domain ux` 查询 + pro-rules/quick-reference 核对）+ 对当前三屏实现（mobile TodayScreen/PetScreen/LifeViewScreen 脏版本、web 三页）与截图证据（artifacts/visual-v3-current、artifacts/r2p/playwright）的结构级审查。

## 0. Skill 检索结论（如实记录）

- `pet life care companion mobile app warm calm premium` --design-system → Claymorphism + 橙色 #F97316（playful/toy-like）。**Declined**：与 canonical §34.1「不是可爱卡通玩具」冲突。
- `wellness companion calm organic earth tone premium minimal` --design-system → Neumorphism + lavender #7C3AED + mindful green。**Declined**：embossed 软 UI 与暖炭/雾灰/earth-green 空间舞台世界不兼容（且 Neumorphism a11y risk high）。
- 两次命中的共享信息：health/wellness 类产品检索被几乎只有“传感/奶油色/圆角卡”的语料覆盖——这正是当前截图的 rut（米白平面 + 卡片）。**方向由 canonical 钉死（Warm Living Intelligence 空间舞台），检索作为反例校准。**
- `mobile touch target spacing one hand` --domain ux：确认触控间距 ≥8px、目标 ≥44px（将写入实现约束）。

## 1. 当前 UX 问题（按屏幕，引用源码事实）

### Today（apps/mobile/src/screens/TodayScreen.tsx @A2B6）
- 结构已基本对齐 canonical（Stage → Change → Attention → 主行动 → 最近发生），但：
- **U1 首屏层级仍是“区域堆叠”**：Stage 矩形块（含头部 name + headline 文字条）→ 文字行 → 行/块，视觉上仍是自上而下的列表节奏，空间锚定关系弱。
- **U2 3D 手势无处可用**：无可旋转对象，用户无法“围绕豆豆”探索；点宠物 → Pet 页，但 Pet 页同样无 3D 交互，形成“3D 不存在”的心智。
- **U3 行动入口分散**：+记录/看看它/问助手 拆成 PrimaryAction + ActionRow；与 canonical「+记录 / 看看它 / 问助手 三个主行动」的平衡感有出入（当前一主两副）。
- **U4 信息密度条数**：任务 OpenSection、注意力、变化叙述、最近发生同时出现时，首屏超过 1 个“注意事项”信号（注意力 + 变化叙述同屏）——认知负荷超标。

### Pet（apps/mobile/src/screens/PetScreen.tsx）
- 仍接近 Profile：圆形头像/角色头 + 域导航列表为主；域行以“按钮”阅读，未先表达“豆豆现在”。（∧ 需在实现中核实并修正）
- Pet World 的 Memory/Photo 展示弱；Life Pulse 缺失。

### Life View（apps/mobile/src/screens/LifeViewScreen.tsx）
- 仍偏“数据页”：状态环/列表式 overlay 为主，3D 主体缺失或仅占小区域；rotate/zoom 无法操作；（∧ 实现时核实）

### Web（apps/web/app/page.tsx、pets/[id]/page.tsx、pets/[id]/life-view/page.tsx）
- 桌面护栏相同；正在复用的 pet-living-stage.tsx 与 living-mode-switcher.tsx 尚未有真正 3D 场景。

## 2. 交互模型（本轮目标态）

```
看豆豆（Stage 中心，可旋转）→ 此刻状态（锚定在宠物周围）→ 变化（≤1 条注意力）
→ 行动（+记录 / 看看它 / 问助手）→ 记忆（最近发生时间流预览）
```

- 3D 手势：拖动 = 旋转（Life View 全量；Today/Pet 可限制为轻量旋转），双指/按钮 = 缩放（Life View），点宠物 = 进入 Life View；Reset 按钮恢复默认朝向。
- 状态锚点 = 可点击，展开「事实 / 与自己相比 / 来源 / 更新时间 / 证据」sheet（§23 canonical），不发明医学值。
- 感知度设计：3D 舞台顶部给一行轻量“拖动旋转”暗示（首见一次，淡出），避免 3D 手势不可发现。

## 3. 移动层级（390×844 优先）

- 一级导航保持 canonical IA：Today / Timeline / Pet / Assistant / Me（底部 ≤5）。
- 三屏共同构图：Stage 为第一视口主体（Today ≈ 40vh、Pet ≈ 45vh、Life View ≈ 全屏舞台），数据/行动在舞台下方以滚动内容承接；Stage 内文字（名字/此刻行/来源）保持可读、不遮挡主体。
- 触控：状态锚点与行动按钮 ≥44×44（Web 桌面 40px+ 亦可）；锚点间距 ≥8px；主行动单一视觉权重。

## 4. 认知负荷与可信

- 一屏 ≤1 个主要注意力；当前 danger + 变化叙述同屏问题：合并为一个 AttentionPanel（danger 优先），变化叙述并入注意力展开。
- 数据锚点至多 4–6 个，且只显示真实存在数据（无数据不造假值，显示“暂无记录”类占位）。
- 新鲜度/来源以次级字体呈现，弱化但不隐藏；禁止 raw enum/内部词（见 A8）。
- 3D 动画仅表达中性姿态（静止站姿/轻微呼吸式起伏），不表达情绪/疾病。

## 5. A11y（本轮实现门禁）

- 3D 信息必须有等价文本：accessibilityLabel 描述豆豆身份与当前状态文本；Web 提供 aria-label + 隐藏文本层。
- reduced-motion：关闭自动旋转/呼吸动画；提供静态 Reset 视图。
- Web 键盘：焦点可达、Enter 触发；旋转按钮可操作（不强制拖拽）。
- 对比度：正文 ≥4.5:1、大字 ≥3:1（用现有 tokens 复查）；风险色仅由确定性规则驱动。
- 状态完整：Loading / Empty / Error / Offline / Permission Denied / Feature Disabled / 3D Fallback / Stale 均要有可见文案（三屏共用状态组件）。

## 6. 逐屏裁决（实施前基线）

| 屏幕 | 层级 | 交互 | 认知负荷 | A11y | 合计 |
|---|---|---|---|---|---|
| Today | 中（区域堆叠）| 低（无 3D 手势）| 中（注意力双信号）| 及格 | 需重构 Stage + 收敛注意力 |
| Pet | 低（Profile 化）| 低 | 中 | 及格 | 需 Pet World 化 |
| Life View | 低（数据页）| 缺失（无旋转/缩放）| 高（锚点列表化）| 及格 | 需 3D Living Stage 化 |

## 7. 落地清单（映射到实现）

1. PetLivingStage 3D 化（Today/Pet/Life 三变体）+ 锚点空间排布规则（上 2 / 中 2 / 下 2 slot，宠物必居中不遮挡）。
2. Life View：此刻模式完整（锚点点击展开事实/相比/来源/时间/证据）、旋转/缩放/Reset、模式切换 此刻=完整 / 趋势/时间线/外观=最小实现或显式 disabled。
3. 注意力合并为一屏一条；行动三件套等权重布局。
4. A11y 模板：3D 等价文本 + reduced-motion 开关 + 键盘路径。
5. 空/加载/错误/fallback 文案模板（Clean Demo 语言）。