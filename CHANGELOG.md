# Changelog

## v1.4.0 (Stage V) — PRE_PILOT_TECHNICAL_AUDIT_PASS（Pre-Pilot 全量验证与仓库终极审计）

在 REAL_PARTICIPANTS=0 / REAL_PETS=0 条件下完成 24 份 Stage V 报告 + Issue Ledger（12 份新建 + 12 份复核修正），
Canonical→Code Traceability（MISSING=0 / DOC_DRIFT=0）、Synthetic Cohort（SYN-01..20，查询级隔离双验证）、
Scenario Replay（REPLAY-01..12）、Adversarial（§14-16，0 unintended access，SV-001 ops 门禁修复）、
Property（§18）、Time-Travel（§19 可控时钟）、AI Goldset（§20-22，21 例）、Visual Regression（12 页×5 宽度基线）、
3D Viewer Runtime（glTF/WebGL/context-loss/FPS/fallback，诚实 blocked）、架构/代码质量/注释/死代码/DB/API/安全/依赖/性能/
文档漂移/测试质量/多端/无障碍/UX Copy 全量审计。

### Verification（2026-09-23 全部真实命令）
- pytest **420 passed**（339.25s，含 Stage V 新增 133）· ruff **0** · 五端 typecheck **0**
- 五端 build **OK**（web/admin/pro next build + mini weapp）· vitest **22/22** · Playwright **29/29**（123.6s）
- OpenAPI **187** ↔ routes **186** ↔ 0 未匹配；/pilot/status 实测 pets_total=0 / activated=0 / excludes[demo,internal,synthetic_domain]
- 禁止文案 Grep **0 命中**；secrets 审计无 committed secret（只报位置/类型/严重度）

### Fixed
- **SV-001 (P1)**：`POST /ops/feature-flags` 无管理门禁 → 增加 `require_ops_admin`（is_internal 平台运营），普通 owner 403（对抗 §15 实测）
- **SV-010 (P2)**：已起草 5 份报告 pytest 数字 419 → 按本轮真实重跑统一修正为 420
- Docker 引擎本 Stage 恢复（容器 healthy），本地全 gate 跑通；staging 部署保持 EXTERNAL_BLOCKED（无权限，不伪造）

### External blockers（诚实保留，同 Stage H/G）
REAL_3D_PROVIDER · REAL_3D_PET_ASSET · 真机 QA · STAGING_DEPLOY · COMPANION_HARDWARE · SMTP · AI Provider · git remote

### 停止点
达到 `PRE_PILOT_TECHNICAL_AUDIT_PASS` + `WAVE_0_REENTRY_READY`；下一步 **Stage G-W0A First Real Participants**；
不自行进入 Stage I / v1.3 / Future 42 / 新功能开发。


## v1.3.0 (Stage H) — PRODUCT_DESIGN_FREEZE + UI_UX_FREEZE + MULTI_CLIENT_EXPERIENCE_FREEZE

从 `WAVE_0_READY / AWAITING_REAL_PARTICIPANTS` 推进到 `PLI_PRODUCT_DESIGN_COMPLETE +
PLI_UI_UX_COMPLETE + PLI_FRONTEND_COMPLETE + PLI_MULTI_CLIENT_EXPERIENCE_FROZEN + WAVE_0_REENTRY_READY`。
设计基线 v3.1-R1 母版 + 228 Feature Inventory；不重新设计产品方向（仍为 Pet Life Intelligence）。

### Added（产品设计 / 信息架构 / 设计系统）
- **docs/product**：`FEATURE_EXPERIENCE_MATRIX`（PLI-001..228 全覆盖，8 类状态词）、`MASTER_PAGE_INVENTORY`
  （OWN-001..021 / ADM-001..010 / PRO-001..006）、`INFORMATION_ARCHITECTURE`、`NAVIGATION_MODEL`。
- **docs/ui**：`PLI_DESIGN_SYSTEM_V1`（11 类 tokens + 语义色 Normal..Emergency + Risk Status）、
  `COMPONENT_INVENTORY`（29 组件）、`COPY_GUIDELINES`（§75 禁止文案 + 错误映射）、`RESPONSIVE_GUIDELINES`
  （360/390/768/1024/1440）、`ACCESSIBILITY_GUIDELINES`、`COMPANION_UX`（四层 + Interaction Welfare Guard）、
  `MONITORING_UX`（五问 + 设备五档 + Camera Candidate Review）、`MULTI_CLIENT_EXPERIENCE_MATRIX`。
