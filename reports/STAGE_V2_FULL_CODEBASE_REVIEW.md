# Stage V.2 — 全仓代码审核、重构、注释、风格、架构、类型、安全与可维护性最终收口报告

> 范围：`E:\AI\Pet Life Intelligence`（HEAD=df05c9d → 本轮提交，branch=main，无 remote）
> 日期：2026-09-24 ｜ 语言：中文为主
> 方法：每一人工维护文件经可复现扫描（`scripts/scan_codebase_scale.py`）+ 类型/注释/结构审核 + 真实命令回归验证；历史数字只作为待复核基线，全部以本轮真实命令结果为准。
> 交付物：本报告 + `STAGE_V2_ISSUE_LEDGER.md`（SV-006/SV-007 = CLOSED，P0/P1 剩余 = 0）。

---

## 1. 环境与基线事实（本轮真实测得）

| 项目 | 数值 |
|---|---|
| 扫描源文件总数（`services|packages|apps|scripts|tests|infra`，排除构建/依赖/数据/迁移/工件目录） | 503（终态，含本轮拆分新增子模块/组件；首轮基数为 400） |
| 人工维护生产源码 >300 行（Python/JS 非组件） | **0**（全仓含测试文件均 ≤300） |
| React 组件/页面 >200 行 | **0** |
| 非组件 TypeScript >300 行 | **0** |
| 裸 TODO/FIXME/HACK/XXX/TEMP | **0** |
| 类型逃逸标记 | 28（§5 逐条判定：0 个未解释的代码级逃逸） |
| 全量 pytest | **427 passed / 0 failed / 0 errors**（5:23） |
| ruff（services/api services/worker packages/rules services/ai-gateway） | **0 errors** |
| 五端 typecheck（web/admin/pro/mini/mobile） | **0 errors** |
| 五端 build（web/admin/pro build、mini build:weapp、mobile typecheck gate） | **全 OK** |
| apps/web vitest | **22/22** |
| tests/e2e-browser Playwright | **29/29**（完整套件真实执行，第 2 次全量运行 exit 0；第 1 次的 1 项 transient 失败在隔离与重跑中均绿） |
| 历史违规清单处置 | 14 Python + 12 React + 1 TS 全部有处置记录（§2.1） |

---

## 2. 规模与结构收口

### 2.1 历史违规清单（14 Python + 12 React + 1 TS）→ 处置映射

历史清单来源：`.pi/goal/stage-v-2-...-20260923-1934.md`（磁盘草稿，非最终证据）。

**14 个 Python >300 行**（10 个已由既有工作树拆分完成，映射到当前真实扫描；4 个本轮拆分）：

| 历史文件（行数） | 处置 | 当前状态（拆分产物，行数） |
|---|---|---|
| api/routes/v10_platform.py (1141) | 既有工作树拆分 | v10_platform.py + v10_platform_{agent,devices,finance,identity,services,training,welfare}.py（全部 ≤300） |
| api/routes/v02_social_platform.py (649) | 既有工作树拆分 | v02_social_platform.py + _{daily,ops,qa,social}.py（全部 ≤300） |
| api/routes/care.py (579) | 既有工作树拆分 | care.py + care_{account,cards,grants,handoffs,members}.py（全部 ≤300） |
| api/routes/v10_extras.py (517) | 既有工作树拆分 | v10_extras.py + v10_extras_{behavior,senior,services,social}.py（全部 ≤300） |
| api/routes/visual.py (487) | 既有工作树拆分 | visual.py + visual_{capture,helpers,model,overlay,schemas}.py（全部 ≤300） |
| api/routes/health.py (454) | **本轮拆分** | health.py 26 + health_{common,intake,observations,triage,vet_brief,outcomes}.py（≤291） |
| api/routes/v02_care_health.py (436) | **本轮拆分** | v02_care_health.py 21 + v02_care_health_{handoff,medical,care}.py（≤212） |
| app/seed.py (390) | 既有工作树拆分 | seed.py + seed_data_{care,content,health,identity}.py（全部 ≤300） |
| domain/event_types.py (386) | 既有工作树拆分 | event_types.py + event_types_{care,daily,health,identity}.py（全部 ≤300） |
| services/auth.py (386) | 既有工作树拆分 | auth.py + auth_{security,sessions,tokens}.py + auth_security.py（全部 ≤300） |
| models/v02.py (317) | 既有工作树拆分 | models/v02.py + v02_{care,finance,identity,social,training}.py（全部 ≤300） |
| api/routes/v02_behavior_training.py (316) | **本轮拆分** | v02_behavior_training.py 27 + v02_behavior_training_{behavior,training,content}.py（≤177） |
| ai-gateway/gateway.py (311) | 既有工作树拆分 | gateway.py + gateway_mock_provider.py（全部 ≤300） |
| api/routes/v02_identity_daily.py (309) | **本轮拆分** | v02_identity_daily.py 25 + v02_identity_daily_{identity,baseline,diary,carecard}.py（≤133） |

