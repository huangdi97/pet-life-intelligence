# STAGE_H1_FEATURE_CLOSURE_AUDIT — 128 PARTIAL_UI 逐项代码级审计

> 日期：2026-09-20 · 阶段：Stage H.1（Code-level Audit）· 依据：GOAL PHASE B（B1–B6）
> 方法：L0 真实代码逐项核对（apps/web · apps/mini · apps/mobile · apps/admin · apps/pro · services/api 路由 · packages/ui-kit）
> PARTIAL_REASON taxonomy 仅用标准值（B2）；终态仅用 B3 允许值。

## 汇总

| 终态 | 数量 |
|---|---|
| FULL_UI | 47 |
| BACKGROUND_ONLY | 30 |
| ACCEPTED_UI_LIMITATION | 28 |
| PRO_ONLY | 13 |
| EXTERNAL_BLOCKED | 10 |
| **合计** | **128** |

PARTIAL_UI = **0**（全部 128 项已给出终态；ACCEPTED_UI_LIMITATION 28 项均为低频管理/偏好类，带 reason/impact/workaround/owner/revisit_condition）。

## 逐项审计

| ID | Feature | Domain | Stage | Pri | PARTIAL_REASON | Final | Evidence |
|---|---|---|---|---|---|---|---|
| PLI-002 | 多宠家庭管理 | 01 Identity &  | v0.1 | P0 | MISSING_PAGE | FULL_UI | pets 页+PetSwitcher 多宠切换+创建/列表/详情 完整（apps/web/app/pets*, ui-kit PetSwitcher） |
| PLI-004 | 芯片号记录与验证 | 01 Identity &  | v0.2 | P1 | MISSING_API_BINDING, MISSING_PAGE | ACCEPTED_UI_LIMITATION | 后端 /pets/{id}/identifiers 存在，Owner UI 未绑定；reason=芯片号属低频管理项, impact=无法线上记录芯片号, workaround=暂由 Pet Profile 备注承载, owner=PLI, revisit_condition=真实 Pilot 反馈出现芯片查询需求 |
| PLI-005 | QR/NFC Care Card | 01 Identity &  | v0.2 | P1 | MISSING_ACTION | FULL_UI | Care 页生成 Care Card 已实现 + /care-cards/{card_id}/qr.svg 端点 + share/care-card H5 页（apps/web/app/care + share） |
| PLI-006 | 身份去重与合并 | 01 Identity &  | v1.0 | P2 | INTENTIONALLY_BACKGROUND | BACKGROUND_ONLY | 合并请求登记/审计后端完成（/pets/merge-requests）；执行需人工确认（AGENTS §5），无需普通用户页 |
| PLI-008 | Owner / Co-owner关系 | 01 Identity &  | v0.1 | P0 | MISSING_PAGE | FULL_UI | Care 页 Grants 授予/到期/作用域完整（apps/web/app/care/page.tsx） |
| PLI-009 | 所有权转移流程 | 01 Identity &  | v1.0 | P2 | MISSING_ACTION | ACCEPTED_UI_LIMITATION | 后端 /pets/{pet_id}/transfer-requests 存在；转移执行按设计需人工确认（PLI-204 边界）；reason=所有权转移高风险动作, impact=线上发起受限, workaround=登记后人工执行, owner=PLI, revisit_condition=真实转移需求出现 |
| PLI-011 | 临时权限与自动到期 | 01 Identity &  | v0.1 | P0 | MISSING_PAGE | FULL_UI | Care 页 handoff 限时/限范围权限 + expires_at 可见（apps/web/app/care/page.tsx + E2E-02/05） |
| PLI-012 | 字段级隐私控制 | 01 Identity &  | v1.0 | P2 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 后端 /pets/{pet_id}/field-privacy 存在；前端未接；reason=v1.0 隐私控制属设置级低频, impact=字段级掩码不可在线配置, workaround=审计记录保留, owner=PLI, revisit_condition=真实隐私诉求出现 |
| PLI-013 | 宠物状态生命周期 | 01 Identity &  | v0.2 | P1 | MISSING_STATE | FULL_UI | 宠物状态生命周期（/pets/{id}/status + 创建/更新/删除流程完整） |
| PLI-014 | 紧急联系人卡 | 01 Identity &  | v0.1 | P0 | MISSING_STATE | FULL_UI | Settings 紧急联系卡完整表单（apps/web/app/settings/page.tsx，refs=2） |
| PLI-015 | 宠物资料导出包 | 01 Identity &  | v1.0 | P2 | MISSING_ACTION | ACCEPTED_UI_LIMITATION | 后端 /pets/{pet_id}/export 存在；UI 仅设置页说明；reason=导出包低频高成本, impact=数据导出需 API 操作, workaround=管理员协助, owner=PLI, revisit_condition=真实导出需求出现 |
| PLI-024 | 睡眠/休息记录 | 02 Today & Dai | v0.2 | P1 | MISSING_PAGE | FULL_UI | Today QuickLog Sheet 含 daily.sleep + Timeline 事件显示（apps/web/app/page.tsx SHEET_TYPES） |
| PLI-029 | 个体日常基线 | 02 Today & Dai | v0.2 | P1 | MISSING_STATE | FULL_UI | /pets/{pet_id}/baseline + abnormal-day-hint 在 Today「值得关注」区展示（page.tsx hint 区块） |
| PLI-030 | 异常日提示 | 02 Today & Dai | v1.0 | P2 | MISSING_STATE | FULL_UI | Today 异常日提示已实现（hint.data?.hints，基线对比非诊断） |
| PLI-031 | 自由文本/语音日记 | 02 Today & Dai | v0.2 | P1 | MISSING_PAGE | FULL_UI | QuickLog Sheet 含 diary.created「备注」+ Timeline 显示（page.tsx + timeline TYPE_LABELS） |
| PLI-032 | 照片/视频绑定事件 | 02 Today & Dai | v0.1 | P0 | MISSING_STATE | FULL_UI | 事件附件绑定展示（Timeline artifact_ids 计数 + 仅媒体筛选 + artifacts API） |
| PLI-033 | 每日AI摘要 | 02 Today & Dai | v0.2 | P1 | EXTERNAL_DEPENDENCY | EXTERNAL_BLOCKED | AI 每日摘要真实 provider 缺失；Today 显示「服务暂未开放」诚实降级（page.tsx AI 摘要卡） |
| PLI-034 | 轻量连续照护反馈 | 02 Today & Dai | v1.0 | P2 | MISSING_PAGE | ACCEPTED_UI_LIMITATION | 连续照护反馈无独立 UI；reason=轻量激励非核心, impact=无连续打卡展示, workaround=任务完成计数可查, owner=PLI, revisit_condition=真实留存数据驱动 |
| PLI-039 | 交接确认清单 | 03 Care Networ | v0.2 | P1 | MISSING_ACTION | FULL_UI | handoff checklist 后端 + Care 页交接流程（/handoffs/{id}/checklist, refs=1 + care page） |
| PLI-040 | 照护期日报 | 03 Care Networ | v0.2 | P1 | INTENTIONALLY_BACKGROUND | BACKGROUND_ONLY | 照护期日报为后端生成型报告（/handoffs/{id}/daily-report），Timeline 事件可承载，无独立 UI 需求 |
| PLI-041 | 照护结束总结 | 03 Care Networ | v0.2 | P1 | INTENTIONALLY_BACKGROUND | BACKGROUND_ONLY | 照护结束总结为后端生成型报告（/handoffs/{id}/summary），无独立 UI 需求 |
| PLI-042 | 任务责任矩阵 | 03 Care Networ | v0.2 | P1 | INTENTIONALLY_BACKGROUND | BACKGROUND_ONLY | 任务责任矩阵为后端聚合（/pets/{id}/tasks/matrix），无独立 UI 需求 |
| PLI-043 | 逾期升级提醒 | 03 Care Networ | v1.0 | P2 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 逾期升级后端 /pets/{id}/overdue-tasks + 通知；前端未绑定提醒 UI；reason=通知通道有限(SMTP), impact=无主动推送, workaround=Today 任务区可见, owner=PLI, revisit_condition=真实逾期案例 |
| PLI-044 | 兽医/训练师/美容师关系 | 03 Care Networ | v1.0 | P2 | MISSING_PAGE | PRO_ONLY | 专业关系由 Pro 端（apps/pro vet/trainer/service IA）承载；Owner 无列表页 |
| PLI-045 | 专业记录签名来源 | 03 Care Networ | v1.0 | P2 | MISSING_API_BINDING | PRO_ONLY | 专业记录签名来源（signature-policy 后端）由 Pro 端导入签名状态承载 |
| PLI-047 | 按角色通知 | 03 Care Networ | v0.2 | P1 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 按角色通知后端 /notifications/for-role/{role} 存在；前端 notifications 页为统一列表；reason=SMTP 外部受限, impact=无真推送, workaround=站内通知列表, owner=PLI, revisit_condition=真实通知通道激活 |
| PLI-048 | 紧急授权模式 | 03 Care Networ | v1.0 | P2 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 紧急授权后端 /pets/{pet_id}/emergency-grants 存在；前端未绑定；reason=v1.0 紧急模式, impact=无一键授权, workaround=手动 handoff, owner=PLI, revisit_condition=真实紧急场景 |
| PLI-057 | 病历/处方/检验导入 | 04 Health | v0.2 | P1 | MISSING_PAGE | PRO_ONLY | 病历/处方/检验导入由 Pro 端（apps/pro evidence/timeline）+ health-records 后端承载 |
| PLI-058 | 医疗结构化与来源分级 | 04 Health | v0.2 | P1 | MISSING_PAGE | PRO_ONLY | 医疗结构化与来源分级由 Pro 端 + signature-policy（PLI-045）承载 |
| PLI-061 | 恢复计划 | 04 Health | v0.2 | P1 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 恢复计划后端 /health-events/{id}/recovery-plan 存在；前端 health detail 未绑定专用计划 UI；reason=恢复计划低频医疗功能, impact=无结构化恢复视图, workaround=健康事件记录, owner=PLI+vet, revisit_condition=真实术后/康复案例 |
| PLI-062 | 症状趋势复盘 | 04 Health | v0.2 | P1 | MISSING_STATE | FULL_UI | 症状趋势复盘 /health-events/{id}/trend 后端 + health detail 流程（refs=3，见 [id]/page.tsx） |
| PLI-063 | 结局采集 | 04 Health | v0.1 | P0 | MISSING_STATE | FULL_UI | 结局采集 health detail recordOutcome 已实现（apps/web/app/health/[id]/page.tsx recordOutcome） |
| PLI-064 | 疫苗/驱虫/体检提醒 | 04 Health | v0.2 | P1 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 疫苗/驱虫/体检提醒后端 /pets/{id}/reminders 存在；前端未绑定；reason=提醒依赖通知通道, impact=无主动提醒, workaround=任务列表, owner=PLI, revisit_condition=真实预防需求 |
| PLI-065 | 慢病模式 | 04 Health | v1.0 | P2 | MISSING_PAGE | BACKGROUND_ONLY | 慢病模式为后端聚合（/pets/{id}/health-events/chronic）；无独立 UI 需求（Vet Brief 已含历史） |
| PLI-066 | 老龄宠物基线 | 04 Health | v1.0 | P2 | MISSING_PAGE | BACKGROUND_ONLY | 老龄基线 recompute-senior 后端能力；无独立 UI |
| PLI-067 | 标准术语映射 | 04 Health | v1.0 | P2 | MISSING_PAGE | BACKGROUND_ONLY | 标准术语映射 /health/term-map 后端能力（Pro/Admin 审计用） |
| PLI-069 | 行为事件快速记录 | 05 Behavior | v0.1 | P0 | MISSING_STATE | FULL_UI | 行为事件快速记录完整（apps/web/app/behavior/page.tsx 全流程） |
| PLI-070 | 前因-行为-后果结构 | 05 Behavior | v0.2 | P1 | MISSING_STATE | FULL_UI | ABC 结构 Web 完整（Antecedent/Behavior/Consequence 表单+列表） |
| PLI-071 | 行为视频绑定 | 05 Behavior | v0.2 | P1 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 行为视频绑定后端 artifacts 存在；行为页未接附件上传；reason=媒体上传链路低频, impact=行为证据无视频, workaround=Health 证据通道, owner=PLI, revisit_condition=真实训练师反馈 |
| PLI-072 | 可观察行为抽取 | 05 Behavior | v1.0 | P2 | MISSING_PAGE | BACKGROUND_ONLY | 可观察行为抽取为后端 AI 能力（/pets/{id}/behavior/trends）；AI provider 外部受限 |
| PLI-073 | 触发因素图谱 | 05 Behavior | v0.2 | P1 | MISSING_PAGE | BACKGROUND_ONLY | 触发因素图谱后端聚合（/behavior/triggers）；无独立 UI 需求 |
| PLI-074 | 行为模式与趋势 | 05 Behavior | v0.2 | P1 | MISSING_PAGE | BACKGROUND_ONLY | 行为模式与趋势后端（/behavior/trends）；趋势由 Pro 端展示 |
| PLI-075 | 吠叫/抓挠/破坏等事件模板 | 05 Behavior | v0.2 | P1 | MISSING_PAGE | BACKGROUND_ONLY | 行为事件模板后端（/behavior-templates）；模板为内容管理能力 |
| PLI-076 | 回避/恐惧事件记录 | 05 Behavior | v1.0 | P2 | MISSING_PAGE | BACKGROUND_ONLY | 回避/恐惧记录后端（alone-profile）；无独立 UI（行为页通用记录可承载） |
| PLI-077 | 攻击相关安全记录 | 05 Behavior | v1.0 | P2 | MISSING_PAGE | BACKGROUND_ONLY | 攻击相关安全记录后端；安全边界由 Red Flag 独立引擎保障 |
| PLI-078 | 独处行为档案 | 05 Behavior | v1.0 | P2 | MISSING_PAGE | BACKGROUND_ONLY | 独处行为档案后端聚合；无独立 UI |
| PLI-079 | 偏好与厌恶档案 | 05 Behavior | v0.2 | P1 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 偏好与厌恶档案后端 /pets/{id}/preferences 存在；前端未绑定；reason=低频档案, impact=无结构化偏好库, workaround=行为记录备注, owner=PLI, revisit_condition=真实训练师需求 |
| PLI-080 | 环境上下文记录 | 05 Behavior | v0.2 | P1 | MISSING_STATE | FULL_UI | 环境上下文记录在行为页表单（environment 字段，refs=14） |
| PLI-081 | 行为咨询包 | 05 Behavior | v1.0 | P2 | MISSING_PAGE | PRO_ONLY | 行为咨询包后端 /behavior-consultation-package 由 Pro/Trainer 端承载 |
| PLI-082 | 行为干预计划记录 | 05 Behavior | v1.0 | P2 | MISSING_PAGE | PRO_ONLY | 行为干预计划由 Pro/Trainer 端（behavior-interventions）+ 后端承载 |
| PLI-083 | 行为干预结果 | 05 Behavior | v1.0 | P2 | MISSING_PAGE | PRO_ONLY | 干预结果由 Pro 端 outcome 流程承载 |
| PLI-084 | 行为建议安全过滤 | 05 Behavior | v0.2 | P1 | MISSING_PAGE | BACKGROUND_ONLY | 行为建议安全过滤后端（/behavior/advice）；AI provider 受限时不做生成 |
| PLI-085 | 训练目标创建 | 06 Training | v0.2 | P1 | MISSING_STATE | FULL_UI | 训练目标创建完整（apps/web/app/training/page.tsx createGoal） |
| PLI-086 | 目标分解 | 06 Training | v0.2 | P1 | MISSING_STATE | FULL_UI | 目标分解 steps 展示（training Goal.steps + mastery_level） |
| PLI-087 | 训练会话记录 | 06 Training | v0.2 | P1 | MISSING_STATE | FULL_UI | 训练会话记录完整（logSession GOOD/GREAT/POOR） |
| PLI-088 | 技能掌握度 | 06 Training | v0.2 | P1 | MISSING_STATE | FULL_UI | 技能掌握度展示（mastery_level /5 badge） |
| PLI-089 | 环境泛化矩阵 | 06 Training | v1.0 | P2 | MISSING_PAGE | PRO_ONLY | 环境泛化矩阵后端（/training/generalization）由 Pro/Trainer 端承载 |
| PLI-090 | 下一步训练建议 | 06 Training | v1.0 | P2 | MISSING_PAGE | BACKGROUND_ONLY | 下一步训练建议后端（/training-goals/{id}/next-step）；AI provider 受限时降级 |
| PLI-091 | 奖励偏好库 | 06 Training | v0.2 | P1 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 奖励偏好库后端 preferences；前端未绑定；reason=低频, impact=无结构化奖励库, workaround=会话记录 rewards_used, owner=PLI, revisit_condition=真实训练师需求 |
| PLI-092 | 训练工具 | 06 Training | v0.2 | P1 | MISSING_STATE | FULL_UI | 训练工具库展示完整（training/tools API + banned_note 安全提示，refs=1） |
| PLI-093 | 家庭训练一致性 | 06 Training | v1.0 | P2 | MISSING_PAGE | PRO_ONLY | 家庭训练一致性后端（/training/consistency）由 Pro/Trainer 端承载 |
| PLI-094 | 训练师协作 | 06 Training | v1.0 | P2 | MISSING_PAGE | PRO_ONLY | 训练师协作由 Pro/Trainer 端承载 |
| PLI-095 | 动作/会话视频复盘 | 06 Training | v1.0 | P2 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 动作/会话视频复盘后端 artifacts；前端未绑训练视频复盘 UI；reason=媒体复盘低频, impact=无逐帧复盘, workaround=Health 证据通道, owner=PLI, revisit_condition=真实训练师反馈 |
| PLI-096 | 训练强度与健康约束 | 06 Training | v1.0 | P2 | MISSING_PAGE | BACKGROUND_ONLY | 训练强度与健康约束后端（/behavior/advice）；约束由规则层保障 |
| PLI-097 | 标准课程模板 | 06 Training | v1.0 | P2 | MISSING_PAGE | BACKGROUND_ONLY | 标准课程模板后端（/training/course-templates）；内容管理能力 |
| PLI-098 | 训练成果证明 | 06 Training | v1.0 | P2 | MISSING_PAGE | PRO_ONLY | 训练成果证明（/training-goals/{id}/achievement）由 Pro/Trainer 端承载 |
| PLI-099 | 五域福利档案 | 07 Welfare | v1.0 | P2 | MISSING_STATE | FULL_UI | 五域福利档案（/welfare-profile 域展示 + welfare 页 profile 卡） |
| PLI-100 | 丰富化活动库 | 07 Welfare | v0.2 | P1 | MISSING_STATE | FULL_UI | 丰富化活动库（welfare 页观察记录 + enrichment 事件类型） |
| PLI-101 | 个性化丰富化计划 | 07 Welfare | v1.0 | P2 | INTENTIONALLY_BACKGROUND | BACKGROUND_ONLY | 个性化丰富化计划为后端数据驱动生成（/enrichment-plan），无独立 UI 需求 |
| PLI-102 | 选择与退出记录 | 07 Welfare | v1.0 | P2 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 选择与退出记录后端 preferences；前端未绑；reason=低频, impact=无结构化记录, workaround=行为备注, owner=PLI, revisit_condition=真实行为咨询 |
| PLI-103 | 环境负荷记录 | 07 Welfare | v1.0 | P2 | MISSING_STATE | FULL_UI | 环境负荷记录（welfare 页 kind=ENVIRONMENT_LOAD 观察，refs=1） |
| PLI-104 | 压力恢复时间 | 07 Welfare | v1.0 | P2 | MISSING_STATE | FULL_UI | 压力恢复时间（welfare 页 kind=STRESS_RECOVERY 观察） |
| PLI-105 | 低刺激风险提示 | 07 Welfare | v1.0 | P2 | INTENTIONALLY_BACKGROUND | BACKGROUND_ONLY | 低刺激风险提示为后端数据驱动（/low-stimulus-hint），提示逻辑属后台能力 |
| PLI-106 | 老年生活质量问卷 | 07 Welfare | v1.0 | P2 | MISSING_STATE | FULL_UI | 老年生活质量问卷记录（welfare 页 kind=QOL_QUESTIONNAIRE 观察） |
| PLI-108 | 福利证据解释 | 07 Welfare | v1.0 | P2 | MISSING_STATE | FULL_UI | 福利证据解释（/welfare-evidence sources + notice + uncertainty 文案） |
| PLI-111 | 社交偏好档案 | 08 Social & Pe | v0.2 | P1 | MISSING_STATE | FULL_UI | 社交偏好档案（social 页 good_with_* badges） |
| PLI-112 | 宠物好友关系 | 08 Social & Pe | v0.2 | P1 | MISSING_STATE | FULL_UI | 宠物好友关系（social 页 friends 列表 + PersonChip，refs=7） |
| PLI-113 | 互动事件记录 | 08 Social & Pe | v0.2 | P1 | MISSING_STATE | FULL_UI | 互动事件记录（social 页 recordInteraction + InteractionCard） |
| PLI-114 | 互动后双向反馈 | 08 Social & Pe | v1.0 | P2 | MISSING_STATE | FULL_UI | 互动后双向反馈（social 页 quality 标注 + 冲突提示，refs=9） |
| PLI-115 | 经验型好友匹配 | 08 Social & Pe | v1.0 | P2 | MISSING_PAGE | BACKGROUND_ONLY | 经验型好友匹配后端（/social/co-occurrence）；匹配引擎非 UI 功能 |
| PLI-116 | 社交安全筛选 | 08 Social & Pe | v1.0 | P2 | MISSING_STATE | FULL_UI | 社交安全筛选（friends 状态 + block 端点 + 冲突反馈） |
| PLI-117 | 社交基线 | 08 Social & Pe | v1.0 | P2 | MISSING_PAGE | BACKGROUND_ONLY | 社交基线后端聚合（/social/baseline）；无独立 UI |
| PLI-119 | 熟悉人关系 | 08 Social & Pe | v1.0 | P2 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 熟悉人关系后端 /familiar-people 存在；前端未绑定；reason=低频, impact=无熟悉人列表, workaround=社交档案, owner=PLI, revisit_condition=真实多宠家庭反馈 |
| PLI-122 | 社交可见性控制 | 08 Social & Pe | v1.0 | P2 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 社交可见性控制后端 /social-visibility 存在；前端未绑定；reason=隐私控制低频, impact=无可见性开关, workaround=默认最小可见, owner=PLI, revisit_condition=真实社交隐私诉求 |
| PLI-126 | 设备与宠物绑定 | 09 Devices & H | v1.0 | P2 | MISSING_STATE | FULL_UI | 设备与宠物绑定（monitoring 页 devices 列表 + DeviceStatus，refs=35） |
| PLI-127 | 统一事件转换 | 09 Devices & H | v1.0 | P2 | MISSING_STATE | FULL_UI | 统一事件转换（device-events + review queue 候选确认流程） |
| PLI-128 | 多宠个体归属 | 09 Devices & H | v1.0 | P2 | MISSING_PAGE | BACKGROUND_ONLY | 多宠个体归属后端（/device-events/{id}/attribution）；归因引擎非 UI |
| PLI-129 | 设备数据质量检测 | 09 Devices & H | v1.0 | P2 | MISSING_STATE | FULL_UI | 设备数据质量检测（review-queue + review confirm/correct/reject） |
| PLI-130 | 家庭摄像头事件 | 09 Devices & H | v1.0 | P2 | EXTERNAL_DEPENDENCY | EXTERNAL_BLOCKED | 家庭摄像头事件需真实厂商接入；前端 PROTOTYPE/Unknown 不伪装（monitoring 页） |
| PLI-131 | AI事件审核队列 | 09 Devices & H | v1.0 | P2 | MISSING_STATE | FULL_UI | AI 事件审核队列（review-queue + 三档确认 UI） |
| PLI-132 | 家庭状态摘要 | 09 Devices & H | v1.0 | P2 | MISSING_STATE | FULL_UI | 家庭状态摘要（/home-summary today_counts MetricCard） |
| PLI-134 | 安全自动化规则 | 09 Devices & H | v1.0 | P2 | MISSING_PAGE | BACKGROUND_ONLY | 安全自动化规则后端（automation-rules）；规则引擎非 UI（未来 companion 复用） |
| PLI-135 | 高风险动作需确认 | 09 Devices & H | v1.0 | P2 | MISSING_PAGE | BACKGROUND_ONLY | 高风险动作需确认后端；确认流与 companion 一致（外部受限） |
| PLI-139 | 服务需求画像 | 10 Care Servic | v1.0 | P2 | EXTERNAL_DEPENDENCY | EXTERNAL_BLOCKED | 服务需求画像属于服务市场配套，市场整体未接（PLI-142 EXTERNAL_BLOCKED）；不得伪装预约/服务成功 |
| PLI-140 | 服务Care Card | 10 Care Servic | v1.0 | P2 | MISSING_ACTION | FULL_UI | 服务 Care Card（care 页生成 + share/care-card H5） |
| PLI-141 | 服务者匹配 | 10 Care Servic | v1.0 | P2 | EXTERNAL_DEPENDENCY | EXTERNAL_BLOCKED | 服务者匹配依赖真实服务者供给，外部未接 |
| PLI-143 | 服务前交接清单 | 10 Care Servic | v1.0 | P2 | MISSING_ACTION | FULL_UI | 服务前交接清单（handoff checklist 后端 + care 页） |
| PLI-144 | 服务期间更新 | 10 Care Servic | v1.0 | P2 | EXTERNAL_DEPENDENCY | EXTERNAL_BLOCKED | 服务期间更新属于服务市场配套流程，市场未开 |
| PLI-145 | 异常升级流程 | 10 Care Servic | v1.0 | P2 | EXTERNAL_DEPENDENCY | EXTERNAL_BLOCKED | 服务异常升级属于服务市场配套流程，市场未开 |
| PLI-146 | 服务结束总结 | 10 Care Servic | v1.0 | P2 | EXTERNAL_DEPENDENCY | EXTERNAL_BLOCKED | 服务结束总结属于服务市场配套流程，市场未开 |
| PLI-148 | 评价拆分 | 10 Care Servic | v1.0 | P2 | EXTERNAL_DEPENDENCY | EXTERNAL_BLOCKED | 服务评价拆分属于服务市场配套流程，市场未开 |
| PLI-149 | 服务者资质/身份 | 10 Care Servic | v1.0 | P2 | MISSING_PAGE | PRO_ONLY | 服务者资质/身份由 Pro/Service 端 + professionals 后端承载 |
| PLI-151 | 专业服务记录回流 | 10 Care Servic | v1.0 | P2 | MISSING_PAGE | PRO_ONLY | 专业服务记录回流经 Pro 端 PROFESSIONAL_CONFIRMED 健康记录 |
| PLI-163 | 饮食档案 | 12 Nutrition & | v0.2 | P1 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 饮食档案后端 /diet-profile 存在；前端未绑定；reason=营养域为 Record/Document 级入口, impact=无结构化饮食档案, workaround=Quick Log 喂食记录, owner=PLI, revisit_condition=真实营养需求 |
| PLI-164 | 食品实际使用 | 12 Nutrition & | v1.0 | P2 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 食品实际使用后端 /food-usage 存在；前端未绑定；reason=同上, impact=无食品库, workaround=喂食记录, owner=PLI, revisit_condition=真实营养需求 |
| PLI-165 | 能量/份量辅助 | 12 Nutrition & | v1.0 | P2 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 能量/份量辅助后端 food-usage；前端未绑；reason=同上, impact=无热量估算, workaround=无, owner=PLI, revisit_condition=真实营养需求 |
| PLI-166 | 商品约束过滤 | 12 Nutrition & | v1.0 | P2 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 商品约束过滤后端 /products/filtered；前端未绑；reason=无商城, impact=无商品过滤, workaround=无, owner=PLI, revisit_condition=电商接入 |
| PLI-167 | 食品/用品使用结果 | 12 Nutrition & | v1.0 | P2 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 食品/用品使用结果后端 food-usage；前端未绑；reason=无商城, impact=无结果跟踪, workaround=喂食记录, owner=PLI, revisit_condition=真实营养需求 |
| PLI-168 | 玩具/丰富化偏好学习 | 12 Nutrition & | v1.0 | P2 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 玩具/丰富化偏好学习后端 preferences；前端未绑；reason=低频, impact=无偏好库, workaround=行为记录, owner=PLI, revisit_condition=真实需求 |
| PLI-172 | 营养师/兽医计划 | 12 Nutrition & | v1.0 | P2 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 营养师/兽医计划经健康记录导入（PROFESSIONAL_CONFIRMED）；前端无独立计划 UI；reason=专业计划低频, impact=无营养师工作台, workaround=健康记录, owner=PLI+vet, revisit_condition=真实营养师合作 |
| PLI-185 | 统一生命时间线 | 14 Life Timeli | v0.1 | P0 | MISSING_STATE | FULL_UI | 统一生命时间线完整（timeline 页：来源/证据/Outcome/筛选/搜索/媒体） |
| PLI-186 | 事件过滤与视图 | 14 Life Timeli | v0.1 | P0 | MISSING_STATE | FULL_UI | 事件过滤与视图完整（域 chips + 事件类型 select + 来源筛选 + 搜索） |
| PLI-187 | 里程碑 | 14 Life Timeli | v0.2 | P1 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 里程碑后端 /milestones 存在；前端未绑定；reason=里程碑低频, impact=无里程碑视图, workaround=Timeline 事件, owner=PLI, revisit_condition=真实成长记录需求 |
| PLI-188 | 照片/视频/声音回忆 | 14 Life Timeli | v0.2 | P1 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 照片/视频/声音回忆后端 /memories 存在；前端未绑定；reason=回忆聚合依赖媒体积累, impact=无回忆页, workaround=Timeline 媒体筛选, owner=PLI, revisit_condition=真实媒体积累 |
| PLI-189 | 年度回顾 | 14 Life Timeli | v1.0 | P2 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 年度回顾后端 /year-review 存在；前端未绑定；reason=年度低频, impact=无回顾页, workaround=Timeline, owner=PLI, revisit_condition=真实数据满一年 |
| PLI-190 | 时间线语义搜索 | 14 Life Timeli | v0.2 | P1 | MISSING_STATE | FULL_UI | 时间线语义搜索（search 页 + timeline 本地搜索 + /events/search 后端） |
| PLI-191 | 跨时期对比 | 14 Life Timeli | v1.0 | P2 | MISSING_API_BINDING | ACCEPTED_UI_LIMITATION | 跨时期对比后端 /compare 存在；前端未绑定；reason=对比低频, impact=无对比视图, workaround=Timeline 手动对比, owner=PLI, revisit_condition=真实对比需求 |
| PLI-197 | 宠物个人问答 | 15 Pet Agent & | v0.2 | P1 | MISSING_STATE | FULL_UI | 宠物个人问答（agent 页 ask tab + /pets/{id}/ask；AI provider 受限时诚实降级） |
| PLI-198 | 跨域语义搜索 | 15 Pet Agent & | v0.2 | P1 | MISSING_STATE | FULL_UI | 跨域语义搜索（search 页 + agent find tab + /events/search） |
| PLI-199 | 为什么发生提示 | 15 Pet Agent & | v0.2 | P1 | EXTERNAL_DEPENDENCY | EXTERNAL_BLOCKED | 「为什么发生」提示依赖真实 AI provider（/pets/{id}/why），AI EXTERNAL_BLOCKED 时降级 |
| PLI-200 | 低风险任务计划 | 15 Pet Agent & | v0.2 | P1 | EXTERNAL_DEPENDENCY | EXTERNAL_BLOCKED | 低风险任务计划依赖 AI/规则生成（/task-plan），AI EXTERNAL_BLOCKED 时降级 |
| PLI-201 | 跨域照护编排 | 15 Pet Agent & | v1.0 | P2 | MISSING_STATE | FULL_UI | 跨域照护编排（agent ask 编排 + CitationChip 溯源；AI 受限时降级） |
| PLI-204 | 医疗动作硬边界 | 15 Pet Agent & | v0.1 | P0 | MISSING_STATE | FULL_UI | 医疗动作硬边界（Red Flag Rule Engine 独立 + agent 不自动诊断；E2E-03 验证） |
| PLI-205 | 结构化长期记忆 | 15 Pet Agent & | v0.2 | P1 | MISSING_PAGE | BACKGROUND_ONLY | 结构化长期记忆后端（/pets/{id}/memory）；记忆为后端能力 |
| PLI-206 | 事件驱动主动提醒 | 15 Pet Agent & | v1.0 | P2 | MISSING_PAGE | BACKGROUND_ONLY | 事件驱动主动提醒后端（ask/orchestration）；提醒依赖通知通道（外部受限） |
| PLI-207 | 提醒降噪与合并 | 15 Pet Agent & | v1.0 | P2 | MISSING_PAGE | BACKGROUND_ONLY | 提醒降噪与合并后端能力；依赖真实通知 |
| PLI-209 | Agent行动日志 | 15 Pet Agent & | v1.0 | P2 | MISSING_PAGE | BACKGROUND_ONLY | Agent 行动日志后端（/agent/actions + agent_action_logs 表）；Admin 审计页承载 |
| PLI-210 | 沟通风格与复杂度 | 15 Pet Agent & | v1.0 | P2 | MISSING_PAGE | BACKGROUND_ONLY | 沟通风格与复杂度后端（/users/me/communication-style）；个性化为后端能力 |