- **packages/ui-tokens**：扩展为完整 token 集（Grid/Breakpoint/Z-index/Border + semantic）+ build 脚本 + src helpers。
- **packages/ui-kit**（新建）：30 组件（PetAvatar/PetSwitcher/QuickLogSheet/EventCard/TimelineItem/MetricCard/
  TrendCard/RiskBanner/RedFlagReason/NextActionCard/EmergencyAction/EvidenceList/EvidenceCard/VetBriefSection/
  CareTask/PersonChip/DeviceStatus/InteractionCard/CompanionControl/AIAnswer/CitationChip/ConsentPanel/
  EmptyState/ErrorState/Skeleton/Toast/Modal/Sheet/State/TokenIcon）；Web 10 个核心页面实际引用。

### Added（五端前端产品化）
- **Web**：Today 重构为产品首页（Current State/Attention/Quick Log ≤10s/Tasks/Recent Events/AI Summary/Timeline
  Preview）；Timeline 完整重构（Domain/Source/Media 筛选 + 搜索 + AI/真实视觉区分 + Skeleton/EmptyState）；
  Pet Profile（/pets/[id]）；Health 全流程（Intake/Evidence/Triage/Vet Brief/Outcome + 独立医疗安全组件）；
  Medication 状态区分（Plan/Pending/Given/Missed）；新增 **/welfare /social /monitoring /companion /agent** 五个领域页；
  Offline UX（Quick Log/Behavior/Health Intake/Care Note 草稿 + 未同步/同步中/已同步/同步失败，lib/drafts.ts）；
  i18n zh-CN 全量集中（lib/i18n.ts + mapErrorMessage 人类语言映射）；PWA basePath/manifest/SW 保持。
- **Mini（Taro）**：Bottom Tab 5 + Sheet + tokens.scss 镜像；companion 入口卡；信息密度收口。
- **Mobile（Expo）**：Today/Timeline/Monitoring/Companion/Me/Notifications/QuickLog/Health 8 屏 + tokens.ts 镜像。
- **Admin**：11 项 IA（Overview/Pilot/Users/Pets/Safety/AI/Devices/Integrations/Audit/Incidents/Flags，
  capabilities 折叠）；不混 Owner 页面。
- **Pro（apps/pro 新建）**：Vet（Assigned Pets/Vet Brief/Evidence/Timeline/Outcome）+ Trainer（Behavior/Training）
  + Service（Care Card/Tasks）；Vet Brief 专业布局 + 打印友好。
- **H5 Share**：Vet Brief / Care Card mobile-first、revocable、expiry 可见（E2E-09 保持）。

### Fixed
- `useCurrentPet` 监听 `pli-pet-changed`/`storage`：TopNav 切换宠物后各页面即时获得上下文
  （修复直接访问 /welfare、/social、/monitoring 时 petId 恒空导致 3 个 error 态的问题）。
- 历史遗留 ruff：`scripts/_patch_ga2b.py` 字符串拼接语法损坏 + 2 处 unused（pilot_demo_seed/remote_privacy_check）。
- 本地 E2E：WinNAT 保留 55432 → `.env.local` 指向 55679（Stage H 临时，不部署、不污染 Pilot 数据）。

### Verification（全部真实命令，2026-09-20）
- pytest **273 passed**；ruff **0 errors**；web/admin/mini/mobile/pro typecheck **0**；
  web/admin/pro/mini build **OK**；vitest（apps/web）**22/22**；Playwright 本地 **17/17**
  （12 旧路径零回归 + 5 新 Stage H UX：welfare/social/monitoring/agent/companion）。
- 禁止文案扫描（AI 确诊/宠物想你了/98% 开心/100% 安全）**CLEAN**；/pilot/status 诚实（PILOT_MODE=false，
  REAL=0，excludes[demo,internal,synthetic_domain]）；未部署 staging；未创建真实 Participant。

### Reports
- `reports/STAGE_H_DESIGN_PREFLIGHT` · `STAGE_H_FEATURE_UI_AUDIT` · `STAGE_H_UX_ACCEPTANCE_MATRIX` ·
  `STAGE_H_ACCESSIBILITY_AUDIT` · `STAGE_H_RESPONSIVE_AUDIT` · `STAGE_H_MULTI_CLIENT_AUDIT` · `STAGE_H_FINAL_REPORT`。