本轮拆分的 4 个文件拆分详情见 §3。行为等价判定：全量 pytest 427 passed（拆分前基线 427 passed，无回归）+ 针对性子集 215 passed（§6）。

**12 个 React 组件/页面 >200 行**：

| 历史文件（行数） | 处置 | 当前状态 |
|---|---|---|
| apps/web/app/settings/page.tsx (382) | **本轮拆分** | 133 + `_components/`（types 18 / AccountSecurityCard 136 / ConsentsCard 38 / EmergencyProfileCard 74 / DeletionRequestCard 26 / AuditAndFeedbackSection 79） |
| apps/mini/src/pages/index/index.tsx (373) | 既有工作树拆分 + **本轮再拆分** | index.tsx 199；`_components/` 8 个单组件文件（15–55 行） |
| apps/web/app/page.tsx (304) | **本轮拆分** | 124 + `_components/today/*`（7 卡片 30–52 行 + constants 43） |
| apps/mobile/src/screens/QuickLogScreen.tsx (295) | 既有工作树拆分 | QuickLogScreen.tsx + quicklog_{sections,types}.tsx / quicklog_types.ts（≤限） |
| apps/mini/src/pages/agent/index.tsx (277) | **本轮拆分** | 129 + agent/_components/（6 面板 17–64 行）+ agent/_lib.ts 51 |
| apps/web/app/agent/page.tsx (275) | **本轮拆分** | 114 + _components/（Brief/Find/Plan/Explain 面板 19–43 行） |
| apps/web/app/timeline/page.tsx (264) | **本轮拆分** | 100 + `_components/timeline/*`（≤110） |
| apps/web/app/companion/page.tsx (244) | **本轮拆分** | 133 + `_components/`（types 21 / 5 面板 28–57 行） |
| apps/mobile/src/screens/ui.tsx (243) | 既有工作树拆分 | ui_shared.tsx / ui_labels.tsx / ui.tsx（≤限） |
| apps/web/app/social/page.tsx (227) | **本轮拆分** | 116 + `_components/`（types 17 / 4 面板 36–83 行） |
| apps/web/app/welfare/page.tsx (217) | **本轮拆分** | 86 + `_components/welfare/*`（≤61） |
| apps/mobile/src/screens/TodayScreen.tsx (205) | 既有工作树拆分 | TodayScreen.tsx 185 + today.ts + today_styles.ts（均 ≤限） |

**1 个非组件 TS >300 行**：apps/web/lib/i18n.ts (316) → **本轮拆分**为 `lib/i18n_zh_cn.ts`（272 行数据，`export const zhCN`）+ `lib/i18n.ts`（逻辑与再导出，52 行）。

**本轮扫描新增发现的 >限文件（历史清单未覆盖，以真实扫描为准）**：apps/web/app/{health/[id],monitoring,pets/[id]/life-view}/page.tsx、apps/pro/app/pets/[id]/{page.tsx,outcome/page.tsx}、apps/pro/app/vet-briefs/[id]/page.tsx、apps/mini/src/pages/index/_components.tsx —— 全部本轮拆分至 ≤200（§3 React 拆分表）。

### 2.2 扫描脚本

