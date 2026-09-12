# GOAL — 今晚从零做到 Pet Life Intelligence v0.1 RELEASE

## 0. 总任务

在 `E:\AI\Pet Life Intelligence` 中，从当前真实状态出发，完成 Pet Life Intelligence v0.1。

最终要求不是 Demo 截图，而是：

- 可安装
- 可启动
- 可迁移数据库
- 可创建 Pet
- 可多宠切换
- 可家庭协作
- 可记录 Daily/Care/Behavior/Health Event
- 可查看 Today / Timeline
- 可形成 Care Card
- 可形成 Health Event → Safety → Vet Brief → Medication → Outcome 闭环
- 有明确权限与审计
- 有 Canonical Event Schema + provenance
- 有真实自动化测试
- 有 AI / Safety 离线评测框架
- 有 Docker 本地依赖
- 有 README / API docs / migration / seed
- 有 Release Report
- 可 Git 提交
- 有远端且鉴权正常时可推送

**禁止把“写了代码”当成完成。**

---

# 1. 当前产品冻结

产品名称：
**Pet Life Intelligence / 宠物生命智能平台**

v0.1 只验证三角 MVP：

### A. Identity + Timeline
解决：
- 这是谁？
- 它过去发生了什么？
- 谁记录的？
- 数据来自哪里？

### B. Daily + Care
解决：
- 今天发生了什么？
- 谁喂了？
- 谁完成了任务？
- 是否重复执行？
- 谁在临时照护？

### C. Behavior + Health
解决：
- 发生了什么异常/行为？
- 可观察事实是什么？
- 是否命中高风险红旗？
- 下一步行动是什么？
- 就医前怎么整理？
- 就医后如何用药/随访/采 Outcome？

底座：
- Canonical Pet Life Event Graph
- Provenance
- RBAC + ABAC
- Consent
- Audit
- Safety
- AI Eval

---

# 2. 绝对禁止项

今晚不做：
- 公开 Feed
- 全国 Marketplace
- 商城
- 宠物地图/避雷
- 自研硬件
- 自动支付
- 自动购买药品
- AI 自动改药
- AI 取代兽医
- “拍照判断宠物真实情绪”
- 无 Outcome 的“Digital Twin”
- 为追求 228 功能覆盖率制造空壳

---

# 3. 技术基线

如果真实仓库尚未形成更好的技术决策，默认：

- Web：Next.js + React + TypeScript
- API：FastAPI + Python
- DB：PostgreSQL + pgvector
- Cache：Redis
- Object Storage：S3-compatible；本地 MinIO
- Async Worker：先保留 durable job abstraction；v0.1 可用简单 worker，禁止关键状态只存在内存
- AI：独立 `ai-gateway` 边界
- Schema：JSON Schema / Pydantic；canonical event 类型集中定义
- Observability：结构化日志；预留 OpenTelemetry
- Local Infra：Docker Compose
- Migration：Alembic
- Test：pytest + 前端 typecheck/lint + API integration + Playwright（如果环境支持）
- Repo：monorepo

允许 Agent 根据真实环境调整具体版本，但：
- 必须记录 ADR
- 不允许随意改变架构边界
- 不允许每个服务各自发明 Event 字段

---

# 4. Phase 0 — Preflight

必须完成：

1. `cd "E:\AI\Pet Life Intelligence"`
2. 检查：
   - Git
   - Python
   - Node
   - pnpm/npm
   - Docker
   - PowerShell
3. 如果 Git 未初始化：初始化。
4. 如果目录已有内容：
   - 列树
   - 识别可保留文件
   - 不无脑覆盖
5. 建立：
   - `reports/`
   - `evidence/`
   - `artifacts/`
6. 更新：
   - `WORK_STATUS.md`

Gate G0：
- [ ] 工作目录正确
- [ ] Git 状态明确
- [ ] 工具链状态明确
- [ ] 参考文档可读
- [ ] v0.1 50 P0 已读取

---

# 5. Phase 1 — Repo / Tooling / Local Infra

建立/修复 monorepo：

```text
apps/
  web/
services/
  api/
  worker/
  ai-gateway/
packages/
  domain-schema/
  api-client/
  rules/
docs/
data/
  migrations/
  seed/
  evals/
tests/
  unit/
  integration/
  contract/
  e2e/
  ai-evals/
  safety/
infra/
scripts/
reports/
evidence/
```

