# PLI Visual System V4

> 阶段：Stage R.2 · 日期：2026-09-26 · 状态：MOBILE + WEB + MINI IMPLEMENTED（v0.2.0）
> 目标分支：feat/pli-v0.2-product-experience-reconstruction · 依据 GOAL §75 / §8-§15

## 1. 设计原则（Design Principles）

视觉人格：**Warm Living Intelligence（真实 · 温暖 · 有生命感 · 高级 · 可信 · 克制智能）**。

两个必须避免的极端：

- SaaS Admin / CRUD（白卡 + 边框 + 表格）；
- Cyberpunk / Medical Sci-Fi / Gaming HUD（霓虹、发光、游戏化）。

PLI 处于「真实宠物生活 + 柔和数字智能」之间。

判断一条原则：**用户第一眼看到的是宠物，还是模块？** 任何页面看起来像后台、表单、功能菜单或系统诊断页，即使功能正确，也尚未完成 PLI 的产品设计（GOAL §121）。

## 2. Color System V4

实现位置：`apps/mobile/src/tokens.ts`（COLORS，含 legacy alias）、`apps/web/app/globals.css`（--v4-*）、`apps/mini/src/styles/tokens.scss`。

| Token | 值（mobile） | 用途 |
|---|---|---|
| canvas | #F6F1E9 | 页面暖底色，替代大面白底 |
| surface | #FFFFFF | 少数真实需要抬升的表面 |
| surfaceRaised / surfaceGlass / surfaceOverlay | #FFFDF8 / #FFFFFFCC / #FFFFFFF2 | 抬升面 / 玻璃 / 浮层 |
| surfaceDark / surfaceDarkRaised | #2B2620 / #3A332B | 沉浸深色（Life View） |
| textPrimary / Secondary / Tertiary | #2B2723 / #5C554C / #8A8074 | 文字三级 |
| textInverse / textOnDark | #FBF7F0 / #EFE8DD | 深色面文字 |
| brandPrimary / brandPrimaryDeep / brandPrimaryDark | #6E8B5E / #4E6349 / #3D4F3A | 植物绿（保留品牌方向） |
| brandSecondary | #B9762A | 暖琥珀 |
| brandSoft / brandSoftGreen / brandSoftAmber | #E7E3D8 / #E4EAE0 / #F6ECDC | 品牌柔面 |
| attention / attentionBg | #A97B2C / #FBF3E0 | 值得关注（温和） |
| warning / warningBg | #C07A2D / #FDF2E3 | 即将就医级 |
| danger / dangerBg | #B42318 / #FBEAE6 | 仅 deterministic URGENT/EMERGENCY |
| success / successBg | #4E7A5A / #EDF3EE | 完成/正常 |
| info / infoBg | #3E7C83 / #E8F1F2 | 信息 |
| mediaOverlay / scrimLight / scrimDark | #0000001A / #00000033 / #00000066 | 媒体遮罩 |
| dividerSubtle / dividerStrong | #E9E2D6 / #D8D0C4 | 分隔线 |

目标：**减少「所有东西白底 + 边框」**，用 canvas 暖底 + 间距 + 图片 + 背景层级分层。

## 3. Typography V4

实现位置：`apps/mobile/src/tokens.ts`（TYPE）。

| 角色 | 值（mobile，逻辑 px） | 用法 |
|---|---|---|
| Display | 34 | 极少数大场面 |
| Hero Name | 30 / 700 | 宠物名（Today/Pet Hero） |
| Page Title | 22 | 页面标题（时间线 / 生命视图 / 助手） |
| Section | 16 | 区块标题 |
| Body / Body Strong | 14 | 正文 |
| Meta | 12 | 说明 / 来源 |
| Caption | 11 | 时间戳 / chip |
| Metric | 20 | 数字摘要（此刻） |
| Button | 14 | 按钮 |

规则：不再所有页面使用「大黑标题 + 灰副标题」同构模板，标题形式随页面角色变化：

- Today：`豆豆` / `今天怎么样？`（Hero）
- Pet：`豆豆` / `3岁2个月 · 柯基 · 雌性`
- Timeline：`时间线` / `记录每一天真实发生的事情`
- Life View：`生命视图` / `豆豆 · 此刻`

## 4. Spacing / Radius

- Spacing：4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48（SPACE s1–s12）。页面左右边距统一 16。
- Radius：8（sm）/ 10（md）/ 12（lg）/ 16（xl）/ 20（xxl）/ 24（hero）/ 999（pill）。
- 图片自带圆角边界时不再包 Card。

## 5. Surface Taxonomy（§9，禁止 Card 为默认容器）

| Surface | 定义 | 规则 |
|---|---|---|
| OpenSection | 标题 + 分隔线 + 内容，无边框容器 | 信息本身有天然边界，不再加 Card |
| MediaHero | 全宽媒体（照片/物种视觉）作视觉焦点 | 图片本身提供视觉边界，不包白卡 |
| PetHero | 宠物主视觉：媒体 + scrim + 名字/标题/身份/时间 | Today/Pet 第一视觉焦点 |
| InlineMetric | 行内数字指标（此刻：进食 2 次 · 饮水 198 ml） | 无边框，靠间距分层 |
| SoftPanel | 品牌柔色面板（brandSoft* / attentionBg 等） | 需要「存在感但不硬」时使用 |
| FloatingAction | 悬浮/模态主操作（快速记录） | 一级 CTA，不用 4 个 Ghost 横排代替导航 |
| StoryRow | 紧凑事件行（时间 + 事件 + 来源/媒体） | 列表用 divider，不每行 Card |
| TimelineNode | 时间轴节点（● 时间 + 事件 + 元数据） | 时间轴本身是视觉骨架 |
| MediaTile | 方形/时间线缩略图 | 统一 PetMedia variant |
| AttentionPanel | 一条关注/平静态面板 | One Attention |
| BottomSheet / Modal | Quick Log 等高频录入 | 2-tap 录入，不进复杂页面 |
| ImmersiveStage | 暖深色沉浸舞台（Life View 唯一允许） | 允许 subtle depth / 透明状态浮层；禁止霓虹/游戏 HUD/持续发光 |

