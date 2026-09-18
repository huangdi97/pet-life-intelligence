# PILOT_OPERATIONS — Stage G 试点运营规程

> 原则：Feature Freeze；真实反馈驱动；不伪造任何 Pilot 数据。
> 配套：STAGE_G_PILOT_READINESS.md（就绪审计）、PILOT_ONBOARDING.md、PILOT_METRIC_DEFINITIONS.md、
> PILOT_SUPPORT.md、INTERVIEW_GUIDES.md、SUPPORT_OPS.md、PILOT_CONSENT.md。

## 1. 顶层状态

| 字段 | 值 |
|---|---|
| Stage | G — REAL PILOT OPERATIONS |
| 系统状态 | `PLI_V1_0_WEB_LIVE_PILOT_LIVE`（公网 staging；PILOT_MODE=false 待决策开启） |
| 运营状态 | `PILOT_OPERATIONS_READY` |
| 参与状态 | `AWAITING_REAL_PARTICIPANTS` |
| Feature Freeze | TRUE（仅 P0 安全/隐私/阻断 Bug/测量缺口/稳定性） |

## 2. Pilot 组织模型（运营台账）

系统层：`PilotUserProfile(role, organization, invite_code_id)`。机构层无表，用运营台账维护（建议第二周评估轻量表 `pilot_org`）。

台账字段（建议放 `reports/pilot/ORG_LEDGER.md` 或表格）：

```
pilot_org_id      # 内部编号，如 ORG-001
name
type              # VET | TRAINER | STORE | CARE_SERVICE | OWNER_COHORT | OTHER
contact           # 机构负责人（姓名/微信/电话，最小必要）
status            # LEAD → ONBOARDING → ACTIVE → PAUSED → COMPLETED
                  # 异常：WITHDRAWN / TERMINATED_SAFETY / TERMINATED_PRIVACY / TERMINATED_OPERATIONAL
started_at
expected_end_at
participant_limit
consent_version   # 对应 docs/pilot/PILOT_CONSENT.md 版本
notes
created_at / updated_at
```

规则：
- 状态只能前进或按流程暂停；**禁止删除历史事实**（WITHDRAWN 保留记录）。
- 每机构记录「本次要验证什么 / 谁负责 / 预计宠物数 / 预计时长 / 什么叫成功 / 允许进入的数据 / 禁止进入的数据」。

## 3. Pilot 用户来源与角色

每个真实用户可追踪：`pilot_org`（台账）、`invite_code`（数据库绑定）、`role`（PilotUserProfile）、
`joined_at`、`cohort`、`source`。

角色（对应 PilotUserProfile.role）：`owner` / `vet` / `trainer` / `caregiver` / `store`；另有系统级
`Pilot Admin`（邀请码发放/运营操作）。Pilot 不绕过正式权限系统（Household/Grant/Relationship 权限照常生效）。

## 4. Demo 与真实 Pilot 隔离

现状与路径详见 STAGE_G_PILOT_READINESS.md Q4。本阶段执行以下操作规则：

1. **Pilot DB 只进真实用户**：公网 Pilot 库不执行 demo seed；demo 仅限 dev/本地库。
2. 若必须共库：约定标识 `email LIKE '%@pli.demo'` 或 household 名 "Demo Family" 为 demo，并在一切指标口径中排除。
3. 正式指标默认 `exclude_demo=true / exclude_internal=true / exclude_synthetic=true`。
4. 没有真实数据时写 `NOT_YET_OBSERVED`，禁止把 demo/synthetic 当真实 Pilot 证据。

## 5. Pilot 生命周期操作

| 操作 | 步骤 |
|---|---|
| 创建机构 | 台账登记 → 确定负责人与目标 → 生成邀请码（`POST /api/v1/pilot/invites`，max_uses/过期时间按需） |
| 邀请用户 | 线下交付邀请码 + 注册链接；用户注册页填码 |
| 激活 | 见 PILOT_ONBOARDING.md §Activation（创建 Pet + 24h ≥3 有效 Event / 专业完成真实协作动作） |
| 暂停 | 台账置 PAUSED；必要时撤销访问（见下） |
| 撤销访问 | 用户级：`is_active=false` 或删号；授权级：revoke Grant / HouseholdMember / Relationship |
| 退出 | 用户主动删号 / 运营完成 COMPLETED / 异常终止（保留记录） |
| 导出/删除 | `GET /pets/{id}/export`、`POST /pets/{id}/deletion-requests`（人工确认执行）、`POST /auth/delete-account`；详见 PILOT_SUPPORT.md |

## 6. 发布与回滚

- 每次真实发布必须记录：version / date / changes / migration / risk / rollback（进入 CHANGELOG + 本次 release note）。
- **禁止无记录热改**；非 P0 走固定 release window（每周一次，避开用户高频使用时段）。
- P0（安全/数据/可用性）立即处理，可随时发布并事后补记录。

## 7. 周例程（Weekly Product Triage）

每周固定产出 `reports/pilot/WEEK_<N>_PILOT_REPORT.md`：

1. 拉取数据：/pilot/status、/metrics、feedback 表、审计事件、台账。
2. 按指标字典算数（模板见 reports/pilot/WEEK_01_PILOT_REPORT.md）。
3. 对每条问题做 `KEEP / FIX / INVESTIGATE / DEFER / REMOVE CANDIDATE`，默认 **DEFER**。
4. 更新：ACTIVATION_FUNNEL / UX_FRICTION_LOG / FEATURE_REQUEST_BACKLOG / COMPANION_DISCOVERY / DEVICE_DISCOVERY / COMMERCIAL_DISCOVERY。
5. 任何功能改动都需 P0/P1 理由；Feature Request 只进 backlog 不进开发。

## 8. 成本跟踪（粗口径即可）

| 项 | 来源 |
|---|---|
| Server/DB/存储/带宽 | 云厂商账单（月度） |
| AI | `AIInferenceLog`（调用数）+ provider 单价（未启用则 0） |
| Email | SMTP 账单（未启用则 0） |
| 核心指标 | cost / active pet / month；AI cost / active pet、/AI-enabled event、/Health Event |

## 9. 禁止事项（与母版 §96 一致）

- 禁止自动联系真实机构并冒充用户；禁止冒充人工客服；禁止伪造访谈/反馈/Retention/Outcome/专业认可。
- 无数据即 `NOT_YET_OBSERVED`。
- Pilot 数据默认不用于模型训练/研究/公开案例/营销（除非独立明确同意：Pilot Consent ≠ Research Consent）。

## 10. 关键决策待办（需用户/运营拍板）

1. 是否在公网 Staging 开启 `PILOT_MODE=true`（邀请制）？建议与第一批真实机构同步开启。
2. 第一轮机构清单与每机构成功标准。
3. 是否在第二周评估：`pilot_org` 轻量表 + `is_demo/is_internal` 隔离字段（进入 backlog 评估，不默认开发）。
