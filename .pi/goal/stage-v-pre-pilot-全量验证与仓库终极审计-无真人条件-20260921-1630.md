## Goal

在 `E:\AI\Pet Life Intelligence`（当前 `HEAD=fa24cb3`、branch=main、worktree=CLEAN、无 remote）执行 Stage V：在 **REAL_PARTICIPANTS=0 / REAL_PETS=0** 条件下完成 Repository Reality Snapshot → Canonical→Code Traceability → Synthetic Pet Cohort + Scenario Replay → Adversarial / Property / Time-Travel 测试 → AI Goldset → UI State Space + Visual Regression → 3D Viewer Runtime 独立验证 → 架构/代码质量/注释/死代码/数据库/API/安全/依赖/性能/文档漂移/多端/无障碍/文案全量审计，输出目标文档 §68 规定的全部 24 个报告与 Issue Ledger，P0/P1 本轮修复，最终从干净环境重跑全量回归并记录真实证据，达到 `PRE_PILOT_TECHNICAL_AUDIT_PASS`（如不满足则诚实输出不通过清单），以 `WAVE_0_REENTRY_READY` 停止，不进入 Stage I / v1.3 / Future 42。

Canonical 权威顺序（L0 runtime > L1 code/tests > L2 > L3 > L4 旧稿）：
- **L3**：仓库根目录 `Pet_Life_Intelligence_v3.1-R1_产品技术运营与Companion统一全量母版_2026-09-18.md`（Goal 文档引用的 v3.3-R1 2026-09-20 不存在，按 WORK_STATUS 既有记录「以 repo 实际为准」并在报告中记录该差异）
- **L2**：`docs/reference/Pet_Life_Intelligence_v2.0_Feature_Inventory_228.xlsx`
- 冲突必须记录，禁止静默让文档覆盖代码事实。

## Acceptance criteria（全部可客观验证）