## 6. Card Budget（§10）

- Today 首屏（390dp）：最多 1 个主要 Hero Surface + 1 个 Attention/Action Surface；禁止 4–6 张同级白卡。
- Pet 首屏：最多 1 个 Pet Hero + 1 个 Life Summary。
- Timeline：事件项默认不允许每条独立大 Card。
- Assistant：主聊天区不允许「大白卡中多个白 pill」。

## 7. Border Budget（§11）

核心 Owner 页面通过 spacing / image / background hierarchy 分层，不是 border around everything。验收需记录 BEFORE bordered surfaces 与 AFTER bordered surfaces（明显下降）。

## 8. Media System（§14 / §66）

统一 `PetMedia` / `PetPhoto` Presentation Layer（`apps/mobile/src/components/media/PetMedia.tsx`）。

Variants：portrait / hero / square / timeline / full-bleed；各自定义尺寸与圆角。

优先级（代码中顺序）：

```text
Pet real/demo photo (uri)
>  species visual（矢量物种图形，优雅降级）
>  letter fallback（仅 opt-in badge，永不作主视觉）
```

有照片时禁止继续显示文字圆形头像作为主视觉。Generated media 必须与 RECORDED/LIVE 明确区分（DEMO/SYNTHETIC 标记）。

## 9. Pet Identity（§1.4 / §20）

- 宠物身份必须真实视觉承载：PetHero / PetMedia，而非「豆」「咪」文字圆形 Avatar。
- Demo 宠物（豆豆/咪咪）本轮使用 warm species-visual（矢量 dog/cat glyph），无生成照片——**ACCEPTED_LIMITATION（2026-09-26 用户批准）**；photo 管道保留给未来 media。
- Demo 环境全局标记「示例数据」，不逐张水印。

## 10. Icons（§13）

- Owner UI 核心功能图标统一矢量 Icon（mobile: @expo/vector-icons Ionicons；web: `apps/web/components/icons.tsx` 31 个 V4 stroke 图标）。
- 禁止 emoji（🌱🩺🐾🎯🏡🤝💬）作为正式核心功能图标。
- 统一 stroke、尺寸、视觉重量、active/inactive 语义。

## 11. Motion（§67）

只加入有意义动效：page transition、hero fade、sheet transition、gentle state transition、optional 3D rotation。

禁止：持续 pulse、炫技 animation、所有 Card 动画。

Reduced Motion 必须可用（respects `prefers-reduced-motion` / 系统设置）：关闭 auto-rotate / breathing loop / parallax / glow pulse。

## 12. Empty / Loading / Error（§59-61）

- Loading：skeleton（非大空白 Card + spinner）、retained previous content、局部加载。
- Empty：必须含 meaning + next action（示例：「豆豆的时间线还很安静… [快速记录]」）。
- Error：InlineError / FullPageError / OfflineBanner / RetryState / PartialDataState；用户文案（「暂时连接不上」+「你的本地操作不会丢失」+ [重试]）；exception 留 logs，不上屏。

详见 `docs/ui/EMPTY_LOADING_ERROR_STATES.md`。

## 13. Attention（§24）

- Today 一屏最多 **One Attention**；普通情况显示平静态「目前没有需要特别关注的变化。」
- 只有 deterministic safety rule（URGENT/EMERGENCY）才使用强 danger 视觉；不得为视觉制造焦虑。

## 14. Safety（§45 / §99）

- 风险级别来自 backend deterministic rule；普通数据不用红色。
- 用户语言保持：观察事实、来源、不确定性、建议行动；禁止「AI 判断它生病了」「情绪 88 分」「心脏健康良好」「豆豆很难过」。

## 15. Timeline（§37-40）

- Day Group + time spine + events + media + source/actor + outcome；事件项不是每条同质大白卡。
- 类型区分靠 icon / semantic marker / media / copy；来源（主人记录/设备记录/专业人员/AI 整理）用小型 provenance treatment。

详见 `docs/ui/LIFE_STREAM.md`。

## 16. Forms（§44-49 / §91）

- 默认 Domain 首页：**先读后写**（reading state first → action second → form third）。
- 首屏大表单 = NO（例外：Quick Log dedicated flow、显式 create/edit 页）。
- Behavior ABC Form 保留在录入流程内，不作默认首页。

## 17. Navigation（§16-17）

- Bottom Tabs 固定 canonical：今天 / 时间线 / 宠物 / 助手 / 我的（Today/Timeline/Pet/Assistant/Me）。
- Monitoring（在家）与 Companion（陪伴）为横向能力，从 Today / Pet contextual entry 进入，不占一级 Tab。

详见 `docs/ui/OWNER_NAVIGATION_V4.md`。

## 18. 验证依据

- 实现：`apps/mobile/src/tokens.ts`、`apps/mobile/src/components/*`；`apps/web/PLI_R2_WEB_MIGRATION.md`；`apps/mini/PLI_R2_MINI_SYNC.md`。
- 截图与像素证据：`artifacts/visual-reconstruction/v0.2.0/`（warm canvas 主导 0.30–0.88，white 0–25%）。
- Mobile tsc 0 + gradle assembleRelease OK；web typecheck 0 + next build OK；mini tsc 0 + taro build OK（2026-09-26）。
