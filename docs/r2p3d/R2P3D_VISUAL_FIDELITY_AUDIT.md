# R2P3D Visual Fidelity Audit

> 责任技能：impeccable（craft-floor 原则：premium finish、surface hierarchy、pet-first、克制智能）。阶段：Phase A 基线审计；最终以真实 screenshot 人工复核为准（`HUMAN_VISUAL_ACCEPTANCE=PENDING`）。

## 1. 视觉方向判定（Pinned，不可协商）

- **North Star**：Warm Living Intelligence + Living Holographic Twin（真实/温暖/生活化/有生命感/高级/可信/克制智能/空间感/个体感/数字存在感）。
- **禁止**：纯赛博 / 钢铁侠 HUD / 满屏蓝 / 霓虹网格 / 游戏属性页 / 儿童玩具 / 医疗监护仪 / 普通 SaaS / 卡片 Dashboard / 蓝色 wireframe / 扫描线 / 网格 body。
- **Twin 规则**：95% 个体外观（真实 PBR 毛色/花纹/体型/项圈）+ 5% 投影语言（轻微半透明、极弱 edge bloom、极薄 projection halo、轻体积光、少量粒子、环境匹配光照、真实接触阴影）。

## 2. 模板感检查清单（当前状态）

| 检查项 | 判定 | 证据/行动 |
|---|---|---|
| 是否模板感 | 部分 | P0 已去 Card dashboard；仍需对 Today 下半屏/二级页做最终截图复核 |
| 是否 Card 过多 | 缓解 | 引入 OpenSection/AttentionPanel/StoryRow/InlineMetric/MediaTile/TimelineNode；二次页复核时逐页计数 |
| 宠物是否焦点 | ✅ | Today/Pet/Life View 均以同一 3D Twin 为构图中心，状态围绕宠物空间排布 |
| 全息是否过重 | ✅(基线) | 无蓝色 wireframe/扫描线/网格 body；投影语言为轻半透明 + 接触阴影 + 极弱 bloom |
| 是否游戏 HUD | ✅ | 无血条/属性环/准星；锚点为毛玻璃浮标 |
| 是否 SaaS | ✅ | 非表格/非左右布局/非按钮群主页 |
| 生活感是否不足 | 待截图复核 | 主证据：Today 上半屏 Twin 实拍 + 下半屏叙事流 |

## 3. 表面治理（Surface Governance，§55）

- 原则：**Card is not the default container**。
- 优先容器：OpenSection / InlineMetric / StoryRow / TimelineNode / MediaTile / AttentionPanel / BottomSheet / ImmersiveStage。
- Glass 仅用于：导航、控件、小型浮层、状态展开、Explain、模式切换；禁止整页正文玻璃化。

## 4. 设计 Token 一致性

- 单一 token 源：`apps/mobile/src/tokens.ts` + `apps/web/app/globals.css`（V4 warm tokens：暖米/陶土/雾灰/earth-green 家族 + 冷白投影青色点缀，符合 Reality Field 暖光 + Twin Field 冷白青）。
- 二级页不得重新定义 color/spacing/radius/font（A6 复核时 grep 私有 style blob）。
- 字阶/行高/间距沿用 V4（见 tokens 摘要，Explorer 报告将附）。

## 5. 生活化 vs 科幻强度（§52 规定）

- Today：生活感 5/5、Twin 科幻感 2/5
- Pet World：生活感 4/5、Twin 科幻感 3/5
- Life View：生活感 3/5、Twin 科幻感 5/5（科幻来自空间/深度/材质/交互/数据关系，**不是蓝色 HUD**）
- Reality Field（暖光/家/草地/真实照片/Camera/Memory/自然色）与 Twin Field（冷白/极轻青/轻透明/空间投影/结构化状态）融合 = 品牌视觉。

## 6. Motion（§54）

- Presence：neutral idle + 轻微 weight shift + 中性呼吸 —— 不表达情绪。
- Data Arrival：事件同步时状态锚点轻变化。
- Memory：切换过去日期 Presence 淡出、历史媒体/版本淡入。
- Live：Twin→Live Camera 必须明确来源切换。
- Reduced Motion：系统设置开启时关闭非必要动画（已实现于 viewer）。

## 7. 硬标准预检（§70，最终以截图逐项判定）

- generic dog glyph 不得为核心主体（P0 用程序化个体 3D，glyph 仅作 species fallback）
- 普通狗照片不得冒充 3D
- 蓝色 wireframe = FAIL
- 3D 不得只在文案里（三屏真实 WebGL/WebView 渲染）
- Life View 必须可 rotate（P0 已实现 angle A/B 像素差测试）
- Pet World 不得是 Profile/Hub（P0 已实现域现状语义）
- Today 不得是 Dashboard
- Health/Behavior 不得是 raw record list
- Social 不得是 test pet list
- Owner UI raw enums = 0

> 复核方式：A8 真实截图 + 像素差脚本 + A11 视觉验收报告逐项勾选；人工 Gate 保持 PENDING。