完成：
- root README
- `.gitignore`
- `.editorconfig`
- `.env.example`
- docker compose
- PostgreSQL / Redis / MinIO 健康检查
- Web / API 最小健康页
- bootstrap/dev/test PowerShell 脚本
- 环境变量校验

Gate G1：
- [ ] docker compose config 有效
- [ ] 依赖可安装
- [ ] API `/health` 200
- [ ] Web 首页可打开
- [ ] `.env.example` 完整
- [ ] secrets 未提交

---

# 6. Phase 2 — Canonical Domain Schema

先做 Schema，后做页面。

必须包含核心实体：

- User
- Household
- Pet
- Actor
- PetIdentifier
- Relationship
- Grant
- Consent
- LifeEvent
- Observation
- Artifact
- CareTask
- HealthEvent
- MedicationPlan
- MedicationAdministration
- BehaviorEvent
- Outcome
- AuditEntry
- Notification

LifeEvent 最低字段：

```text
event_id
pet_id
event_type
occurred_at
recorded_at
actor_id
source_type
source_ref
provenance_level
schema_version
payload
artifact_ids
supersedes_event_id
retracted_at
created_at
```

Provenance 至少：

- OWNER_REPORTED
- CAREGIVER_REPORTED
- DEVICE_DERIVED
- AI_DERIVED
- PROFESSIONAL_CONFIRMED
- LAB_CONFIRMED
- SYSTEM_CALCULATED

原则：
- 事实不能静默覆盖
- 修改必须形成新版本 / supersedes / audit
- Event 创建支持 idempotency key
- 多宠任何 Event 必须明确 pet_id
- timezone-aware datetime
- 金额/剂量/单位禁止裸 float

Gate G2：
- [ ] JSON/Pydantic Schema 可验证
- [ ] migration 可从空库升级
- [ ] downgrade 或 forward-fix 策略存在
- [ ] seed 可生成 demo household + 2 pets
- [ ] idempotency 测试通过
- [ ] provenance 测试通过

---

# 7. Phase 3 — Auth / Permission / Consent / Audit

实现：
- 本地开发认证模式
- User → Household → Pet
- Owner / Co-owner / Family / Temporary caregiver
- 临时 Grant：
  - starts_at
  - expires_at
  - scope
- Care Card token：
  - 可撤销
  - 可过期
  - 最小字段
- Consent：
  - 产品必需
  - AI 推断
  - 研究二次使用
  - 外部分享
- Audit：
  - 谁读取
  - 谁新增
  - 谁修改
  - 谁撤销

高风险规则：
- 非 Owner 不得转移 Pet 所有权
- 临时 caregiver 不得永久授权第三方
- 分享链接不得默认泄露完整医疗历史
- token 到期必须失效

Gate G3：
- [ ] 越权 API 测试
- [ ] 到期权限测试
- [ ] 撤销 token 测试
- [ ] audit 可查
- [ ] 多宠串数据测试

---

# 8. Phase 4 — Today / Daily / Task / Timeline

实现 50 P0 中 Daily / Timeline：

Today：
- 当前 Pet 上下文
- 今天事件
- 任务
- 今日是否完成
- Quick Log

Quick Log：
- meal
- drink
- elimination
- walk/activity
- play/enrichment
- weight/body condition
- media attachment

Task：
- 创建
- 重复任务
- assignee
- complete
- completed_by
- duplicate/conflict warning

Timeline：
- 按 Pet
- 过滤 event_type
- 显示来源
- 显示 actor
- 显示附件
- 显示 superseded/retracted 状态

冲突：
- 不静默覆盖
- 多人重复完成时明确提示

Gate G4：
- [ ] E2E-01
- [ ] E2E-02
- [ ] E2E-03
- [ ] Today 与 Timeline 数据一致
- [ ] 多宠不会写错 Pet

---

# 9. Phase 5 — Care Network / Handoff / Care Card

实现：
- 邀请家庭成员
- 角色模板
- Care Handoff：
  - start/end
  - caregiver
  - authorized data scope
- Care Card：
  - 饮食
  - 用药
  - 行为禁忌
  - 紧急联系人
  - 首选医院文字字段（不是地图）