### External blockers（诚实标注，同 Stage G）
git remote URL、真实 AI API key、SMTP 凭据、独立生产域名/DNS、小程序账号/签名；
Companion 硬件（Camera/Audio/Treat/Toy/Robot）= EXTERNAL_BLOCKED / DESIGN_ONLY。

### 停止点
达到 `STAGE_H_COMPLETE`（PRODUCT_DESIGN_FREEZE / UI_UX_FREEZE / MULTI_CLIENT_EXPERIENCE_FREEZE）。
下一步为 **Stage G-W0A First Real Participants**；不自行进入 Stage I / v1.3。
## v1.2.2 (Stage G-W0) — WAVE_0_READY（隔离上线 + 邀请制演练 + 无干预 dry-run）

从 `PILOT_OPERATIONS_READY / AWAITING_REAL_PARTICIPANTS` 推进到 `WAVE_0_READY / AWAITING_REAL_PARTICIPANTS`。

### Added
- **demo/internal/test 工程级隔离（已上线 staging）**：users/pets `is_demo`/`is_internal` 标记 +
  `pilot_orgs` 元数据表（状态机 LEAD→ONBOARDING→ACTIVE→PAUSED→COMPLETED + WITHDRAWN/TERMINATED_*，
  无硬删除）+ legacy 回填（@pli.demo→is_demo、@pli.test→is_internal）；查询时合成域安全网
  （@pli.demo/@pli.test/@pli.pilot）。`/pilot/status` 诚实化：**pets_total 7(合成污染)→0(真实)** +
  excludes 声明 + invited/registered/activated_owners 字段（migration `48f7e9c2ab01` + `c4d8e2a71b93`）。
- **无干预 dry-run 脚本**：`scripts/pli_wave0_dryrun.sh`（注册(带邀请码)→验证→登录→建宠→
  Quick Log→Timeline→Today→反馈→指标排除，PILOT_MODE 临时 true 自动恢复）。
- **W0 运营模板**：reports/pilot/ORG_LEDGER.md（W0-OWNER-01 / W0-PROFESSIONAL-01 占位 LEAD，不伪造机构）。

### Fixed
- **P1 测量 bug（live dry-run 发现）**：/pilot/status 合成域过滤 OR-of-NOT-LIKEs 恒真 →
  dry-run @pli.test 宠物漏入 pets_total；改 AND 排除（`8bcc0bf`）+ 回归测试。
- 本地 WinNAT 保留 55432 端口 → docker-compose PG 端口支持 `PLI_PG_PORT` 覆盖。

### Verification（全部真实命令）
- 邀请制门控演练 **9/9 PASS**（临时 true → 无码 422/有码 201/恢复 false）；无干预 dry-run **11/11 PASS**；
  隐私 **8/8 PASS**（跨用户 403/导出/consent/删除登记）；备份 **10/10 PASS**（74 表 + 恢复库 smoke）；
  Playwright **12/12 PASS**（公网 staging，含七路径医疗安全/IDOR）。
- pytest **273 passed**；ruff 全绿；web/admin typecheck 0。

### External blockers（诚实标注）
git remote URL、真实 AI API key、SMTP 凭据、独立生产域名/DNS、小程序账号/签名。

## v1.2.1 (Stage G 启动) — REAL PILOT OPERATIONS READY

从 `PLI_V1_0_WEB_LIVE_PILOT_LIVE` 进入 Stage G：真实试点运营准备完成，待真实参与者。

### Added
- **Stage G 就绪审计**：`reports/STAGE_G_PILOT_READINESS.md`（§6 十五问逐条回答；结论
  `PILOT_OPERATIONS_READY / AWAITING_REAL_PARTICIPANTS`；公网 staging 当前 PILOT_MODE=false）。
- **试点运营文档**：docs/pilot/ 新增 PILOT_OPERATIONS（组织模型/状态机/隔离/发布/退出/成本）、
  PILOT_ONBOARDING（宠主 ≤5min + 机构流程 + Activation 定义）、PILOT_METRIC_DEFINITIONS（M-01~M-16 指标字典）、
  INTERVIEW_GUIDES（宠主/兽医/训练师/Companion/价格访谈）、PILOT_SUPPORT（支持/SLA/健康边界/incident/导出删除）。