`scripts/scan_codebase_scale.py`（本轮验证并保留；单次确定性扫描，退出码 0）：
- 排除：node_modules/dist/.next/out/build/__pycache__/.venv/migrations//锁文件/egg-info/artifacts/evidence/data/.pytest_cache/.ruff_cache/.git；
- 输出：>300 Python/JS、>200 React、>300 非组件 TS、裸 TODO、类型逃逸标记（带行号与原文，供逐条判定）。

真实运行：`.venv\Scripts\python.exe scripts\scan_codebase_scale.py` → §1 表中的数字（503 文件，终态）。

### 2.3 原超限测试文件（补充轮拆分——例外表已清空）

| 文件（原行数） | 处置 | 当前状态 |
|---|---|---|
| tests/integration/test_api_integration.py (402) | 类级拆分 | 194 + 新文件 test_api_integration_flows.py 216（TestCareHandoff/TestHealthFlow/TestPlatformFeatures 移出；收集 32 不变） |
| tests/stage_v/test_adversarial_permissions.py (304) | 提取助手 + 顶部导入合并 | 288（_delete_user / _archive_pet 提取；6 处内联 import 合并） |
| tests/e2e/test_seven_paths.py (308) | 提取 DB 建户助手 | 276 + 新文件 tests/e2e/_path_helpers.py 40（create_owner / create_user） |

拆分后扫描 **0 超限**：over_py=0 / over_tsx=0 / over_ts=0（503 文件，含测试）；三个文件收集 55 → 55 不变；全量 pytest **427 passed / 0 failed**（真实重跑复证）。

---

## 3. 本轮拆分明细（行为等价，API 契约不变）

### 3.1 后端 Python（4 个模块 → 聚合器 + 子模块，遵循仓库既有 v02_social_platform.py 模式）

**health.py（502 → 26）**：路径/方法/状态码/响应 shape/权限（MEDICAL_READ/WRITE）/安全不变量（rule triage 不被 AI 降低、outcome 枚举校验、share-token 过期/吊销、`extra: forbid` schema）逐字保留；`app.api.routes.health.router` 11 条路由注册序不变。
- health_common.py 76：INTAKE_QUESTIONS、5 个 Pydantic schema、`get_health_event_for_user`（原 `_get_health_event` 更名）
- health_intake.py 291：open/list/get health event、questions、answers（`_GATEWAY` 单例在此）
- health_observations.py 55 / health_triage.py 34 / health_vet_brief.py 107 / health_outcomes.py 55

**v02_care_health.py（501 → 21）**：15 条路由逐一保留（handoff 5 / care 5 / medical 5），201/200 状态码不变。
- v02_care_health_handoff.py 177（PLI-039..041）、v02_care_health_medical.py 212（PLI-057/058/061/062）、v02_care_health_care.py 152（PLI-042/047/064）

**v02_behavior_training.py（371 → 27）**：11 条路由不变；保留 `router` 与 `ensure_content_seeded`（app/main.py lifespan 调用点不变）。
- v02_behavior_training_behavior.py 133（PLI-070/073/074/075/084）、_training.py 177（PLI-079/085..088/091）、_content.py 83（PLI-092/100/223）

**v02_identity_daily.py（357 → 25）**：9 条路由不变；保留 `router` 与 `_baseline_algorithm`（tests/v02/test_identity_daily_care.py:77 的导入继续可用，聚合器冗余别名再导出满足 F401）。
- v02_identity_daily_identity.py 114（PLI-004/013）、_baseline.py 109（PLI-029 + `_baseline_algorithm`）、_diary.py 133（PLI-031/033）、_carecard.py 39（PLI-005）

### 3.2 前端 React 页面（16 个文件 → 全部 ≤200；页面保留 default export、数据获取、状态与处理函数，JSX 原样搬入 props 驱动的子组件）