- 到期自动失效
- 访问审计

Gate G5：
- [ ] E2E-04 完整通过
- [ ] 未授权字段不可读
- [ ] 到期自动拒绝
- [ ] Care Card 可打印/分享

---

# 10. Phase 6 — Behavior Event

实现最小 ABC：

- antecedent/context
- observable behavior
- consequence
- duration
- intensity（owner-reported，必须标来源）
- people/animals involved
- environment
- media

规则：
- 不把“观察到吠叫/回避”自动写成“焦虑症”
- AI 若做摘要必须保留原始事实

Gate G6：
- [ ] E2E-07
- [ ] 行为记录进入 Timeline
- [ ] 原始记录与 AI 摘要分开
- [ ] provenance 正确

---

# 11. Phase 7 — Health Event / Safety Engine

实现：

### 11.1 发现异常
- 主诉
- onset
- duration
- eating/drinking
- elimination
- activity
- meds
- history
- media

### 11.2 动态追问
LLM 只能：
- 生成结构化追问
- 提取可观察事实
- 整理摘要

LLM 不得：
- 单独决定 emergency
- 生成确定诊断
- 改药/停药

### 11.3 Safety / Red Flag Engine
独立 rule engine。

最低规则集：
- breathing difficulty
- collapse/unconsciousness
- continuous/recurrent seizure emergency pattern
- severe bleeding
- suspected high-risk toxin ingestion
- severe abdominal distension + unproductive retching
- cat repeated urination attempts with little/no urine
- severe trauma

输出：
- MONITOR
- VET_SOON
- URGENT
- EMERGENCY

规则必须：
- Rule ID
- version
- trigger
- output
- test cases

### 11.4 Observable Findings
严格区分：
- owner statement
- AI observation
- rule conclusion
- vet confirmation

### 11.5 Vet Brief
包括：
- Pet
- chief complaint
- timeline
- key findings
- red flags
- history
- meds
- media links
- AI disclaimer

Gate G7：
- [ ] E2E-05
- [ ] 每条 red flag 有正/反例
- [ ] under-triage safety tests 通过
- [ ] AI 不可覆盖 rule engine 紧急度
- [ ] Vet Brief 可生成
- [ ] Vet Brief 可撤销分享

---

# 12. Phase 8 — Medication / Follow-up / Outcome

实现：

MedicationPlan：
- medicine_name
- dose_text
- route
- frequency
- start/end
- source/professional

MedicationAdministration：
- planned_at
- administered_at
- by_actor
- skipped/missed

安全：
- v0.1 不做剂量推荐
- 不自动解释“可以停药”
- 用户录入药物要明确来源

Outcome：
- recovered
- improved
- unchanged
- worsened
- relapsed
- referred
- unresolved

Gate G8：
- [ ] E2E-06
- [ ] 遗漏提醒
- [ ] 多人重复给药冲突保护
- [ ] outcome 与原 HealthEvent 关联

---

# 13. Phase 9 — AI Gateway / RAG / Eval

AI Gateway 要统一：

- provider abstraction
- model name
- prompt version
- schema version
- cost/latency
- trace id
- fallback
- timeout
- rate limit

首版 AI 能力：
- dynamic intake question
- observable fact extraction
- timeline summary
- Vet Brief drafting

所有输出优先结构化 JSON。

无真实 Key 时：
- 提供 deterministic mock provider
- 测试必须可离线完成
- 不得因无 Key 阻塞整个产品

RAG：
v0.1 只预留接口，个人 Pet 历史检索可先用结构化 DB 查询。
不要为了“RAG”把简单事实查询复杂化。

AI Eval：
- hallucination
- unsupported medical assertion
- provenance loss
- rule conflict
- output schema validity
- high-risk escalation preservation

Gate G9：
- [ ] mock AI 全套测试可离线跑
- [ ] 结构化输出 schema 通过
- [ ] safety suite 通过
- [ ] 有模型/Prompt版本审计

---

# 14. Phase 10 — Frontend 14 Surfaces

实现：
1. Onboarding / Create Pet
2. Today
3. Quick Log
4. Timeline
5. Care Network
6. Tasks
7. Care Handoff / Care Card
8. Behavior Event
9. Health Event
10. Vet Brief
11. Medication
12. Outcome / Follow-up
13. Notifications
14. Settings / Privacy