- **周报体系**：reports/pilot/ 新增 README + ACTIVATION_FUNNEL / UX_FRICTION_LOG / FEATURE_USAGE /
  FEATURE_REQUEST_BACKLOG / COMPANION_DISCOVERY / DEVICE_DISCOVERY / COMMERCIAL_DISCOVERY /
  WEEK_01_PILOT_REPORT 模板（全部 NOT_YET_OBSERVED，无伪造）。

### Changed
- 注册页新增「邀请码（选填）」输入并透传（PILOT_MODE=true 时真实用户可完成邀请制注册）：
  `apps/web/app/register/page.tsx` + `packages/api-client` `authApi.register(…, invite_code?)`。
- 设置页新增「试点反馈」卡片（10 类：bug/confusing/slow/missing/unnecessary/safety/privacy/
  feature_request/health_concern/other）：`apps/web/app/settings/page.tsx` + `pilotApi.feedback()`。
- 反馈类别集合扩展为 Stage G 全集：`services/api/app/services/pilot.py`。
- Admin 首页新增「试点 Pilot 状态」卡片（/pilot/status：pilot_mode/pets/3d/7d/反馈数）：`apps/admin/app/page.tsx`。

### Quality
- pytest **267 passed**（全量重跑）；web + admin typecheck 0 error；ruff 全绿。

### Known gaps（诚实标注，进入 backlog）
- 无 is_demo/is_internal 隔离字段（Pilot DB 不进 demo 运营缓解）；无 pilot_org 元数据表（运营台账过渡）；
  Admin 邀请码批量生成/反馈分诊页未建；AI/SMTP/git remote 仍为外部 blocker。
## v1.2.0 (2026-09-17) — Stage F Deployment Activation（WEB_LIVE + PILOT_LIVE）

从 `WEB_READY_PILOT_READY` 推进到 `PLI_V1_0_WEB_LIVE_PILOT_LIVE`（公网 staging 真实可用）。
### Added
- **真实公网部署**：https://staging.haoleilab.com（path-prefix /pli web · /pli-api API · /pli-admin admin；独立 DB/Redis/volume；Caddy Let's Encrypt TLS + HSTS 安全头）。
- **远程验证套件**（scripts/remote_*.py，全部真实公网执行）：全链路 smoke 20/20、Auth 矩阵 15/15、医疗安全 9/9、存储 9/9、隐私 8/8、share-revoke 7/7、Pilot 8/8、Pilot 闸门 9/9、备份恢复 10/10（exit 0）。
- **Playwright 远程化**：PLI_E2E_BASE_URL / PLI_E2E_BASE_PATH / PLI_E2E_API 环境变量驱动 + goto base-path fixture；本地 12/12 + 远程公网 12/12。
- **PWA basePath 感知**：动态 manifest 路由（start_url/scope/icons 随 NEXT_BASE_PATH）、PwaShell basePath prop、sw.js v2 从 registration.scope 派生 BASE、API/share 响应同域前缀下永不缓存。
### Fixed
- web/admin 镜像缺 NEXT_PUBLIC_API_URL 构建 ARG → bundle 烘焙 localhost:8800，公网浏览器端 API 全断（远程 Playwright 发现）。
- seed 清理列表漏 auth/pilot 表（FK 引用 users）→ 服务器有会话时 seed 崩溃（远程 seed 发现）。
- 健康页 window.location.href 不感知 basePath → 公网部署健康详情流 404；改 router.push。
- Web typecheck：本地 node_modules 漂移（stale react 19.3.0）致 Suspense/ReactNode 伪错误；pnpm install --force 修复（无代码 hack）。
### Quality
- pytest **267 passed**；ruff 全绿；typecheck 0 error；本地 + 远程 Playwright **12/12**；远程部署后全链路回归绿。
### External blockers（诚实标注）
git remote URL、真实 AI API key（代码 REAL_PROVIDER_READY）、SMTP（代码+模板齐备）、独立生产域名/DNS 控制、微信 AppID / 商店账号 / 签名。
## v1.1.1 (2026-09-14) — Stage E Real Launch Preparation

从 `PRODUCTION_READY_MULTI_CLIENT` 推进到 `WEB_READY_PILOT_READY`（发布步骤外部 blocker）。

### Added
- **Real Auth**：Argon2id 密码、rotating refresh tokens（family reuse detection）、
  注册/登录/刷新/登出/忘记密码/重置/邮箱验证/会话管理/改密/删号/登录限流；
  dev-auth 生产 fail-fast；注册自动创建 household（修复真实用户无法建档）。
