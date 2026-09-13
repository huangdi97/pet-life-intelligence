# PARTIAL TRIAGE — Stage D Phase 1

- 依据：FULL_PRODUCT_AUDIT.md + 实际代码逐项核对。
- 计数修正：上轮审计 Stage C 漏计 PLI-081（咨询包已实现并有测试），应计入 DONE。
  修正后：Stage C = DONE 63 / PARTIAL 23 / BLOCKED_EXTERNAL 2 = 88；
  全库 PARTIAL = **28**（A4 + B1 + C23）。
- 分类：GA_BLOCKER / ACCEPTED_LIMITATION / UX_POLISH / FUTURE / EXTERNAL_BLOCKED

| ID | 原状态 | 新分类 | 证据 | GA blocker? | 处理动作 | 最终状态 |
|---|---|---|---|---|---|---|
| PLI-003 | PARTIAL | UX_POLISH | artifact 上传+avatar_artifact_id 后端完成；专用 UI 缺 | 否 | v1.0.1 UI | PARTIAL→UX_POLISH |
| PLI-025 | PARTIAL | UX_POLISH | daily.weight 入事件图；无趋势图 | 否 | v1.0.1 图表 | UX_POLISH |
| PLI-056 | PARTIAL | ACCEPTED_LIMITATION | 分享链接+撤销+审计完成；PDF 未做 | 否 | release notes 注明 | ACCEPTED_LIMITATION |
| PLI-217 | PARTIAL | ACCEPTED_LIMITATION | dev 认证为 v1.0 设计模式（SECURITY.md）；密码/OIDC v0.2+ | 否 | release notes + SECURITY.md | ACCEPTED_LIMITATION |
| PLI-005 | PARTIAL | UX_POLISH | QR 目标/NFC payload 端点完成；前端渲染缺 | 否 | v1.0.1 | UX_POLISH |
| PLI-006 | PARTIAL | ACCEPTED_LIMITATION | 合并请求登记+审计；执行按设计需人工（AGENTS §5） | 否 | 文档已述 | ACCEPTED_LIMITATION |
| PLI-009 | PARTIAL | ACCEPTED_LIMITATION | 转移请求登记；执行人工确认（PLI-204 边界） | 否 | 文档已述 | ACCEPTED_LIMITATION |
| **PLI-012** | PARTIAL | **GA_BLOCKER** | field-privacy 此前仅为审计记录，序列化未真实掩码 | **是** | **本阶段实现真实掩码+测试** | → DONE |
| **PLI-045** | PARTIAL | **GA_BLOCKER** | 医疗记录导入无签名状态标记（provenance 完整性） | **是** | **导入标记 UNSIGNED/ SIGNED+测试** | → DONE |
| PLI-094 | PARTIAL | UX_POLISH | 专业链接存在；目标共享 UI 缺 | 否 | v1.0.1 | UX_POLISH |
| PLI-095 | PARTIAL | UX_POLISH | 视频工件绑定完成；复盘 UI 缺 | 否 | v1.0.1 | UX_POLISH |
| PLI-099 | PARTIAL | UX_POLISH | 五域档案表存在；端点缺 | 否 | **本阶段补端点（低成本）** | → DONE |
| PLI-103 | PARTIAL | UX_POLISH | ENVIRONMENT_LOAD kind 可记录；无分析视图 | 否 | v1.0.1 | UX_POLISH |
| PLI-104 | PARTIAL | UX_POLISH | STRESS_RECOVERY kind 可记录；无分析视图 | 否 | v1.0.1 | UX_POLISH |
| PLI-106 | PARTIAL | UX_POLISH | QOL_QUESTIONNAIRE kind 可记录；无问卷 UI/计分 | 否 | v1.0.1 | UX_POLISH |
| PLI-128 | PARTIAL | UX_POLISH | attribution 字段存在；手动归因端点缺 | 否 | **本阶段补端点** | → DONE |
| PLI-130 | PARTIAL | EXTERNAL_BLOCKED | 真实摄像头需要厂商接入 | 是(外部) | adapter+沙箱维持 | EXTERNAL_BLOCKED |
| PLI-131 | PARTIAL | UX_POLISH | 审核队列只读；复核写回缺 | 否 | **本阶段补端点** | → DONE |
| PLI-140 | PARTIAL | UX_POLISH | care_card_id 字段存在；发卡联动缺 | 否 | v1.0.1 | UX_POLISH |
| PLI-143 | PARTIAL | UX_POLISH | 服务前清单未接 handoff checklist 模式 | 否 | **本阶段补端点** | → DONE |
| PLI-145 | PARTIAL | ACCEPTED_LIMITATION | 逾期升级走通知；专门 SLA 流程缺 | 否 | v1.0.1 | ACCEPTED_LIMITATION |
| PLI-146 | PARTIAL | UX_POLISH | 总结字段存在；生成端点缺 | 否 | **本阶段补端点** | → DONE |
| PLI-151 | PARTIAL | ACCEPTED_LIMITATION | 回流经 PROFESSIONAL_CONFIRMED 健康记录（已可用） | 否 | 文档已述 | ACCEPTED_LIMITATION |
| PLI-168 | PARTIAL | ACCEPTED_LIMITATION | 偏好学习为手动记录（无自动学习） | 否 | 文档已述 | ACCEPTED_LIMITATION |
| PLI-172 | PARTIAL | ACCEPTED_LIMITATION | 营养师计划经健康记录导入（PROFESSIONAL_CONFIRMED） | 否 | 文档已述 | ACCEPTED_LIMITATION |
| PLI-180 | PARTIAL | ACCEPTED_LIMITATION | 理赔材料列表字段；编译器未做 | 否 | v1.0.1 | ACCEPTED_LIMITATION |
| PLI-181 | PARTIAL | ACCEPTED_LIMITATION | 理赔状态在列表内；状态机未做 | 否 | v1.0.1 | ACCEPTED_LIMITATION |
| PLI-220 | PARTIAL | ACCEPTED_LIMITATION | Care Card 自包含 JSON（可打印）；离线 PWA 未做 | 否 | release notes 注明 | ACCEPTED_LIMITATION |

## 结论

- **GA_BLOCKER：2 项（PLI-012、PLI-045）—— 本阶段必须修复**
- 本阶段低成本升级 DONE：PLI-099、128、131、143、146（5 项）
- ACCEPTED_LIMITATION：11 项（随 release notes 发布）
- UX_POLISH：10 项（推迟 v1.0.1）
- EXTERNAL_BLOCKED：1 项（PLI-130；另有 PLI-141/165 已在该分类）
- FUTURE：0 项（P2 范围内无推迟到 v1.1 的新功能；不为实现清零而做 Future）
