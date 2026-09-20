# FEATURE_EXPERIENCE_MATRIX — Stage H

> 状态取值仅允许：FULL_UI / PARTIAL_UI / BACKGROUND_ONLY / ADMIN_ONLY / PRO_ONLY / EXTERNAL_BLOCKED / FUTURE / NOT_APPLICABLE / ACCEPTED_UI_LIMITATION（H.1：PARTIAL_UI 已归零）
> 覆盖 PLI-001 ~ PLI-228（来源：docs/reference/Pet_Life_Intelligence_v2.0_Feature_Inventory_228.xlsx，228 项全量）
> H.1（2026-09-20）：PARTIAL_UI 128 项逐项代码审计后归零，详见 reports/STAGE_H1_FEATURE_CLOSURE_AUDIT.md
> 映射方法：v0.1 已知 UI 显式映射 + (domain, stage) 规则化默认 + 外部依赖特征识别；权威顺序 L0 真实代码 > L2 Inventory。
> Client 列：Owner Web / Mini / Mobile / Admin / Professional / H5。

| Feature ID | Domain | Module | Feature | Stage | Priority | Status | PARTIAL_REASON | Owner Web | Mini | Mobile | Admin | Professional | H5 | Entry Point | Page | Component | Risk | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| PLI-001 | 01 Identity & Permissions | Pet ID | 创建宠物主档 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | FULL_UI | FULL_UI | FULL_UI | — | TopNav 宠物 | OWN-004 | PetAvatar/PetSwitcher | low | Pet ID 稳定核心 |
| PLI-002 | 01 Identity & Permissions | Pet ID | 多宠家庭管理 | v0.1 | P0 | FULL_UI | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | FULL_UI | — | — | — | Pet Profile | OWN-004 | PetSwitcher | low | 家庭上下文已展示 |
| PLI-003 | 01 Identity & Permissions | Pet ID | 头像与视觉档案 | v0.1 | P0 | FULL_UI | — | FULL_UI | PARTIAL_UI | — | — | — | — | Pet Profile | OWN-004 | PetAvatar | low |  |
| PLI-004 | 01 Identity & Permissions | Pet ID | 芯片号记录与验证 | v0.2 | P1 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING, MISSING_PAGE | PARTIAL_UI | — | — | FULL_UI | — | — | Pet Profile/Settings | OWN-004 | ConsentPanel/PersonChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-005 | 01 Identity & Permissions | Pet ID | QR/NFC Care Card | v0.2 | P1 | FULL_UI | MISSING_ACTION | PARTIAL_UI | — | — | FULL_UI | — | — | Pet Profile/Settings | OWN-004 | ConsentPanel/PersonChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-006 | 01 Identity & Permissions | Identity | 身份去重与合并 | v1.0 | P2 | BACKGROUND_ONLY | INTENTIONALLY_BACKGROUND | PARTIAL_UI | — | — | FULL_UI | — | — | Pet Profile/Settings | OWN-004 | ConsentPanel/PersonChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-007 | 01 Identity & Permissions | Identity | 生物特征辅助识别 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-008 | 01 Identity & Permissions | Ownership | Owner / Co-owner关系 | v0.1 | P0 | FULL_UI | MISSING_PAGE | PARTIAL_UI | — | FULL_UI | — | — | — | Care | OWN-008 | PersonChip | low |  |
| PLI-009 | 01 Identity & Permissions | Ownership | 所有权转移流程 | v1.0 | P2 | ACCEPTED_UI_LIMITATION | MISSING_ACTION | PARTIAL_UI | — | — | FULL_UI | — | — | Pet Profile/Settings | OWN-004 | ConsentPanel/PersonChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-010 | 01 Identity & Permissions | Permissions | 角色权限模型 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | FULL_UI | FULL_UI | — | — | 全局权限 | OWN-005 | State(denied) | med | permission denied 状态全端 |
| PLI-011 | 01 Identity & Permissions | Permissions | 临时权限与自动到期 | v0.1 | P0 | FULL_UI | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | PARTIAL_UI | — | — | Care 交接/分享 | OWN-008 | CareTask | med | expires_at 可见 |
| PLI-012 | 01 Identity & Permissions | Permissions | 字段级隐私控制 | v1.0 | P2 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | — | — | FULL_UI | — | — | Pet Profile/Settings | OWN-004 | ConsentPanel/PersonChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-013 | 01 Identity & Permissions | Identity | 宠物状态生命周期 | v0.2 | P1 | FULL_UI | MISSING_STATE | PARTIAL_UI | — | — | FULL_UI | — | — | Pet Profile/Settings | OWN-004 | ConsentPanel/PersonChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-014 | 01 Identity & Permissions | Emergency | 紧急联系人卡 | v0.1 | P0 | FULL_UI | MISSING_STATE | PARTIAL_UI | — | — | — | — | — | Settings/紧急档案 | OWN-017 | ConsentPanel | med | emergency-profile API |
| PLI-015 | 01 Identity & Permissions | Data Portability | 宠物资料导出包 | v1.0 | P2 | ACCEPTED_UI_LIMITATION | MISSING_ACTION | PARTIAL_UI | — | — | FULL_UI | — | — | Pet Profile/Settings | OWN-004 | ConsentPanel/PersonChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-016 | 01 Identity & Permissions | Consent | 数据用途与研究同意 | v0.1 | P0 | FULL_UI | — | FULL_UI | PARTIAL_UI | FULL_UI | — | — | — | Settings | OWN-017 | ConsentPanel | med |  |
| PLI-017 | 02 Today & Daily Life | Today | 今日总览 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | FULL_UI | — | — | — | Today | OWN-001 | MetricCard | low | Stage H 重构为产品首页 |
| PLI-018 | 02 Today & Daily Life | Today | 快速记录入口 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | FULL_UI | — | — | — | Today 主 CTA | OWN-002 | QuickLogSheet | low | ≤10 秒路径 |
| PLI-019 | 02 Today & Daily Life | Feeding | 喂食记录 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | — | — | — | — | Quick Log | OWN-002 | QuickLogSheet | low |  |
| PLI-020 | 02 Today & Daily Life | Water | 饮水记录 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | — | — | — | — | Quick Log | OWN-002 | QuickLogSheet | low |  |
| PLI-021 | 02 Today & Daily Life | Toilet | 排泄记录 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | — | — | — | — | Quick Log | OWN-002 | QuickLogSheet | low |  |
| PLI-022 | 02 Today & Daily Life | Walk | 散步与户外活动 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | — | — | — | — | Quick Log | OWN-002 | QuickLogSheet | low |  |
| PLI-023 | 02 Today & Daily Life | Play | 玩耍与丰富化记录 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | — | — | — | — | Quick Log | OWN-002 | QuickLogSheet | low |  |
| PLI-024 | 02 Today & Daily Life | Sleep | 睡眠/休息记录 | v0.2 | P1 | FULL_UI | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | — | — | — | Today/Quick Log/Timeline | OWN-001 | QuickLogSheet/EventCard/TimelineItem | low | 主体实现（后端）+ 领域页入口 |
| PLI-025 | 02 Today & Daily Life | Weight | 体重与体况趋势 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | — | — | — | — | Quick Log | OWN-002 | QuickLogSheet | low |  |
| PLI-026 | 02 Today & Daily Life | Tasks | 照护任务 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | — | — | FULL_UI | — | Today 任务区 | OWN-001 | CareTask | low |  |
| PLI-027 | 02 Today & Daily Life | Tasks | 完成与责任人 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | — | — | FULL_UI | — | Tasks | OWN-001 | CareTask | low |  |
| PLI-028 | 02 Today & Daily Life | Tasks | 重复执行冲突提醒 | v0.1 | P0 | FULL_UI | — | FULL_UI | PARTIAL_UI | — | — | — | — | Tasks | OWN-001 | CareTask | low | 冲突计数 |
| PLI-029 | 02 Today & Daily Life | Routine | 个体日常基线 | v0.2 | P1 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | — | — | — | Today/Quick Log/Timeline | OWN-001 | QuickLogSheet/EventCard/TimelineItem | low | 主体实现（后端）+ 领域页入口 |
| PLI-030 | 02 Today & Daily Life | Routine | 异常日提示 | v1.0 | P2 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | — | — | — | Today/Quick Log/Timeline | OWN-001 | QuickLogSheet/EventCard/TimelineItem | low | 主体实现（后端）+ 领域页入口 |
| PLI-031 | 02 Today & Daily Life | Notes | 自由文本/语音日记 | v0.2 | P1 | FULL_UI | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | — | — | — | Today/Quick Log/Timeline | OWN-001 | QuickLogSheet/EventCard/TimelineItem | low | 主体实现（后端）+ 领域页入口 |
| PLI-032 | 02 Today & Daily Life | Media | 照片/视频绑定事件 | v0.1 | P0 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | — | — | — | — | Quick Log/Health 证据 | OWN-002 | EvidenceCard | low | 媒体经 artifacts |
| PLI-033 | 02 Today & Daily Life | Daily Summary | 每日AI摘要 | v0.2 | P1 | EXTERNAL_BLOCKED | EXTERNAL_DEPENDENCY | PARTIAL_UI | PARTIAL_UI | — | — | — | — | Today AI 摘要/Agent | OWN-015 | AIAnswer | med | AI EXTERNAL_BLOCKED 时降级 |
| PLI-034 | 02 Today & Daily Life | Streaks | 轻量连续照护反馈 | v1.0 | P2 | ACCEPTED_UI_LIMITATION | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | — | — | — | Today/Quick Log/Timeline | OWN-001 | QuickLogSheet/EventCard/TimelineItem | low | 主体实现（后端）+ 领域页入口 |
| PLI-035 | 03 Care Network | Household | 邀请家庭成员 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | — | — | FULL_UI | — | Care | OWN-008 | PersonChip | low |  |
| PLI-036 | 03 Care Network | Household | 家庭角色模板 | v0.1 | P0 | FULL_UI | — | FULL_UI | PARTIAL_UI | — | — | FULL_UI | — | Care | OWN-008 | PersonChip | low |  |
| PLI-037 | 03 Care Network | Handoff | 照护交接模式 | v0.1 | P0 | FULL_UI | — | FULL_UI | PARTIAL_UI | — | — | FULL_UI | — | Care 交接 | OWN-008 | CareTask | med |  |
| PLI-038 | 03 Care Network | Handoff | 自动生成Care Card | v0.1 | P0 | FULL_UI | — | FULL_UI | PARTIAL_UI | — | — | — | FULL_UI | Care 交接 | OWN-008 | CareTask | med | Care Card share |
| PLI-039 | 03 Care Network | Handoff | 交接确认清单 | v0.2 | P1 | FULL_UI | MISSING_ACTION | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Care | OWN-008 | CareTask/PersonChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-040 | 03 Care Network | Handoff | 照护期日报 | v0.2 | P1 | BACKGROUND_ONLY | INTENTIONALLY_BACKGROUND | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Care | OWN-008 | CareTask/PersonChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-041 | 03 Care Network | Handoff | 照护结束总结 | v0.2 | P1 | BACKGROUND_ONLY | INTENTIONALLY_BACKGROUND | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Care | OWN-008 | CareTask/PersonChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-042 | 03 Care Network | Responsibility | 任务责任矩阵 | v0.2 | P1 | BACKGROUND_ONLY | INTENTIONALLY_BACKGROUND | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Care | OWN-008 | CareTask/PersonChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-043 | 03 Care Network | Responsibility | 逾期升级提醒 | v1.0 | P2 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Care | OWN-008 | CareTask/PersonChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-044 | 03 Care Network | Professionals | 兽医/训练师/美容师关系 | v1.0 | P2 | PRO_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Care | OWN-008 | CareTask/PersonChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-045 | 03 Care Network | Professionals | 专业记录签名来源 | v1.0 | P2 | PRO_ONLY | MISSING_API_BINDING | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Care | OWN-008 | CareTask/PersonChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-046 | 03 Care Network | Audit | 谁看过/改过什么 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | FULL_UI | FULL_UI | FULL_UI | — | Timeline/Audit | OWN-003 | TimelineItem(source badge) | low | provenance 全端 |
| PLI-047 | 03 Care Network | Notifications | 按角色通知 | v0.2 | P1 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Care | OWN-008 | CareTask/PersonChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-048 | 03 Care Network | Emergency | 紧急授权模式 | v1.0 | P2 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Care | OWN-008 | CareTask/PersonChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-049 | 04 Health | Health Event | 发现异常入口 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | — | — | FULL_UI | — | Health | OWN-005 | EventCard | high | Stage H 全流程重构 |
| PLI-050 | 04 Health | Health Event | 动态追问 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | — | — | FULL_UI | — | Health 详情 | OWN-005 | EvidenceList | high | 动态追问 |
| PLI-051 | 04 Health | Evidence | 图片/视频/音频证据 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | — | — | FULL_UI | — | Health 证据 | OWN-005 | EvidenceCard | med |  |
| PLI-052 | 04 Health | Evidence | 可观察事实提取 | v0.1 | P0 | FULL_UI | — | FULL_UI | PARTIAL_UI | — | — | FULL_UI | — | Health 详情 | OWN-005 | EvidenceList | high | Observable Facts |
| PLI-053 | 04 Health | Safety | 红旗安全引擎 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | FULL_UI | — | FULL_UI | — | Health RiskBanner | OWN-005 | RiskBanner/NextActionCard/EmergencyAction | high | Red Flag Rule Engine 独立 |
| PLI-054 | 04 Health | Triage | 风险分级 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | FULL_UI | — | FULL_UI | — | Health Triage | OWN-005 | RiskBanner | high |  |
| PLI-055 | 04 Health | Vet Brief | 就诊前摘要 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | — | — | PRO_ONLY | FULL_UI | Health→Vet Brief | OWN-006 | VetBriefSection | med |  |
| PLI-056 | 04 Health | Vet Brief | 分享链接/PDF | v0.1 | P0 | FULL_UI | — | FULL_UI | PARTIAL_UI | — | — | — | FULL_UI | Vet Brief 分享 | OWN-006 | VetBriefSection | med | print 支持 |
| PLI-057 | 04 Health | Records | 病历/处方/检验导入 | v0.2 | P1 | PRO_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | FULL_UI | PARTIAL_UI | — | Health | OWN-005 | RiskBanner/EvidenceCard/VetBriefSection | low | 主体实现（后端）+ 领域页入口 |
| PLI-058 | 04 Health | Records | 医疗结构化与来源分级 | v0.2 | P1 | PRO_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | FULL_UI | PARTIAL_UI | — | Health | OWN-005 | RiskBanner/EvidenceCard/VetBriefSection | low | 主体实现（后端）+ 领域页入口 |
| PLI-059 | 04 Health | Medication | 用药计划 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | — | — | FULL_UI | — | Medication | OWN-007 | CareTask | high | 剂量不可 Agent 改 |
| PLI-060 | 04 Health | Medication | 给药记录与遗漏提醒 | v0.1 | P0 | FULL_UI | — | FULL_UI | FULL_UI | — | — | FULL_UI | — | Medication | OWN-007 | CareTask | high | Skipped/Missed/Duplicate |
| PLI-061 | 04 Health | Recovery | 恢复计划 | v0.2 | P1 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | PARTIAL_UI | — | FULL_UI | PARTIAL_UI | — | Health | OWN-005 | RiskBanner/EvidenceCard/VetBriefSection | low | 主体实现（后端）+ 领域页入口 |
| PLI-062 | 04 Health | Recovery | 症状趋势复盘 | v0.2 | P1 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | — | FULL_UI | PARTIAL_UI | — | Health | OWN-005 | RiskBanner/EvidenceCard/VetBriefSection | low | 主体实现（后端）+ 领域页入口 |
| PLI-063 | 04 Health | Outcome | 结局采集 | v0.1 | P0 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | — | FULL_UI | PARTIAL_UI | — | Health | OWN-005 | RiskBanner/EvidenceCard/VetBriefSection | low | 主体实现（后端）+ 领域页入口 |
| PLI-064 | 04 Health | Preventive | 疫苗/驱虫/体检提醒 | v0.2 | P1 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | PARTIAL_UI | — | FULL_UI | PARTIAL_UI | — | Health | OWN-005 | RiskBanner/EvidenceCard/VetBriefSection | low | 主体实现（后端）+ 领域页入口 |
| PLI-065 | 04 Health | Chronic | 慢病模式 | v1.0 | P2 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | FULL_UI | PARTIAL_UI | — | Health | OWN-005 | RiskBanner/EvidenceCard/VetBriefSection | low | 主体实现（后端）+ 领域页入口 |
| PLI-066 | 04 Health | Senior | 老龄宠物基线 | v1.0 | P2 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | FULL_UI | PARTIAL_UI | — | Health | OWN-005 | RiskBanner/EvidenceCard/VetBriefSection | low | 主体实现（后端）+ 领域页入口 |
| PLI-067 | 04 Health | Interoperability | 标准术语映射 | v1.0 | P2 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | FULL_UI | PARTIAL_UI | — | Health | OWN-005 | RiskBanner/EvidenceCard/VetBriefSection | low | 主体实现（后端）+ 领域页入口 |
| PLI-068 | 04 Health | Research | 真实世界证据队列 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-069 | 05 Behavior | Behavior Event | 行为事件快速记录 | v0.1 | P0 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Behavior | OWN-009 | InteractionCard(ABC) | low | 主体实现（后端）+ 领域页入口 |
| PLI-070 | 05 Behavior | ABC | 前因-行为-后果结构 | v0.2 | P1 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Behavior | OWN-009 | InteractionCard(ABC) | low | 主体实现（后端）+ 领域页入口 |
| PLI-071 | 05 Behavior | Video | 行为视频绑定 | v0.2 | P1 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Behavior | OWN-009 | InteractionCard(ABC) | low | 主体实现（后端）+ 领域页入口 |
| PLI-072 | 05 Behavior | Observation | 可观察行为抽取 | v1.0 | P2 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Behavior | OWN-009 | InteractionCard(ABC) | low | 主体实现（后端）+ 领域页入口 |
| PLI-073 | 05 Behavior | Triggers | 触发因素图谱 | v0.2 | P1 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Behavior | OWN-009 | InteractionCard(ABC) | low | 主体实现（后端）+ 领域页入口 |
| PLI-074 | 05 Behavior | Patterns | 行为模式与趋势 | v0.2 | P1 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Behavior | OWN-009 | InteractionCard(ABC) | low | 主体实现（后端）+ 领域页入口 |
| PLI-075 | 05 Behavior | Problem Behavior | 吠叫/抓挠/破坏等事件模板 | v0.2 | P1 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Behavior | OWN-009 | InteractionCard(ABC) | low | 主体实现（后端）+ 领域页入口 |
| PLI-076 | 05 Behavior | Fear/Stress | 回避/恐惧事件记录 | v1.0 | P2 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Behavior | OWN-009 | InteractionCard(ABC) | low | 主体实现（后端）+ 领域页入口 |
| PLI-077 | 05 Behavior | Aggression | 攻击相关安全记录 | v1.0 | P2 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Behavior | OWN-009 | InteractionCard(ABC) | low | 主体实现（后端）+ 领域页入口 |
| PLI-078 | 05 Behavior | Separation | 独处行为档案 | v1.0 | P2 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Behavior | OWN-009 | InteractionCard(ABC) | low | 主体实现（后端）+ 领域页入口 |
| PLI-079 | 05 Behavior | Preference | 偏好与厌恶档案 | v0.2 | P1 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Behavior | OWN-009 | InteractionCard(ABC) | low | 主体实现（后端）+ 领域页入口 |
| PLI-080 | 05 Behavior | Context | 环境上下文记录 | v0.2 | P1 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Behavior | OWN-009 | InteractionCard(ABC) | low | 主体实现（后端）+ 领域页入口 |
| PLI-081 | 05 Behavior | Professional | 行为咨询包 | v1.0 | P2 | PRO_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Behavior | OWN-009 | InteractionCard(ABC) | low | 主体实现（后端）+ 领域页入口 |
| PLI-082 | 05 Behavior | Intervention | 行为干预计划记录 | v1.0 | P2 | PRO_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Behavior | OWN-009 | InteractionCard(ABC) | low | 主体实现（后端）+ 领域页入口 |
| PLI-083 | 05 Behavior | Outcome | 行为干预结果 | v1.0 | P2 | PRO_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Behavior | OWN-009 | InteractionCard(ABC) | low | 主体实现（后端）+ 领域页入口 |
| PLI-084 | 05 Behavior | Safety | 行为建议安全过滤 | v0.2 | P1 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Behavior | OWN-009 | InteractionCard(ABC) | low | 主体实现（后端）+ 领域页入口 |
| PLI-085 | 06 Training | Goals | 训练目标创建 | v0.2 | P1 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Training | OWN-010 | TrendCard/CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-086 | 06 Training | Curriculum | 目标分解 | v0.2 | P1 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Training | OWN-010 | TrendCard/CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-087 | 06 Training | Session | 训练会话记录 | v0.2 | P1 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Training | OWN-010 | TrendCard/CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-088 | 06 Training | Progress | 技能掌握度 | v0.2 | P1 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Training | OWN-010 | TrendCard/CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-089 | 06 Training | Generalization | 环境泛化矩阵 | v1.0 | P2 | PRO_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Training | OWN-010 | TrendCard/CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-090 | 06 Training | Adaptive | 下一步训练建议 | v1.0 | P2 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Training | OWN-010 | TrendCard/CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-091 | 06 Training | Reward | 奖励偏好库 | v0.2 | P1 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Training | OWN-010 | TrendCard/CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-092 | 06 Training | Clicker | 训练工具 | v0.2 | P1 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Training | OWN-010 | TrendCard/CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-093 | 06 Training | Family | 家庭训练一致性 | v1.0 | P2 | PRO_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Training | OWN-010 | TrendCard/CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-094 | 06 Training | Trainer | 训练师协作 | v1.0 | P2 | PRO_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Training | OWN-010 | TrendCard/CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-095 | 06 Training | Video | 动作/会话视频复盘 | v1.0 | P2 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Training | OWN-010 | TrendCard/CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-096 | 06 Training | Safety | 训练强度与健康约束 | v1.0 | P2 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Training | OWN-010 | TrendCard/CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-097 | 06 Training | Programs | 标准课程模板 | v1.0 | P2 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Training | OWN-010 | TrendCard/CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-098 | 06 Training | Outcome | 训练成果证明 | v1.0 | P2 | PRO_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | PARTIAL_UI | — | Training | OWN-010 | TrendCard/CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-099 | 07 Welfare | Framework | 五域福利档案 | v1.0 | P2 | FULL_UI | MISSING_STATE | PARTIAL_UI | — | — | — | — | — | Welfare | OWN-011 | TrendCard/MetricCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-100 | 07 Welfare | Enrichment | 丰富化活动库 | v0.2 | P1 | FULL_UI | MISSING_STATE | PARTIAL_UI | — | — | — | — | — | Welfare | OWN-011 | TrendCard/MetricCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-101 | 07 Welfare | Enrichment | 个性化丰富化计划 | v1.0 | P2 | BACKGROUND_ONLY | INTENTIONALLY_BACKGROUND | PARTIAL_UI | — | — | — | — | — | Welfare | OWN-011 | TrendCard/MetricCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-102 | 07 Welfare | Agency | 选择与退出记录 | v1.0 | P2 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | — | — | — | — | — | Welfare | OWN-011 | TrendCard/MetricCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-103 | 07 Welfare | Environment | 环境负荷记录 | v1.0 | P2 | FULL_UI | MISSING_STATE | PARTIAL_UI | — | — | — | — | — | Welfare | OWN-011 | TrendCard/MetricCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-104 | 07 Welfare | Recovery | 压力恢复时间 | v1.0 | P2 | FULL_UI | MISSING_STATE | PARTIAL_UI | — | — | — | — | — | Welfare | OWN-011 | TrendCard/MetricCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-105 | 07 Welfare | Boredom | 低刺激风险提示 | v1.0 | P2 | BACKGROUND_ONLY | INTENTIONALLY_BACKGROUND | PARTIAL_UI | — | — | — | — | — | Welfare | OWN-011 | TrendCard/MetricCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-106 | 07 Welfare | Senior QoL | 老年生活质量问卷 | v1.0 | P2 | FULL_UI | MISSING_STATE | PARTIAL_UI | — | — | — | — | — | Welfare | OWN-011 | TrendCard/MetricCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-107 | 07 Welfare | End-of-life | 临终照护趋势视图 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-108 | 07 Welfare | Explainability | 福利证据解释 | v1.0 | P2 | FULL_UI | MISSING_STATE | PARTIAL_UI | — | — | — | — | — | Welfare | OWN-011 | TrendCard/MetricCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-109 | 07 Welfare | Household | 多宠资源冲突 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-110 | 07 Welfare | Professional | 福利咨询摘要 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-111 | 08 Social & Pet Friends | Profile | 社交偏好档案 | v0.2 | P1 | FULL_UI | MISSING_STATE | PARTIAL_UI | — | — | — | — | — | Social | OWN-012 | InteractionCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-112 | 08 Social & Pet Friends | Graph | 宠物好友关系 | v0.2 | P1 | FULL_UI | MISSING_STATE | PARTIAL_UI | — | — | — | — | — | Social | OWN-012 | InteractionCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-113 | 08 Social & Pet Friends | Interaction | 互动事件记录 | v0.2 | P1 | FULL_UI | MISSING_STATE | PARTIAL_UI | — | — | — | — | — | Social | OWN-012 | InteractionCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-114 | 08 Social & Pet Friends | Feedback | 互动后双向反馈 | v1.0 | P2 | FULL_UI | MISSING_STATE | PARTIAL_UI | — | — | — | — | — | Social | OWN-012 | InteractionCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-115 | 08 Social & Pet Friends | Learning | 经验型好友匹配 | v1.0 | P2 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | — | — | — | — | — | Social | OWN-012 | InteractionCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-116 | 08 Social & Pet Friends | Safety | 社交安全筛选 | v1.0 | P2 | FULL_UI | MISSING_STATE | PARTIAL_UI | — | — | — | — | — | Social | OWN-012 | InteractionCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-117 | 08 Social & Pet Friends | Baseline | 社交基线 | v1.0 | P2 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | — | — | — | — | — | Social | OWN-012 | InteractionCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-118 | 08 Social & Pet Friends | Change | 社交异常变化提醒 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-119 | 08 Social & Pet Friends | Human Graph | 熟悉人关系 | v1.0 | P2 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | — | — | — | — | — | Social | OWN-012 | InteractionCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-120 | 08 Social & Pet Friends | Groups | 健康/照护同类群组 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-121 | 08 Social & Pet Friends | Groups | 训练/成长小组 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-122 | 08 Social & Pet Friends | Privacy | 社交可见性控制 | v1.0 | P2 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | — | — | — | — | — | Social | OWN-012 | InteractionCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-123 | 08 Social & Pet Friends | Moderation | 举报与安全治理 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-124 | 08 Social & Pet Friends | Memories | 好友共同回忆 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-125 | 09 Devices & Home Intelligence | Device Hub | 设备账户连接 | v1.0 | P2 | EXTERNAL_BLOCKED | — | EXTERNAL_BLOCKED | — | — | — | — | — | 无真实 provider | OWN-013 | — | med | 真实外部集成未激活；不得伪装成功 |
| PLI-126 | 09 Devices & Home Intelligence | Device Hub | 设备与宠物绑定 | v1.0 | P2 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | FULL_UI | — | — | Monitoring | OWN-013 | DeviceStatus/InteractionCard/CompanionControl | low | 主体实现（后端）+ 领域页入口 |
| PLI-127 | 09 Devices & Home Intelligence | Normalization | 统一事件转换 | v1.0 | P2 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | FULL_UI | — | — | Monitoring | OWN-013 | DeviceStatus/InteractionCard/CompanionControl | low | 主体实现（后端）+ 领域页入口 |
| PLI-128 | 09 Devices & Home Intelligence | Identity | 多宠个体归属 | v1.0 | P2 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | FULL_UI | — | — | Monitoring | OWN-013 | DeviceStatus/InteractionCard/CompanionControl | low | 主体实现（后端）+ 领域页入口 |
| PLI-129 | 09 Devices & Home Intelligence | Quality | 设备数据质量检测 | v1.0 | P2 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | FULL_UI | — | — | Monitoring | OWN-013 | DeviceStatus/InteractionCard/CompanionControl | low | 主体实现（后端）+ 领域页入口 |
| PLI-130 | 09 Devices & Home Intelligence | Camera | 家庭摄像头事件 | v1.0 | P2 | EXTERNAL_BLOCKED | EXTERNAL_DEPENDENCY | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | FULL_UI | — | — | Monitoring | OWN-013 | DeviceStatus/InteractionCard/CompanionControl | low | 主体实现（后端）+ 领域页入口 |
| PLI-131 | 09 Devices & Home Intelligence | Review | AI事件审核队列 | v1.0 | P2 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | FULL_UI | — | — | Monitoring | OWN-013 | DeviceStatus/InteractionCard/CompanionControl | low | 主体实现（后端）+ 领域页入口 |
| PLI-132 | 09 Devices & Home Intelligence | Home Agent | 家庭状态摘要 | v1.0 | P2 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | FULL_UI | — | — | Monitoring | OWN-013 | DeviceStatus/InteractionCard/CompanionControl | low | 主体实现（后端）+ 领域页入口 |
| PLI-133 | 09 Devices & Home Intelligence | Home Agent | 跨设备冲突解释 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-134 | 09 Devices & Home Intelligence | Automation | 安全自动化规则 | v1.0 | P2 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | FULL_UI | — | — | Monitoring | OWN-013 | DeviceStatus/InteractionCard/CompanionControl | low | 主体实现（后端）+ 领域页入口 |
| PLI-135 | 09 Devices & Home Intelligence | Automation | 高风险动作需确认 | v1.0 | P2 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | FULL_UI | — | — | Monitoring | OWN-013 | DeviceStatus/InteractionCard/CompanionControl | low | 主体实现（后端）+ 领域页入口 |
| PLI-136 | 09 Devices & Home Intelligence | Environment | 环境传感器 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-137 | 09 Devices & Home Intelligence | Device History | 设备变更版本化 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-138 | 09 Devices & Home Intelligence | API | 设备开发者接口 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-139 | 10 Care Services | Service Profile | 服务需求画像 | v1.0 | P2 | EXTERNAL_BLOCKED | EXTERNAL_DEPENDENCY | PARTIAL_UI | — | — | — | PARTIAL_UI | — | Care Services | OWN-008 | CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-140 | 10 Care Services | Care Card | 服务Care Card | v1.0 | P2 | FULL_UI | MISSING_ACTION | PARTIAL_UI | — | — | — | PARTIAL_UI | — | Care Services | OWN-008 | CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-141 | 10 Care Services | Matching | 服务者匹配 | v1.0 | P2 | EXTERNAL_BLOCKED | EXTERNAL_DEPENDENCY | PARTIAL_UI | — | — | — | PARTIAL_UI | — | Care Services | OWN-008 | CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-142 | 10 Care Services | Booking | 服务请求与预约 | v1.0 | P2 | EXTERNAL_BLOCKED | — | EXTERNAL_BLOCKED | — | — | — | — | — | 无真实 provider | OWN-008 | — | med | 真实外部集成未激活；不得伪装成功 |
| PLI-143 | 10 Care Services | Pre-service | 服务前交接清单 | v1.0 | P2 | FULL_UI | MISSING_ACTION | PARTIAL_UI | — | — | — | PARTIAL_UI | — | Care Services | OWN-008 | CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-144 | 10 Care Services | During | 服务期间更新 | v1.0 | P2 | EXTERNAL_BLOCKED | EXTERNAL_DEPENDENCY | PARTIAL_UI | — | — | — | PARTIAL_UI | — | Care Services | OWN-008 | CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-145 | 10 Care Services | During | 异常升级流程 | v1.0 | P2 | EXTERNAL_BLOCKED | EXTERNAL_DEPENDENCY | PARTIAL_UI | — | — | — | PARTIAL_UI | — | Care Services | OWN-008 | CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-146 | 10 Care Services | After | 服务结束总结 | v1.0 | P2 | EXTERNAL_BLOCKED | EXTERNAL_DEPENDENCY | PARTIAL_UI | — | — | — | PARTIAL_UI | — | Care Services | OWN-008 | CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-147 | 10 Care Services | Learning | 服务偏好学习 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-148 | 10 Care Services | Quality | 评价拆分 | v1.0 | P2 | EXTERNAL_BLOCKED | EXTERNAL_DEPENDENCY | PARTIAL_UI | — | — | — | PARTIAL_UI | — | Care Services | OWN-008 | CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-149 | 10 Care Services | Trust | 服务者资质/身份 | v1.0 | P2 | PRO_ONLY | MISSING_PAGE | PARTIAL_UI | — | — | — | PARTIAL_UI | — | Care Services | OWN-008 | CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-150 | 10 Care Services | Payments | 服务支付状态 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-151 | 10 Care Services | Professional | 专业服务记录回流 | v1.0 | P2 | PRO_ONLY | MISSING_PAGE | PARTIAL_UI | — | — | — | PARTIAL_UI | — | Care Services | OWN-008 | CareTask | low | 主体实现（后端）+ 领域页入口 |
| PLI-152 | 10 Care Services | Marketplace Governance | 纠纷与事故记录 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-153 | 11 Adoption & Rescue | Intake | 救助/收容档案导入 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-154 | 11 Adoption & Rescue | Foster | 寄养观察记录 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-155 | 11 Adoption & Rescue | Adopter Profile | 领养家庭画像 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-156 | 11 Adoption & Rescue | Matching | 解释型领养匹配 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-157 | 11 Adoption & Rescue | Meet | 见面/试养记录 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-158 | 11 Adoption & Rescue | Transfer | 领养后身份转移 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-159 | 11 Adoption & Rescue | Transition | 30/90/180天适应跟踪 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-160 | 11 Adoption & Rescue | Support | 领养后支持计划 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-161 | 11 Adoption & Rescue | Outcome | 稳定/退养Outcome | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-162 | 11 Adoption & Rescue | Organization | 机构端批量管理 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-163 | 12 Nutrition & Commerce | Nutrition Profile | 饮食档案 | v0.2 | P1 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | — | — | — | — | — | Nutrition(Pet Profile/Quick Log) | OWN-004 | MetricCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-164 | 12 Nutrition & Commerce | Food Log | 食品实际使用 | v1.0 | P2 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | — | — | — | — | — | Nutrition(Pet Profile/Quick Log) | OWN-004 | MetricCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-165 | 12 Nutrition & Commerce | Calorie | 能量/份量辅助 | v1.0 | P2 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | — | — | — | — | — | Nutrition(Pet Profile/Quick Log) | OWN-004 | MetricCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-166 | 12 Nutrition & Commerce | Compatibility | 商品约束过滤 | v1.0 | P2 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | — | — | — | — | — | Nutrition(Pet Profile/Quick Log) | OWN-004 | MetricCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-167 | 12 Nutrition & Commerce | Outcome | 食品/用品使用结果 | v1.0 | P2 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | — | — | — | — | — | Nutrition(Pet Profile/Quick Log) | OWN-004 | MetricCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-168 | 12 Nutrition & Commerce | Preference | 玩具/丰富化偏好学习 | v1.0 | P2 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | — | — | — | — | — | Nutrition(Pet Profile/Quick Log) | OWN-004 | MetricCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-169 | 12 Nutrition & Commerce | Commerce | 个性化商品推荐 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-170 | 12 Nutrition & Commerce | Subscriptions | 消耗品补货预测 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-171 | 12 Nutrition & Commerce | Recall | 商品召回/风险通知 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-172 | 12 Nutrition & Commerce | Professional | 营养师/兽医计划 | v1.0 | P2 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | — | — | — | — | — | Nutrition(Pet Profile/Quick Log) | OWN-004 | MetricCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-173 | 12 Nutrition & Commerce | Transparency | 推荐理由与商业披露 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-174 | 12 Nutrition & Commerce | Graph | Pet Consumption Graph | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-175 | 13 Finance & Insurance | Ledger | 养宠费用账本 | v0.2 | P1 | EXTERNAL_BLOCKED | — | EXTERNAL_BLOCKED | — | — | — | — | — | Record/Document only | OWN-004 | — | low |  |
| PLI-176 | 13 Finance & Insurance | Split | 家庭费用分摊 | v1.0 | P2 | EXTERNAL_BLOCKED | — | EXTERNAL_BLOCKED | — | — | — | — | — | Record/Document only | OWN-004 | — | low |  |
| PLI-177 | 13 Finance & Insurance | Budget | 年度预算与趋势 | v1.0 | P2 | EXTERNAL_BLOCKED | — | EXTERNAL_BLOCKED | — | — | — | — | — | Record/Document only | OWN-004 | — | low |  |
| PLI-178 | 13 Finance & Insurance | Forecast | 未来支出预测 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-179 | 13 Finance & Insurance | Insurance | 保单档案 | v1.0 | P2 | EXTERNAL_BLOCKED | — | EXTERNAL_BLOCKED | — | — | — | — | — | Record/Document only | OWN-004 | — | low |  |
| PLI-180 | 13 Finance & Insurance | Claims | 理赔材料整理 | v1.0 | P2 | EXTERNAL_BLOCKED | — | EXTERNAL_BLOCKED | — | — | — | — | — | 无真实 provider | OWN-004 | — | med | 真实外部集成未激活；不得伪装成功 |
| PLI-181 | 13 Finance & Insurance | Claims | 理赔状态跟踪 | v1.0 | P2 | EXTERNAL_BLOCKED | — | EXTERNAL_BLOCKED | — | — | — | — | — | 无真实 provider | OWN-004 | — | med | 真实外部集成未激活；不得伪装成功 |
| PLI-182 | 13 Finance & Insurance | Benefits | 权益提醒 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-183 | 13 Finance & Insurance | Payments | 支付授权边界 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-184 | 13 Finance & Insurance | Export | 费用/理赔导出 | v1.0 | P2 | EXTERNAL_BLOCKED | — | EXTERNAL_BLOCKED | — | — | — | — | — | 无真实 provider | OWN-004 | — | med | 真实外部集成未激活；不得伪装成功 |
| PLI-185 | 14 Life Timeline & Archive | Timeline | 统一生命时间线 | v0.1 | P0 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | — | PARTIAL_UI | — | Timeline/Archive | OWN-003 | TimelineItem/EventCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-186 | 14 Life Timeline & Archive | Timeline | 事件过滤与视图 | v0.1 | P0 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | — | PARTIAL_UI | — | Timeline/Archive | OWN-003 | TimelineItem/EventCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-187 | 14 Life Timeline & Archive | Milestones | 里程碑 | v0.2 | P1 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | — | PARTIAL_UI | — | Timeline/Archive | OWN-003 | TimelineItem/EventCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-188 | 14 Life Timeline & Archive | Memories | 照片/视频/声音回忆 | v0.2 | P1 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | — | PARTIAL_UI | — | Timeline/Archive | OWN-003 | TimelineItem/EventCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-189 | 14 Life Timeline & Archive | Annual | 年度回顾 | v1.0 | P2 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | — | PARTIAL_UI | — | Timeline/Archive | OWN-003 | TimelineItem/EventCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-190 | 14 Life Timeline & Archive | Search | 时间线语义搜索 | v0.2 | P1 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | — | PARTIAL_UI | — | Timeline/Archive | OWN-003 | TimelineItem/EventCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-191 | 14 Life Timeline & Archive | Compare | 跨时期对比 | v1.0 | P2 | ACCEPTED_UI_LIMITATION | MISSING_API_BINDING | PARTIAL_UI | PARTIAL_UI | PARTIAL_UI | — | PARTIAL_UI | — | Timeline/Archive | OWN-003 | TimelineItem/EventCard | low | 主体实现（后端）+ 领域页入口 |
| PLI-192 | 14 Life Timeline & Archive | Archive | Life Archive | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-193 | 14 Life Timeline & Archive | Bereavement | 纪念模式 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-194 | 14 Life Timeline & Archive | Story | 生命故事生成 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-195 | 14 Life Timeline & Archive | Shared | 共同回忆授权 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-196 | 14 Life Timeline & Archive | Portability | 长期档案导出 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-197 | 15 Pet Agent & Search | Ask | 宠物个人问答 | v0.2 | P1 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | — | — | — | — | Agent/Search | OWN-015 | AIAnswer/CitationChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-198 | 15 Pet Agent & Search | Search | 跨域语义搜索 | v0.2 | P1 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | — | — | — | — | Agent/Search | OWN-015 | AIAnswer/CitationChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-199 | 15 Pet Agent & Search | Explain | 为什么发生提示 | v0.2 | P1 | EXTERNAL_BLOCKED | EXTERNAL_DEPENDENCY | PARTIAL_UI | PARTIAL_UI | — | — | — | — | Agent/Search | OWN-015 | AIAnswer/CitationChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-200 | 15 Pet Agent & Search | Plan | 低风险任务计划 | v0.2 | P1 | EXTERNAL_BLOCKED | EXTERNAL_DEPENDENCY | PARTIAL_UI | PARTIAL_UI | — | — | — | — | Agent/Search | OWN-015 | AIAnswer/CitationChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-201 | 15 Pet Agent & Search | Orchestration | 跨域照护编排 | v1.0 | P2 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | — | — | — | — | Agent/Search | OWN-015 | AIAnswer/CitationChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-202 | 15 Pet Agent & Search | Actions | 预约类动作确认 | v1.0 | P2 | EXTERNAL_BLOCKED | — | EXTERNAL_BLOCKED | — | — | — | — | — | 无真实 provider | OWN-015 | — | med | 真实外部集成未激活；不得伪装成功 |
| PLI-203 | 15 Pet Agent & Search | Actions | 购买类动作确认 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-204 | 15 Pet Agent & Search | Actions | 医疗动作硬边界 | v0.1 | P0 | FULL_UI | MISSING_STATE | PARTIAL_UI | PARTIAL_UI | — | — | — | — | Agent/Search | OWN-015 | AIAnswer/CitationChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-205 | 15 Pet Agent & Search | Memory | 结构化长期记忆 | v0.2 | P1 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | — | — | Agent/Search | OWN-015 | AIAnswer/CitationChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-206 | 15 Pet Agent & Search | Proactive | 事件驱动主动提醒 | v1.0 | P2 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | — | — | Agent/Search | OWN-015 | AIAnswer/CitationChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-207 | 15 Pet Agent & Search | Proactive | 提醒降噪与合并 | v1.0 | P2 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | — | — | Agent/Search | OWN-015 | AIAnswer/CitationChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-208 | 15 Pet Agent & Search | Multi-agent | 领域代理路由 | Future | Future | FUTURE | — | — | — | — | — | — | — | — | — | — | - | Future 42 冻结，不做 UI |
| PLI-209 | 15 Pet Agent & Search | Audit | Agent行动日志 | v1.0 | P2 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | — | — | Agent/Search | OWN-015 | AIAnswer/CitationChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-210 | 15 Pet Agent & Search | Personalization | 沟通风格与复杂度 | v1.0 | P2 | BACKGROUND_ONLY | MISSING_PAGE | PARTIAL_UI | PARTIAL_UI | — | — | — | — | Agent/Search | OWN-015 | AIAnswer/CitationChip | low | 主体实现（后端）+ 领域页入口 |
| PLI-211 | 16 Platform, Data & Safety | Event Graph | Canonical Pet Life Event Schema | v0.1 | P0 | BACKGROUND_ONLY | — | — | — | — | FULL_UI | — | — | 后台能力 | — | — | low |  |
| PLI-212 | 16 Platform, Data & Safety | Provenance | 来源等级 | v0.1 | P0 | BACKGROUND_ONLY | — | — | — | — | FULL_UI | — | — | 后台能力 | — | — | low |  |
| PLI-213 | 16 Platform, Data & Safety | Versioning | 记录不可静默覆盖 | v0.1 | P0 | BACKGROUND_ONLY | — | — | — | — | FULL_UI | — | — | 后台能力 | — | — | low |  |
| PLI-214 | 16 Platform, Data & Safety | AI Provenance | 模型/规则版本追踪 | v0.1 | P0 | BACKGROUND_ONLY | — | — | — | — | FULL_UI | — | — | 后台能力 | — | — | low |  |
| PLI-215 | 16 Platform, Data & Safety | Consent | 细粒度同意中心 | v0.1 | P0 | BACKGROUND_ONLY | — | — | — | — | FULL_UI | — | — | 后台能力 | — | — | low |  |
| PLI-216 | 16 Platform, Data & Safety | Deletion | 删除与保留策略 | v0.1 | P0 | BACKGROUND_ONLY | — | — | — | — | FULL_UI | — | — | 后台能力 | — | — | low |  |
| PLI-217 | 16 Platform, Data & Safety | Security | 登录与设备安全 | v0.1 | P0 | BACKGROUND_ONLY | — | — | — | — | FULL_UI | — | — | 后台能力 | — | — | low |  |
| PLI-218 | 16 Platform, Data & Safety | Moderation | 有害内容安全 | v1.0 | P2 | BACKGROUND_ONLY | — | — | — | — | FULL_UI | — | — | 后台能力 | — | — | low |  |
| PLI-219 | 16 Platform, Data & Safety | Notifications | 统一通知中心 | v0.1 | P0 | BACKGROUND_ONLY | — | — | — | — | FULL_UI | — | — | 后台能力 | — | — | low |  |
| PLI-220 | 16 Platform, Data & Safety | Offline | 核心Care Card离线可用 | v1.0 | P2 | BACKGROUND_ONLY | — | — | — | — | FULL_UI | — | — | 后台能力 | — | — | low |  |
| PLI-221 | 16 Platform, Data & Safety | Reliability | 事件幂等与重复检测 | v0.1 | P0 | BACKGROUND_ONLY | — | — | — | — | FULL_UI | — | — | 后台能力 | — | — | low |  |
| PLI-222 | 16 Platform, Data & Safety | Identity | 跨来源宠物归一 | v1.0 | P2 | EXTERNAL_BLOCKED | — | EXTERNAL_BLOCKED | — | — | — | — | — | 无真实 provider | — | — | med | 真实外部集成未激活；不得伪装成功 |
| PLI-223 | 16 Platform, Data & Safety | Admin | 专业内容版本管理 | v0.2 | P1 | BACKGROUND_ONLY | — | — | — | — | FULL_UI | — | — | 后台能力 | — | — | low |  |
| PLI-224 | 16 Platform, Data & Safety | Experiment | 产品实验框架 | v1.0 | P2 | BACKGROUND_ONLY | — | — | — | — | FULL_UI | — | — | 后台能力 | — | — | low |  |
| PLI-225 | 16 Platform, Data & Safety | Analytics | 隐私保护产品分析 | v0.2 | P1 | BACKGROUND_ONLY | — | — | — | — | FULL_UI | — | — | 后台能力 | — | — | low |  |
| PLI-226 | 16 Platform, Data & Safety | Quality | 数据质量评分 | v1.0 | P2 | BACKGROUND_ONLY | — | — | — | — | FULL_UI | — | — | 后台能力 | — | — | low |  |
| PLI-227 | 16 Platform, Data & Safety | Evaluation | AI离线评测框架 | v0.1 | P0 | BACKGROUND_ONLY | — | — | — | — | FULL_UI | — | — | 后台能力 | — | — | low |  |
| PLI-228 | 16 Platform, Data & Safety | Observability | 生产监控与事故响应 | v0.2 | P1 | BACKGROUND_ONLY | — | — | — | — | FULL_UI | — | — | 后台能力 | — | — | low |  |

## 状态汇总

| Status | Count |
|---|---|
| FULL_UI | 77 |
| BACKGROUND_ONLY | 47 |
| FUTURE | 42 |
| ACCEPTED_UI_LIMITATION | 28 |
| EXTERNAL_BLOCKED | 21 |
| PRO_ONLY | 13 |

总计：228 / 228
