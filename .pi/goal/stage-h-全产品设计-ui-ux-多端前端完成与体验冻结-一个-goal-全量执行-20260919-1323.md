## Goal

在 `E:\AI\Pet Life Intelligence`（当前 `WAVE_0_READY + AWAITING_REAL_PARTICIPANTS`，git 干净）执行 Stage H 全量任务：完成全产品设计、信息架构收口、Design System v1、五端前端（Web / Mini / Mobile / Admin / 新建 Pro）完整产品化重构、Monitoring 与 Companion 全量设计与前端原型、统一状态/文案/无障碍/响应式，输出全部 Stage H 文档与审计报告，通过全量质量门槛，达到 `PRODUCT_DESIGN_FREEZE + UI_UX_FREEZE + MULTI_CLIENT_EXPERIENCE_FREEZE`，并以 `WAVE_0_REENTRY_READY` 停止，不自行进入下一阶段。

设计基线（L3）：`Pet_Life_Intelligence_v3.1-R1_产品技术运营与Companion统一全量母版_2026-09-18.md`（已在项目根目录）；L2：`docs/reference/Pet_Life_Intelligence_v2.0_Feature_Inventory_228.xlsx`；权威顺序：真实代码/测试 > 母版 > Inventory > 辅助文档。**不重新设计产品方向**（仍是 Pet Life Intelligence，围绕 Pet Timeline / Personal Baseline / Outcome / Provenance）。

## Acceptance criteria（全部可客观验证）

### A. 设计与产品文档（文件存在 + 必需内容可 Grep 验证）
1. `docs/product/`：`FEATURE_EXPERIENCE_MATRIX.md`（覆盖 PLI-001~PLI-228，每行含 Feature ID/Domain/Backend Status/各 Client 列/Entry Point/Page/Component/Risk/Stage，状态只取 FULL_UI/PARTIAL_UI/BACKGROUND_ONLY/ADMIN_ONLY/PRO_ONLY/EXTERNAL_BLOCKED/FUTURE/NOT_APPLICABLE）、`MASTER_PAGE_INVENTORY.md`（每页含 Page ID/Name/Role/Client/Feature IDs/JTBD/Entry/CTA/API/Event/Risk/Permission/States/Responsive Rule；Page ID 按 OWN-xxx/ADM-xxx/PRO-xxx 规范）、`INFORMATION_ARCHITECTURE.md`、`NAVIGATION_MODEL.md`。
2. `docs/ui/`：`PLI_DESIGN_SYSTEM_V1.md`（tokens 含 Color/Typography/Spacing/Radius/Elevation/Border/Motion/Icon/Grid/Breakpoint/Z-index；语义色含 Normal/Info/Notice/Monitor/Vet Soon/Urgent/Emergency/Success/Error/Disabled）、`COMPONENT_INVENTORY.md`（清单内含 PetAvatar/PetSwitcher/QuickLogSheet/EventCard/TimelineItem/MetricCard/TrendCard/RiskBanner/EvidenceCard/VetBriefSection/CareTask/PersonChip/DeviceStatus/InteractionCard/CompanionControl/AIAnswer/CitationChip/ConsentPanel/EmptyState/ErrorState/Skeleton/Toast/Modal/Sheet，每项含 Props/Variants/States/Responsive/Accessibility）、`MULTI_CLIENT_EXPERIENCE_MATRIX.md`、`COPY_GUIDELINES.md`、`RESPONSIVE_GUIDELINES.md`、`ACCESSIBILITY_GUIDELINES.md`、`COMPANION_UX.md`、`MONITORING_UX.md`。
3. `reports/`：`STAGE_H_DESIGN_PREFLIGHT.md`（回答 §7 十问）、`STAGE_H_FEATURE_UI_AUDIT.md`、`STAGE_H_UX_ACCEPTANCE_MATRIX.md`（每页含 Web/Mini/Mobile/Admin/Professional/Responsive/Accessibility/States/E2E/Status，Status 只取 PASS/PASS_WITH_LIMITATION/EXTERNAL_BLOCKED/PROTOTYPE/NOT_APPLICABLE）、`STAGE_H_ACCESSIBILITY_AUDIT.md`、`STAGE_H_RESPONSIVE_AUDIT.md`（含 360/390/768/1024/1440 验证记录）、`STAGE_H_MULTI_CLIENT_AUDIT.md`、`STAGE_H_FINAL_REPORT.md`（含 §116 全量状态块：各端 COMPLETE/PARTIAL、Responsive/Accessibility/E2E PASS/FAIL、Pages/Components/Routes/States/Breakpoints/Client coverage/Known limitations/External blockers 数据）。
4. 母版与 Feature 数据不得被删除或改写；仅新增 Stage H 文档。

### B. 设计系统代码
5. `packages/ui-tokens` 扩展为完整 token 集（上述 11 类，含语义色）；新建 `packages/ui-kit` 承载组件实现；web 端实际引用 token 与 ui-kit 组件（Grep 验证 import 存在）。
6. `docs/ui/COMPONENT_INVENTORY.md` 列出的组件在 Web 端有对应实现并被核心页面使用（Grep 验证）。

