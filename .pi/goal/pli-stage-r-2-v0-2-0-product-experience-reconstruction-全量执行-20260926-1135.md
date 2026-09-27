# Goal

在 `E:/AI/Pet Life Intelligence` 仓库全量执行 **Stage R.2 — Product Experience Reconstruction（PLI v0.2.0，Internal / Pre-Pilot）**，依据 `PLI_Stage_R2_Product_Experience_Reconstruction_GOAL_2026-09-26.md`（3488 行、121 节），将 Owner-facing Presentation Layer 从"工程原型 + Card CRUD + 功能宫格"重建为"一只具体宠物持续存在的生命界面"（Pet → Now → Change → Attention → Action → Memory），视觉身份为 **Warm Living Intelligence**。执行采用截图驱动的 Wave 流程：每个 Wave 实现 → 构建 → 模拟器截图 → 截图+checklist 自查 → 冻结/进入下一 Wave，连续推进直至全部 Gate 满足。

执行顺序：Preflight → Current UI Forensic Audit → Visual System V4 → Component Foundation → Today Wave → Pet + Life View Wave → Timeline + QuickLog Wave → Domain Waves（Health/Behavior/Training/Welfare/Social）→ Assistant/Companion/Me/Monitoring → Web 迁移 → Mini 同步 → Visual Regression V3 → 全部报告与文档 → 最终验收 → push + merge main + v0.2.0 tag/Release。

# 环境事实（执行前已核实）

- 仓库 `main` HEAD = `6a95593`（v0.1.2 后基线），origin = `https://github.com/huangdi97/pet-life-intelligence.git`，tags v0.1.0/v0.1.1/v0.1.2 存在。
- Android 模拟器 AVD pdig36（Pixel 5，API 36）已启动（emulator-5554）；PLI 后端未运行（8800 关闭；8000 为无关应用），执行时需本地启动 `services/api` 并 seed 豆豆/咪咪 demo 数据。
- v0.1.2 模拟器构建方式（已核实）：`expo prebuild --platform android` + `gradlew assembleRelease`，`EXPO_PUBLIC_PLI_API_URL=http://10.0.2.2:8800`。

# Acceptance criteria（全部可由我在执行后客观验证）

## A0. 基线与环境

- [ ] `git branch --show-current` = `feat/pli-v0.2-product-experience-reconstruction`，从 `main@6a95593` 创建；`v0.1.2` tag 及其 `artifacts/emulator/v0.1.2/` 产物保持原样（未修改）。
- [ ] 本地 API 在 `http://localhost:8800` 可访问（`/api/health` 200），模拟器内 `http://10.0.2.2:8800` 可达。
- [ ] `adb shell pm list packages` 含 `com.pli.mobile`；`emulator-5554` 上安装的为本次以 `EXPO_PUBLIC_PLI_API_URL=http://10.0.2.2:8800` 构建的 v0.2.0 APK（`artifacts/release/v0.2.0/` 或等价位保存）。

## A1. Navigation / IA（P0，必须先修）

- [ ] 底部导航恢复 canonical：今天 / 时间线 / 宠物 / 助手 / 我的（Today/Timeline/Pet/Assistant/Me）；`在家/Monitoring`、`陪伴/Companion` 不再是一级 Tab，功能保留并作为 Today/Pet 内的 contextual entry（核对 `apps/mobile/src/navigation.tsx` 与实际截图）。
- [ ] 代码结构为 RootStack → OwnerTabs(5 tabs)；二级页面（QuickLog/LifeView/Health/Behavior/Training/Welfare/Social/Monitoring/Companion/Notifications）不占据一级 IA。

## A2. Visual System V4 + 共享组件

