# R2P3D_VISUAL_FIDELITY_AUDIT — 视觉保真审计（impeccable 职责）

> 方法：impeccable skill（context.mjs / new-work / craft-floor）。回答核心问题：
> **为什么当前截图“整洁”，却仍然像普通宠物管理 App？**

## 1. 结论先行

当前截图（v0.2.0 与 R2P 轮）满足“干净、对齐、字号统一”，但视觉语言落在两类
**AI/模板默认 (rut)** 上，所以一看就是“宠物管理软件”：
**cream-hero + metric 模板** 与 **card-as-default 的 SaaS kit**。

## 2. 逐项判定（对照截图证据与源码）

| 维度 | 现状 | 判定 |
|---|---|---|
| Pet Presence | 2.5D 扁平椭圆柯基或 species glyph；面积小、材质平 | 弱：遮住文字后是“插图”，不是“在场的宠物” |
| 3D Presence | 无任何 3D；无透视/相机/体积光/接触阴影 | 无 |
| Spatial Depth | 米白/暖色平面渐变 wash（`stageGradient` + 一个右上的圆 wash）| 无真实前/中/后景；无雾、无景深、无 parallax |
| State Relationship | 锚点以绝对 slot 摆放（top 12% / 44%…），但视觉仍像“悬浮标签阵列”而非空间锚定 | 弱 |
| Visual Identity | 豆豆有 2.5D 柯基（比 glyph 进步），但材质/光照/形体仍“插画风”，非“数字生命在场” | 中低 |
| Card Density | Today 下方 OpenSection/task 行/AttentionPanel 仍以圆角容器为主 | 中：Card is still the default container |
| Utility / Profile / Hub / Admin Feeling | Pet 页角色头+列表；Life View 数据页 | 强：Profile+列表感 |

## 3. 为什么“整洁却普通”——根因（对应 craft-floor 的 rut 清单）

1. **Hero-metric 模板**（craft-floor Refuse 第一则）：大头像/矩形 hero + 下面几行 metric。
   当前 Stage 本质上仍是“hero 矩形 + 数据在下方”，宠物与数据是**上下关系，不是空间关系**。
2. **cream 默认**（frontend-design/calibration）：`#FFF7ED`-类米白背景 + 暖色文字，正是 AI 生成界面
   第一大聚类（cream + serif + terracotta）。当前 canvas/stage 色接近此默认 → 一眼“模板”。
3. **Card as default**：AttentionPanel / OpenSection / task rows 都是软圆角容器；craft-floor 明令
   “cards are the lazy container; nested cards always wrong”。
4. **2.5D 椭圆插图 ≈ sketch-level SVG 模仿图片**（craft-floor: “Real illustration or none”）：
   一组 Ellipse 拼成的柯基在材质、光照、体积上停在“示意图”，不足以承载“生命在场”。
5. **无 depth system**：stage 只有色块 wash，无接触阴影、无 rim、无雾、无前景/背景分离；
   阴影/高光没有偏移与软模糊体系。
6. **等权 UI 肌理**：chip、outline button、secondary rows 全是同一“圆角浅灰”皮肤 → 无主次节奏。

## 4. 证据引用

- mobile `tokens.ts`（脏版本）`stageGradientTop/Base` 与 `wash`；`PetLivingStage.tsx` 的 env 层 = 两个色块 + 圆 wash。
- `PetTwoPointFiveD.tsx`：全部为 `Ellipse` 基本形；无光照/无材质分层。
- v0.2.0 `_s_01_Today.png` / `_a_Today.png` 与 `visual-v3-current/today-*.png`：米白暖底、上方宠物块、下方列表。
- wrap-up 记录：视觉统计 warm 0.81–0.97 / white 0–20% —— 米白平面占统治地位。

## 5. 目标态（craft-floor 反推）

- **Depth system 取代平面 wash**：暖炭基底 + 低密度雾 + 一只暖spot + 柔和 rim + 真实接触阴影；
  前中后三层（环境背景 → 中景宠物舞台 → 前景 overlay 层）。
- **3D 取代 2.5D 插图**：体积/光照/相机让豆豆“存在于空间”；同一模型跨三屏（身份一致）。
- **宠物为唯一主焦点**：状态锚点贴附宠物周围，数据不再占用卡片。
- **Card 不再是默认容器**：注意力用面板条（非圆角层）或内联叙事；行内信息用文字+分隔，克制使用容器。
- **校准自检**：遮住文字后，截图应回答“这是一只持续存在的数字化豆豆”，而非“米白底 + 圆角块列表”。

## 6. 禁入清单（本轮视觉实现红线）

- 禁：hero-metric 模板、同尺寸“图标+标题+文字”卡片网格、嵌套卡片。
- 禁：eyebrow/kicker（标题上方小标签）、section 编号 01/02/03（非序列内容）。
- 禁：sparkline/进度环/软阴影圆角矩形替代内容；mono 字体扮“技术”；emoji 代替图标。
- 禁：渐变文字、装饰性 glass/blur、>1px 彩色左边框。
- 禁：cyberpunk/HUD/grid floor/neon/医疗监护（canonical §34.1）。
- 禁：单个单词内强调（一句话里只高亮一个词）、全大写标签、spaced em-dash 造标签。

## 7. 微细部（must-have）

- 有限阴影偏移+模糊（深度）；文字与背景对比 ≥4.5:1；段落行宽 ≤80ch（Web 大屏）。
- 一屏一次编排动效（如 stage 淡入 + 宠物轻呼吸），不做逐卡 hover 动效。
- 状态锚点图标准确（专用图标库一致 stroke），非 emoji。