一级导航：
- Today
- Timeline
- Pet
- More

UI 原则：
- 永远显示当前 Pet
- AI 推断可点开“为什么/来源”
- 商业功能不进入 v0.1
- 医疗状态用文字，不依赖颜色
- loading/empty/error/permission-denied 均需设计
- mobile-first responsive
- 基本键盘可操作/语义标签

Gate G10：
- [ ] 核心页面不为空壳
- [ ] 7 条 E2E 主路径可操作
- [ ] 移动/桌面基本可用
- [ ] error/empty/loading 存在

---

# 15. Phase 11 — Test Matrix

必须实际运行：

Backend：
- ruff
- type checking（若启用）
- pytest unit
- pytest integration
- migration test
- permission test
- safety test

Frontend：
- lint
- typecheck
- build
- component/unit（如已配置）
- E2E / smoke

Contract：
- API schema
- event schema
- AI JSON schema

Security：
- secret scan
- auth/permission negative cases
- rate limit basic
- upload validation
- path traversal/file type checks
- CORS/CSRF strategy documented

禁止：
- 为通过测试删除重要测试
- 把 failing test 标 xfail 而不解释
- 用 catch-all 吃掉异常

Gate G11：
必须输出 `reports/TEST_REPORT.md`：
- 命令
- exit code
- pass/fail counts
- blocked tests
- known limitations

---

# 16. Phase 12 — Demo Seed + Product Demo

Seed：
- Household: Demo Family
- Pet A: Coco（dog）
- Pet B: Mimi（cat）
- Owner + Family member + Temporary caregiver
- 至少 1 天 Daily events
- 1 个 Task
- 1 个 BehaviorEvent
- 1 个 non-emergency HealthEvent
- 1 个 emergency red-flag sample（测试数据）
- 1 个 MedicationPlan
- 1 个 Outcome

提供：
- demo login / dev auth 说明
- reset demo script
- screenshots 可选，但不能代替测试

Gate G12：
- [ ] 新环境可 seed
- [ ] Demo 数据可重置
- [ ] 7 条主路径可复现

---

# 17. Phase 13 — Documentation

必须更新：

- README.md
- docs/architecture/
- docs/api/
- docs/safety/
- docs/decisions/
- OpenAPI
- `.env.example`
- RUNBOOK.md
- BACKUP_RESTORE.md
- SECURITY.md
- PRIVACY_MODEL.md
- LIMITATIONS.md

README 必须提供：
- Windows PowerShell 启动
- Docker 启动
- API/Web URL
- migration
- seed
- test
- shutdown
- reset

---

# 18. Phase 14 — CI/CD

如果 GitHub repo 已连接：
- lint
- tests
- build
- migration/schema
- safety suite

如果 CI 额度不可用：
- 提供 local CI script
- `scripts/ci-local.ps1`
- 不因 GitHub Actions 不可运行而假装 CI PASS

---

# 19. FINAL RELEASE AUDIT

必须生成：

`FINAL_RELEASE_REPORT.md`

内容：

## A. Git
- branch
- commit
- clean/dirty
- remote
- pushed / blocked

## B. Scope
50 个 P0：
- DONE
- PARTIAL
- BLOCKED
- NOT_STARTED

不得只写“50/50 done”，必须列 Feature ID。

## C. Gates
G0-G12：
- PASS / FAIL / BLOCKED / NOT_RUN
- evidence path

## D. Tests
真实命令和结果。

## E. Security / Safety
- medical safety
- permission
- secrets
- data deletion
- audit

## F. Known limitations
诚实列出。

## G. Start commands
从新 PowerShell 到打开产品的完整命令。

## H. Next
只列：
- v0.1 bug/tech debt
- v0.2 建议
不要在 Release 前偷偷开始 v0.2。

最终状态名称：

若全部核心 Gate 通过：
`PLI_V0_1_RELEASE_CANDIDATE_READY`

若功能完成但有真实外部阻塞：
`PLI_V0_1_IMPLEMENTATION_COMPLETE_EXTERNAL_BLOCKERS`

若核心测试没过：
`PLI_V0_1_NOT_RELEASE_READY`

绝不因为“今晚想做完”而伪造 READY。