- **Real AI**：OpenAI-compatible provider（经 AI Gateway，JSON+schema 强制，
  mock fallback 保产品可用）；`/ai/status` 如实报告 real/mock。
- **Pilot Mode**：invite-only（管理员单次邀请码）、注册门禁、反馈通道、
  指标（北极星：Active Pets with Continuous Evidence Chain）；业务包全套文档。
- **WeChat 登录**：jscode2session 后端 exchange + find-or-create；无凭据诚实
  EXTERNAL_BLOCKED。
- **监控**：/metrics 端点；worker crash/restart 语义测试。
- **配置**：生产 fail-fast 校验；staging compose + nginx（HSTS/CSP）。
- **Demo**：`scripts/pilot_demo_seed.py`（虚构宠物"豆包"全链路）。

### Quality
- pytest **267 passed**（+28：auth 11 / pilot 5 / config 4 / onboarding 2 / worker crash 2 / ai provider 4）；
  Playwright **12/12**（+2 真实注册/登录/重置浏览器 E2E）；ruff 全绿；
  Web/Admin/Mini/Mobile build 全绿。

### External blockers（诚实）
git remote、服务器/域名/证书、AI key、微信 AppID、移动商店账号、SMTP。

## v1.1.0 (2026-09-14) — Multi-Client Productionization

从 `PLI_V1_0_RELEASE_CANDIDATE_READY` 推进到 `PLI_V1_0_PRODUCTION_READY_MULTI_CLIENT`。

### Added
- **多端客户端**：`apps/mini`（Taro 微信/支付宝/抖音小程序，12 页 + 平台抽象层）、
  `apps/mobile`（Expo iOS/Android，secure-store + 底部 Tab）、`apps/admin`（运营概览/Feature Flags/能力注册表/审计/就诊摘要）。
- **H5 分享页**：Vet Brief / Care Card 匿名 token 访问（过期/撤销/审计）。
- **设计系统**：`packages/ui-tokens`（Color/Typography/Spacing/Radius/Elevation/Motion/Risk/Semantic）+ 品牌视觉资产。
- **Web/PWA**：manifest + service worker + 离线壳、loading/error/not-found 边界、
  中文导航重构（今日/时间线/宠物/助手/我的）、i18n 基础、响应式。
- **后端硬化**：lifespan 优雅启停、DB 连接池、structlog JSON 日志、
  OpenAPI 契约 artifact（157 paths）、生产/staging/pilot env 模板。
- **基础设施**：docker-compose.production + Dockerfiles + nginx、CI（.github/workflows/ci.yml）。
- **测试**：`tests/multi-client`（跨端一致性 4 项）、Playwright 扩至 10 条（PWA/share/404/中文导航）、
  OpenAPI 生成校验脚本。

### Quality
- pytest **239 passed**；ruff 全绿；Web/Admin build 绿；Mini（weapp/alipay/tt）build 绿；
  Mobile（android/ios）bundle 绿 + typecheck 绿；Playwright **10/10**；staging smoke 12/12；
  性能基线 p95<1s 0 error；备份/恢复（历史 round2）。

### External blockers（诚实标注）
- 微信 AppID/主体、App Store/Google Play/HarmonyOS 账号、域名备案/证书、生产服务器、git remote。

## v1.0.0 (2026-09-13) — GA

Stage A v0.1（50 P0）→ Stage B v0.2（48 P1）→ Stage C v1.0（88 P2）→ Stage D GA Hardening。

### Added
- v0.1：canonical event graph（46 事件类型、provenance/幂等/不可静默覆盖）、
  RBAC+ABAC+审计、Today/QuickLog/Timeline/Tasks、照护网络（邀请/交接/Care Card）、
  行为 ABC、健康事件→独立红旗规则引擎→分级→Vet Brief→用药→Outcome、
  AI Gateway（mock provider、结构化输出、离线评测）、14 个 UI 界面、7 条 API E2E。
- v0.2：芯片/护照标识、宠物生命周期、确定性基线（trimmed_mean_v1）、日记、
  AI 日报、交接清单与照护报告、角色通知、病历导入（来源分级）、恢复计划、
  症状趋势、疫苗/驱虫/体检提醒、行为图谱/模板/偏好/建议安全过滤、
  奖励式训练全链路、社交（双重同意/拉黑/举报）、饮食档案、费用账本、里程碑、
  回忆、带证据的个人问答/搜索/为什么提示、结构化记忆、内容版本管理、
  隐私分析计数、运行状态。