- [ ] `docs/ui/PLI_VISUAL_SYSTEM_V4.md` 存在并冻结：Design principles、Color（≥25 个 §8 token：canvas/surface/surface-raised/surface-glass/surface-overlay/surface-dark-immersive、text-*、brand-*、attention/warning/danger/success/info、media-overlay/scrim-light/scrim-dark/divider-subtle）、Typography V4（Display/Hero Name/Page Title/Section Title/Body/Body Strong/Meta/Caption/Metric/Button）、Spacing、Radius、Surfaces（§9 十二种，禁用"一切信息都 Card"）、Media、Pet identity、Icons（统一矢量 icon，正式功能图标无 emoji，继续使用 @expo/vector-icons/Ionicons）、Motion（含 Reduced Motion 可用）、Empty、Loading、Error、Attention、Safety、Timeline、Forms、Navigation。
- [ ] Mobile 代码存在统一 token/theme 模块并实际使用；白底+边框驱动的卡片密度显著下降（对同一页面统计 bordered surfaces：AFTER < BEFORE，记录于报告）。
- [ ] `apps/mobile/src/components/{pet,life,timeline,feedback,actions,media,assistant,navigation}/` 下实现：PetHero、PetMedia、PetAvatar、PetContextHeader、LifeSignal、AttentionPanel、BaselineDelta/Change、LifeStream(+LifeStreamEvent)、QuickAction、EmptyState、OfflineBanner、InlineError/FullPageError/RetryState/PartialDataState；Today/Pet/LifeView 由组合组件构成而非单个巨型 Screen。
- [ ] 复杂度 Gate：production source file ≤300 行（白名单除外）、React component ≤200 行、dependency cycles = 0、无新增 unjustified type escape / silent catch（用仓库现有扫描脚本验证并记录）。

## A3. Today Wave（Living Canvas）

- [ ] `artifacts/visual-reconstruction/v0.2.0/wave-01-today/before/` 与 `after/` 有截图；`after` 截图为 390×844dp 与 360×800dp（模拟器 `wm size/density` 配置到对应 dp 后 `adb exec-out screencap`，PNG 非空且尺寸核对我验证）。
- [ ] Today 状态覆盖 5 种：with-data / empty / attention / offline / multi-pet，各有截图；代码路径可切换这些状态（demo seed 数据 + 可注入状态）。
- [ ] Today 首屏满足：PET_VISUAL_PRESENT=YES、PET_IS_PRIMARY_FOCUS=YES、LIVING_CANVAS=YES、CARD_DASHBOARD_PATTERN=NO、ONE_ATTENTION=YES、PRIMARY_ACTION_CLEAR=YES、OWNER_INTERNAL_TERMS=0；首屏同权重 Card ≤2、primary CTA ≤2；Pet Hero 为第一视觉焦点（≥30% 首屏高度建议），hero 文案只来自确定数据（允许"今天还没有新的记录/上午记录了 3 件事/今天有 1 件事值得关注/最近一次记录在 12 分钟前"；禁止"豆豆今天很开心"类未证实情绪句，grep 验证）。
- [ ] Now/Change/Attention/Action/Memory 层级按 §22–26 实现：Now 为生活状态摘要（无数据时"今天还没有足够记录"）；Change 利用 Personal Baseline（基线不足时"数据还不足以比较"）；Attention 一屏至多 1 个（无异常时"目前没有需要特别关注的变化"），danger 视觉仅用于 backend deterministic safety rule；Primary Action=快速记录，次行动为 问助手/看看它/查看今天（非 4 个 Ghost Button 横排）；Recent 为 compact life stream preview（3–5 条，含时间/事件/来源或媒体）。

## A4. Pet + Life View Wave

- [ ] Pet 页 = Pet World：PetHero（大图）+ 豆豆 3岁2个月 · 柯基 · 雌性 身份摘要 + Life Summary + Life View 入口 + 域意义条目（健康/行为/训练/福利/社交 显示"对豆豆当前的意义"，如"最近 7 天 · 2 条记录"）；LETTER_AVATAR_PRIMARY=0、FEATURE_GRID_AS_PRIMARY=NO（截图+代码验证）。
- [ ] Life View = 豆豆的可视生命状态入口：Photo-first（大图/全身照 + 此刻 + 最近一次记录 + 生命轨迹 preview + "3D 形象 尚未创建 / 等待连接真实服务"）；Presentation（photo/overlay/timeline memory）/ Inference（change signal/AI summary，带 label）/ Fact（event/observation/baseline/outcome/provenance）三层分离，Presentation 不成为 Fact。
- [ ] Owner 主页面禁止出现：provider_real、model_id、today.viewed、health.event_opened、health.outcome_recorded、provenance_kind raw enum、failure_reason 原文、raw internal event key（grep Owner UI 源码与截图 OCR 抽查 = 0）；技术诊断下沉到 Developer/advanced 页，Debug/内部信息只在 debug/internal build 可见。
- [ ] Life View 为唯一沉浸式暖深色表面；无 neon/gaming HUD/medical sci-fi/连续 glow/fake hologram（截图自查 + 代码主题验证）；3D 不可用时是优雅状态而非失败页（截图）。

## A5. Timeline + QuickLog Wave

