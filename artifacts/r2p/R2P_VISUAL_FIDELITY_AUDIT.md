# R2P_VISUAL_FIDELITY_AUDIT — 为什么"干净"却没有 Pet Presence（impeccable 工作流产出）

> 日期：2026-09-27
> 方法：`impeccable` v4.0.4 的 native audit 流程（reference/audit.native.md 骨架 + reference/critique.md
> 评估维度）。Setup 已跑 `context.mjs --target TodayScreen.tsx`（返回 NO_PRODUCT_MD →
> 以 Goal + v3.4-R1 作为本次结构化 brief，P0 不创建 PRODUCT.md，记录在案）。
> Assessment B：`detect.mjs --json` 对 TodayScreen/PetScreen/LifeViewScreen = **[]（0 findings）**。
> Assessment A：design-director 源码 + 像素证据评审（本 Agent 执行；未起浏览器可视化 —— 原生 RN，
> 无浏览器 overlay 适用，符合 audit.native.md 的 source-based audit）。

## 0. Audit Health Score（5 维，0-4）

| # | Dimension | Score | Key Finding |
|---|---|---|---|
| 1 | Accessibility | 3 | labels/roles 基础齐全；新组件需保持 4.5:1、≥44dp、大文本不裁切 |
| 2 | Performance | 3 | ScrollView + 轻量 API 调用；无重型渲染；多屏复用需注意引用稳定性 |
| 3 | Appearance & Theming | 2 | tokens 齐全且无散落 hex；但实际成图 white≈50%，暖调被白卡稀释 → 观感落回通用 |
| 4 | Platform Conformance | 3 | React Navigation 原生栈 + Expo，无 web 移植感；Tab≤5 ✓ |
| 5 | Adaptivity | 2 | 390dp 单列 OK；Web 桌面双栏已做；LifeView 新布局需防 360dp 溢出 |
| **Total** | | **13/20 = Acceptable（significant work needed）** | 首要缺口在 Presentation 结构而非代码质量 |

Platform Conformance Verdict：read as native app（Pass）；read as "宠物管理 App"（Fail）— 两者不矛盾：
工程上是原生，产品呈现上是通用 dashboard 语法。

## 1. 为什么"干净"却没有 Pet Presence（根因）

impeccable 视角的四条判断，全部适用：

1. **Design Specificity 缺失**：当前构图（hero 卡 + 圆角白卡 + 纵向分段）可以被任何
   "宠物管家 / 记账 / 水站" 产品原样复用。没有一条视觉语法是从"这只宠物存在于这里"长出来的。
   → §46.5 Surface Taxonomy 有 12 类 primitives，但三屏实际只用了 Hero/OpenSection/InlineMetric 3 类。
2. **没有层次，就没有空间**：所有元素都浮在同一平面（canvas+surface 两层）。像素证据 dark≈2-10%。
   宠物"不在空间中"，照片/插画才需要在背景-中景-前景之间呼吸。→ 必须引入 BACKGROUND/MIDGROUND/FOREGROUND。
3. **数据不跟宠物发生空间关系**：数据全部线性排列在 pet 下方（G1/G3），
   "围绕宠物组织"（§9 PLM State Carrier）从未在布局上成立。
4. **Identity 由文字承担**：media uri 恒 null → 永远 species glyph → 用户回答 Q2 只能答"一只狗"。
   没有任何 presentation 层表达"这是豆豆"。→ 本轮生成 identity-specific demo visual（用户已批准）。

## 2. 必须阻止的错误捷径（Goal §6.2）

```text
「米白背景 + 圆角 + icon + 柔和阴影 = 高级」
```
判定：这是当前 v0.2.0 已经踩中的陷阱（tokens 正确、密度正确、但观感=通用）。R2P 明确禁止：
- 只改 token 不改构图；
- 用更多圆角/阴影/图标堆"质感"；
- 把 pet 放大的同时仍保持"卡片堆"。

替代：以「舞台（stage）」为构图单元 —— 背景环境层 + 宠物中景 + 状态/注意/动作前景，数据锚定在宠物周围。

## 3. 关键 Findings（audit 骨架，severity 分级）

| # | Severity | Finding | Location | Recommendation |
|---|---|---|---|---|
| V1 | P0 | 三屏无空间层次；white≈48-52% | 三屏 + tokens 使用方式 | 引入 stage 构图 + 环境层（warm gradient/soft wash），surface 只用于信息区 |
| V2 | P0 | media uri 恒 null → generic glyph | demoPetVisual.ts | identity-specific demo visual（DEMO/SYNTHETIC 标注）+ renderer 抽象（photo/2.5D/generated/3D） |
| V3 | P0 | Today/ Pet/ LifeView 数据与 pet 无空间关系 | 三屏布局 | 点/锚定/环绕 metrics（PetStateAnchor 语法），首屏 ≤2 信息块 |
| V4 | P1 | Pet 域行 = 导航菜单感 | PetScreen rows | 叙事化（先讲豆豆）leave 0-1 行走主列表 |
| V5 | P1 | LifeView 无模式层，升级 3D 无占位 | LifeViewScreen | LivingModeSwitcher（此刻/趋势/时间线/外观）+ PetStageRenderer 接口 |
| V6 | P1 | Home hero 与 LifeView stage 是两套视觉 | PetHero vs LifeView stage | 统一 PetLivingStage 语法，hero=stage 的紧凑变体 |
| V7 | P2 | 3D 诚实态孤立小卡 | LifeViewScreen | 并入 stage 副文案（"3D 形象尚未创建 · 当前以照片与记录呈现"） |
| V8 | P2 | 少量加工位文案像工具（"最近"、"生活摘要"） | Today/Pet | copy 从"段落名"换成"豆豆的话"（"豆豆最近…"） |

## 4. 正向资产（保持）

- tokens 系统完整（COLORS/TYPE/SPACE/RADIUS/语义色），无散落 hex；
- 术语干净：三屏无 BW-*/raw enum/事件 key（G9，grep + 源码确认）；
- 结构顺序符合 R.2 主轴（PET→NOW→CHANGE→ATTENTION→ACTION→MEMORY）；
- text 与来源始终高于装饰（canonical §34.1 已遵守）；
- a11y 基础好（labels/roles/state）。

## 5. polish 清单（P0 终检，沿用 §30）

spacing 节奏 · visual balance · typography hierarchy · depth · alignment · surface hierarchy ·
Pet dominance（>50% 首屏视觉权重）· button density（每屏显性按钮 ≤4）· icon consistency ·
microcopy（豆豆话术）· visual rhythm · premium quality。逐项过，不自我放行。

## 6. 结论

代码质量不是障碍，**构图语法**才是。R2P P0 = 把三屏从「卡片堆」换成「宠物舞台」，并用 identity-
specific demo 视觉把"豆豆"放回画布中心。方向和判据在 R2P_VISUAL_DIRECTION.md。