- v1.0：设备适配器体系（interface+沙箱+flag+契约测试+webhook 去重）、
  统一事件转换/质量检查/多宠归因/AI 审核队列、身份合并与所有权转移
  （仅登记+人工确认）、字段级隐私、数据导出包、专业关系/签名政策、
  紧急授权模式、五域福利/问卷/证据、行为干预计划、慢病/老年视图、术语映射、
  训练泛化/下一步建议/健康约束/成果证明、服务请求记录层（不撮合不收款）、
  商品约束过滤、费用分摊/年度汇总/保单档案/导出、年度回顾/跨期对比、
  Agent 行动策略（booking/purchase/medical 一律 REFUSED）、有害内容过滤、
  跨来源身份归一、实验分组、数据质量评分、capability registry。
- Stage D（GA）：字段级隐私真实掩码、专业记录签名状态、capability registry、
  结构化访问日志、EXTERNAL_BLOCKED 错误码、webhook 重放 409、
  规则引擎正则模式（对抗插词规避）、Playwright 浏览器 E2E（7 主路径）、
  迁移全重放与降级验证、备份/恢复 round 2（恢复库 API smoke）、性能基线。

### Fixed（Stage D 真实缺陷）
- CORS 缺 3100：真实浏览器无法调用 API（仅浏览器 E2E 可发现）。
- NUL/控制字符 payload 导致 500 → 统一 422。
- HealthEventCreate 决策字段未禁 extra → extra=forbid。
- 设备 webhook 重放 → 409 DUPLICATE_EVENT。

### Safety
- 红旗规则引擎独立且版本化；LLM 输出 schema 禁止决策字段；
  triage 只升不降；主人淡化/提示注入攻击测试覆盖。
- 高风险动作（转移/合并/删除/预约/购买/医疗）一律不自动执行。

### Quality @ GA
- pytest 235 passed；Playwright 7 passed；ruff/typecheck/build 绿；
  迁移重放+降级验证；备份恢复（恢复库可读写）；staging smoke 12/12；
  性能基线全端点 p95<100ms。

## v1.5.0 (Stage V.2) — 全仓代码审核、重构、注释、风格、架构、类型、安全与可维护性最终收口

- 逐文件审核 + 可复现扫描（scripts/scan_codebase_scale.py）：生产源码 >300 行 / React >200 行 / 非组件 TS >300 行 = 0；裸 TODO = 0。
- 历史违规清单（14 Python + 12 React + 1 TS）全部处置：本轮拆分 4 个 Python 路由模块（health / v02_care_health / v02_behavior_training / v02_identity_daily → 聚合器 + 子模块，路由/状态码/权限/安全不变量逐一保留）、16 个 React 页面、1 个 TS 数据模块（lib/i18n.ts → lib/i18n_zh_cn.ts）。
- SV-006（mobile 双 API 层）CLOSED：单一契约层统一引用，`pnpm --dir apps/mobile typecheck` 0。
- SV-007（限流）CLOSED：Redis 分布式（INCR+EXPIRE）+ in-process 回退 adapter；backend auto/redis/in_process；`tests/unit/test_rate_limit.py` 7 用例，不依赖常驻 Redis。
- 修复既有工作树损坏：AskPanel 签名重建、TodayScreen 缺类型导入、mini `_components` 重复 import、agent 面板 i18n 相对路径深度、auth.py import 排序（I001）。
- 类型收口：network.ts `unknown as` 转义消除（`# PROVIDER:` 边界函数）；28 个逃逸标记逐条判定、0 个未解释转义。
- 回归（真实命令，command/date/duration 见 WORK_STATUS.md 与 STAGE_V2_FULL_CODEBASE_REVIEW.md）：pytest **427** passed / 0 failed；ruff 0；五端 typecheck 0；五端 build OK（web/admin 清理陈旧 `.next/standalone` 后重跑全绿）；vitest 22/22；Playwright **29/29**（完整套件）。

- 补充（测试文件拆分）：3 个手写测试文件拆分后全仓含测试 0 超限——test_api_integration.py 402→194+flows 216（类级）、test_adversarial_permissions.py 304→288（助手提取）、test_seven_paths.py 308→276+_path_helpers.py（DB 建户助手）；55 用例收集/通过不变，全量 pytest **427** passed 复证。