### C. 五端前端产品化
7. **Web（Owner）**：Today 成为首页（含 Pet Switcher/Current State/Attention/Quick Log/Tasks/Recent Events/AI Summary/Timeline Preview，不是 dashboard）；Quick Log 快捷记录（Feeding/Water/Elimination/Walk/Play/Sleep/Weight/Medication/Behavior/Health/Note，≤10 秒路径）；Timeline 完整重构（Filter/Search/Domain/Actor/Source/Media/Outcome，TimelineItem 统一组件，AI 内容与真实记录视觉区分）；Pet Profile（Identity/Health/Behavior/Care Network/Baseline/Devices/Relationships/Consent/Data）；Health 全流程 UI（发现异常→Intake→Evidence→动态追问→Observable Facts→Red Flag→Triage→Next Action→Vet Brief→Vet Outcome→Recovery，RiskBanner/RedFlagReason/NextActionCard/EmergencyAction/EvidenceList 独立组件，医疗安全信息不埋入聊天文本）；Vet Brief 专业布局（含 Chief Complaint/Onset/Trend/Evidence/Medication/History/Risk/Provenance）；Medication 状态区分（Plan/Scheduled/Given/Skipped/Missed/Duplicate Risk/Completed）；Behavior（中文引导 发生前→做了什么→之后发生了什么，Pro 端显 ABC）；Training（Goal/Plan/Session/Progress/Context/Reward/Outcome）；Welfare（Evidence/Trend/Uncertainty，禁止 AI 情绪百分比）；Social（Relationship Graph/Interaction History/Safety/Feedback/Baseline，非传统 Feed）；Monitoring 完整 UI；Companion 前端原型（feature-flagged）；Agent（Ask/Brief/Find/Plan/Explain，AI Answer 含 Facts/Inference/Sources/Uncertainty/Action + 点击跳转 Timeline Event）；Notifications（Tasks/Care/Health/Medication/Monitoring/System 分类 + bundling/priority）；Settings/Me（Household/Notifications/Privacy/Data/Settings）。
8. **PWA**：保持 basePath/manifest/service worker 行为（Stage F 修复不回退），installable + offline shell + responsive。
9. **Mini（Taro）**：按设计系统对齐；重点是 Today/Quick Log/Timeline/Health/Care/Companion/Me；使用 Bottom Tab/Sheet/Fast Input；信息密度低于 Desktop；`pnpm --dir apps/mini typecheck` 与 `build`（weapp）通过。
10. **Mobile（Expo）**：实现 Today/Quick Log/Monitoring/Companion/Notifications/Camera/Health/Timeline 屏幕；`pnpm --dir apps/mobile typecheck` 通过。
11. **Admin**：收口为 Overview/Pilot/Users/Pets/Safety/AI/Devices/Integrations/Audit/Incidents/Feature Flags IA，不混 Owner 页面；`pnpm --dir apps/admin typecheck` 与 `build` 通过。
12. **Pro（新建 `apps/pro` 独立客户端）**：Vet（Assigned Pets/Vet Brief/Evidence/Timeline/Outcome）、Trainer（Behavior/Training/Plan/Progress）、Service（Care Card/Tasks/Medication/Updates/Incident）；typecheck 与 build 通过。
13. **H5 Share**：Vet Brief / Care Card / Professional Share 保持 mobile-first、revocable、expiry visible、no app required。

### D. 统一体验
14. 禁止文案不得出现在 UI copy 中（Grep apps/ 排除 node_modules：AI 确诊、宠物很伤心、宠物想你了、98% 开心、100% 安全 等 §75 禁用项）；Companion 文案不得宣称"宠物理解/给主人打电话"（如使用"豆豆触发了互动按钮"式表达）。
15. 统一状态模型落地：核心页面覆盖 Loading/Skeleton/Empty/Partial/Populated/Error/Offline/Permission Denied/Not Found/Feature Disabled/External Blocked/Safety Blocked/Success；错误 UX 不得向用户暴露 `EXTERNAL_BLOCKED`/`Schema validation failed`/`500 Internal Server Error`/`payload invalid`（映射为人类语言）。
16. Offline UX：Quick Log / Behavior / Health Intake / Care Note 支持草稿与 未同步/同步中/已同步/同步失败 状态展示（Web 端至少）。
17. 文案不散落 hard-code：统一 i18n 结构至少 zh-CN，en-US 结构预留。
18. 前端契约：不私自造 DTO/event payload，继续使用 `packages/domain-schema` 与 `packages/api-client`；所有事件带 pet_id/actor/time/source；AI 输出带 model/prompt/schema version。

