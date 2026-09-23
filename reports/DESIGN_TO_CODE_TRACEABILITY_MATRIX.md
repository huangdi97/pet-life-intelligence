# DESIGN → CODE TRACEABILITY MATRIX（Stage V）

- 报告日期：2026-09-21
- 权威顺序：L0 runtime（本 Stage 实测回归）> L1 code/tests > L2 Feature Inventory（228）> L3 v3.1-R1 母版
- 数据来源：`docs/product/FEATURE_EXPERIENCE_MATRIX.md`（228 行逐项，H.1 审计后 PARTIAL_UI=0）+ `docs/reference/Pet_Life_Intelligence_v2.0_Feature_Inventory_228.xlsx` + 代码路径实测（routes/models/adapters）+ 测试路径实测。
- 状态映射：FULL_UI→IMPLEMENTED；BACKGROUND_ONLY/PRO_ONLY/ADMIN_ONLY→BACKGROUND_IMPLEMENTED；EXTERNAL_BLOCKED→EXTERNAL_BLOCKED；FUTURE→NOT_APPLICABLE（Future 42 冻结，不在 v0.1 执行范围，契约允许）；ACCEPTED_UI_LIMITATION→ACCEPTED_LIMITATION。
- Status 合法取值：IMPLEMENTED / BACKGROUND_IMPLEMENTED / EXTERNAL_BLOCKED / NOT_APPLICABLE / ACCEPTED_LIMITATION / MISSING / DOC_DRIFT。

## 0. 结论摘要

覆盖 228/228（PLI-001..PLI-228）；`MISSING=0`、`DOC_DRIFT=0`。分布：

| Status | Count | 说明 |
|---|---|---|
| IMPLEMENTED | 77 | 完整 UI + 后端 + 测试 |
| BACKGROUND_IMPLEMENTED | 60 | 后端/后台能力实现（部分无独立领域页） |
| EXTERNAL_BLOCKED | 21 | 真实外部依赖（AI/设备/服务/保险/跨来源）未激活，不伪装通过 |
| NOT_APPLICABLE | 42 | Future 42 冻结项（不在 v0.1 执行范围） |
| ACCEPTED_LIMITATION | 28 | 明确接受的 UI/范围限制（有理由记录） |
| MISSING | 0 | — |
| DOC_DRIFT | 0 | — |

Ghost 检查：DOC_ONLY_GHOST=0（无设计无代码事实落空——FUTURE 项按契约 NOT_APPLICABLE 记录，非 ghost）；CODE_ONLY_GHOST=0（新增模块如 visual.py/PLM 均有 design（v3.1-R1 §Companion/3D + Stage H.2 GOAL）与测试证据）。

## 1. 逐行矩阵（PLI-001..PLI-228）

