# R2P_CURRENT_VS_CANONICAL_GAP — v0.2.0 现状 vs v3.4-R1 canonical 差距表

> 日期：2026-09-27
> 证据来源：artifacts/visual-reconstruction/v0.2.0/ 真实截图（像素统计）+ 三屏源码结构（L1）+ v3.4-R1 §46/§34/§33/§47（L3）。
> 方法：本 Agent 为文本模型，人眼验收属于用户；本表用于把 code + 像素证据翻译成可核验的差距清单。

## 0. 实测像素证据（before ≈ v0.2.0 P0 起点）

```text
_s_01_Today.png     212×460 ：white≈48% · dark≈2% · 顶部 1/3 white≈42%
_s_04_Pet.png       212×460 ：white≈47% · dark≈8% · 顶部 1/3 white≈40%
_s_05_LifeView.png  212×460 ：white≈52% · dark≈2% · 顶部 1/3 white≈47%
pet-390.png         1024×2216（=390×844dp 全高）：white≈52% · dark≈10% · 顶部 1/2 white≈50%
```

释义：画面约半数被白色 surface 占据，顶部（hero 区域）也约一半是白色，深色/中景占比极低 → 页面读起来
是「暖色底布 + 白色卡片堆叠」，而不是「宠物为主体、数据围绕宠物的空间界面」。

## 1. 源码结构证据（三屏均为：PetHero / 大 block → 纵向 OpenSection 堆叠）

```text
TodayScreen     = PetHero(290dp) ↓ LifeSignal ↓ BaselineChange ↓ AttentionPanel ↓ Tasks ↓ PrimaryAction+ActionRow ↓ 最近 OpenSection
PetScreen       = PetHero(300dp) ↓ 生活摘要 OpenSection ↓ LifeView 入口 ↓ 它最近怎么样 OpenSection(5 域行) ↓ 陪伴与在家 OpenSection
LifeViewScreen  = pageTitle ↓ stage(PetMedia full-bleed + overlay) ↓ 生命轨迹 OpenSection ↓ 3D 形象 card ↓ 回到今日
demoPetVisual.resolvePetMediaUri() = 恒返回 null → Hero/Media 永远走 species glyph（generic corgi）
```

## 2. GAP 表

