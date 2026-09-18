# STAGE_G_PILOT_READINESS — 真实 Pilot 就绪审计

> 状态：**PILOT_OPERATIONS_READY / AWAITING_REAL_PARTICIPANTS**
> 依据：本次 Stage G 启动前对仓库 + 公网 Staging 的实际核查（2025 现场验证，非假设）。
> 审计时间：Stage G 启动（本文件创建日）。所有结论以代码路径与 API 为准。

## 0. 审计方式与证据基线

| 检查项 | 证据 |
|---|---|
| 后端模型/路由 | `services/api/app/models/pilot.py`、`services/api/app/services/pilot.py`、`services/api/app/api/routes/v11_pilot.py` |
| 注册门控 | `services/api/app/services/auth.py`（require_pilot_registration）+ `routes/auth.py` |
| AI 状态 | `services/api/app/adapters/ai_provider.py`（provider_status）+ `routes/system.py /ai/status` |
| 监控 | `services/api/app/api/routes/system.py /metrics` |
| Demo 隔离 | `services/api/app/seed.py`（@pli.demo / Demo Family） |
| 前端 | `apps/web/app/register/page.tsx`、`apps/web/app/settings/page.tsx`、`apps/admin/app/page.tsx` |
| 回归 | pytest 267 PASS（本次改动后全量重跑）、web/admin typecheck 0、ruff clean |
| 公网 | https://staging.haoleilab.com/pli · /pli-api · /pli-admin（Stage F 验证 LIVE，PILOT_MODE=false） |

## 1. 启动前 Reality Audit 结论（对 §6 的 15 个问题逐一回答）

### Q1 如何创建 Pilot organization
**现状：无机构实体。** 系统只有轻量 `PilotUserProfile.organization`（字符串字段）与 Household
（家庭维度）。不存在 `pilot_org_id` / 机构状态机（LEAD→ONBOARDING→ACTIVE→PAUSED→COMPLETED）。
- 过渡做法：用 `PilotUserProfile.organization` + `note` 记录机构名；机构级元数据落到
  `docs/pilot/PILOT_OPERATIONS.md` 的运营台账（离线表格）。
- 缺口：`pilot_org` 元数据表（§7）**未实现**。第一轮 Pilot 前建议按 §5 轻量模型补一张表
  （见 PILOT_OPERATIONS.md「Pilot 组织模型」；不进入 Feature 域，仅运营元数据）。

### Q2 如何邀请 Pilot user
**已实现（后端完整，前端本次补齐）。**
- 管理员（当前为任意登录用户，advisory 检查）调用 `POST /api/v1/pilot/invites` → 返回一次性邀请码
  （`secrets.token_urlsafe(9)`，服务端只存 sha256 哈希，可设用途/次数/过期时间）。
- 注册时 `POST /api/v1/auth/register` 携带 `invite_code` + `role`；PILOT_MODE=true 时无码 422（有测试证据：无码 422 / 有码 201）。
- **本次修复**：`apps/web/app/register/page.tsx` 原无邀请码输入框（真实用户在邀请制下无法注册），
  已新增「邀请码（选填）」字段并透传。
- 待办：正式运营需要**邀请码批量生成脚本/页面**（Admin），当前需用 API 或 seed 辅助。

### Q3 如何创建真实 Pet
- 注册/登录后 `POST /api/v1/pets`（web：`/pets/new`），Pet 挂 Household；支持多宠（多 pet 同 household）。
- 真实 Pilot 的 pet 与 demo pet 在同一数据表，**当前无 is_demo 标记**（见 Q4）。

### Q4 如何区分 demo / real pilot
**缺口（本轮未实现数据库级隔离）。**
- 现状：`User`/`Pet`/`LifeEvent` 均无 `is_demo` / `is_internal` 字段；seed 只靠约定
  （邮箱 `*@pli.demo`、household 名 "Demo Family"）区分。
- 后果：`/pilot/status`、`/metrics` 的计数**不排除 demo 数据**（有真实污染风险）。
- 本轮缓解：Admin Pilot 卡片与本文档明确标注口径与缺口；PILOT_OPERATIONS.md 给出两条路径：
  (a) Pilot DB 只进真实用户（推荐，demo seed 仅在 dev 库执行）；
  (b) 后续补 `is_demo/is_internal` 字段 + migration + 指标过滤（进入 backlog，需解除部分冻结评估）。