### E. 质量门槛（命令全部通过）
19. `pytest` 全绿（≥ 现有 273，不回归）；`ruff check` 0 error；web/admin typecheck 0；web build、admin build、mini build（weapp）、mobile typecheck、pro build 全部成功。
20. 本地 Playwright 全绿且不低于 12/12，现有三个 spec（pwa-share/real-auth/seven-paths）不回归；按 §88 增加必要关键 UX E2E（如 Today/Quick Log/Timeline 关键路径）。
21. 不破坏 Pilot 数据治理：`is_demo`/`is_internal`/synthetic filtering/`pilot_org` 保持；mock/prototype/screenshot 数据不污染 `/pilot/status`；Stage H 结束恢复开始前 PILOT 配置；REAL PARTICIPANTS / REAL PETS / ACTIVATED OWNERS 保持真实值 0（可查 `/pilot/status` 或等价证据）；不得伪造指标。
22. 前端测试覆盖 component/critical route/navigation/state rendering/permission（新增测试文件存在且运行通过）。

### F. 收口与停止
23. `WORK_STATUS.md` 与 `CHANGELOG.md` 更新为 Stage H 完成（含最终状态块与证据）；按 §110 规范提交（docs(product)/feat(ui)/refactor(web)/feat(monitoring)/feat(companion)/feat(mini)/feat(mobile)/refactor(admin)/refactor(pro)/test(ui)/docs(design)），commit 带 `[PLI-STAGEH]` 或相应 PLI-xxx 关联。
24. Companion 状态只报告 `COMPANION_DESIGN_COMPLETE + COMPANION_FRONTEND_PROTOTYPE_COMPLETE + HARDWARE_INTEGRATION_NOT_ACTIVATED`，绝不写 `COMPANION_LIVE`；Monitoring 报告 `MONITORING_UI_COMPLETE`（设备 provider 仍 EXTERNAL_BLOCKED 时也完成 connected/offline/empty/candidate event/review/summary 状态 UI）。
25. `STAGE_H_FINAL_REPORT.md` 以 `STAGE_H_COMPLETE` 状态块结尾，且报告明确「达到 PRODUCT_DESIGN_FREEZE / UI_UX_FREEZE / MULTI_CLIENT_EXPERIENCE_FREEZE；下一步为 Stage G-W0A First Real Participants」；完成后 STOP，不自行进入 Stage I / v1.3 / Future Feature Development。

## Boundaries

- **不重新设计产品方向**：不做 AI 宠物医生、宠物商城、宠物朋友圈、IoT 控制台、医院 HIS、宠物地图、宠物避雷平台。
- **不新增未验证的领域功能**：Future 42、Digital Twin、Multi-omics、Complex Multi-Agent、全国 Marketplace、大型公开 Feed、宠物地图、宠物避雷、自研硬件、自营保险、新支付系统一律冻结；Companion 是唯一例外（允许设计+UI+前端原型），但无真实设备/协议时不得伪装真实硬件能力（显示 Demo/Prototype/Unavailable，不假装执行成功）。
- **Companion 原则冻结**：Zero-cognition First / Observation First / Welfare First / Privacy First / Human-in-Control；Interaction Welfare Guard（rest/cooldown/treat limit/session duration/non-response/avoidance/noise/night quiet/device safety）须设计；RemoteInteractionSession 若后端 canonical schema 未批准只能作为 DESIGN CANDIDATE，不擅自迁移正式 schema。
- **医疗安全**：不诊断、不改药、不自动停止药物；LLM 不得单独决定 emergency（Red Flag Rule Engine 独立）；不把未发现红旗写成"没有疾病"；不把图片结果写成确定诊断；Vet Brief 是信息整理不是兽医诊断；禁止文案（§75）不得使用。
- **不部署公网 staging**：只保证本地构建/测试通过，不破坏 staging 现状；不创建真实 Participant；不触碰生产支付/外部真实服务下单。
- **数据治理**：mock/sandbox/prototype 必须明确标注 DEMO/SANDBOX/PROTOTYPE，不进入真实 Pilot 数据；不删除现有数据/文档；canonical event schema 集中管理。
- **工程规范**：TS strict（禁止无解释 any）；timezone-aware datetime；金额/剂量/单位显式类型；外部调用 timeout/retry/idempotency；日志不写完整敏感病历；feature flag 控制未成熟能力（Companion）。
- **范围外即停**：达到 Freeze 状态后停止，不自行进入下一阶段，等待用户指令进入 Wave 0-A。

## 执行顺序（内部方法，不作为交付验收）

Reality Audit（已部分完成）→ FEATURE_EXPERIENCE_MATRIX → MASTER_PAGE_INVENTORY → IA/导航冻结 → Design System v1 + ui-tokens/ui-kit → Owner Web 重构（Today/Quick Log/Timeline → Health/Vet Brief/Medication → Care/Behavior/Training/Welfare → Social → Monitoring → Companion 原型 → Agent → Notifications/Settings）→ Mini 对齐 → Mobile 对齐 → Admin 收口 → Pro 新建 → Responsive/Accessibility/Copy → UI Polish Pass → UX Acceptance Matrix → 228 前端覆盖复审计 → 全量回归 → STAGE_H_FINAL_REPORT → 更新 WORK_STATUS/CHANGELOG → 提交 → Freeze 状态块 → STOP。