| 页面 | 行数变化 | 拆分产物（全部 ≤200） |
|---|---|---|
| apps/web/app/page.tsx | 325→124 | _components/today/: constants.ts 43, LifeViewCard 30, NowCard 33, ChangeCard 30, AttentionCard 39, ActionCard 30, TasksCard 41, RecentCard 52 |
| apps/web/app/timeline/page.tsx | 275→100 | _components/timeline/: constants.ts 52, DayBackCard 30, FilterBar 110, EventList 65 |
| apps/web/app/welfare/page.tsx | 232→86 | _components/welfare/: constants.ts 35, QualityCard 53, EvidenceCard 56, WelfareTrendCard 61 |
| apps/web/app/health/[id]/page.tsx | 293→170 | _components/health/: OverviewCard 53（含 RiskLevel cast + RiskBanner/EmergencyAction 安全块）, IntakeCard 53, ObservationCard 43, VetBriefCard 56, OutcomeCard 55 |
| apps/web/app/agent/page.tsx | 292→114 | _components/: BriefPanel 19, FindPanel 19, PlanPanel 22, ExplainPanel 43（AskPanel/AnswerPanel 复用既有） |
| apps/web/app/companion/page.tsx | 271→133 | _components/: types 21, GatePanel 28, ObservePanel 57, ControlPanel 52, WelfareGuardPanel 35, SessionSummaryPanel 31 |
| apps/web/app/monitoring/page.tsx | 206→84 | _components/: types 24, LastSeenPanel 35, TodayPanel 47, DevicesPanel 41, ReviewQueuePanel 52 |
| apps/web/app/social/page.tsx | 243→116 | _components/: types 17, RelationsPanel 47, FriendsPanel 36, InteractionsPanel 57, RecordInteractionPanel 83 |
| apps/web/app/settings/page.tsx | 416→133 | _components/: types 18, AccountSecurityCard 136, ConsentsCard 38, EmergencyProfileCard 74, DeletionRequestCard 26, AuditAndFeedbackSection 79 |
| apps/web/app/pets/[id]/life-view/page.tsx | 275→106 | _components/: types 55, ProviderStatusCard 52, ModelVersionsCard 54, StateOverlayCard 45, RealPhotoCard 27 |
| apps/pro/app/pets/[id]/page.tsx | 269→71 | _components/: IdentityCard 24, HealthOverviewCard 91, BehaviorOverviewCard 56, CareNetworkCard 47, BaselineCard 20, EvidenceCard 15, TimelinePreviewCard 46 |
| apps/pro/app/pets/[id]/outcome/page.tsx | 214→109 | _components/: SelectHealthEventCard 99, RecordOutcomeCard 71 |
| apps/pro/app/vet-briefs/[id]/page.tsx | 310→101 | _components/: 9 张卡片 27–47 行 |
| apps/mini/src/pages/agent/index.tsx | 315→129 | _components/: index.ts 6, tabs 18, ask 64, brief 36, find 48, plan 31, explain 17；_lib.ts 51 |
| apps/mini/src/pages/index/_components.tsx | 254→删除（避免遮蔽目录桶） | _components/: index.ts 8 + 8 个单组件文件 15–55 行 |
| apps/mini/src/pages/index/index.tsx | 205→199 | 仅压缩 import；页面逻辑未动 |

### 3.3 其他结构与类型修复（本轮真实修复）

- `apps/mobile/src/screens/TodayScreen.tsx`：SV-006 拆分遗留 —— `TodayResp` 类型已迁至 `today.ts` 但未导入 → 补 `import { todayTasks, type TodayResp } from "./today";`，修复 TS2304 + TS7006。
- `apps/mini/src/pages/index/_components.tsx`：`QUICK_TYPES` 未导入 + import 块重复 → 修复导入、删除重复段、移除未使用导入 `ATTENTION_LEVELS`。
- `apps/web/app/agent/_components/AskPanel.tsx`：既有拆分损坏（函数签名重复 + 接口断裂 + 缺 `basePath` prop）→ 重建干净签名 41 行；`AskPanel/AnswerPanel` 的 `../../lib/i18n` 相对深度错误 → 修正为 `../../../lib/i18n`。
- `apps/web/lib/i18n.ts`：数据/逻辑拆分（见 §2.1）。
- `services/api/app/services/auth.py`：拆分后 import 块 I001 → ruff --fix 排序归位（行为不变）。

---

## 4. 注释收口