| # | Current Screenshot（当前） | Canonical Intent（v3.4-R1） | Observed Gap | Severity | Planned Correction（R2P P0） |
| G10 | Web 三页存在（`/`=Today、`/pets/[id]`=Pet、`/pets/[id]/life-view`=LifeView），但与 mobile 同构：v4-art blob + paw glyph + hero 卡，无 identity 视觉 | §48.2 Web Parity 要求 V4 视觉语言（larger canvas / responsive composition） | 结构存在但呈现与 mobile 同样 flat（web 无 identity-specific 视觉；life-view 是 .v4-stage dark 大卡） | P1 | web 三页同步升级为 stage grammar：身份视觉 + 三层深度 + 390 单列 / ≥1024 双列，语义化 HTML；media 复用同一 identity visual（用户已批准） |
| G1 | Today：上部 290dp PetHero 卡片，其余为纵向 white OpenSection 堆叠（此刻/基线/注意/任务/记录/最近） | §46.3 PET→NOW→CHANGE→ATTENTION→ACTION→MEMORY；§46.6 PetHero→此刻→基线变化→One Attention→Primary Action→Life Stream Preview | Hero 是「一张卡」而非「一个舞台」；Pet 在上、数据在下，"data 与 pet 无视觉关系"；首屏被信息段占据而非宠物占据；CARD 密度偏高（white≈48%） | P0（阻断 R2-P 目标） | 重构 Today 为 living stage：宠物视觉作为画布中心，此刻/饮水/进食/活动/睡眠锚定在宠物周围（极轻 overlay），上方保留身份+整体稳定一行，Attention 唯一化，Life Stream 收进底部 |
| G2 | Pet：300dp PetHero + 生活摘要 + LifeView 入口 + 5 域行 + 陪伴/在家 → 读起来仍是 Profile + Navigation hub | §46.7 PetHero→Identity→Life Summary→Life View→Domain Meaning Rows→Memories；「先讲豆豆，其次才允许 navigation」 | 域行是「功能菜单 + 一句话」而非「这一只宠物的生命侧面」；Memory（重要生活事件）缺失；Life View 入口是普通行而非 pet stage 延伸 | P0 | Pet 重构为 Pet World：身份层更强（identity visual + 名称 + 年龄/breed/sex），Life Pulse（现在/最近变化/记忆），域用「豆豆最近…」的叙事行表达该域对此刻豆豆的意义，入口降权 |
| G3 | Life View：标题+大字 → stage（PetMedia full-bleed 大图/glyph + 名字 overlay）→ 轨迹 OpenSection → 3D 卡 | §46.8 宠物视觉→此刻→真实来源状态→生命轨迹→3D 诚实状态；§34.3 中心 pet + 环绕状态（活动/饮水/进食/睡眠/体重/任务）+ 底部模式（此刻/趋势/时间线/外观） | "看一个浮在卡片上方的大图" 而非 "看豆豆的 living stage"；状态没有环绕/锚定关系；无模式切换；3D 诚实态是独立小卡（低调但生硬） | P0 | Life View 重构为 Pet Living Stage：中心 pet 权重最高，此刻/饮水/进食/活动/睡眠/体重等锚定在 pet 周围（edge/floating anchor），底部模式条（此刻/趋势/时间线/外观），3D 诚实态并入 stage 副文案，不占主视觉 |
| G4 | 三屏 pet visual 都用 generic species glyph（media uri 恒 null） | §46.5 Pet Media hierarchy：identity-specific demo photo/生成视觉 > species visual > letter | 用户看到「一只狗」而非「豆豆」；identity 靠文字不靠视觉 | P0 | 生成/接入 identity-specific demo 视觉（透明 cutout / 2.5D layer），标注 DEMO/SYNTHETIC；species glyph 仅作 fallback |
| G5 | 三屏都是同平面：canvas + surface 两层 | §34.1 三层视觉深度背景/中景/前景；§46.5 Warm Living Intelligence | 无空间感；dark≈2-10% 说明没有深色中景层 | P0 | 每屏建立 background（warm gradient/环境）+ midground（pet stage + 软阴影 + 微视差/层次）+ foreground（status/attention/action 前景层） |
| G6 | Today 首屏信息密度：hero + 5 段 | §47.2 Today 首屏同权大 Card ≤ 2；§17 首屏不该塞多任务多按钮 | 首屏结构仍是信息流 | P1 | 首屏收敛：身份+此刻(stage) + ≤1 注意 + ≤1 主 CTA；其余收进下方 |
| G7 | LifeView 无模式、无趋势入口 | §34.3 底部 [此刻][趋势][时间线][外观]；§20 Life View 默认「此刻」 | 缺模式化体验 | P1 | 底部 LivingModeSwitcher（此刻默认），其余模式为 P1 扩展占位但交互存在 |
| G8 | Pet 域行标题是「健康/行为/…」功能词 + 数字 | §46.7 域行要表达「这个域对豆豆现在意味着什么」 | 有意义的域叙事较弱（有改善但仍是行式菜单） | P1 | 域行改为「豆豆最近…」叙事（最近 7 天 N 条记录 / 最近一次观察 / 当前目标 / 近期观察 / 最近互动），微图标弱化 |
| G9 | 三屏 Owner 可见输出经源码检查无 BW-*/raw enum/事件 key（R2 已达标） | §47.1 OWNER_INTERNAL_TERMS=0 | 无（保持）；但新增代码不得回退 | P0（保持） | 保持 0 泄漏；新增组件/文案经 grep 复检 |
| G10 | Web（apps/web）无 Today/Pet/LifeView 三页 | §48.2 Web Parity（Today/Timeline/Pet/LifeView/Assistant V4 已迁） | R.2 报告称 Web 已迁，但 apps/web 实际没有这三页（仅 monitoring/admin 向） | P1（内容完整性问题） | apps/web 新增 /today /pet /life-view 三页，应用同一 design grammar（用户已批准完整实现） |

## 3. 结论

v0.2.0 的 R.2 实现是「结构对、密度对、术语对」但「呈现不对」：Pet 不是视觉焦点、数据不与宠物建立空间关系、
没有三层深度、identity 靠文字。这正是 R2_PRESENTATION_FIDELITY = NOT_ACCEPTED 的根因。

P0 三屏重构必须同时解决 G1-G5（P0 级）并处理 G6/G7/G8（P1 级，在 P0 内一并落实），G9 保持，G10 由 Web
双端实现承担。GAP 关闭判据汇总于 R2P_VISUAL_DIRECTION.md 的 acceptance 清单。