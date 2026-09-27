# R2P3D_CURRENT_VS_CANONICAL — 逐屏截图级审计（CURRENT / CANONICAL / GAP / ROOT CAUSE / DESIGN ACTION）

> 方法：真实读取当前实现（mobile 三屏脏版本 + web 三页 + PetLivingStage/PetStageRenderer/PetTwoPointFiveD）
> 与截图证据（v0.2.0 final、visual-v3-current 390/1440、artifacts/r2p/playwright）。canonical = v3.4-R1 §46.6/46.7/46.8 + §34。

## Today — Living Canvas（canonical §34.2 / §46.6）

### CURRENT
- Stage：暖色渐变背景（米白→浅暖）+ 2.5D 椭圆柯基 + 环绕锚点（进食/饮水/活动/睡眠，绝对 slot）+ 顶部名字 + 底部 headline/caption + "示例数据"chip。
- Stage 下：ChangeNarrative（若有）→ AttentionPanel（若有）→ 今天任务 → 快速记录(主) + 看看它/问助手(副) → 最近发生(OpenSection+LifeStream)。

### CANONICAL
> 3D Pet = Composition Center；状态与宠物产生视觉锚定关系；"不能再宠物在上、数据在下"；
> 今天整体稳定 / 现在 / 变化 ≤1 / 行动三件套 / 最近发生。

### GAP
- 宠物不是"空间主体"：是 hero 块内的 2.5D 贴图，与下方内容仍是**上下堆叠**。
- 无透视/光照/接触阴影/雾/景深 → 无空间感；锚点为"悬浮标签阵列"。
- 变化叙述与注意力可能同屏 → 双注意信号。

### ROOT CAUSE
- 呈现层停在 R2P 的 2.5D 授权方案（REAL_3D_PROVIDER blocked 时用 2.5D fallback 当作默认）；
- Stage 底层用色块 wash 而非 depth system（无雾/无阴影体系/无前景中景后景）。

### DESIGN ACTION
- PetLivingStage 接真实 3D scene（demo3d asset）：相机透视 + 暖 spot + rim + 接触阴影 + 低密度雾 +
  前中后景分层（environment → pet stage → overlay 锚点）。
- 锚点改为空间贴附（围绕宠物 body 的上/中/下轨），保留可点击 → 展开事实/来源/时间。
- 注意力收敛：danger 优先，变化叙述并入注意力面板；一屏一条。

## Pet — Pet World（canonical §46.7）

### CURRENT
- Stage（2.5D 豆豆 + identity 行）→ 豆豆最近（最近一次记录/与它自己相比/记忆行）→ 它的生活（健康/行为/训练/福利/社交 = "对豆豆现在意味着什么" 行）→ 生命与陪伴入口。

### CANONICAL
> 豆豆自己的 World：Identity + current pulse + recent memory + per-domain meaning rows；"这个域对豆豆现在意味着什么"。

### GAP
- 结构已对齐 canonical（narrative-first domain rows 存在）；gap 集中在：
  - **3D 主体缺失**（2.5D 扁平，同样无空间性）；
  - "它的生活"仍以列表行 + chevron 呈现 → 有"列表感"（恰是截图审计中的 utility 感来源）；
  - memory 只有一行文字，无媒体/时间锚点质感。

### ROOT CAUSE
- Pet 页在 R2P 重构时结构与 canonical 一致，但视觉执行仍停留在"行 + 图标 + chevron"；
- 无 3D、无记忆媒体展示。

### DESIGN ACTION
- 3D 化（比 Today 更大、轻微 rotation、环境略丰富：豆豆自己的空间）。
- "它的生活"行强化"现在状态"前缀（首字为该域此刻含义），弱化 chevron。
- Memory 区加入时间锚（最近照片/时间点占位以上下文文字呈现，不伪造媒体）。

## Life View — Photo-first Living View（canonical §34.3 / §46.8）

### CURRENT
- Stage（life variant，452px）+ 锚点（真实数据过滤）+ headline/caption +「3D 形象尚未创建」note；
- LivingModeSwitcher: 此刻/趋势/时间线/外观；ad-hoc panel 内容（趋势=ChIP 网格；时间线=LifeStream；外观=3D 待创建说明）。

### CANONICAL
> 核心 3D Living Stage：顶部 Pet/时间/新鲜度；中心可旋转 3D Pet；状态环绕；底部 [此刻][趋势][时间线][外观]。
> 锚点点击展开 事实/与自己相比/来源/更新时间/证据。禁止伪医学值。

### GAP
- **无 3D 场景**：note 直接写"3D 形象尚未创建"——基于 demo3d 资产后此文案必须改为诚实但正向的演示状态；
- **无旋转/缩放/Reset**（交互缺失 = A4 核心）；
- 锚点不可点击展开详情（此刻模式不完整）；
- 外观模式文案沿用"3D 未创建"，需更新为 demo 资产状态。

### ROOT CAUSE
- 3D infrastructure 从未接入（mobile/web 均无 3D 库）；交互契约（rotate/zoom）只存在于文档。
- "诚实状态"文案领先于真实能力：demo 3D 资产建立后，文案需同步升级。

### DESIGN ACTION
- 接入 demo3d renderer + 交互（rotate/zoom/Reset）；锚点可点 → 详情 sheet（事实/与自己相比/来源/时间/证据）。
- 此刻模式完整；趋势/时间线/外观 = 已有 minimal 实现微调（趋势用真实累计；外观改为"演示 3D 形象"说明 + 关闭真实媒体提示）。
- note 文案改为诚实正向：如"演示 3D 形象（开发环境）· 未来将用真实照片生成"。

## 横向判定汇总

| 维度 | Today | Pet | Life View |
|---|---|---|---|
| Pet Presence | 弱→目标强 | 弱→目标强 | 弱→目标强 |
| 3D Presence | 无→真实 3D | 无→真实 3D | 无→真实 3D（可交互）|
| Spatial Depth | 平面→三景深 | 平面→沉浸 | 平面→全屏舞台 |
| State Relationship | 标签阵列→空间锚定 | —（无锚点）→ pulse 化 | 标签→可点击空间锚定 |
| Visual Identity | 2.5D→demo3d 统一 | 同左 | 同左 |
| Card Density | 中→降（OpenSection 保留但弱化容器）| 中→降 | 中→降 |
| Utility/Profile/Hub/Admin Feeling | 中 | 列表感→世界感 | 数据页→Living Stage |
| 3D 交互 | 轻 | 轻 | 全量 rotate/zoom/reset |