- 全仓裸 TODO/FIXME/HACK/XXX/TEMP = **0**（扫描 §4 无命中；含追踪 ID 的注释允许，本仓未发现需要跟踪的临时注释）。
- 高价值注释按 AGENTS.md 标签落点（代表性，含本轮新增）：
  - `# PROVIDER:` — apps/mini/src/platform/network.ts（WeChat/Taro 边界类型透传，唯一转义点）；core/rate_limit.py（redis-py 不可用语义）。
  - `# SAFETY:` / 医疗安全 — health_* 拆分后保留 triage/outcome/share 安全注释；`Deterministic Red Flag > LLM` 语义在 retriage 端点注释保留。
  - `# PILOT-INTEGRITY:` 合成隔离注释沿用（services/pilot* 既有）。
  - `# PROVENANCE:` 3D provenance 注释沿用（visual_* 既有）。
  - 删除/未新增垃圾注释；被注释掉的旧代码块经扫描无残留（Git 保存历史）。
- 既有轮次（H/Stage V）已落标签在本轮保持。

## 5. 类型收口（28 个标记逐条判定）

| 标记 | 位置 | 判定 |
|---|---|---|
| `unknown as`（真实转义） | apps/mini/src/platform/network.ts:54（原 `resp.data as unknown as T`） | **已消除**：改为 `passThrough<T>` / `decodeUpload<T>` 两个带 `# PROVIDER:` 说明的边界函数，代码中不再含 `unknown as`（仅模块 doc 注释提及该反模式 → 扫描 false positive） |
| `any`（false positive） | apps/web/app/manifest.ts:24-25（PWA `purpose: "any"` 字面量）、tests/e2e-browser/specs/helpers.ts:54（注释"any deployment"）、network.ts:23（注释） | 非类型转义，正则误报 |
| `# noqa: BLE001` ×9 | ai_provider.py:134（provider 边界）、system.py:27/35/50（/ready、/ready/db 必须永不 500）、rate_limit.py:114（Redis 连接变体）、storage.py:90（回退本地磁盘）、worker/main.py:29（worker 循环崩溃安全） | 有界宽 except，均有行内理由；安全/可观测性边界必需 |
| `# noqa: E402` ×4 | gen_openapi.py:16（sys.path 引导后导入）、event_types.py:52/64/88/110（聚合模块 import 顺序） | 聚合/引导边界，惯例 |
| `# noqa: F401` ×11 | event_types.py（事件 payload 再导出）、models/__init__.py:43/65/83（模型注册共享 metadata）、v02_identity_daily_diary.py:107（gateway metadata） | re-export / 注册副作用，聚合边界惯例 |
| `any` / `unknown as` / `@ts-ignore` / `@ts-expect-error` / `cast(` 代码级（TS） | — | **0 个未解释转义**；五端 typecheck 0 |

结论：无新增未证明的类型逃逸；所有标记可审计（行内理由或规约边界）。

## 6. SV-006 / SV-007 收口（详见 STAGE_V2_ISSUE_LEDGER.md）

- **SV-006（apps/mobile 双 API 层）→ CLOSED**：`src/services/api.ts` 已删除且无导入残留；11 个消费方统一 `../api` 单一契约层；`TodayResp` 缺失导入已修复；`pnpm --dir apps/mobile typecheck` → 0 errors。
- **SV-007（限流 Redis 分布式 + in-process 回退）→ CLOSED**：`app/core/rate_limit.py`（RedisRateLimiter INCR+EXPIRE 固定窗口 / InProcessRateLimiter deque 回退；backend `auto|redis|in_process`；`auto` 不可达时日志回退，`redis` 显式选择 fail-fast）+ `app/main.py` 中间件（写方法、启用时 429 `RATE_LIMITED`）+ `config.py` 集中配置（rate_limit_enabled/per_minute/backend/redis_url）+ `tests/unit/test_rate_limit.py` 7 用例（Redis 路径 fake client、回退路径 monkeypatch 不可达，均不依赖常驻 Redis；本机 Redis 未监听下真实通过）。

## 7. 补测试（D）