- [ ] Timeline = Life Stream：Day Group（如"9月25日 · 今天"）+ time spine + 事件（icon/语义标记/媒体/文案区分类型）+ source/actor provenance（主人记录/设备记录/专业人员/AI 整理 之一）+ outcome；每条事件无独立大白卡（截图 + 组件结构验证）；"回到那一天"只显示该时间点已有的数据/媒体（不冒充历史）。
- [ ] QuickLog：顶部"为豆豆记录" + 小型真实宠物照片身份；一级 喂食/饮水/排泄/散步，二级 玩耍/睡眠/体重/用药/行为/健康/备注；常用动作 2 taps 完成，优先 bottom sheet/compact modal，不是所有动作进复杂页（截图 + 代码）。

## A6. Domain Waves（读先于写）

- [ ] Health：首屏顺序 豆豆的健康 → 近期状态 → 最近变化 → 健康记录 → 用药/测量 →（最后）记录健康事件；"+ 发现异常"不再是视觉核心；risk 级别来自 backend deterministic rule，仅真实 URGENT/EMERGENCY 用强 danger 视觉，普通数据不红（截图 + 报告断言）。
- [ ] Behavior：首屏 Recent Observations/Patterns/Current context，主要 Action=记录行为 → 打开 Behavior Record Sheet（ABC Form 保留在录入流程，不是默认首页）。
- [ ] Training：首屏 Current Goal/Progress/Recent Sessions/Safe Tools，然后才是 "+ 新训练目标"。
- [ ] Welfare：近期观察/舒适/环境/活动/恢复/生活质量记录；禁止 快乐指数/幸福分数/情绪指数（grep = 0）。
- [ ] Social：关系/最近互动/互动历史优先，有 media 用照片；记录互动为 Action 非主体。
- [ ] Forms Guardrail：默认域首页 above-the-fold 无大型编辑表单 = YES（QuickLog 专用流程与显式 create/edit 页除外，截图验证）。

## A7. Assistant / Companion / Me / Monitoring

- [ ] Assistant = Pet-aware：顶部"豆豆的助手 / 正在帮助你理解：豆豆" + Pet visual context；保留 Ask/Brief/Find/Plan/Explain，但非等权 pill 排布（primary mode + contextual actions）；回答契约 结论→依据→不确定性→下一步（医疗风险由 deterministic rule engine 控制）；Empty State 为"我会基于豆豆已有的真实记录回答。你可以问最近变化、任务、训练、健康记录。" + Pet identity（截图 + 报告）。
- [ ] Companion：完整 Empty/Preview 体验（豆豆 + 陪伴模式 + "连接支持的设备后，可以在不打扰它的前提下观察和互动" + Observe/Presence/Enrichment/Learned Interaction 四层，用户语言）；Owner UI 无 PLIDEBUG_COMPANION=1、feature flag、prototype implementation note、internal architecture terms（grep = 0）。
- [ ] Me：Owner identity / Household / My Pets / Notifications / Privacy & Data / App About；"开发模式登录"移入 Developer Settings（仅 debug/internal build 可见，生产 build 无此入口，代码条件验证）；Offline 等错误为统一体验（"暂时连接不上 / 你的本地操作不会丢失 / [重试]"），无 raw 红色错误文本刷屏（Offline 截图）。

## A8. Media / Demo 数据

- [ ] `PetMedia`/`PetPhoto` 组件支持 portrait/hero/square thumbnail/timeline thumbnail/full-bleed/fallback/loading/error；有照片时主视觉不再用文字圆形头像。
- [ ] 豆豆（柯基）/ 咪咪（猫）各有 7 类 demo 照片（hero portrait/full body/indoor/outdoor/resting/activity/close-up），由 imagegen 生成；数据层标记 DEMO/SYNTHETIC 且不进 real Pilot metrics；demo 环境全局有"示例数据"提示，照片本身无破坏性 watermark；媒体经过尺寸处理（非 4K 直堆首屏）。

## A9. Copy / Error / Loading / Empty / Motion / A11y / Performance