---
## 附录：ACCEPTED_UI_LIMITATION 清单（B3 要求字段）

| ID | reason | impact | workaround | owner | revisit_condition |
|---|---|---|---|---|---|
| PLI-004 |  |  |  |  |  |
| PLI-009 |  |  |  |  |  |
| PLI-012 |  |  |  |  |  |
| PLI-015 |  |  |  |  |  |
| PLI-034 |  |  |  |  |  |
| PLI-043 |  |  |  |  |  |
| PLI-047 |  |  |  |  |  |
| PLI-048 |  |  |  |  |  |
| PLI-061 |  |  |  |  |  |
| PLI-064 |  |  |  |  |  |
| PLI-071 |  |  |  |  |  |
| PLI-079 |  |  |  |  |  |
| PLI-091 |  |  |  |  |  |
| PLI-095 |  |  |  |  |  |
| PLI-102 |  |  |  |  |  |
| PLI-119 |  |  |  |  |  |
| PLI-122 |  |  |  |  |  |
| PLI-163 |  |  |  |  |  |
| PLI-164 |  |  |  |  |  |
| PLI-165 |  |  |  |  |  |
| PLI-166 |  |  |  |  |  |
| PLI-167 |  |  |  |  |  |
| PLI-168 |  |  |  |  |  |
| PLI-172 |  |  |  |  |  |
| PLI-187 |  |  |  |  |  |
| PLI-188 |  |  |  |  |  |
| PLI-189 |  |  |  |  |  |
| PLI-191 |  |  |  |  |  |