### A. 24 个 Stage V 报告文件全部存在且含必需内容
1. `reports/STAGE_V_REPOSITORY_BASELINE.md`：含 Git（branch/HEAD/status/remote/recent commits/changed files）、Runtime、Clients、Backend、Database、AI、3D、Tests、Docs、Known blockers 各节；不修改未提交工作。
2. `reports/DESIGN_TO_CODE_TRACEABILITY_MATRIX.md`：覆盖 v3.1-R1 设计要求 + PLI-001..228（L2）；每行含 Requirement ID / Canonical Section / Requirement / Expected Module / Expected Client / Code Evidence / Test Evidence / Runtime Evidence / Status / Mismatch / Action；Status 只取 IMPLEMENTED / BACKGROUND_IMPLEMENTED / EXTERNAL_BLOCKED / NOT_APPLICABLE / ACCEPTED_LIMITATION / MISSING / DOC_DRIFT；最终 `MISSING=0` 且 `DOC_DRIFT=0`（或全部剩余项有明确 EXTERNAL_BLOCKED / ACCEPTED_LIMITATION 理由）；DOC_ONLY_GHOST / CODE_ONLY_GHOST 全部解决或解释。
3. `reports/SYNTHETIC_COHORT_SPEC.md`：固定可复现 cohort（30–50 pets / 10–15 households，禁止随机 seed 每次变化），覆盖 SYN-01..SYN-20 全部场景；所有 synthetic 数据带 `is_demo` / `is_internal` / `synthetic_domain` / `source=SYNTHETIC`；新增回归测试 `SYNTHETIC_NEVER_COUNTS_AS_REAL` 通过（pytest + Grep 双重验证隔离：不得进入真实 Pilot 指标 / Retention / Outcome / Vet Usefulness / Commercial Metrics）。
4. `reports/SCENARIO_REPLAY_REPORT.md`：REPLAY-01..12 场景（Daily Life 30d / Care Collaboration / Duplicate Feeding / Medication Safety / Health Closure / Behavior→Training / Handoff / Device Disconnect-Reconnect / Companion Session / Consent Withdrawal / Pet Switch / 3D Model Version Evolution）落地 `tests/scenarios/`（或既有 repo 结构）并可 replay，全部 PASS。
5. `reports/ADVERSARIAL_TEST_REPORT.md`：§14 输入对抗（重复事件/乱序/未来时间/旧时间补录/跨时区/非法单位/负数/NaN/Infinity/超大数/空串/超长串/Unicode/Emoji/malformed JSON/断媒体/大媒体/超时/断网/半传/重复提交/race）+ §15 权限对抗（猜 pet_id/跨 household/过期 grant/撤销 grant/删除 user/删除 pet/专业到期/sitter 到期/artifact URL 复用/share 过期/role escalation/admin boundary → `0 unintended access`）+ §16 医疗安全对抗（LLM 不得降级 red flag、不得自动改药/改剂量、不得把 inference 写成 fact、Owner 要求降风险时 Deterministic Safety > LLM）全部 PASS。
6. `reports/PROPERTY_TEST_REPORT.md`：§18 关键 invariants（Event 属于合法 Pet / 合法 occurred_at / ClinicalFact 有 provenance / Inference 不覆盖 Fact / Outcome 关联目标事件 / 撤销 Grant 后访问失败 / 跨 Household 不得访问 / 同 idempotency key 不重复写 / Medication 不允许重复确认 / Synthetic 不进 real metrics / Red Flag 不被 AI 降级 / 删除 Pet 后 artifact 不可访问 / Pet Switch 后用新 pet_id / Timeline 与 Event Source 一致 / Baseline 只来自允许数据源 / Generated 3D 永不成为 ClinicalFact）以 property 或等价测试覆盖并通过（Hypothesis 仅在生态合适时引入，不强行加重依赖）。
7. `reports/TIME_TRAVEL_TEST_REPORT.md`：可控 Clock（不依赖 wall-clock）模拟 1d / 7d / 30d / 6mo / 1y / 3y，覆盖 §19 列表（Recurring Tasks / Medication / Grant Expiration / Notifications / Baseline Windows / Long-term Timeline / Lifecycle / Archive / Consent Expiry / Model Version / Device Staleness / Companion Session Expiry）全部通过。
8. `reports/AI_GOLDSET_REPORT.md`：`evals/PLI_AI_GOLDSET_V1` 建立（已有则扩展，不另起体系），覆盖 §20 类别（structuring/summarization/grounding/timeline QA/baseline explanation/health safety/behavior/training/refusal/uncertainty/provenance/hallucination/prompt injection）；§21 必测错误（禁止「豆豆可能患有肾病」式诊断/读心/无依据因果/虚假来源/虚假数字/虚假历史）；§22 输出结构 Fact/Inference/Uncertainty/Evidence/Action 可追踪 input refs + prompt/model version + rule version。
9. `reports/VISUAL_REGRESSION_REPORT.md`：核心页面状态空间（Loading/Empty/Normal/Dense/Error/Offline/Permission Denied/Feature Disabled/External Blocked/Safety Blocked/Stale Data/Partial Data）+ 截图基线 360/390/768/1024/1440，覆盖 §24 页面清单（Today/Timeline/Pet/Health/Behavior/Training/Assistant/Me/Companion/3D Life View/Capture Wizard/3D Verification）。
10. `reports/3D_VIEWER_RUNTIME_REPORT.md`：使用合法公开许可 TEST_3D_ASSET（.glb/.gltf，禁止标成真实宠物资产）真实运行验证 §27 列表（load/rotate/zoom/camera/lighting/texture/LOD/fallback/404/corrupt asset/slow network/huge texture/WebGL unavailable/context loss/memory/FPS/resize/orientation）；状态只标 `3D_VIEWER_RUNTIME_READY`，绝不标 `REAL_PET_3D_VALIDATED`；`REAL_PET_3D_IDENTITY = NOT_YET_OBSERVED`。
11. `reports/ARCHITECTURE_AUDIT.md`：依赖方向（UI→API→Domain，防 frontend direct DB assumptions / domain 导入 app / circular dependency / client-specific schema duplication）、Domain Boundary（pets/events/timeline/health/behavior/training/care/permissions/AI/3D-PLM/Companion 职责清晰，防 God Service/Hook/Component/API module）、Event Schema 集中遵循 domain-schema（前端不得私自发明 event payload）。
12. `reports/CODE_QUALITY_AUDIT.md`：TODO/FIXME/HACK/XXX/TEMP/MOCK/PLACEHOLDER/NOT_IMPLEMENTED 逐一分类（REMOVE/IMPLEMENT/DOCUMENT/EXTERNAL_BLOCKED/LEGITIMATE_TEST_FIXTURE）；top-20 大文件/大函数检查 single responsibility/testability/duplication（非机械拆文件）；Type Escape（any/unknown as/@ts-ignore/@ts-expect-error/eslint-disable/noqa/type:ignore/cast）逐一判断 `unjustified critical = 0`；Exception 审计（except Exception/catch {}/silent catch/return null on error/console.error only）在 permissions/health/storage/AI/3D jobs 无 silent failure；Magic Value 合理抽取。
13. `reports/COMMENT_AND_DOCUMENTATION_AUDIT.md`：§40 要求的 High-value comments（医疗安全 invariants/权限决策/idempotency/并发/复杂 migration/provider quirks/privacy boundary/synthetic exclusion/非显然算法/baseline 计算/3D provenance）存在；删除垃圾注释与过期注释；Public API 文档含 purpose/input/output/invariants/errors；Safety Comment 能回答 Why / What invariant / What must never change。
14. `reports/DEAD_CODE_AND_GHOST_FEATURE_AUDIT.md`：unused route/page/component/API/flag/env var/DB column/orphan table/orphan migration/unused fixture/unused CSS/unused translation key/unused adapter + DOC_ONLY_GHOST / CODE_ONLY_GHOST + legacy/compat/deprecated（v0.x/old route/old endpoint/old component）全部解决或解释。
15. `reports/DATABASE_API_AUDIT.md`：migrations 可重放/有序/无隐式生产手工步骤/有 rollback 或 forward-fix；FK/index/unique/nullability/enum/timezone/soft delete/cascade 检查（重点 pets/events/permissions/artifacts/health/visual models/pilot flags）；OpenAPI↔实际 routes↔client↔docs↔tests 核对：undocumented endpoint / unused endpoint / inconsistent status code / missing auth / missing permission / inconsistent error schema 全部 0 或已修。
16. `reports/SECURITY_AUDIT.md`：Auth/JWT/session/refresh/rate limit/IDOR/CSRF（适用时）/CORS/upload/signed URL/injection/RAG leakage/logs/PII/secrets 全覆盖；Secrets Audit 只报告 location/type/severity，**绝不输出 secret 内容**；无 committed secret / 硬编码 key/password/token。
17. `reports/DEPENDENCY_AUDIT.md`：Python/Node/Docker 的 outdated/known vulnerability/unused/duplicate version/lockfile consistency/license，分类 MUST_FIX/SHOULD_FIX/ACCEPT/DEFER，不盲目升级。
18. `reports/PERFORMANCE_AUDIT.md`：API latency / Timeline pagination / Event write / Bulk event ingestion / Media / Baseline query / Synthetic dashboard；Synthetic Load 50/200/1000 pets（不要求 production benchmark），重点发现 N+1 / pagination bug / memory growth / slow query / missing index。
19. `reports/DOCUMENTATION_DRIFT_AUDIT.md`：§56 十项逐项对比（Feature Matrix↔code / Page Inventory↔routes / IA↔navigation / API docs↔routes-OpenAPI / Event docs↔schemas / DB docs↔migrations / Env docs↔env access / Design System↔components / Tests report↔actual tests / External blocker list↔actual state）；只允许根据代码事实修正文档，禁止为文档好看虚构代码。
20. `reports/TEST_QUALITY_AUDIT.md`：只测 happy path / assert 太弱 / snapshot 滥用 / fixture 太理想 / mock 掉关键逻辑 / flaky / 互相污染 / 依赖执行顺序 检查；Mutation-thinking 人工 review（把 permission/red flag/synthetic filter/idempotency/medication/pet switch 关键条件反置时测试是否会失败）。
21. `reports/MULTI_CLIENT_PARITY_AUDIT.md`：对每个 Feature 判断 Should Web/Mini/Mobile/Pro/Admin 职责一致性，某端遗漏不被误判为设计差异。
22. `reports/ACCESSIBILITY_FINAL_AUDIT.md`：keyboard/focus/ARIA/contrast/screen reader/large text/touch target/reduced motion；重点验证 3D 页面「3D information has textual equivalent」。
23. UX Copy 审计（并入最终报告）：§64 禁止文案（豆豆想你了/豆豆很开心/情绪评分/AI诊断/数字孪生/器官状态/未来发病概率）在 apps/（排除 node_modules）Grep 命中 0；§65 Provenance 文案能区分 主人记录/设备/专业人士/AI整理/AI推断/生成式3D/实时/录制。
24. `reports/STAGE_V_ISSUE_LEDGER.md`：每行含 ID/Category/Severity(P0/P1/P2/P3/INFO)/Evidence/File/Status/Fix/Test/Remaining Risk；P0/P1 剩余 0；P2 若涉及安全/数据完整性/权限/核心 UX/测试可靠性必须修复，其余记录收口；P3 低风险简单修改顺手修，否则记录。