- 指标默认规则（§5）：`exclude_demo=true / exclude_internal=true / exclude_synthetic=true`，
  无真实数据时写 `NOT_YET_OBSERVED`，不伪造。

### Q5 如何查看 Pilot metrics
- 实时：`GET /api/v1/pilot/status`（pilot_mode / pets_total / active_pets_3d / active_pets_7d / feedback_count / north_star）。
- 运维：`GET /api/v1/metrics`（24h 计数：life_events / ai_calls / login_failures / security_events / audit_entries / open_incidents）。
- **本次新增**：Admin 首页「试点 Pilot 状态」卡片（`apps/admin/app/page.tsx`）。
- 周报：`reports/pilot/WEEK_N_PILOT_REPORT.md` 模板（人工汇总）。
- 缺口：Activation Funnel / Retention / Outcome Closure 尚无自动化计算，先以
  `reports/pilot/ACTIVATION_FUNNEL.md` 手工 + 脚本口径维护。

### Q6 如何收集 feedback
- **已实现 + 本次补齐前端**：`POST /api/v1/pilot/feedback`（类别已扩展为 Stage G 全集：
  bug / confusing / slow / missing / unnecessary / safety / privacy / feature_request / health_concern / other）。
- 前端入口：设置页「试点反馈」卡片（`apps/web/app/settings/page.tsx`），安全/隐私类别自动带
  page_url 与 pet_id；敏感数据最小化（不自动附加病历/媒体/全文）。
- 缺：反馈查看/分诊页面（Admin），先用 DB 查询 + 周报。

### Q7 如何处理 support
- 已实现通道：产品内反馈（见 Q6）；`docs/pilot/SUPPORT_OPS.md`（支持渠道/SLA/每日检查）。
- 缺口：pilot@ 邮箱、oncall 邮箱为占位符（SMTP EXTERNAL_BLOCKED，见 Q14）；无工单系统（第一轮人工+表格可接受）。

### Q8 如何处理 incident
- 已有：`Incident` 模型 + `/metrics` open_incidents + `docs/INCIDENT_RUNBOOK.md`（SUPPORT_OPS 引用）。
- 补齐：`docs/pilot/PILOT_SUPPORT.md` 定义 P0–P3 分级与 SLA；Safety Incident 清单（§39）进入周报。

### Q9 如何退出 Pilot
- 用户侧：`POST /api/v1/auth/delete-account`（账号删除）、`POST /api/v1/pets/{id}/deletion-requests`
  （删除请求登记，人工确认后离线执行——v0.1 设计如此）。
- 机构侧：运营人员在运营台账中把 org 状态置为 COMPLETED/WITHDRAWN（无系统状态机，见 Q1）。
- 本次实测范围：删除请求在设置页可登记（已有 UI）。

### Q10 如何导出 / 删除 Pilot 数据
- 导出：`GET /api/v1/pets/{pet_id}/export`（完整数据）与 `/pets/{pet_id}/finance/export.csv`（已存在）。
- 删除：账号删除 + pet 删除请求（人工确认，不静默删）。
- 注意：**没有「撤销 consent」后自动删除数据的联动流程**（同意可撤回，数据删除仍需人工流程）——
  已写入 PILOT_SUPPORT.md 的操作规程，由运营执行。

### Q11 如何暂停机构 Pilot
- 无系统机制（无 org 状态机）。过渡：运营台账标记 PAUSED + 撤销该机构用户的访问（Q12）。

### Q12 如何撤销机构访问
- 账号级：禁用用户 `is_active=false`（DB 操作）或删除账号。
- 共享/授权级：`Grant`（pet 级授权）可 revoke（remote_privacy_check 已验证 share-revoke 403）；
  `HouseholdMember.status` / `Relationship.revoked_at` 可撤回家庭/关系权限。
- 安全事件审计齐全（AuditEntry）。

### Q13 当前真实 AI 是否启用
- **未启用**。`GET /api/v1/ai/status` → `real:false`（AI_API_KEY 为空 / AI_PROVIDER=mock）。
- 启用条件：`AI_PROVIDER=openai_compatible` + 真实 `AI_API_KEY` → real:true（代码就绪）。
- 启用后必须重跑：AI Eval / Medical Safety / Prompt Injection / Grounding / Hallucination / Remote AI Smoke
  （§41 清单），之后才允许真实 Pilot 使用 AI。未启用前：`AI_EXTERNAL_BLOCKED`，非 AI 功能照常 Pilot。