- 每个被拆分模块的路径均由既有测试覆盖（含新增的 `tests/unit/test_rate_limit.py`）：拆分专项子集合计 **215 passed / 0 failed**（health 相关 49、v02_care_health 17、v02_behavior_training 62、v02_identity_daily 87，含安全/IDOR/场景重放/时移/多端一致性）。
- 全量 pytest = **427 passed / 0 failed / 0 errors**（≥420 达标；记录实际数字 427）。
- 未删除/弱化任何既有断言；全量数字较历史 420 更高。

## 8. 全量回归（E，真实命令证据）

| # | Gate | Command（真实执行） | 结果 |
|---|---|---|---|
| E10 | ruff | `.venv\Scripts\python.exe -m ruff check services/api services/worker packages/rules services/ai-gateway` | 0 errors（`All checks passed!`） |
| E11 | pytest | `.venv\Scripts\python.exe -m pytest -q` | **427 passed / 0 failed**，323.42s（5:23），exit 0 |
| E12 | 五端 typecheck | `pnpm --dir {web,admin,pro,mini,mobile} typecheck` | 5 × 0 errors |
| E13 | 五端 build | `pnpm --dir apps/web build` / `pnpm --dir apps/admin build` / `pnpm --dir apps/pro build` / `pnpm --dir apps/mini build:weapp` / `pnpm --dir apps/mobile typecheck`（mobile 无 build 脚本，既有 gate） | web ✓（清理陈旧 `.next/standalone` 符号链接后，51s）、admin ✓（46s）、pro ✓（57.5s）、mini ✓（43.8s，dist 产出）、mobile ✓（tsc 0） |
| E14 | vitest | `pnpm --dir apps/web exec vitest run` | 22/22 passed（4 个测试文件，含拆分后的 today-page 渲染用例） |
| E14 | Playwright | `npx playwright test --config tests/e2e-browser/playwright.config.ts`（全套件，web:3100 + api:8800 + Postgres 自建迁移/seed） | **29/29 passed**（完整重跑 exit 0；首跑 1 项 static-asset 瞬时失败，隔离与重跑均绿，`artifacts/results.json` expected=29 留存） |
| E15 | 安全/医学/合成隔离 | 含于全量 pytest：tests/safety、tests/stage_v（adversarial/properties/time_travel/synthetic_isolation）、tests/ga 全绿；SYNTHETIC_NEVER_COUNTS_AS_REAL、Deterministic Red Flag 不被降级、权限 deny-by-default 与撤销即时生效用例均为 passing | 通过 |

> 注：web/admin build 初跑失败为环境性陈旧 `.next/standalone`（Windows pnpm 符号链接 EPERM，`next.config.ts` 已内置 `PLIT_LOCAL_BUILD` 说明）；清理构建产物后重跑全绿，非源码缺陷。Playwright 环境性前提（迁移+seed、API/Web 进程）由测试运行方按库中既有流程满足。

## 9. 收口与提交（F）

- `WORK_STATUS.md` / `CHANGELOG.md` 已追加 Stage V.2 状态块（真实证据数字，见各文件）。
- 全部变更（本轮 + 既有未提交工作）以 `[PLI-STAGEV2]` 前缀单次提交至 main；不 force push；已完成 STOP，未进入 Stage I / v1.3 / Future 42 / 新功能开发。

---

## 附录：本轮（V.2）处置结论汇总

- **拆分**：4 个 Python 路由模块 + 16 个 React 页面/组件 + 1 个 TS 数据模块（i18n）；另修复既有工作树 5 处损坏（AskPanel、TodayScreen、mini _components、import 深度、auth.py 排序）。
- **重构/收口**：SV-006 单一契约层、SV-007 限流 adapter、注释/类型收口。
- **无需处理**（扫描+回归覆盖判定）：其余生产文件保持 ≤限、ruff/typecheck 0、无裸 TODO、无未解释类型转义，行为由全量回归证明。
- **死代码清理**：删除 `apps/mini/src/pages/agent/_components.tsx`（既有内容已迁入目录桶）、剥离未使用导入（ATTENTION_LEVELS）、清理 `apps/{web,admin}/.next` 陈旧构建产物。