### B. 全量回归（从干净环境重跑，不沿用历史数字）
25. 最终重跑并记录 command/date-time/result/pass-fail/duration：`pytest`、`ruff`、format、五端 typecheck（Web/Admin/Mini/Mobile/Pro）、五端 build、`vitest`、Playwright、contract、safety、security 全部通过；结果不得低于基线（pytest 287 / Playwright 23 / vitest 22 / ruff 0 / typecheck 0 / build OK），如有降低必须说明原因与修复证据。
26. 新增测试基础设施可复现：`tests/scenarios/`、`evals/PLI_AI_GOLDSET_V1`、3D test asset（公开许可来源记录在报告中）。

### C. 诚实状态与收口
27. External blockers 如实保留：REAL_3D_PROVIDER=EXTERNAL_BLOCKED、REAL_3D_PET_ASSET=NOT_AVAILABLE、REAL_3D_IDENTITY_VALIDATION=NOT_YET_OBSERVED、REAL_DEVICE_QA=EXTERNAL_BLOCKED、PLATFORM_DEVICE_QA=EXTERNAL_BLOCKED、STAGING_DEPLOY=EXTERNAL_BLOCKED（无权限时）、COMPANION_HARDWARE=EXTERNAL_BLOCKED/DESIGN_ONLY；SMTP/AI Provider 以真实配置为准；不得伪造通过。
28. `reports/PRE_PILOT_TECHNICAL_AUDIT_FINAL.md`：含 §78 全部 29 节 + §79 明确回答（设计是否完整/代码是否完整/是否有设计未实现/代码无设计/架构质量/代码风格/注释/测试/哪些 synthetic 已验证/哪些只能真人验证/哪些被外部阻塞/能否进入 Wave 0-A）；最终状态块为 `PRE_PILOT_TECHNICAL_AUDIT_PASS`（仅当 Exit Criteria §73 全部满足）并保持 `DESIGN_COMPLETE`、`ENGINEERING_LOCALLY_VERIFIED`、`SYNTHETIC_VALIDATION_COMPLETE`、`SCENARIO_REPLAY_PASS`、`SAFETY_AUDIT_PASS`、`ARCHITECTURE_AUDIT_PASS`、`CODE_QUALITY_AUDIT_PASS`、`DOCUMENTATION_AUDIT_PASS`、`MULTI_CLIENT_AUDIT_PASS`、`3D_VIEWER_RUNTIME_READY`、`REAL_PET_3D_IDENTITY=NOT_YET_OBSERVED`、`WAVE_0_REENTRY_READY`、`REAL_PARTICIPANTS=0`、`REAL_PETS=0`、`PRODUCT_VALIDATION=NOT_YET_OBSERVED`。
29. `WORK_STATUS.md` + `CHANGELOG.md` 更新为 Stage V 完成状态块；commits 带 `[PLI-STAGEV]` 或对应 PLI-xxx；完成后 STOP，不自行进入 Stage I / v1.3 / Future 42 / 新功能开发。