### Q14 当前 SMTP 是否真实可用
- **不可用**。`EMAIL_DELIVERY=console`（验证码打印到日志/响应），SMTP 凭据为空。
- Invite-only Pilot 可接受：邀请码由运营线下交付，邮箱验证走 console（远程 smoke 已验证该路径）。
- 公开注册前必须完成真实 SMTP（§67）。

### Q15 当前监控是否能识别 Pilot 用户与环境
- 部分能：`/metrics` 有全局计数；`/pilot/status` 有 pilot 计数；但**无按 org/cohort/用户区分**的指标，
  且不排除 demo（见 Q4）。监控无法回答「哪些是真实 Pilot 用户」——以 invite 绑定（PilotUserProfile）为准，
  周报人工归属 cohort。

## 2. 已具备（可以立刻开始）的能力清单

- [x] 邀请制注册门控（后端完整，前端邀请码框已补齐）
- [x] 一次性/过期/哈希邀请码 + 审计
- [x] 产品内反馈 API + 前端入口（10 类）
- [x] Pilot 实时计数 API + Admin 卡片
- [x] /metrics 运维计数 + /ready 健康检查
- [x] 数据导出（pet 全量 + finance CSV）
- [x] 账号删除 + 删除请求登记（人工确认）
- [x] 授权撤销（share/grant 已验证 403）
- [x] 医疗安全：独立规则引擎 + Safety Gate（Stage F 9/9）
- [x] 备份/恢复演练（10/10）
- [x] 文档骨架：VET/STORE/TRAINER/CARE_SERVICE PILOT、DEMO_SCRIPT、PILOT_CONSENT、SUPPORT_OPS
- [x] 全新交付：PILOT_OPERATIONS / PILOT_ONBOARDING / PILOT_METRIC_DEFINITIONS / INTERVIEW_GUIDES / PILOT_SUPPORT
  + reports/pilot/ 全套模板（见 §3）

## 3. 本轮（Stage G 启动）新增交付

| 文件 | 内容 |
|---|---|
| docs/pilot/PILOT_OPERATIONS.md | 组织模型/状态机/角色/隔离/发布/退出/导出删除/成本 |
| docs/pilot/PILOT_ONBOARDING.md | 宠主 + 机构 onboarding、Activation 定义 |
| docs/pilot/PILOT_METRIC_DEFINITIONS.md | 指标字典、北极星、funnel、retention、outcome closure、cohort |
| docs/pilot/INTERVIEW_GUIDES.md | 宠主/专业/Companion/价格访谈 |
| docs/pilot/PILOT_SUPPORT.md | Support 类型/分诊/健康边界/incident/export-delete 规程 |
| reports/pilot/README.md + 7 个模板 | ACTIVATION_FUNNEL / UX_FRICTION_LOG / FEATURE_USAGE / FEATURE_REQUEST_BACKLOG / COMPANION_DISCOVERY / DEVICE_DISCOVERY / COMMERCIAL_DISCOVERY / WEEK_01_PILOT_REPORT |

## 4. 已知缺口（按优先级）

| 优先级 | 缺口 | 处置 |
|---|---|---|
| P1 | 无 is_demo/is_internal 隔离，指标可能被 demo 污染 | 运营上：Pilot DB 不进 demo；工程上：入 backlog（轻量字段 + migration + 过滤） |
| P1 | 无 pilot_org 元数据与状态机 | 运营台账过渡；第二周评估轻量表 |
| P1 | AI 未启用（无 key） | 外部 blocker，等 key；提供 key 即按 §41 流程启用 |
| P1 | SMTP 未启用 | 外部 blocker，invite-only 阶段可接受 |
| P2 | Admin 无邀请码批量生成/反馈分诊页 | 入 backlog（运营工具，非业务功能） |
| P2 | 无自动化 funnel/retention 计算 | 先脚本+手工；样本量上来后做 SQL 视图 |
| P3 | git remote 为空 | 外部 blocker；有 remote 即 push + 最低 CI |

## 5. 启动声明

**PILOT_OPERATIONS_READY = TRUE（基础设施与流程就绪）**
**AWAITING_REAL_PARTICIPANTS = TRUE（尚无真实用户进入）**

Stage G 正式开始前需用户决策：是否在公网 Staging 开启 `PILOT_MODE=true`（邀请制）。当前为 false（公开注册）。
开启时机建议与第一批真实机构 onboarding 同步，避免公开期杂数据进入 Pilot 计数。