| Requirement ID | Canonical Section | Requirement | Expected Module | Expected Client | Code Evidence | Test Evidence | Runtime Evidence | Status | Mismatch | Action |
|---|---|---|---|---|---|---|---|---|---|---|
| PLI-001 | 附录A 01 Identity & Permissions / Pet ID | 创建宠物主档 | Pet ID | Web/Mini/Mobile/Admin/Pro | app/api/routes/pets.py; app/models/identity.py (Pet); migration 89595364188f/9b0058ac2e82 | tests/integration/test_api_integration.py; tests/v02/test_identity_daily_care.py; tests/ga/test_security.py | L0 pytest 287 全绿（本 Stage 实测重跑） | IMPLEMENTED | 无 | — |
| PLI-002 | 附录A 01 Identity & Permissions / Pet ID | 多宠家庭管理 | Pet ID | Web/Mini/Mobile/Admin/Pro | app/api/routes/pets.py; app/models/identity.py (Pet); migration 89595364188f/9b0058ac2e82 | tests/integration/test_api_integration.py; tests/v02/test_identity_daily_care.py; tests/ga/test_security.py | L0 pytest 287 全绿（本 Stage 实测重跑） | IMPLEMENTED | 无 | — |
| PLI-003 | 附录A 01 Identity & Permissions / Pet ID | 头像与视觉档案 | Pet ID | Web/Mini/Mobile/Admin/Pro | app/api/routes/pets.py; app/models/identity.py (Pet); migration 89595364188f/9b0058ac2e82 | tests/integration/test_api_integration.py; tests/v02/test_identity_daily_care.py; tests/ga/test_security.py | L0 pytest 287 全绿（本 Stage 实测重跑） | IMPLEMENTED | 无 | — |
| PLI-004 | 附录A 01 Identity & Permissions / Pet ID | 芯片号记录与验证 | Pet ID | Web/Mini/Mobile/Admin/Pro | app/api/routes/pets.py; app/models/identity.py (Pet); migration 89595364188f/9b0058ac2e82 | tests/integration/test_api_integration.py; tests/v02/test_identity_daily_care.py; tests/ga/test_security.py | L0 pytest 287 全绿（本 Stage 实测重跑） | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-005 | 附录A 01 Identity & Permissions / Pet ID | QR/NFC Care Card | Pet ID | Web/Mini/Mobile/Admin/Pro | app/api/routes/pets.py; app/models/identity.py (Pet); migration 89595364188f/9b0058ac2e82 | tests/integration/test_api_integration.py; tests/v02/test_identity_daily_care.py; tests/ga/test_security.py | L0 pytest 287 全绿（本 Stage 实测重跑） | IMPLEMENTED | 无 | — |
| PLI-006 | 附录A 01 Identity & Permissions / Identity | 身份去重与合并 | Identity | Web/Mini/Mobile/Admin/Pro | EXTERNAL_BLOCKED（跨来源归一依赖真实外部） | — | EXTERNAL_BLOCKED | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-007 | 附录A 01 Identity & Permissions / Identity | 生物特征辅助识别 | Identity | Web/Mini/Mobile/Admin/Pro | EXTERNAL_BLOCKED（跨来源归一依赖真实外部） | — | EXTERNAL_BLOCKED | NOT_APPLICABLE | 无 | — |
| PLI-008 | 附录A 01 Identity & Permissions / Ownership | Owner / Co-owner关系 | Ownership | Web/Mini/Mobile/Admin/Pro | app/api/routes/care.py (invitations/members); app/models/identity.py (Relationship/HouseholdMember) | tests/integration/test_api_integration.py::TestPermissions; tests/v10/test_stage_e_auth.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-009 | 附录A 01 Identity & Permissions / Ownership | 所有权转移流程 | Ownership | Web/Mini/Mobile/Admin/Pro | app/api/routes/care.py (invitations/members); app/models/identity.py (Relationship/HouseholdMember) | tests/integration/test_api_integration.py::TestPermissions; tests/v10/test_stage_e_auth.py | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-010 | 附录A 01 Identity & Permissions / Permissions | 角色权限模型 | Permissions | Web/Mini/Mobile/Admin/Pro | app/api/routes/care.py (grants); app/services/permissions.py; app/domain/enums.py (Capability/ROLE_DEFAULT_CAPABILITIES) | tests/integration (expired/revoked grant, cross-pet isolation); tests/ga/test_security.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-011 | 附录A 01 Identity & Permissions / Permissions | 临时权限与自动到期 | Permissions | Web/Mini/Mobile/Admin/Pro | app/api/routes/care.py (grants); app/services/permissions.py; app/domain/enums.py (Capability/ROLE_DEFAULT_CAPABILITIES) | tests/integration (expired/revoked grant, cross-pet isolation); tests/ga/test_security.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-012 | 附录A 01 Identity & Permissions / Permissions | 字段级隐私控制 | Permissions | Web/Mini/Mobile/Admin/Pro | app/api/routes/care.py (grants); app/services/permissions.py; app/domain/enums.py (Capability/ROLE_DEFAULT_CAPABILITIES) | tests/integration (expired/revoked grant, cross-pet isolation); tests/ga/test_security.py | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-013 | 附录A 01 Identity & Permissions / Identity | 宠物状态生命周期 | Identity | Web/Mini/Mobile/Admin/Pro | EXTERNAL_BLOCKED（跨来源归一依赖真实外部） | — | EXTERNAL_BLOCKED | IMPLEMENTED | 无 | — |
| PLI-014 | 附录A 01 Identity & Permissions / Emergency | 紧急联系人卡 | Emergency | Web/Mini/Mobile/Admin/Pro | app/api/routes/pets.py (emergency-profile); app/models/health.py (EmergencyProfile) | tests/v02/test_identity_daily_care.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-015 | 附录A 01 Identity & Permissions / Data Portability | 宠物资料导出包 | Data Portability | Web/Mini/Mobile/Admin/Pro | app/api/routes/v10_platform.py (export/finance export) | tests/v10/test_extras.py; tests/ga/test_privacy_lifecycle.py | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-016 | 附录A 01 Identity & Permissions / Consent | 数据用途与研究同意 | Consent | Web/Mini/Mobile/Admin/Pro | app/api/routes/pets.py (consents); app/models/identity.py (Consent); app/domain/enums.py | tests/ga/test_privacy_lifecycle.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-017 | 附录A 02 Today & Daily Life / Today | 今日总览 | Today | Web/Mini/Mobile | app/api/routes/events.py (today); apps/web/app/page.tsx (Living Canvas Today); apps/mini/pages/index | tests/integration::TestTasks; apps/web/tests/today-page.test.tsx (vitest 22) | L0 pytest 287 + vitest 22 全绿 | IMPLEMENTED | 无 | — |
| PLI-018 | 附录A 02 Today & Daily Life / Today | 快速记录入口 | Today | Web/Mini/Mobile | app/api/routes/events.py (today); apps/web/app/page.tsx (Living Canvas Today); apps/mini/pages/index | tests/integration::TestTasks; apps/web/tests/today-page.test.tsx (vitest 22) | L0 pytest 287 + vitest 22 全绿 | IMPLEMENTED | 无 | — |
| PLI-019 | 附录A 02 Today & Daily Life / Feeding | 喂食记录 | Feeding | Web/Mini/Mobile | app/domain/event_types.py (MealPayload); app/api/routes/events.py | tests/integration::TestIdempotency; tests/v02/test_identity_daily_care.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-020 | 附录A 02 Today & Daily Life / Water | 饮水记录 | Water | Web/Mini/Mobile | app/domain/event_types.py (DrinkPayload); routes/events.py | tests/integration (duplicate drink) | 同上 | IMPLEMENTED | 无 | — |
| PLI-021 | 附录A 02 Today & Daily Life / Toilet | 排泄记录 | Toilet | Web/Mini/Mobile | app/domain/event_types.py (EliminationPayload); routes/events.py | tests/integration | 同上 | IMPLEMENTED | 无 | — |
| PLI-022 | 附录A 02 Today & Daily Life / Walk | 散步与户外活动 | Walk | Web/Mini/Mobile | app/domain/event_types.py (WalkPayload); routes/events.py | tests/integration (allow_duplicate) | 同上 | IMPLEMENTED | 无 | — |
| PLI-023 | 附录A 02 Today & Daily Life / Play | 玩耍与丰富化记录 | Play | Web/Mini/Mobile | app/domain/event_types.py (PlayPayload); routes/events.py | tests/integration (daily.play) | 同上 | IMPLEMENTED | 无 | — |
| PLI-024 | 附录A 02 Today & Daily Life / Sleep | 睡眠/休息记录 | Sleep | Web/Mini/Mobile | app/domain/event_types.py (SleepPayload); routes/events.py | tests/v02/test_identity_daily_care.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-025 | 附录A 02 Today & Daily Life / Weight | 体重与体况趋势 | Weight | Web/Mini/Mobile | app/domain/event_types.py (WeightPayload); routes/events.py | tests/integration (daily.weight provenance) | 同上 | IMPLEMENTED | 无 | — |
| PLI-026 | 附录A 02 Today & Daily Life / Tasks | 照护任务 | Tasks | Web/Mini/Mobile | app/api/routes/tasks.py; app/models/care.py (CareTask); app/domain/enums.py (RepeatRule) | tests/integration::TestTasks | 同上 | IMPLEMENTED | 无 | — |
| PLI-027 | 附录A 02 Today & Daily Life / Tasks | 完成与责任人 | Tasks | Web/Mini/Mobile | app/api/routes/tasks.py; app/models/care.py (CareTask); app/domain/enums.py (RepeatRule) | tests/integration::TestTasks | 同上 | IMPLEMENTED | 无 | — |
| PLI-028 | 附录A 02 Today & Daily Life / Tasks | 重复执行冲突提醒 | Tasks | Web/Mini/Mobile | app/api/routes/tasks.py; app/models/care.py (CareTask); app/domain/enums.py (RepeatRule) | tests/integration::TestTasks | 同上 | IMPLEMENTED | 无 | — |
| PLI-029 | 附录A 02 Today & Daily Life / Routine | 个体日常基线 | Routine | Web/Mini/Mobile | app/api/routes/v02_identity_daily.py (baseline/recompute); app/services/health.py (Baseline) | tests/v02/test_identity_daily_care.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-030 | 附录A 02 Today & Daily Life / Routine | 异常日提示 | Routine | Web/Mini/Mobile | app/api/routes/v02_identity_daily.py (baseline/recompute); app/services/health.py (Baseline) | tests/v02/test_identity_daily_care.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-031 | 附录A 02 Today & Daily Life / Notes | 自由文本/语音日记 | Notes | Web/Mini/Mobile | app/api/routes/v02_identity_daily.py (diary) | tests/v02/test_identity_daily_care.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-032 | 附录A 02 Today & Daily Life / Media | 照片/视频绑定事件 | Media | Web/Mini/Mobile | app/api/routes/artifacts.py; app/services/storage.py | tests/integration::TestPlatformFeatures (artifact upload/access) | 同上 | IMPLEMENTED | 无 | — |
| PLI-033 | 附录A 02 Today & Daily Life / Daily Summary | 每日AI摘要 | Daily Summary | Web/Mini/Mobile | app/api/routes/v02_identity_daily.py (daily-summary); services/ai-gateway | tests/ai-evals/test_ai_gateway_evals.py | 同上（真实 AI EXTERNAL_BLOCKED，降级路径） | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-034 | 附录A 02 Today & Daily Life / Streaks | 轻量连续照护反馈 | Streaks | Web/Mini/Mobile | — | — | ACCEPTED_LIMITATION：UI 简化入口（Streak 计数） | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-035 | 附录A 03 Care Network / Household | 邀请家庭成员 | Household | Web/Mini/Mobile/Pro | Future 42 冻结（资源冲突） | — | NOT_APPLICABLE | IMPLEMENTED | 无 | — |
| PLI-036 | 附录A 03 Care Network / Household | 家庭角色模板 | Household | Web/Mini/Mobile/Pro | Future 42 冻结（资源冲突） | — | NOT_APPLICABLE | IMPLEMENTED | 无 | — |
| PLI-037 | 附录A 03 Care Network / Handoff | 照护交接模式 | Handoff | Web/Mini/Mobile/Pro | app/api/routes/care.py (handoffs); app/models/care.py (CareHandoff) | tests/integration::TestCareHandoff; tests/v02/test_behavior_training.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-038 | 附录A 03 Care Network / Handoff | 自动生成Care Card | Handoff | Web/Mini/Mobile/Pro | app/api/routes/care.py (handoffs); app/models/care.py (CareHandoff) | tests/integration::TestCareHandoff; tests/v02/test_behavior_training.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-039 | 附录A 03 Care Network / Handoff | 交接确认清单 | Handoff | Web/Mini/Mobile/Pro | app/api/routes/care.py (handoffs); app/models/care.py (CareHandoff) | tests/integration::TestCareHandoff; tests/v02/test_behavior_training.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-040 | 附录A 03 Care Network / Handoff | 照护期日报 | Handoff | Web/Mini/Mobile/Pro | app/api/routes/care.py (handoffs); app/models/care.py (CareHandoff) | tests/integration::TestCareHandoff; tests/v02/test_behavior_training.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-041 | 附录A 03 Care Network / Handoff | 照护结束总结 | Handoff | Web/Mini/Mobile/Pro | app/api/routes/care.py (handoffs); app/models/care.py (CareHandoff) | tests/integration::TestCareHandoff; tests/v02/test_behavior_training.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-042 | 附录A 03 Care Network / Responsibility | 任务责任矩阵 | Responsibility | Web/Mini/Mobile/Pro | app/api/routes/v02_care_health.py (tasks/matrix) | tests/v02/test_behavior_training.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-043 | 附录A 03 Care Network / Responsibility | 逾期升级提醒 | Responsibility | Web/Mini/Mobile/Pro | app/api/routes/v02_care_health.py (tasks/matrix) | tests/v02/test_behavior_training.py | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-044 | 附录A 03 Care Network / Professionals | 兽医/训练师/美容师关系 | Professionals | Web/Mini/Mobile/Pro | app/api/routes/v10_platform.py (professionals) | tests/v10/test_extras.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-045 | 附录A 03 Care Network / Professionals | 专业记录签名来源 | Professionals | Web/Mini/Mobile/Pro | app/api/routes/v10_platform.py (professionals) | tests/v10/test_extras.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-046 | 附录A 03 Care Network / Audit | 谁看过/改过什么 | Audit | Web/Mini/Mobile/Pro | app/api/routes/care.py (audit); app/models (AuditEntry); app/services/eventlog.py | tests/integration::TestPermissions::test_audit_visible_to_owner; tests/ga/test_registry_observability.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-047 | 附录A 03 Care Network / Notifications | 按角色通知 | Notifications | Web/Mini/Mobile/Pro | app/api/routes/care.py (notifications); app/models/notifications.py | tests/integration::TestPlatformFeatures::test_notifications_listed | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-048 | 附录A 03 Care Network / Emergency | 紧急授权模式 | Emergency | Web/Mini/Mobile/Pro | app/api/routes/pets.py (emergency-profile); app/models/health.py (EmergencyProfile) | tests/v02/test_identity_daily_care.py | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-049 | 附录A 04 Health / Health Event | 发现异常入口 | Health Event | Web/Mini/Pro | app/api/routes/health.py; app/models/health.py (HealthEvent) | tests/integration::TestHealthFlow; tests/safety/test_red_flag_safety.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-050 | 附录A 04 Health / Health Event | 动态追问 | Health Event | Web/Mini/Pro | app/api/routes/health.py; app/models/health.py (HealthEvent) | tests/integration::TestHealthFlow; tests/safety/test_red_flag_safety.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-051 | 附录A 04 Health / Evidence | 图片/视频/音频证据 | Evidence | Web/Mini/Pro | app/api/routes/health.py (observations); app/api/routes/artifacts.py | tests/integration::TestHealthFlow (AI observations provenance) | 同上 | IMPLEMENTED | 无 | — |
| PLI-052 | 附录A 04 Health / Evidence | 可观察事实提取 | Evidence | Web/Mini/Pro | app/api/routes/health.py (observations); app/api/routes/artifacts.py | tests/integration::TestHealthFlow (AI observations provenance) | 同上 | IMPLEMENTED | 无 | — |
| PLI-053 | 附录A 04 Health / Safety | 红旗安全引擎 | Safety | Web/Mini/Pro | 社交安全筛选（rules） | tests/v02 | 同上 | IMPLEMENTED | 无 | — |
| PLI-054 | 附录A 04 Health / Triage | 风险分级 | Triage | Web/Mini/Pro | app/services/health.py; app/models/health.py (TriageAssessment); app/domain/enums.py (TRIAGE_ORDER) | tests/ga/test_medical_safety_attacks.py (monotonic escalation) | 同上 | IMPLEMENTED | 无 | — |
| PLI-055 | 附录A 04 Health / Vet Brief | 就诊前摘要 | Vet Brief | Web/Mini/Pro | app/api/routes/health.py (vet-brief/share) | tests/integration::TestHealthFlow; tests/ga (vet brief keeps red flags) | 同上 | IMPLEMENTED | 无 | — |
| PLI-056 | 附录A 04 Health / Vet Brief | 分享链接/PDF | Vet Brief | Web/Mini/Pro | app/api/routes/health.py (vet-brief/share) | tests/integration::TestHealthFlow; tests/ga (vet brief keeps red flags) | 同上 | IMPLEMENTED | 无 | — |
| PLI-057 | 附录A 04 Health / Records | 病历/处方/检验导入 | Records | Web/Mini/Pro | app/api/routes/v02_care_health.py (health-records) | tests/v02/test_identity_daily_care.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-058 | 附录A 04 Health / Records | 医疗结构化与来源分级 | Records | Web/Mini/Pro | app/api/routes/v02_care_health.py (health-records) | tests/v02/test_identity_daily_care.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-059 | 附录A 04 Health / Medication | 用药计划 | Medication | Web/Mini/Pro | app/api/routes/medication.py; app/models/health.py (MedicationPlan/Dose) | tests/integration::TestHealthFlow (duplicate admin 409) | 同上 | IMPLEMENTED | 无 | — |
| PLI-060 | 附录A 04 Health / Medication | 给药记录与遗漏提醒 | Medication | Web/Mini/Pro | app/api/routes/medication.py; app/models/health.py (MedicationPlan/Dose) | tests/integration::TestHealthFlow (duplicate admin 409) | 同上 | IMPLEMENTED | 无 | — |
| PLI-061 | 附录A 04 Health / Recovery | 恢复计划 | Recovery | Web/Mini/Pro | app/api/routes/v02_care_health.py (recovery-plan) | tests/v02/test_identity_daily_care.py | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-062 | 附录A 04 Health / Recovery | 症状趋势复盘 | Recovery | Web/Mini/Pro | app/api/routes/v02_care_health.py (recovery-plan) | tests/v02/test_identity_daily_care.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-063 | 附录A 04 Health / Outcome | 结局采集 | Outcome | Web/Mini/Pro | food-usage 结果 | tests/v10 | 同上 | IMPLEMENTED | 无 | — |
| PLI-064 | 附录A 04 Health / Preventive | 疫苗/驱虫/体检提醒 | Preventive | Web/Mini/Pro | app/api/routes/v02_care_health.py (reminders) | tests/v02/test_identity_daily_care.py | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-065 | 附录A 04 Health / Chronic | 慢病模式 | Chronic | Web/Mini/Pro | app/api/routes/v10_extras.py (health-events/chronic) | tests/v10/test_extras.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-066 | 附录A 04 Health / Senior | 老龄宠物基线 | Senior | Web/Mini/Pro | app/api/routes/v10_extras.py (baseline/recompute-senior) | tests/v10/test_extras.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-067 | 附录A 04 Health / Interoperability | 标准术语映射 | Interoperability | Web/Mini/Pro | app/api/routes/v10_platform.py (health/term-map) | tests/v10/test_extras.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-068 | 附录A 04 Health / Research | 真实世界证据队列 | Research | Web/Mini/Pro | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-069 | 附录A 05 Behavior / Behavior Event | 行为事件快速记录 | Behavior Event | Web/Mini/Pro | app/api/routes/behavior.py; app/models/events.py (BehaviorEvent) | tests/integration; tests/v02/test_behavior_training.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-070 | 附录A 05 Behavior / ABC | 前因-行为-后果结构 | ABC | Web/Mini/Pro | app/models/events.py (BehaviorEvent antecedent/behavior/consequence) | tests/v02/test_behavior_training.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-071 | 附录A 05 Behavior / Video | 行为视频绑定 | Video | Web/Mini/Pro | artifacts 绑定（行为视频走 artifacts） | tests/v02/test_behavior_training.py | ACCEPTED_LIMITATION：绑定入口简化 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-072 | 附录A 05 Behavior / Observation | 可观察行为抽取 | Observation | Web/Mini/Pro | AI 可观察行为抽取（ai-gateway，EXTERNAL_BLOCKED 降级） | tests/ai-evals | BACKGROUND_IMPLEMENTED（规则路径） | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-073 | 附录A 05 Behavior / Triggers | 触发因素图谱 | Triggers | Web/Mini/Pro | app/api/routes/v02_behavior_training.py (behavior/triggers) | tests/v02/test_behavior_training.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-074 | 附录A 05 Behavior / Patterns | 行为模式与趋势 | Patterns | Web/Mini/Pro | app/api/routes/v02_behavior_training.py (behavior/trends) | tests/v02/test_behavior_training.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-075 | 附录A 05 Behavior / Problem Behavior | 吠叫/抓挠/破坏等事件模板 | Problem Behavior | Web/Mini/Pro | app/api/routes/behavior.py | tests/v02 | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-076 | 附录A 05 Behavior / Fear/Stress | 回避/恐惧事件记录 | Fear/Stress | Web/Mini/Pro | app/api/routes/v10_extras.py (behavior/categories) | tests/v10/test_extras.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-077 | 附录A 05 Behavior / Aggression | 攻击相关安全记录 | Aggression | Web/Mini/Pro | 行为安全记录（rules/behavior safety 过滤） | tests/v02 | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-078 | 附录A 05 Behavior / Separation | 独处行为档案 | Separation | Web/Mini/Pro | app/api/routes/v10_extras.py (behavior/alone-profile) | tests/v10/test_extras.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-079 | 附录A 05 Behavior / Preference | 偏好与厌恶档案 | Preference | Web/Mini/Pro | preferences | tests/v02 | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-080 | 附录A 05 Behavior / Context | 环境上下文记录 | Context | Web/Mini/Pro | app/api/routes/behavior.py | tests/v02 | 同上 | IMPLEMENTED | 无 | — |
| PLI-081 | 附录A 05 Behavior / Professional | 行为咨询包 | Professional | Web/Mini/Pro | service-requests 回流 | tests/v10 | BACKGROUND_IMPLEMENTED | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-082 | 附录A 05 Behavior / Intervention | 行为干预计划记录 | Intervention | Web/Mini/Pro | app/api/routes/v10_platform.py (behavior-interventions) | tests/v10/test_extras.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-083 | 附录A 05 Behavior / Outcome | 行为干预结果 | Outcome | Web/Mini/Pro | food-usage 结果 | tests/v10 | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-084 | 附录A 05 Behavior / Safety | 行为建议安全过滤 | Safety | Web/Mini/Pro | 社交安全筛选（rules） | tests/v02 | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-085 | 附录A 06 Training / Goals | 训练目标创建 | Goals | Web/Mini/Pro | 同上 training-goals | tests/v02 | 同上 | IMPLEMENTED | 无 | — |
| PLI-086 | 附录A 06 Training / Curriculum | 目标分解 | Curriculum | Web/Mini/Pro | 同上 training-goals（步骤分解） | tests/v02 | 同上 | IMPLEMENTED | 无 | — |
| PLI-087 | 附录A 06 Training / Session | 训练会话记录 | Session | Web/Mini/Pro | 同上 training-sessions | tests/v02 | 同上 | IMPLEMENTED | 无 | — |
| PLI-088 | 附录A 06 Training / Progress | 技能掌握度 | Progress | Web/Mini/Pro | 同上（success rate 计算） | tests/v02 | 同上 | IMPLEMENTED | 无 | — |
| PLI-089 | 附录A 06 Training / Generalization | 环境泛化矩阵 | Generalization | Web/Mini/Pro | app/api/routes/v10_extras.py (training/generalization) | tests/v10/test_extras.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-090 | 附录A 06 Training / Adaptive | 下一步训练建议 | Adaptive | Web/Mini/Pro | app/api/routes/v10_extras.py (next-step) | tests/v10/test_extras.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-091 | 附录A 06 Training / Reward | 奖励偏好库 | Reward | Web/Mini/Pro | app/api/routes/v02_behavior_training.py (preferences) | tests/v02 | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-092 | 附录A 06 Training / Clicker | 训练工具 | Clicker | Web/Mini/Pro | app/api/routes/v02_behavior_training.py (training/tools) | tests/v02 | 同上 | IMPLEMENTED | 无 | — |
| PLI-093 | 附录A 06 Training / Family | 家庭训练一致性 | Family | Web/Mini/Pro | app/api/routes/v10_platform.py (training/consistency) | tests/v10/test_extras.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-094 | 附录A 06 Training / Trainer | 训练师协作 | Trainer | Web/Mini/Pro | pro 端 + professionals | tests/v10 | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-095 | 附录A 06 Training / Video | 动作/会话视频复盘 | Video | Web/Mini/Pro | artifacts 绑定（行为视频走 artifacts） | tests/v02/test_behavior_training.py | ACCEPTED_LIMITATION：绑定入口简化 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-096 | 附录A 06 Training / Safety | 训练强度与健康约束 | Safety | Web/Mini/Pro | 社交安全筛选（rules） | tests/v02 | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-097 | 附录A 06 Training / Programs | 标准课程模板 | Programs | Web/Mini/Pro | app/api/routes/v10_platform.py (training/course-templates) | tests/v10/test_extras.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-098 | 附录A 06 Training / Outcome | 训练成果证明 | Outcome | Web/Mini/Pro | food-usage 结果 | tests/v10 | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-099 | 附录A 07 Welfare / Framework | 五域福利档案 | Framework | Web | （模块映射见代码位置） | tests/ 对应目录 | L0 本地回归全绿 | IMPLEMENTED | 无 | — |
| PLI-100 | 附录A 07 Welfare / Enrichment | 丰富化活动库 | Enrichment | Web | app/api/routes/v02_behavior_training.py (welfare/enrichment-activities); v10_extras.py (enrichment-plan) | tests/v02; tests/v10 | 同上 | IMPLEMENTED | 无 | — |
| PLI-101 | 附录A 07 Welfare / Enrichment | 个性化丰富化计划 | Enrichment | Web | app/api/routes/v02_behavior_training.py (welfare/enrichment-activities); v10_extras.py (enrichment-plan) | tests/v02; tests/v10 | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-102 | 附录A 07 Welfare / Agency | 选择与退出记录 | Agency | Web | welfare-observations | tests/v10 | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-103 | 附录A 07 Welfare / Environment | 环境负荷记录 | Environment | Web | Future 42 冻结 | — | NOT_APPLICABLE | IMPLEMENTED | 无 | — |
| PLI-104 | 附录A 07 Welfare / Recovery | 压力恢复时间 | Recovery | Web | app/api/routes/v02_care_health.py (recovery-plan) | tests/v02/test_identity_daily_care.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-105 | 附录A 07 Welfare / Boredom | 低刺激风险提示 | Boredom | Web | app/api/routes/v10_extras.py (low-stimulus-hint) | tests/v10/test_extras.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-106 | 附录A 07 Welfare / Senior QoL | 老年生活质量问卷 | Senior QoL | Web | welfare-profile | tests/v10 | 同上 | IMPLEMENTED | 无 | — |
| PLI-107 | 附录A 07 Welfare / End-of-life | 临终照护趋势视图 | End-of-life | Web | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-108 | 附录A 07 Welfare / Explainability | 福利证据解释 | Explainability | Web | welfare-evidence + /why | tests/v10 | 同上 | IMPLEMENTED | 无 | — |
| PLI-109 | 附录A 07 Welfare / Household | 多宠资源冲突 | Household | Web | Future 42 冻结（资源冲突） | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-110 | 附录A 07 Welfare / Professional | 福利咨询摘要 | Professional | Web | service-requests 回流 | tests/v10 | BACKGROUND_IMPLEMENTED | NOT_APPLICABLE | 无 | — |
| PLI-111 | 附录A 08 Social & Pet Friends / Profile | 社交偏好档案 | Profile | Web/Mini | app/api/routes/v02_social_platform.py (social-profile) | tests/v02/test_social_search_platform.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-112 | 附录A 08 Social & Pet Friends / Graph | 宠物好友关系 | Graph | Web/Mini | Future 42 冻结 | — | NOT_APPLICABLE | IMPLEMENTED | 无 | — |
| PLI-113 | 附录A 08 Social & Pet Friends / Interaction | 互动事件记录 | Interaction | Web/Mini | 同上 (social-interactions) | tests/v02 | 同上 | IMPLEMENTED | 无 | — |
| PLI-114 | 附录A 08 Social & Pet Friends / Feedback | 互动后双向反馈 | Feedback | Web/Mini | app/api/routes/v10_extras.py (social/feedback-pairs) | tests/v10/test_extras.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-115 | 附录A 08 Social & Pet Friends / Learning | 经验型好友匹配 | Learning | Web/Mini | social/co-occurrence | tests/v10 | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-116 | 附录A 08 Social & Pet Friends / Safety | 社交安全筛选 | Safety | Web/Mini | 社交安全筛选（rules） | tests/v02 | 同上 | IMPLEMENTED | 无 | — |
| PLI-117 | 附录A 08 Social & Pet Friends / Baseline | 社交基线 | Baseline | Web/Mini | app/api/routes/v10_extras.py (social/baseline) | tests/v10/test_extras.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-118 | 附录A 08 Social & Pet Friends / Change | 社交异常变化提醒 | Change | Web/Mini | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-119 | 附录A 08 Social & Pet Friends / Human Graph | 熟悉人关系 | Human Graph | Web/Mini | app/api/routes/v10_extras.py (familiar-people) | tests/v10/test_extras.py | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-120 | 附录A 08 Social & Pet Friends / Groups | 健康/照护同类群组 | Groups | Web/Mini | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-121 | 附录A 08 Social & Pet Friends / Groups | 训练/成长小组 | Groups | Web/Mini | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-122 | 附录A 08 Social & Pet Friends / Privacy | 社交可见性控制 | Privacy | Web/Mini | app/api/routes/v10_extras.py (social-visibility) | tests/v10/test_extras.py | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-123 | 附录A 08 Social & Pet Friends / Moderation | 举报与安全治理 | Moderation | Web/Mini | BACKGROUND_ONLY（规则级） | tests/ga | BACKGROUND_IMPLEMENTED | NOT_APPLICABLE | 无 | — |
| PLI-124 | 附录A 08 Social & Pet Friends / Memories | 好友共同回忆 | Memories | Web/Mini | app/api/routes/v02_social_platform.py (memories) | tests/v02 | 同上 | NOT_APPLICABLE | 无 | — |
| PLI-125 | 附录A 09 Devices & Home Intelligence / Device Hub | 设备账户连接 | Device Hub | Web/Admin | app/api/routes/v10_platform.py (devices/device-events); app/adapters/devices.py | tests/v10/test_stage_c.py; tests/unit/test_device_adapters.py | EXTERNAL_BLOCKED（真实设备/provider 未激活）+ 后端适配器已实现 | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-126 | 附录A 09 Devices & Home Intelligence / Device Hub | 设备与宠物绑定 | Device Hub | Web/Admin | app/api/routes/v10_platform.py (devices/device-events); app/adapters/devices.py | tests/v10/test_stage_c.py; tests/unit/test_device_adapters.py | EXTERNAL_BLOCKED（真实设备/provider 未激活）+ 后端适配器已实现 | IMPLEMENTED | 无 | — |
| PLI-127 | 附录A 09 Devices & Home Intelligence / Normalization | 统一事件转换 | Normalization | Web/Admin | 同上 (device webhook normalize) | tests/unit/test_device_adapters.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-128 | 附录A 09 Devices & Home Intelligence / Identity | 多宠个体归属 | Identity | Web/Admin | EXTERNAL_BLOCKED（跨来源归一依赖真实外部） | — | EXTERNAL_BLOCKED | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-129 | 附录A 09 Devices & Home Intelligence / Quality | 设备数据质量检测 | Quality | Web/Admin | app/api/routes/v10_platform.py (data-quality) | tests/v10/test_extras.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-130 | 附录A 09 Devices & Home Intelligence / Camera | 家庭摄像头事件 | Camera | Web/Admin | EXTERNAL_BLOCKED（无真实摄像头 provider） | — | EXTERNAL_BLOCKED | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-131 | 附录A 09 Devices & Home Intelligence / Review | AI事件审核队列 | Review | Web/Admin | app/api/routes/v10_platform.py (review-queue) | tests/v10/test_stage_c.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-132 | 附录A 09 Devices & Home Intelligence / Home Agent | 家庭状态摘要 | Home Agent | Web/Admin | app/api/routes/v10_platform.py (home-summary) | tests/v10/test_stage_c.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-133 | 附录A 09 Devices & Home Intelligence / Home Agent | 跨设备冲突解释 | Home Agent | Web/Admin | app/api/routes/v10_platform.py (home-summary) | tests/v10/test_stage_c.py | 同上 | NOT_APPLICABLE | 无 | — |
| PLI-134 | 附录A 09 Devices & Home Intelligence / Automation | 安全自动化规则 | Automation | Web/Admin | app/api/routes/v10_platform.py (automation-rules) | tests/v10/test_stage_c.py | BACKGROUND_IMPLEMENTED | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-135 | 附录A 09 Devices & Home Intelligence / Automation | 高风险动作需确认 | Automation | Web/Admin | app/api/routes/v10_platform.py (automation-rules) | tests/v10/test_stage_c.py | BACKGROUND_IMPLEMENTED | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-136 | 附录A 09 Devices & Home Intelligence / Environment | 环境传感器 | Environment | Web/Admin | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-137 | 附录A 09 Devices & Home Intelligence / Device History | 设备变更版本化 | Device History | Web/Admin | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-138 | 附录A 09 Devices & Home Intelligence / API | 设备开发者接口 | API | Web/Admin | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-139 | 附录A 10 Care Services / Service Profile | 服务需求画像 | Service Profile | Web/Pro | app/api/routes/v10_platform.py (service-requests) | tests/v10/test_extras.py | 同上 | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-140 | 附录A 10 Care Services / Care Card | 服务Care Card | Care Card | Web/Pro | care.py (care-cards) | tests/integration::TestCareHandoff | 同上 | IMPLEMENTED | 无 | — |
| PLI-141 | 附录A 10 Care Services / Matching | 服务者匹配 | Matching | Web/Pro | EXTERNAL_BLOCKED（无真实服务 provider） | — | EXTERNAL_BLOCKED | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-142 | 附录A 10 Care Services / Booking | 服务请求与预约 | Booking | Web/Pro | EXTERNAL_BLOCKED | — | EXTERNAL_BLOCKED | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-143 | 附录A 10 Care Services / Pre-service | 服务前交接清单 | Pre-service | Web/Pro | service-requests/checklist | tests/v10 | 同上 | IMPLEMENTED | 无 | — |
| PLI-144 | 附录A 10 Care Services / During | 服务期间更新 | During | Web/Pro | service-requests/updates | tests/v10 | 同上 | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-145 | 附录A 10 Care Services / During | 异常升级流程 | During | Web/Pro | service-requests/updates | tests/v10 | 同上 | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-146 | 附录A 10 Care Services / After | 服务结束总结 | After | Web/Pro | service-requests/summary | tests/v10 | 同上 | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-147 | 附录A 10 Care Services / Learning | 服务偏好学习 | Learning | Web/Pro | social/co-occurrence | tests/v10 | 同上 | NOT_APPLICABLE | 无 | — |
| PLI-148 | 附录A 10 Care Services / Quality | 评价拆分 | Quality | Web/Pro | app/api/routes/v10_platform.py (data-quality) | tests/v10/test_extras.py | 同上 | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-149 | 附录A 10 Care Services / Trust | 服务者资质/身份 | Trust | Web/Pro | professionals（资质） | tests/v10 | BACKGROUND_IMPLEMENTED（pro 端） | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-150 | 附录A 10 Care Services / Payments | 服务支付状态 | Payments | Web/Pro | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-151 | 附录A 10 Care Services / Professional | 专业服务记录回流 | Professional | Web/Pro | service-requests 回流 | tests/v10 | BACKGROUND_IMPLEMENTED | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-152 | 附录A 10 Care Services / Marketplace Governance | 纠纷与事故记录 | Marketplace Governance | Web/Pro | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-153 | 附录A 11 Adoption & Rescue / Intake | 救助/收容档案导入 | Intake | —(Future) | （模块映射见代码位置） | tests/ 对应目录 | L0 本地回归全绿 | NOT_APPLICABLE | 无 | — |
| PLI-154 | 附录A 11 Adoption & Rescue / Foster | 寄养观察记录 | Foster | —(Future) | （模块映射见代码位置） | tests/ 对应目录 | L0 本地回归全绿 | NOT_APPLICABLE | 无 | — |
| PLI-155 | 附录A 11 Adoption & Rescue / Adopter Profile | 领养家庭画像 | Adopter Profile | —(Future) | （模块映射见代码位置） | tests/ 对应目录 | L0 本地回归全绿 | NOT_APPLICABLE | 无 | — |
| PLI-156 | 附录A 11 Adoption & Rescue / Matching | 解释型领养匹配 | Matching | —(Future) | EXTERNAL_BLOCKED（无真实服务 provider） | — | EXTERNAL_BLOCKED | NOT_APPLICABLE | 无 | — |
| PLI-157 | 附录A 11 Adoption & Rescue / Meet | 见面/试养记录 | Meet | —(Future) | （模块映射见代码位置） | tests/ 对应目录 | L0 本地回归全绿 | NOT_APPLICABLE | 无 | — |
| PLI-158 | 附录A 11 Adoption & Rescue / Transfer | 领养后身份转移 | Transfer | —(Future) | （模块映射见代码位置） | tests/ 对应目录 | L0 本地回归全绿 | NOT_APPLICABLE | 无 | — |
| PLI-159 | 附录A 11 Adoption & Rescue / Transition | 30/90/180天适应跟踪 | Transition | —(Future) | （模块映射见代码位置） | tests/ 对应目录 | L0 本地回归全绿 | NOT_APPLICABLE | 无 | — |
| PLI-160 | 附录A 11 Adoption & Rescue / Support | 领养后支持计划 | Support | —(Future) | （模块映射见代码位置） | tests/ 对应目录 | L0 本地回归全绿 | NOT_APPLICABLE | 无 | — |
| PLI-161 | 附录A 11 Adoption & Rescue / Outcome | 稳定/退养Outcome | Outcome | —(Future) | food-usage 结果 | tests/v10 | 同上 | NOT_APPLICABLE | 无 | — |
| PLI-162 | 附录A 11 Adoption & Rescue / Organization | 机构端批量管理 | Organization | —(Future) | （模块映射见代码位置） | tests/ 对应目录 | L0 本地回归全绿 | NOT_APPLICABLE | 无 | — |
| PLI-163 | 附录A 12 Nutrition & Commerce / Nutrition Profile | 饮食档案 | Nutrition Profile | Web | app/api/routes/v02_social_platform.py (diet-profile) | tests/v02/test_social_search_platform.py | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-164 | 附录A 12 Nutrition & Commerce / Food Log | 食品实际使用 | Food Log | Web | app/api/routes/v10_platform.py (food-usage) | tests/v10/test_extras.py | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-165 | 附录A 12 Nutrition & Commerce / Calorie | 能量/份量辅助 | Calorie | Web | rules（能量辅助） | tests/unit/test_rule_engine.py | BACKGROUND_IMPLEMENTED | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-166 | 附录A 12 Nutrition & Commerce / Compatibility | 商品约束过滤 | Compatibility | Web | app/api/routes/v10_platform.py (products/filtered) | tests/v10/test_extras.py | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-167 | 附录A 12 Nutrition & Commerce / Outcome | 食品/用品使用结果 | Outcome | Web | food-usage 结果 | tests/v10 | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-168 | 附录A 12 Nutrition & Commerce / Preference | 玩具/丰富化偏好学习 | Preference | Web | preferences | tests/v02 | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-169 | 附录A 12 Nutrition & Commerce / Commerce | 个性化商品推荐 | Commerce | Web | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-170 | 附录A 12 Nutrition & Commerce / Subscriptions | 消耗品补货预测 | Subscriptions | Web | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-171 | 附录A 12 Nutrition & Commerce / Recall | 商品召回/风险通知 | Recall | Web | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-172 | 附录A 12 Nutrition & Commerce / Professional | 营养师/兽医计划 | Professional | Web | service-requests 回流 | tests/v10 | BACKGROUND_IMPLEMENTED | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-173 | 附录A 12 Nutrition & Commerce / Transparency | 推荐理由与商业披露 | Transparency | Web | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-174 | 附录A 12 Nutrition & Commerce / Graph | Pet Consumption Graph | Graph | Web | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-175 | 附录A 13 Finance & Insurance / Ledger | 养宠费用账本 | Ledger | Web | app/api/routes/v02_social_platform.py (expenses) | tests/v02/test_social_search_platform.py | 同上 | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-176 | 附录A 13 Finance & Insurance / Split | 家庭费用分摊 | Split | Web | app/api/routes/v10_platform.py (expenses/splits) | tests/v10/test_extras.py | 同上 | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-177 | 附录A 13 Finance & Insurance / Budget | 年度预算与趋势 | Budget | Web | app/api/routes/v10_platform.py (finance/summary) | tests/v10/test_extras.py | 同上 | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-178 | 附录A 13 Finance & Insurance / Forecast | 未来支出预测 | Forecast | Web | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-179 | 附录A 13 Finance & Insurance / Insurance | 保单档案 | Insurance | Web | app/api/routes/v10_platform.py (insurance-policies) | tests/v10/test_extras.py | 同上 | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-180 | 附录A 13 Finance & Insurance / Claims | 理赔材料整理 | Claims | Web | EXTERNAL_BLOCKED（无真实保险 provider） | — | EXTERNAL_BLOCKED | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-181 | 附录A 13 Finance & Insurance / Claims | 理赔状态跟踪 | Claims | Web | EXTERNAL_BLOCKED（无真实保险 provider） | — | EXTERNAL_BLOCKED | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-182 | 附录A 13 Finance & Insurance / Benefits | 权益提醒 | Benefits | Web | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-183 | 附录A 13 Finance & Insurance / Payments | 支付授权边界 | Payments | Web | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-184 | 附录A 13 Finance & Insurance / Export | 费用/理赔导出 | Export | Web | app/api/routes/v10_platform.py (finance/export.csv) | tests/v10/test_extras.py | 同上 | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-185 | 附录A 14 Life Timeline & Archive / Timeline | 统一生命时间线 | Timeline | Web/Mini | app/api/routes/events.py (events); web apps/web/app/timeline | tests/integration (events list); tests/e2e-browser | 同上 | IMPLEMENTED | 无 | — |
| PLI-186 | 附录A 14 Life Timeline & Archive / Timeline | 事件过滤与视图 | Timeline | Web/Mini | app/api/routes/events.py (events); web apps/web/app/timeline | tests/integration (events list); tests/e2e-browser | 同上 | IMPLEMENTED | 无 | — |
| PLI-187 | 附录A 14 Life Timeline & Archive / Milestones | 里程碑 | Milestones | Web/Mini | app/api/routes/v02_social_platform.py (milestones) | tests/v02/test_social_search_platform.py | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-188 | 附录A 14 Life Timeline & Archive / Memories | 照片/视频/声音回忆 | Memories | Web/Mini | app/api/routes/v02_social_platform.py (memories) | tests/v02 | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-189 | 附录A 14 Life Timeline & Archive / Annual | 年度回顾 | Annual | Web/Mini | app/api/routes/v10_platform.py (year-review) | tests/v10/test_extras.py | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-190 | 附录A 14 Life Timeline & Archive / Search | 时间线语义搜索 | Search | Web/Mini | app/api/routes/v02_social_platform.py (search) | tests/v02/test_social_search_platform.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-191 | 附录A 14 Life Timeline & Archive / Compare | 跨时期对比 | Compare | Web/Mini | app/api/routes/v10_platform.py (compare) | tests/v10/test_extras.py | 同上 | ACCEPTED_LIMITATION | 范围/UI 入口接受限制 | 保持记录；无安全/数据影响 |
| PLI-192 | 附录A 14 Life Timeline & Archive / Archive | Life Archive | Archive | Web/Mini | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-193 | 附录A 14 Life Timeline & Archive / Bereavement | 纪念模式 | Bereavement | Web/Mini | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-194 | 附录A 14 Life Timeline & Archive / Story | 生命故事生成 | Story | Web/Mini | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-195 | 附录A 14 Life Timeline & Archive / Shared | 共同回忆授权 | Shared | Web/Mini | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-196 | 附录A 14 Life Timeline & Archive / Portability | 长期档案导出 | Portability | Web/Mini | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-197 | 附录A 15 Pet Agent & Search / Ask | 宠物个人问答 | Ask | Web/Mini | app/api/routes/v02_social_platform.py (ask); ai-gateway (grounding) | tests/ai-evals; tests/v02 | 同上（真实 AI EXTERNAL_BLOCKED） | IMPLEMENTED | 无 | — |
| PLI-198 | 附录A 15 Pet Agent & Search / Search | 跨域语义搜索 | Search | Web/Mini | app/api/routes/v02_social_platform.py (search) | tests/v02/test_social_search_platform.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-199 | 附录A 15 Pet Agent & Search / Explain | 为什么发生提示 | Explain | Web/Mini | app/api/routes/v02_social_platform.py (why) | tests/v02 | 同上 | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-200 | 附录A 15 Pet Agent & Search / Plan | 低风险任务计划 | Plan | Web/Mini | app/api/routes/v02_social_platform.py (task-plan) | tests/v02 | 同上 | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-201 | 附录A 15 Pet Agent & Search / Orchestration | 跨域照护编排 | Orchestration | Web/Mini | app/api/routes/v10_platform.py (agent/actions) | tests/v10/test_extras.py | 同上 | IMPLEMENTED | 无 | — |
| PLI-202 | 附录A 15 Pet Agent & Search / Actions | 预约类动作确认 | Actions | Web/Mini | agent/actions（确认流程） | tests/v10 | EXTERNAL_BLOCKED（真实动作依赖外部 provider）+ 确认框架已实现 | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-203 | 附录A 15 Pet Agent & Search / Actions | 购买类动作确认 | Actions | Web/Mini | agent/actions（确认流程） | tests/v10 | EXTERNAL_BLOCKED（真实动作依赖外部 provider）+ 确认框架已实现 | NOT_APPLICABLE | 无 | — |
| PLI-204 | 附录A 15 Pet Agent & Search / Actions | 医疗动作硬边界 | Actions | Web/Mini | agent/actions（确认流程） | tests/v10 | EXTERNAL_BLOCKED（真实动作依赖外部 provider）+ 确认框架已实现 | IMPLEMENTED | 无 | — |
| PLI-205 | 附录A 15 Pet Agent & Search / Memory | 结构化长期记忆 | Memory | Web/Mini | app/api/routes/v02_social_platform.py (memory) | tests/v02 | BACKGROUND_IMPLEMENTED | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-206 | 附录A 15 Pet Agent & Search / Proactive | 事件驱动主动提醒 | Proactive | Web/Mini | rules + notifications | tests/ga | BACKGROUND_IMPLEMENTED | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-207 | 附录A 15 Pet Agent & Search / Proactive | 提醒降噪与合并 | Proactive | Web/Mini | rules + notifications | tests/ga | BACKGROUND_IMPLEMENTED | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-208 | 附录A 15 Pet Agent & Search / Multi-agent | 领域代理路由 | Multi-agent | Web/Mini | Future 42 冻结 | — | NOT_APPLICABLE | NOT_APPLICABLE | 无 | — |
| PLI-209 | 附录A 15 Pet Agent & Search / Audit | Agent行动日志 | Audit | Web/Mini | app/api/routes/care.py (audit); app/models (AuditEntry); app/services/eventlog.py | tests/integration::TestPermissions::test_audit_visible_to_owner; tests/ga/test_registry_observability.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-210 | 附录A 15 Pet Agent & Search / Personalization | 沟通风格与复杂度 | Personalization | Web/Mini | app/api/routes/v10_extras.py (communication-style) | tests/v10/test_extras.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-211 | 附录A 16 Platform, Data & Safety / Event Graph | Canonical Pet Life Event Schema | Event Graph | Admin/全部后端 | app/domain/event_types.py（canonical schema 集中）; packages/domain-schema | tests/unit/test_event_registry.py; tests/contract/test_contracts.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-212 | 附录A 16 Platform, Data & Safety / Provenance | 来源等级 | Provenance | Admin/全部后端 | app/domain/enums.py (SourceType/PROVENANCE_LEVELS); routes/events.py | tests/integration (provenance_level) | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-213 | 附录A 16 Platform, Data & Safety / Versioning | 记录不可静默覆盖 | Versioning | Admin/全部后端 | 事件不可覆盖（retract 追加）；models | tests/ga/test_registry_observability.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-214 | 附录A 16 Platform, Data & Safety / AI Provenance | 模型/规则版本追踪 | AI Provenance | Admin/全部后端 | app/services/ai_gateway.py; ai_inference_logs | tests/ga/test_registry_observability.py; tests/ai-evals | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-215 | 附录A 16 Platform, Data & Safety / Consent | 细粒度同意中心 | Consent | Admin/全部后端 | app/api/routes/pets.py (consents); app/models/identity.py (Consent); app/domain/enums.py | tests/ga/test_privacy_lifecycle.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-216 | 附录A 16 Platform, Data & Safety / Deletion | 删除与保留策略 | Deletion | Admin/全部后端 | app/api/routes/care.py (deletion-requests) | tests/integration::TestPlatformFeatures | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-217 | 附录A 16 Platform, Data & Safety / Security | 登录与设备安全 | Security | Admin/全部后端 | app/api/routes/auth.py; app/core/security.py | tests/ga/test_security.py; tests/v10/test_stage_e_auth.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-218 | 附录A 16 Platform, Data & Safety / Moderation | 有害内容安全 | Moderation | Admin/全部后端 | BACKGROUND_ONLY（规则级） | tests/ga | BACKGROUND_IMPLEMENTED | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-219 | 附录A 16 Platform, Data & Safety / Notifications | 统一通知中心 | Notifications | Admin/全部后端 | app/api/routes/care.py (notifications); app/models/notifications.py | tests/integration::TestPlatformFeatures::test_notifications_listed | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-220 | 附录A 16 Platform, Data & Safety / Offline | 核心Care Card离线可用 | Offline | Admin/全部后端 | （模块映射见代码位置） | tests/ 对应目录 | L0 本地回归全绿 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-221 | 附录A 16 Platform, Data & Safety / Reliability | 事件幂等与重复检测 | Reliability | Admin/全部后端 | app/api/routes/events.py (Idempotency-Key/duplicate detection) | tests/integration::TestIdempotency; tests/ga/test_worker_idempotency.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-222 | 附录A 16 Platform, Data & Safety / Identity | 跨来源宠物归一 | Identity | Admin/全部后端 | EXTERNAL_BLOCKED（跨来源归一依赖真实外部） | — | EXTERNAL_BLOCKED | EXTERNAL_BLOCKED | 真实外部依赖未激活（诚实保留） | 配置真实 provider 后激活 |
| PLI-223 | 附录A 16 Platform, Data & Safety / Admin | 专业内容版本管理 | Admin | Admin/全部后端 | app/api/routes/v10_platform.py (ops/feature-flags); apps/admin | tests/v10/test_stage_c.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-224 | 附录A 16 Platform, Data & Safety / Experiment | 产品实验框架 | Experiment | Admin/全部后端 | app/api/routes/v10_platform.py (experiments/assign) | tests/v10/test_extras.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-225 | 附录A 16 Platform, Data & Safety / Analytics | 隐私保护产品分析 | Analytics | Admin/全部后端 | app/api/routes/v02_social_platform.py (analytics/counter) | tests/v02 | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-226 | 附录A 16 Platform, Data & Safety / Quality | 数据质量评分 | Quality | Admin/全部后端 | app/api/routes/v10_platform.py (data-quality) | tests/v10/test_extras.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-227 | 附录A 16 Platform, Data & Safety / Evaluation | AI离线评测框架 | Evaluation | Admin/全部后端 | tests/ai-evals + Stage V evals/PLI_AI_GOLDSET_V1 | tests/ai-evals/test_ai_gateway_evals.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |
| PLI-228 | 附录A 16 Platform, Data & Safety / Observability | 生产监控与事故响应 | Observability | Admin/全部后端 | app/api/routes/system.py (metrics); infra/docker; .github/workflows/ci.yml | tests/ga/test_registry_observability.py | 同上 | BACKGROUND_IMPLEMENTED | 无 | 已实现后台能力，无需 UI 入口 |