- [ ] Owner UI 扫描：PLI-xxx、internal event key、OWNER_REPORTED、feature flag、provider_real、model_id、DEBUG、technical exception、raw enum = 0（排除 Developer diagnostics/审核必需 evidence detail）；来源用语为用户可理解的 主人记录/设备记录/专业人员/AI 整理。
- [ ] Loading 无"大空白 Card + spinner"，使用 skeleton / retained previous content / subtle progress；核心 Domain 都有带意义与 next action 的 Empty State（Training/Timeline 等按 §61 示例）。
- [ ] 动效仅 page transition/hero fade/sheet transition/gentle state transition；无持续 pulse/炫技/全 Card 动画；Reduced Motion 可用（组件实现 + 报告）。
- [ ] A11y：`reports/ACCESSIBILITY_FINAL_AUDIT.md` 复跑（或新的 R2 专项小节）对比：screen reader 标签、large text、contrast、touch target、reduced motion、text alternatives 无回归（重要状态不只靠图片）；Mobile E2E 复核 Login/Today/QuickLog/Timeline/Pet/LifeView/Health/Behavior/Training/Welfare/Social/Assistant/Companion/Me/Pet Switch/Offline/Logout 可用。

## A10. Web + Mini

- [ ] Owner Web 迁移 Today/Timeline/Pet/LifeView/Assistant（至少），非手机 UI 拉宽：larger pet canvas / two-column / persistent context / richer timeline media（组件与截图验证）；屏幕 768/1440 截图或 Playwright 证据；信息架构与 Mobile 一致。
- [ ] Mini 同步 Today/Timeline/Pet/QuickLog/Assistant；3D 按平台降级（poster/fallback）；mini build 通过。
- [ ] Admin/Pro 不同步 Pet-first 视觉，仅同步 brand tokens/typography/semantic status（不把 Admin 做成宠物照片首页）。

## A11. 工程与安全 Gates（全部命令实跑并记录）

- [ ] `pytest` 全绿；`ruff` 0；format 通过；mobile/web/mini 各 `tsc --noEmit` 0 错误；`vitest` 全绿；Playwright 功能测试全绿；mobile（gradle assembleRelease emulator APK）、web、mini build 均通过。
- [ ] 专项套件通过并记录：contract、safety、security、pilot isolation；Safety Gates 报告：RED_FLAG_REGRESSION=0、MEDICATION_REGRESSION=0、PERMISSION_REGRESSION=0、PILOT_CONTAMINATION=0、FACT_INFERENCE_CONFUSION=0、GENERATED_3D_TO_CLINICAL_FACT=0。
- [ ] 既有安全/权限/pilot 逻辑零削弱（代码 diff 审查确认只在 Presentation Layer 变更；若发现真实 bug 可在报告中记录并最小修复）。

## A12. Visual Regression V3 + 最终截图

- [ ] Visual Regression V3 spec 建立（Today/Timeline/QuickLog/Pet/LifeView/Health/Behavior/Training/Welfare/Social/Assistant/Companion/Me/Offline/Empty/Attention；宽度 360/390/768/1440 按 client 分配），每 Wave 截图+自查确认后才更新 approved baseline（`PLI_UPDATE_VISUAL_BASELINE=1` 协议）；V3 全绿；V2 baseline 保留为历史（不破坏旧产物）；`reports/R2_VISUAL_REGRESSION_V3.md` 记录。
- [ ] `artifacts/visual-reconstruction/v0.2.0/final/` 有统一 Demo 数据下的 16 张最终截图（01 Today … 16 Attention），生成 `PLI_v0.2.0_Android_Final_Contact_Sheet.png` 与 `before-v0.1.2-vs-after-v0.2.0.png`，并生成 HTML gallery 用 BrowserPreview 打开供人工复核；至少 §88 要求的 12 页面有真实 Before/After。

## A13. 报告与文档（全部存在且内容符合要求）

- [ ] `reports/R2_PREFLIGHT.md`、`R2_CURRENT_UI_FORENSIC_AUDIT.md`（对现有 16 张截图逐屏拆解"Screen/Current Purpose/What works/Canonical mismatch/Visual hierarchy problem/Pet presence problem/Content architecture problem/Internal leakage/Card density/Action priority/Required reconstruction"）、`R2_PRESENTATION_ARCHITECTURE.md`、`R2_NAVIGATION_ALIGNMENT.md`、`R2_PET_MEDIA_AND_IDENTITY.md`、`R2_TODAY_LIVING_CANVAS_ACCEPTANCE.md`、`R2_PET_WORLD_ACCEPTANCE.md`、`R2_LIFE_VIEW_ACCEPTANCE.md`、`R2_LIFE_STREAM_ACCEPTANCE.md`、`R2_DOMAIN_EXPERIENCE_ACCEPTANCE.md`、`R2_ASSISTANT_COMPANION_ACCEPTANCE.md`、`R2_WEB_PARITY.md`、`R2_VISUAL_REGRESSION_V3.md`、`R2_FINAL_REPORT.md`。
- [ ] `docs/ui/` 更新：PLI_VISUAL_SYSTEM_V4.md、LIVING_CANVAS_UX.md、PET_IDENTITY_PRESENTATION.md、PET_3D_LIFE_VIEW.md、LIFE_STREAM.md、OWNER_NAVIGATION_V4.md、EMPTY_LOADING_ERROR_STATES.md、ASSISTANT_EXPERIENCE_V4.md、COMPANION_EXPERIENCE_V4.md。

