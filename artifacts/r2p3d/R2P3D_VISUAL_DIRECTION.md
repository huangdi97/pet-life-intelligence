# R2P3D_VISUAL_DIRECTION — 视觉方向合约（design synthesis）

> 方法：frontend-design 两遍法（先个性化 token 方案 + 对照反模板清单自检，再写代码）+
> impeccable 方向记录（new-work §5 合约格式）+ concept-seed roll 记录。brief（canonical v3.4-R1 Visual System V4）
> **钉死方向 → 骰子让步**，按 new-work 无人值守路径执行并明示假设。

## 1. concept-seed roll 记录（impeccable）

- roll：`concept-seed.mjs`（key e9e98543；source api；approved pool c3b204a1eed6）→ ASSIGNED INDEX 5。
- 目录 challengers 放出 6 张：ukiyoe block printing / civic bureau prospectus / hypercard stack /
  oscilloscope / multiplane cel dawn / miura fold sheet。
- 裁决（brief-pinned world 优先）：
  - **Win（discipline donate）**：`cinema-cinematography-editing-multiplane-cel-dawn` — 借其纪律：
    **分层景深（前中后景以不同速率运动/雾化）、低密度空间雾、单一暖灯焦点**（chal 中 cottage lamp = 我们的暖 spot），
    命名为 **RAISE-multiplane** 并入方向。不挪用其 cel 动画/画框语言。
  - decline：ukiyoe（平涂色块=我们的反例）、civic prospectus（Civic 办公黑体紫罗兰=背离暖世界）、
    hypercard（b&w 复古=非生命温暖）、oscilloscope（示波器=医疗监护仪，canonical 明禁）、
    miura（折纸科技=机械非有机）。
- 假设声明（无人值守替代）：用户不可交互；方向由契约+canonical 钉死；如用户后续不满可 reroll。

## 2. 方向合约（impeccable new-work §5 五块，150 词内）

- **THESIS**：一只具体的狗（豆豆）此刻正存在于一个温暖的空间里；本方向拒绝
  "hero 矩形 + metric 列表"与"米白底 + 圆角卡"两类模板默认。
- **OWN-WORLD**：暖炭基底、暖白与雾灰过渡、earth-green 低饱和强调；3D 宠物为唯一光体
  （暖 spot + 柔 rim + 接触阴影）；锚点 = 极简毛玻璃浮标，数据层透明贴附宠物周围。
- **STORY**：打开 PLI → 立刻"看到豆豆在空间里"→ 状态围绕它 → 变化 ≤1 条 → 行动 → 记忆。
- **FIRST VIEWPORT**：豆豆以可旋转 3D 站姿居中于舞台（约 66% 视口高），名字+此刻行在其下；
  环绕锚点 4–6 个贴附；背景暖炭→暖白纵深渐隐 + 低密度雾 + 暖 spot 光斑。
- **FORM**：Warm Living Intelligence 空间舞台（canonical §46.5）；seeded world；
  wall 之 rut = generic glyph + beige + cards。

## 3. Token 方案（frontend-design 两遍法，Pass 1）

| Token | 值 | 角色 |
|---|---|---|
| 背景基底 | #171310（暖炭）| Stage 环境远层 / 深色文案底 |
| 暖白 | #FAF6EF | 文案主色（Stage 上）/ 页面浅底时正文底 |
| 雾灰 | #8A7F72（暖雾灰）| 次级文案/雾层 |
| earth-green | #6E7F5B（鼠尾草绿）| 强调/成功/品牌（非饱和荧光）|
| 中性浅 | #EFE9E0 | 浅面/分隔 |
| 暖棕话题 | #B07D5B（陶土但降饱和，非 terracotta 高亮）| 主行动/图标（克制）|

- **Type**：正文/标题用一套系统无衬线（PingFang/Noto Sans SC 系），数字用tabular，不引入装饰字体；标题用字重与行距分级，不做大字衬线展示（避开 cream+serif+terracotta 聚类）。
- **Layout**：Stage 全宽沉浸（margin 0，内部安全圆角可选）；数据区窄于舞台、居中阅读列；
  行内对齐左对齐 + 数值右语义（指标行内联，非独立卡）。
- **Principles**：宠物唯一焦点；深度=雾+接触阴影+soft spotlight；锚点≤6 且不遮挡；
  一屏一次编排动效；card 非默认容器。

## 4. 反模板自检（frontend-design calibration；Pass 1.5）

- ☑ 不是 cream(#F4F1EA)+serif+terracotta(#D97757) 聚类：基底改暖炭、强调改低饱和陶土/鼠尾草，非高饱和橘。
- ☑ 不全是圆角卡：注意力用面板条(圆角小)与内联行；OpenSection 保留但弱化容器线。
- ☑ 无全大写 eyebrow / 01-02-03 编号 / em-dash 标签 / mono 伪技术 / emoji 图标。
- ☑ 无渐变文字；无零偏移 halo 阴影；无嵌套卡。
- ☑ 动效：stage 淡入一次 + 宠物线性中性呼吸（reduced-motion 关闭），无逐卡 hover 入场。

## 5. 授权边界记录

- demo 3D 资产（豆豆 corgi / 咪咪 cat）：DEMO/SYNTHETIC · development-only · provenance 显式；
  永远不是事实/医学来源；外观不替代真实照片/记录（文案策略 §A5/Life View note）。
- 术语红线（user-facing）：禁 数字孪生/生理仿真/AI 诊断体/预测生命/虚拟生命体/LIVE/实时；
  用 豆豆·此刻 / 3D 形象 / 生命视图 / 看看豆豆 / 回到那一天。
- 禁入风格：cyberpunk、HUD、neon、grid floor、满屏光圈、粒子堆砌、医疗监护仪、游戏属性环。