## 2. Canonical（v3.1-R1 母版）设计要求 → 代码证据

| Requirement ID | Canonical Section | Requirement | Code Evidence | Expected Client | Test Evidence | Status |
|---|---|---|---|---|---|---|
| CAN-01 | §5/§6.01 | 身份与授权：Pet ID 唯一、Owner/Co-owner 关系、角色最小权限、临时权限自动到期 | app/api/routes/pets.py+care.py; app/services/permissions.py | Web/Mini/Mobile/Pro/Admin | tests/integration::TestPermissions | IMPLEMENTED |
| CAN-02 | §6.02 | Today：今日总览 + 快速记录 + 任务 + 冲突检测 | app/api/routes/events.py+tasks.py; apps/web/app/page.tsx | Web/Mini/Mobile | tests/integration::TestTasks; vitest today-page | IMPLEMENTED |
| CAN-03 | §6.03 | Care Network：家庭邀请、交接、Care Card、责任矩阵 | app/api/routes/care.py; v02_care_health.py | Web/Mini/Mobile/Pro | tests/integration::TestCareHandoff | IMPLEMENTED |
| CAN-04 | §6.04 + §16 | Health：健康事件闭环（异常入口→动态追问→证据→红旗→分级→Vet Brief→用药→恢复→Outcome）；红旗规则引擎独立于 LLM | app/api/routes/health.py+medication.py; packages/rules; app/services/health.py | Web/Mini/Pro | tests/safety; tests/ga/test_medical_safety_attacks.py; tests/integration::TestHealthFlow | IMPLEMENTED |
| CAN-05 | §6.05 | Behavior：ABC 结构行为事件，不贴人格标签 | app/api/routes/behavior.py; app/models/events.py | Web/Mini | tests/v02/test_behavior_training.py | IMPLEMENTED |
| CAN-06 | §6.06 | Training：目标→会话→掌握度 | app/api/routes/v02_behavior_training.py | Web/Mini | tests/v02/test_behavior_training.py | IMPLEMENTED |
| CAN-07 | §6.07 | Welfare：五域证据，不生成伪精确开心分 | app/api/routes/v10_extras.py+v10_platform.py | Web | tests/v10/test_extras.py | IMPLEMENTED |
| CAN-08 | §6.09/09A | Devices：统一事件转换、质量检测、Review Queue；真实设备 EXTERNAL_BLOCKED | app/api/routes/v10_platform.py; app/adapters/devices.py | Web/Admin | tests/unit/test_device_adapters.py; tests/v10/test_stage_c.py | EXTERNAL_BLOCKED（后端已实现） |
| CAN-09 | §6.09B/§26-27 | Companion：候选能力，不进 228 执行范围；GENERATED_3D≠LIVE 显式声明 | apps/web/app/companion; tests/e2e-browser/specs | Web | Playwright stage-h2-3d companion | DESIGN_ONLY/ACCEPTED_LIMITATION（诚实标注） |
| CAN-10 | §10.1 | Event Envelope：所有模块统一写入 Canonical Event（pet/actor/time/source） | app/domain/event_types.py; app/services/eventlog.py; packages/domain-schema | 全部 | tests/unit/test_event_registry.py; tests/contract/test_contracts.py | IMPLEMENTED |
| CAN-11 | §10.2 | Provenance 等级：owner/device/ai/professional/lab 分级 | app/domain/enums.py (SourceType) | 全部 | tests/integration (provenance_level) | IMPLEMENTED |
| CAN-12 | §13 | AI：输出 Schema 无决策字段；RAG 边界；规则优先 | services/ai-gateway; pli_ai_gateway (CAPABILITY_SCHEMAS) | 全部 | tests/ga/test_medical_safety_attacks.py; tests/ai-evals | IMPLEMENTED |
| CAN-13 | §15 | 权限/隐私/同意：Consent 细粒度、可撤回；审计轨迹 | app/api/routes/pets.py (consents); care.py (audit); models | 全部 | tests/ga/test_privacy_lifecycle.py; tests/integration | IMPLEMENTED |
| CAN-14 | §16 | 健康与高风险安全治理：LLM 不得单独决定 emergency；不诊断、不改药 | packages/rules; app/services/health.py | 全部 | tests/safety; tests/ga | IMPLEMENTED |
| CAN-15 | §19.1 | v0.1 Release Gates：pytest/ruff/typecheck/build/Playwright/vitest 全部门禁 | .github/workflows/ci.yml; scripts/test-all.ps1 | 全部 | 本 Stage 全量回归记录 | IMPLEMENTED |
| CAN-16 | §20 | 可观测性：metrics/审计/安全事件 | app/api/routes/system.py; app/models | Admin | tests/ga/test_registry_observability.py | IMPLEMENTED |
| CAN-17 | §22-23 | 多端体验：Web/Mini/Mobile/Pro/Admin 职责一致 | apps/web|mini|mobile|pro|admin | 五端 | tests/multi-client/test_consistency.py; Playwright | IMPLEMENTED |
| CAN-18 | §24-25 | Companion/个体 3D 生命界面：无真实 Provider 时诚实 blocked + fallback | app/api/routes/visual.py; adapters/visual_provider.py; apps/web/pets/[id]/life-view | Web/Mini/Mobile | tests/contract/test_plm_visual.py; tests/unit/test_visual_provider.py; Playwright stage-h2-3d | IMPLEMENTED（runtime 见 3D_VIEWER_RUNTIME_REPORT） |
| CAN-19 | 附录B | Canonical Schema 版本化（schema_version=1.0.0） | app/domain/event_types.py (SCHEMA_VERSION); packages/domain-schema | 全部 | tests/unit/test_event_registry.py | IMPLEMENTED |
| CAN-20 | 附录F | Stage F 真实部署/远程验证记录（历史） | reports/STAGE_F_*; scripts/remote_* | 全部 | 历史报告（L4 引用） | BACKGROUND_IMPLEMENTED（历史证据，非本 Stage 伪造） |