## A14. 最终 Gate

- [ ] P0 = 0、P1 = 0（按 §105/§106 定义逐项核对并记录）；P2 显式列出为 ACCEPTED_DEFER（如 real 3D provider unavailable、advanced animation later、web responsive polish），不混为 PASS。
- [ ] §108 全部最终 Product Visual Gates = PASS（OWNER_NAVIGATION_CANONICAL_PASS … VISUAL_REGRESSION_V3_PASS），`STAGE_R2_COMPLETE = TRUE`。
- [ ] 诚实状态不变：REAL_PARTICIPANTS=0、REAL_PETS=0、PRODUCT_VALIDATION=NOT_YET_OBSERVED、REAL_3D_PROVIDER=EXTERNAL_BLOCKED、PLAY_STORE_SIGNING=EXTERNAL_BLOCKED（除非真实事实变化）；生成数据全部来自真实 API / demo synthetic source，无编造健康数据/心率/呼吸/体温/情绪/睡眠/设备在线/位置/专业判断。
- [ ] `R2_FINAL_REPORT.md` 按 §120 最终回复格式输出（HEAD/Branch/Worktree/baseline/navigation/各页面 Before-After-Acceptance/Copy Audit/Card Density Audit/Pet Media Audit/Emulator/Web/Mini/VR V3/全部测试/P0-P1-P2/Git/Push/Release/REAL 状态/最终 PASS 判定）。

## A15. Git / Release（用户选定 C）

- [ ] 全部工作以有意义 commit 落在 `feat/pli-v0.2-product-experience-reconstruction`（建议按 §100 提交粒度），未在 main 上做视觉实验。
- [ ] 仅在 A14 全部 Gate 满足后：merge 到 main、`git push origin main`、push tag `v0.2.0`（`git ls-remote origin refs/tags/v0.2.0` 可验证）、创建 GitHub Release "PLI v0.2.0 — Living Pet Experience Reconstruction"（Internal / Pre-Pilot）；若 gh 未认证/凭据不可用，则记录为 EXTERNAL_BLOCKED 并报告；README/CHANGELOG 同步 v0.2.0（Internal / Pre-Pilot，不改变 REAL 状态声明）。

# Boundaries（禁止事项）

- 只重构 Presentation Layer / Visual System / Interaction Composition / Owner Navigation / Content Hierarchy / Pet Identity Presentation / Media Presentation / Empty-Error-Loading 体验 / Mobile-Web-Mini Owner 体验；不重新设计 Domain Model、Event Graph、API contracts、Safety logic、Permissions、Pilot Integrity、228 Feature Inventory、backend facts、Outcome/Provenance（除非发现真实 bug 并最小修复、记录）。
- 禁止 Stage I / v1.3 / Future 42 / PLI-229+ / 新增业务 Domain / 重设计核心业务。
- 禁止为视觉编造任何数据（健康数据、心率、呼吸、体温、情绪、睡眠、设备在线、位置、专业判断）；概念图数据不得复制进产品；禁止 AI inference 写成 fact、禁止生成 3D 写成 ClinicalFact。
- 禁止 fake LIVE / fake real participant / fake real pet；不改变真实世界状态声明。
- 禁止削弱 deterministic red flag / medication safety / permission / pilot isolation 安全逻辑。
- 禁止为通过检查而删除测试、弱化断言、加 ignore、关 lint、绕过安全或 type-check（§56）。
- v0.1.2 及历史产物不可变；不在 main 直接实验；结束后 v0.2.0 才允许合并/发布。
- 视觉必须落在 Warm Living Intelligence 区间（真实宠物生活 + 柔和数字智能），避免 SaaS Admin/CRUD 与 Cyberpunk/Medical Sci-Fi/Gaming HUD 两个极端。
- Owner 界面禁止暴露内部工程语言（Provider 状态、raw event key、模型 id、feature flag、技术异常）——下沉 Developer diagnostics。
- 不变更 REAL_PARTICIPANTS / REAL_PETS / PRODUCT_VALIDATION / REAL_3D_PROVIDER 等外部事实（除非真实事实变化）。