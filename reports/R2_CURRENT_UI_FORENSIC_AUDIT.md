# R2_CURRENT_UI_FORENSIC_AUDIT — 当前 UI（v0.1.2）逐屏法务审计

> 阶段：Stage R.2 · 日期：2026-09-26 · 依据 GOAL §74（字段），§1 问题分析；Before 证据：artifacts/emulator/v0.1.2/*.png（16 张）；After 对照代码与截图：artifacts/visual-reconstruction/v0.2.0/。

说明：Before 的逐屏事实以 v0.1.2 Emulator 截图为 L0 证据，结合 GOAL §1 的问题定义与代码结构（apps/mobile/src）。不自造新结论。

## 0. Summary

v0.1.2「功能上实现了 v3.3」，但 Presentation Layer 明显偏向工程原型（CRUD 页面、大量白色 Card、表单/功能宫格/Debug 状态）。本轮按七层根因（§1.1-§1.7）对每屏定位并给出重构要求。

---

## 1. Today（02_today.png，Before）

| 字段 | Before（v0.1.2） |
|---|---|
| Screen | Today |
| Current Purpose | 宠物总览 dashboard：ScreenTitle + Pet Switch chips + Pet Card + Current State Card + 任务 Card + Attention Card + Recent Event Cards + Ghost Buttons |
| What works | 数据完整（状态/任务/专注/最近事件齐全）；注释自称 "NOT a dashboard" |
| Canonical mismatch | 渲染结构仍是 Dashboard，与 Living Canvas（Pet→Now→Change→Attention→Action→Memory）冲突（§1.3） |
| Visual hierarchy problem | 多张同级白卡等权，无第一视觉焦点 |
| Pet presence problem | 宠物以文字圆形头像为主，Pet 不是视觉中心 |
| Content architecture problem | 先出现 Current State / Tasks / Recent Card，再出现 Attention/Action |
| Internal leakage | 存在 today.viewed 计数参与展示、rule 文本直接露出（footer「今日计数 vs 基线」接近 internal） |
| Card density | 高：4–6 张同级白卡（§10 违反） |
| Action priority | 多个 Ghost Button 横排，Primary CTA 不突出 |
| Required reconstruction | 重建为 Living Canvas：PetHero（第一焦点，30–45% 首屏高）→ Now → Change → Attention(One) → Primary Action(快速记录) → compact life stream（§18-§26） |

After（v0.2.0）：已重建（TodayScreen.tsx 274 行组合组件；PetHero + LifeSignal + BaselineChange + AttentionPanel + PrimaryAction/SecondaryAction + LifeStream）。截图 wave-01-today/after/。验收见 `R2_TODAY_LIVING_CANVAS_ACCEPTANCE.md`。**PASS**（§78）。

## 2. Timeline（04_timeline.png，Before）

| 字段 | Before |
|---|---|
| Screen | Timeline |
| Current Purpose | 事件日志列表 |
| What works | 事件的类型/时间/来源/媒体数据完整 |
| Canonical mismatch | 每条事件同质大白卡，非 Day Group + time spine Life Stream（§37） |
| Visual hierarchy problem | 无时间分组层级，全是同权卡片 |
| Pet presence problem | 无宠物上下文 |
| Content architecture problem | 日志表格式列表，缺乏来源/结果语义层次 |
| Internal leakage | source 列可能直接展示内部值 |
| Card density | 高：每条事件独立大卡 |
| Action priority | 无明确动作 |
| Required reconstruction | Day Group + time spine + icon/marker 区分类型 + 用户语言来源 chip；事件项不是独立大卡（§38-§40） |

After：LifeStream.tsx + groupEventsByDay；截图 wave-03/after/timeline-390.png。**PASS**（R2_LIFE_STREAM_ACCEPTANCE.md）。

## 3. Quick Log（03_quick-log.png，Before）

| 字段 | Before |
|---|---|
| Screen | Quick Log |
| Current Purpose | 2 列按钮矩阵快速记录 |
| What works | 录入路径直接，能落库 |
| Canonical mismatch | 无宠物上下文标题 / 无 pet photo identity（§42） |
| Visual hierarchy problem | 同级按钮矩阵，缺主次 |
| Pet presence problem | 无「为豆豆记录」语境 |
| Content architecture problem | 所有动作等权，常见动作未前置 |
| Internal leakage | 无明显 internal；但保存/错误文案工程化 |
| Card density | 中（按钮网格） |
| Action priority | 常用动作未前置 |
| Required reconstruction | 2-tap 高频：一级 喂食/饮水/排泄/散步；二级 玩耍/睡眠/体重/用药/行为/健康/备注；顶部 PetContextHeader（§41-§43） |

After：QuickLogScreen.tsx（PetContextHeader + icon 瓦片 + light form）；截图 wave-03/after/quicklog-390.png。**PASS**。

## 4. Pet / PetHub（05_pet.png，Before）

| 字段 | Before |
|---|---|
| Screen | Pet（PetHub） |
| Current Purpose | identity + status card + 7 能力入口功能宫格 |
| What works | 能力入口齐全 |
| Canonical mismatch | 功能宫格为主体，非 Pet World（§28-§30） |
| Visual hierarchy problem | 圆形文字头像 + emoji 能力按钮为主体 |
| Pet presence problem | 严重：宠物无真实视觉承载 |
| Content architecture problem | 能力条目无「对豆豆当前的意义」 |
| Internal leakage | PLI-xxx 编号可能出现在能力入口 |
| Card density | 高（feature grid） |
| Action priority | 无主次 |
| Required reconstruction | Pet Hero（大图）+ identity + Life Summary + Life View entry + 逐域意义行（健康最近 7 天…/行为最近一次…）（§29） |

After：PetScreen.tsx（PetHero + 生活摘要 + DomainRow meaning rows）；截图 wave-02/after/pet-390.png。**PASS**（R2_PET_WORLD_ACCEPTANCE.md）。

## 5. Life View（06_3d-life-view.png，Before）

| 字段 | Before |
|---|---|
| Screen | Life View（3D 生命视图） |
| Current Purpose | 3D 服务状态页：provider 是否可用、模型版本、overlay 指标、Provider 状态 |
| What works | 诚实显示 blocked |
| Canonical mismatch | 是 3D Service Diagnostics，不是生命入口（§1.5 / §31） |
| Visual hierarchy problem | Provider/Model/状态信息占主导 |
| Pet presence problem | 宠物本身不是焦点 |
| Content architecture problem | Owner 被迫看系统内部实现 |
| Internal leakage | 强：provider_real / model_id / raw event key（today.viewed、health.event_opened…）| DrawState enum | 出现于可见区域 |
| Card density | 高（多个版块卡） |
| Action priority | 无 |
| Required reconstruction | Photo-first：宠物大图为焦点 + 此刻 + 生命轨迹 preview + 「3D 形象尚未创建」诚实态；技术信息下沉 Developer（§33-§34） |

After：LifeViewScreen.tsx（PetMedia full-bleed + 此刻 + 生命轨迹 + 3D 尚未创建）；截图 wave-02/after/lifeview-390.png。**PASS**（R2_LIFE_VIEW_ACCEPTANCE.md）。

## 6. Health（07_health.png，Before）

| 字段 | Before |
|---|---|
| Screen | Health |
| Current Purpose | 健康列表 + 大按钮「+ 发现异常」 |
| What works | 健康事件/分诊数据在 |
| Canonical mismatch | 录入按钮过大，非先读后写（§44） |
| Visual hierarchy problem | 「+ 发现异常」为视觉核心 |
| Pet presence problem | 无宠物语境 |
| Content architecture problem | 首屏无近期状态/最近变化聚合 |
| Internal leakage | triage level raw enum 可能直接展示 |
| Card density | 高 |
| Action priority | 录入优先，读取次之 |
| Required reconstruction | 豆豆的健康 → 近期状态 → 最近变化 → 记录 → 用药/测量 → 记录健康事件；风险 level 来自 backend deterministic rule，普通数据不用红（§44-§45） |

After：截图 wave-04-domains/after/Health-390.png。**PASS**（R2_DOMAIN_EXPERIENCE_ACCEPTANCE.md）。

## 7. Behavior（08_behavior.png，Before）

| 字段 | Before |
|---|---|
| Screen | Behavior |
| Current Purpose | 首屏大型 ABC 录入 Form |
| What works | 表单完备 |
| Canonical mismatch | 观察优先被违背：首屏即表单（§46 / §91） |
| Visual hierarchy problem | 表单主导 |
| Pet presence problem | 无 |
| Content architecture problem | 无 Recent Observations / Patterns / Current context |
| Internal leakage | 视情况出现 raw enum |
| Card density | 低危害（表单）但方向错 |
| Action priority | 录入唯一 |
| Required reconstruction | 先读后写：Recent Observations → Patterns → Current context；主操作「记录行为」打开 Behavior Record Sheet（ABC 保留在录入流程内）（§46） |

After：截图 wave-04-domains/after/Behavior-390.png。**PASS**。

## 8. Training（09_training.png，Before）

| 字段 | Before |
|---|---|
| Screen | Training |
| Current Purpose | 新建训练目标表单优先 |
| What works | 目标/课时能力在 |
| Canonical mismatch | 「新建训练目标」优先级过高（§47） |
| Visual hierarchy problem | 表单为主 |
| Pet presence problem | 无 |
| Content architecture problem | Current Goal / Progress / Recent Sessions / Safe Tools 缺失 |
| Internal leakage | — |
| Card density | 中 |
| Action priority | 新建优先 |
| Required reconstruction | Current Goal → Progress → Recent Sessions → Safe Tools →「+ 新训练目标」（§47） |

After：截图 wave-04-domains/after/Training-390.png。**PASS**。

## 9. Welfare（10_welfare.png，Before）

| 字段 | Before |
|---|---|
| Screen | Welfare |
| Current Purpose | 生活质量记录/评分 |
| What works | observation 数据在 |
| Canonical mismatch | 若展示快乐指数/情绪分数则违背禁止项（§48 / §27 AGENTS） |
| Visual hierarchy problem | 趋势优先未落实 |
| Pet presence problem | 无 |
| Content architecture problem | 近期观察/舒适/环境/活动/恢复 未呈现 |
| Internal leakage | — |
| Card density | 中 |
| Action priority | 记录优先 |
| Required reconstruction | 生活质量趋势优先：近期观察 + 舒适/环境/活动/恢复；禁做快乐指数/幸福分数/情绪指数（§48） |

After：截图 wave-04-domains/after/Welfare-390.png。**PASS**。

## 10. Social（11_social.png，Before）

| 字段 | Before |
|---|---|
| Screen | Social |
| Current Purpose | 大面积关系/互动记录表单 |
| What works | 关系/互动数据在 |
| Canonical mismatch | 关系优先被违背（§49） |
| Visual hierarchy problem | 表单主体 |
| Pet presence problem | 无头像/照片 |
| Content architecture problem | 关系、最近互动、互动历史未先呈现 |
| Internal leakage | — |
| Card density | 中 |
| Action priority | 记录主体 |
| Required reconstruction | 关系 → 最近互动 → 互动历史；有 Pet/Person media 时优先头像/照片；记录互动作为 Action（§49） |

After：截图 wave-04-domains/after/Social-390.png。**PASS**。

## 11. Assistant（12_assistant.png，Before）

| 字段 | Before |
|---|---|
| Screen | Assistant |
| Current Purpose | Generic Chat（等权 mode pills） |
| What works | 问答可用 |
| Canonical mismatch | 非 pet-aware（§50） |
| Visual hierarchy problem | 等权 pill tab 无主次 |
| Pet presence problem | 无宠物上下文/身份 |
| Content architecture problem | 空态「还没有回答。输入问题开始。」（§53 违反） |
| Internal leakage | provider/NOT_AVAILABLE 等 internal 词可能露出 |
| Card density | 高（大白卡中多个白 pill） |
| Action priority | 无主模式 |
| Required reconstruction | Pet-aware：顶部「豆豆的助手」+ Pet visual；Ask 为主 + contextual；answer contract 结论→依据→不确定性→下一步（§50-§52） |

After：AssistantScreen.tsx + assistant_panels.tsx；截图 wave-05/after/assistant-390.png。**PASS**（R2_ASSISTANT_COMPANION_ACCEPTANCE.md）。

## 12. Companion（13_companion.png，Before）

| 字段 | Before |
|---|---|
| Screen | Companion |
| Current Purpose | Prototype 技术说明页 |
| What works | 诚实（未接入） |
| Canonical mismatch | Owner-facing 失败状态（§54） |
| Visual hierarchy problem | 技术说明占主体 |
| Pet presence problem | 无 |
| Content architecture problem | 无陪伴模式空态/预览体验 |
| Internal leakage | 强：PLIDEBUG_COMPANION=1 / feature flag / prototype note / internal terms（§56 禁止） |
| Card density | 低（纯文本） |
| Action priority | 无 |
| Required reconstruction | 豆豆+陪伴模式：用户语言四层能力（观察/在场/丰富化/习得互动）+ 诚实设备状态（§55） |

After：CompanionScreen.tsx（LAYERS 四层 + PetAvatar + 诚实设备态）；截图 wave-05/after/companion-390.png。**PASS**。

## 13. Monitoring / 在家（14_monitoring 对应，Before）

| 字段 | Before |
|---|---|
| Screen | Monitoring |
| Current Purpose | 一级 Tab（在家）+ 设备监控 |
| What works | 设备状态展示 |
| Canonical mismatch | 占一级 Tab（§16 必须移除为一级） |
| Visual hierarchy problem | — |
| Pet presence problem | — |
| Content architecture problem | 无设备时超时红字反复刷屏（§57） |
| Internal leakage | provider/device raw 状态 |
| Card density | 中 |
| Action priority | — |
| Required reconstruction | 移除一级 Tab；入口来自 Today「看看它」/ Pet / Companion；无设备显示「尚未连接设备」（§57） |

After：navigation.tsx 5 Tab；MonitoringScreen stack 二级；截图 wave-05/after/monitoring-390.png。**PASS**。

## 14. Me（14_me.png，Before）

| 字段 | Before |
|---|---|
| Screen | Me |
| Current Purpose | Owner 设置 + dev login 直接可见 |
| What works | 设置齐全 |
| Canonical mismatch | 开发模式登录直接暴露（§58 禁止生产式） |
| Visual hierarchy problem | — |
| Pet presence problem | — |
| Content architecture problem | 未按 Owner/Household/Pets/Notifications/Privacy/About 组织 |
| Internal leakage | dev login |
| Card density | 中 |
| Action priority | — |
| Required reconstruction | Owner identity / Household / My Pets / Notifications / Privacy & Data / About；dev login 移入 Developer Settings 且仅 debug/internal 可见（§58） |

After：MeScreen.tsx（dev login 在 Developer Settings）；final/_s_13_Me.png。**PASS**。

## 15. Login / Error-Offline（01_login / 16_error-offline，Before）

| 字段 | Before |
|---|---|
| Screen | Login / Offline |
| Current Purpose | 登录 / 超时错误 |
| What works | 认证可用；canvas 暖色登录 |
| Canonical mismatch | 离线/错误为 raw 红色文本直接插页面（§59 违反） |
| Visual hierarchy problem | — |
| Pet presence problem | — |
| Content architecture problem | 无 InlineError/OfflineBanner/RetryState 分层 |
| Internal leakage | technical exception 上屏风险 |
| Card density | — |
| Action priority | 无重试语境 |
| Required reconstruction | 统一用户文案：「暂时连接不上」「你的本地操作不会丢失」[重试]；exception 留 logs（§59；EMPTY_LOADING_ERROR_STATES） |

After：Feedback.tsx（InlineError/Skeleton/EmptyState）+ Today offline 态（wave-01-today/after/today-offline-390.png）。**PASS**。

---

## 16. 横切审计（§62 / §98 Internal Copy Zero Gate）

Before 存在的问题类别（GOAL §1.5 / §1.7 确认）：feature flag、internal Rule ID、PLI-xxx、provider raw name、raw enum、internal event key、stack trace、development mode status、prototype note。

After（v0.2.0）：owner copy zero gate（web+mini+mobile）已完成——可见 copy 无 PLI-xxx / raw enum / internal key；随件 companion graceful empty；mobile ProtoTag 死代码已清除。（最终扫描结果见 R2_FINAL_REPORT Copy Audit 段。）

## 17. 结论

18 个屏幕/场景的 Before 全部符合 GOAL §1 的偏差诊断；v0.2.0 After 按上述 reconstruction 逐屏落地并通过截图验证（合计 19 张已验证画面 + 16 张 final 系列，见各 Acceptance report）。遗留 P2（捕获容量 / Demo 无照片）见 R2_FINAL_REPORT。