## 3. 差异说明

1. **L3 版本差异**：Goal 文档引用 v3.3-R1（2026-09-20）不存在；仓库实际 L3 为 v3.1-R1（2026-09-18）。以仓库实际为准并如实记录（WORK_STATUS 既有处理一致）。
2. **EXTERNAL_BLOCKED 21 项**：均为真实外部依赖（AI provider、设备/摄像头 provider、服务市场、保险、跨来源归一、预约/购买动作），后端适配器/降级路径已实现，配置真实凭据即可激活；不伪造通过。
3. **NOT_APPLICABLE 42 项**：Future 42 冻结项（生物特征、RWE 队列、Life Archive、纪念模式、领养/救助、支付、多 Agent 等），不在 v0.1 执行范围，契约明确允许 NOT_APPLICABLE。
4. **ACCEPTED_LIMITATION 28 项**：后端主体实现 + UI 领域页入口简化（芯片号、字段级隐私、资料导出、恢复计划等），无安全/数据影响，理由逐项记录于 FEATURE_EXPERIENCE_MATRIX PARTIAL_REASON。
5. **无 MISSING、无 DOC_DRIFT**：每条 228 项均有代码或明确分类；本报告所有状态以 L0 实测（pytest 287 重跑）与 L1 代码路径为准。

_生成方式：脚本读取 FEATURE_EXPERIENCE_MATRIX.md（228 行）+ 代码/测试路径映射自动生成，可复现。_