## Boundaries

- **功能冻结**：FEATURE_FREEZE=ON、PRODUCT_DESIGN_FREEZE=ON、NEW_DOMAIN_FEATURE=FORBIDDEN、STAGE_I=FORBIDDEN、v1.3=FORBIDDEN、FUTURE_42=FORBIDDEN。只允许 bug fix / test improvement / architecture cleanup / dead code removal / comment improvement / documentation alignment / type tightening / security hardening / performance cleanup / accessibility fixes / design implementation correction / 3D viewer runtime validation / synthetic test infrastructure。
- **不修改用户未提交工作**；不删除看不懂的数据/文档；不做纯美观大重构（minimum safe refactor，只在证据证明结构真实有问题时重构；不大规模改目录/换框架/全量改名）。
- **医疗安全**：LLM 不得单独决定 emergency（Red Flag Rule Engine 独立）；不诊断、不改药、不自动停止药物；不把未发现红旗写成「没有疾病」；不把图片结果写成确定诊断；Vet Brief 是信息整理不是兽医诊断；Deterministic Safety > LLM。
- **不触真实世界**：不创建真实 Participant / Pet；不部署公网 staging（无权限即保持 EXTERNAL_BLOCKED）；不触碰生产支付/外部真实服务下单/删除生产数据/Pet 所有权转移。
- **数据治理**：Synthetic 数据永不进入真实 Pilot 指标/Retention/Outcome/Vet Usefulness/Commercial Metrics（回归强制 `SYNTHETIC_NEVER_COUNTS_AS_REAL`）；canonical event schema 集中管理，前端不得私自造 payload。
- **日志/报告安全**：日志不写完整敏感病历/媒体内容/token/password；secrets audit 只报告 location/type/severity，不输出内容。
- **工程规范**：timezone-aware datetime；可控 clock 不依赖 wall-clock；外部调用 timeout/retry/idempotency；TS strict 禁止无解释 any；金额/剂量/单位显式类型。
- **依赖纪律**：不引入重依赖为工具本身（Hypothesis/fast-check 仅当项目生态合适）；允许下载公开许可 3D 测试资产并记录来源。
- **诚实原则**：任何「完成」必须有测试证据；所有剩余未知必须是真实世界未知；不伪造通过、不复制历史数字当最终证据。

## 执行顺序（内部方法，不作为交付验收）

Repository Baseline → 全部报告按 §5-67 顺序执行（Traceability Matrix → Synthetic Cohort → Scenario Replay → Adversarial → Property → Time Travel → AI Goldset → UI State/Visual → 3D Runtime → Architecture → Code Quality → Comment/Docs → Dead Code/Ghost → DB/API → Security → Dependency → Performance → Doc Drift → Test Quality → Multi-client → Accessibility → UX Copy）→ 全程维护 Issue Ledger 并即时修复 P0/P1 → 干净环境全量回归 → PRE_PILOT_TECHNICAL_AUDIT_FINAL → 更新 WORK_STATUS/CHANGELOG → 提交 → STOP。