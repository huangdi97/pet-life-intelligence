# STAGE V — Repository Reality Snapshot（Repository Baseline）

- 报告日期：2026-09-21（Stage V 执行首日）
- 执行者：PI-Desktop Agent（本地只读收集 + 命令实测）
- 阶段：Stage V Pre-Pilot 全量验证与仓库终极审计
- 说明：本报告只记录**当时真实状态**，不做判断、不修改未提交工作。

---

## 1. Git

| 项 | 值 |
|---|---|
| branch | `main` |
| HEAD | `fa24cb3048ea4b1945fba6c23b22f30b7b69d6e7`（短 `fa24cb3`） |
| worktree | CLEAN（唯一未跟踪项：`.pi/goal/stage-v-...md`，为本 Stage 目标工件，不属于本仓库交付物） |
| remote | 无（`git remote -v` 为空，本地单仓） |
| 最近提交 | 见下 |

最近 12 条提交（`git log --oneline`）：

```
fa24cb3 docs(stage-h2): record remaining local scope closure (provider unit tests 6/6, C6 explain embedding, mobile life view), full regression 287/23/22 green [PLI-STAGEH2]
263a284 feat(stage-h2): close remaining local scope — visual provider adapter unit tests 6/6, PHASE C6 contextual Explain embedded (Timeline [为什么] + Today [查看依据] -> agent explain with ctx), Mobile 3D LifeViewScreen (Expo, honest blocked + versions + overlay) registered from Me [PLI-STAGEH2]
f48ae89 docs(stage-h2): resolve Docker environment blocker (disk cleanup + .wslconfig + explorer detach), full regression closed — Playwright 23/23 (incl. stage-h2-3d companion), pytest 281, ruff 0 [PLI-STAGEH2]
ad122e6 docs(stage-h2): PHASE M visual design system v3 (GOAL M1-M4) + PHASE N responsive/accessibility report updates for 3D Life View & Capture Wizard; web build + vitest 22/22 verified [PLI-STAGEH2]
9e81719 docs(stage-h2): record H.2 E2E supplement + Docker Desktop engine outage as environment blocker (stage-h2-3d 5/6 passed before outage; companion fix committed; rerun command documented) [PLI-STAGEH2]
98e942b feat(stage-h2): Stage H.2 E2E spec (life-view honest blocked / capture wizard / timeline back-to-day / companion GENERATED_3D-not-LIVE / today entry), companion gate now declares GENERATED_3D != LIVE to all users [PLI-STAGEH2]
ffe3c23 feat(stage-h2): Capture Wizard entry, Companion GENERATED_3D vs LIVE declaration, final acceptance reports (MULTI_CLIENT/WAVE0/FINAL_READINESS), WORK_STATUS H.2 closure [PLI-STAGEH2]
e37b7f0 feat(stage-h2): Capture Wizard (web /pets/[id]/capture, 6-angle photo guide + upload + QC) and Timeline back-to-that-day (day filter + real-events-only + active model version note) [PLI-STAGEH2]
34fe40a feat(stage-h2): Pet Living Model backend (capture/model/render-manifest + provider adapter + verify/activate rules), Living Canvas Today, 3D Life View web+mini, PLM contract tests 8/8, H.2 docs+reports, pytest 281 [PLI-STAGEH2]
d266694 feat(stage-h1): PARTIAL_UI 128 closure audit (PARTIAL_UI=0), prefers-reduced-motion implemented, H.1 preflight/closure/classification reports, FEATURE_EXPERIENCE_MATRIX updated to 19-col with PARTIAL_REASON [PLI-STAGEH1]
23581df test+docs(stage-h): fix legacy ruff (patch_ga2b syntax + unused vars), ruff 0 errors, pnpm lock, CHANGELOG v1.3.0 + WORK_STATUS Stage H complete [PLI-STAGEH]
4d4c478 feat(clients): align mini/mobile, finalize admin IA, new pro client, ui acceptance tests (vitest 22 + stage-h UX E2E 5) [PLI-STAGEH]
```

Changed files（工作区相对 HEAD）：无（除 `.pi/goal/` 未跟踪目标工件）。

## 2. Runtime

| 组件 | 版本/状态 |
|---|---|
| Python | 3.13.14（仓库 venv `.venv`） |
| Node.js | v22.15.0 |
| pnpm | 12.4.1 |
| Docker Engine | 29.2.1 |
| 容器（docker ps 实测） | `petlifeintelligence-postgres-1`（pgvector/pgvector:pg16，Up healthy，host 55679→5432）、`petlifeintelligence-redis-1`（redis:7-alpine，Up healthy，host 56379→6379）、`petlifeintelligence-minio-1`（minio/minio，Up healthy，host 59000/59001→9000/9001）；另有非本仓 postgis 容器（petaccess-db，5432，无关） |

端口约定（scripts/dev.ps1 记载，与容器实测一致）：API 8800 / Web 3100 / PG 55432（实测因 WinNAT 预留改为 55679）/ Redis 56379 / MinIO 59000-59001。

## 3. Clients

| 端 | 位置 | 说明 |
|---|---|---|
| Web | `apps/web` | Next.js（app router），页面：Today(page.tsx)、Timeline、Pets/[id]、Health、Medication、Behavior、Training、Welfare、Social、Monitoring、Companion、Agent、Capture Wizard(/pets/[id]/capture)、3D Life View(/pets/[id]/life-view)、Me/Settings 等；含 offline drafts、i18n zh-CN、ui-kit 集成 |
| Admin | `apps/admin` | 运营/管理端（pilot status 卡等） |
| Mini | `apps/mini` | Taro/小程序端（含 life-view 页） |
| Mobile | `apps/mobile` | Expo 移动端（LifeViewScreen 等） |
| Pro | `apps/pro` | 专业人士客户端（stage-h 新增） |
| packages | `packages/api-client`、`packages/domain-schema`、`packages/rules`、`packages/ui-kit`、`packages/ui-tokens` | 共享层：API client、canonical event schema、红规则、设计系统 |

## 4. Backend

| 服务 | 位置 | 说明 |
|---|---|---|
| API | `services/api` | FastAPI + SQLAlchemy(async) + Alembic（`services/api/migrations`）；模块含 `app/core`、`app/routes`、`app/adapters`、`app/models`、`app/seed.py`、`app/main.py` |
| Worker | `services/worker` | `main.py`（任务执行） |
| AI Gateway | `services/ai-gateway` | `app` + `pli_ai_gateway`（AI provider 适配/LLM 网关） |
| 共享规则 | `packages/rules` | 红规则 / 医疗安全确定性规则（跨语言） |

## 5. Database

- PostgreSQL 16 + pgvector（容器，host 55679）；应用库 `pli`、测试库 `pli_test`（conftest 自动创建）。
- Redis 7（56379）；MinIO（59000/59001）。
- conftest.py：session 级自动 migration 到 head；测试间 wipe 表清单覆盖 pets/events/permissions/artifacts/health/visual models/pilot flags 等全部业务表（顺序即 FK 安全顺序）。

## 6. AI

- `services/ai-gateway`：AI provider 适配层。
- 外部真实 AI Provider：**EXTERNAL_BLOCKED**（无真实 key；代码 REAL_PROVIDER_READY，配置即激活）。
- AI 安全：`packages/rules` 独立确定性规则（Red Flag Rule Engine），LLM 不单独决定 emergency（需在审计中再次验证）。

## 7. 3D / Pet Living Model

- `services/api/app/models/visual.py`：Capture/Model/RenderManifest；migration `21b4b571112a`（3 张表，可回滚）。
- `services/api/app/routes/visual.py`：capture/qc/model/verify/activate/retire/manifest/state-overlay/status。
- `services/api/app/adapters/visual_provider.py`：Provider protocol + Sandbox + ExternalBlocked。
- 前端：Web `/pets/[id]/life-view`、Mini life-view、Mobile LifeViewScreen。
- 状态：`REAL_3D_PROVIDER=EXTERNAL_BLOCKED`、`REAL_3D_PET_ASSET=NOT_AVAILABLE`、`REAL_3D_IDENTITY_VALIDATION=NOT_YET_OBSERVED`、`COMPANION_HARDWARE=EXTERNAL_BLOCKED/DESIGN_ONLY`。

## 8. Tests

- Python 测试：`tests/`（unit/integration/contract/safety/ai-evals/e2e/ga/multi-client/v02/v10 + conftest.py）+ `services/api/tests`。测试文件约 29 个 `test_*.py`（含 e2e-browser 与 services/api/tests/test_health.py；数量以 pytest 实际收集为准，见 STAGE_V 回归）。
- 历史基线（输入基线，需本次重跑验证）：pytest 287 / Playwright 23 / vitest 22 / ruff 0 / 五端 typecheck 0 / build OK。
- Browser E2E：`tests/e2e-browser`（Playwright，baseURL http://localhost:3100，chromium 单 worker，zh-CN locale）。
- 前端单测：`apps/web/tests`（vitest，4 个文件）。
- `tests/README.md` 明确禁止只写 happy path，要求 cross-pet isolation / expired grant / revoked token / duplicate medication / idempotency / supersedes / red-flag downgrade / AI schema failure 等覆盖。

## 9. Docs

- 根目录母版：`Pet_Life_Intelligence_v3.1-R1_产品技术运营与Companion统一全量母版_2026-09-18.md`（L3；Goal 文档引用的 v3.3-R1 2026-09-20 不存在，**差异记录**：以 repo 实际为准）。
- L2：`docs/reference/Pet_Life_Intelligence_v2.0_Feature_Inventory_228.xlsx`。
- `docs/` 共 64 个文件：api / architecture / decisions / mobile / pilot / product / reference / release / safety / ui 子目录 + 顶层 01..09 + AI_SAFETY / DEPLOYMENT / DISASTER_RECOVERY_RUNBOOK / INCIDENT_RUNBOOK / LOCAL_DEVELOPMENT / MINI_PROGRAM_RELEASE / MOBILE_RELEASE / PRIVACY / PRODUCTION / STAGING 等。
- 其他根文档：README、AGENTS.md、CHANGELOG.md、WORK_STATUS.md、PRIVACY_MODEL.md、SECURITY.md、RUNBOOK.md、BACKUP_RESTORE.md、LIMITATIONS.md、00_START_HERE.md、GOAL_* 历史目标文档。
- 已有 reports/ 60+ 份（Stage G/H/H.1/H.2 及历史 Stage），尚无 Stage V 报告（本次将新增 24 份）。
- 代码规模实测：Python ~18.5k LOC（services/packages/tests/scripts）、TS/TSX ~15.5k LOC（apps/packages，排除 node_modules/dist/.next）。

## 10. Known Blockers（诚实保留，不伪造）

| 项 | 状态 |
|---|---|
| REAL_3D_PROVIDER | EXTERNAL_BLOCKED（无真实 3D 生成服务） |
| REAL_3D_PET_ASSET | NOT_AVAILABLE（无真实宠物资产） |
| REAL_3D_IDENTITY_VALIDATION | NOT_YET_OBSERVED |
| REAL_DEVICE_QA | EXTERNAL_BLOCKED（无真机） |
| PLATFORM_DEVICE_QA | EXTERNAL_BLOCKED（无平台账号） |
| STAGING_DEPLOY | EXTERNAL_BLOCKED（本阶段无部署权限；历史 remote staging 为 Stage F 记录） |
| COMPANION_HARDWARE | EXTERNAL_BLOCKED / DESIGN_ONLY |
| REAL_AI_PROVIDER | EXTERNAL_BLOCKED（无真实 key，代码 READY） |
| SMTP | EXTERNAL_BLOCKED（无邮箱账号，模板就绪） |
| git remote | 无（仓库就绪，待提供 URL 即可 push） |
| REAL_PARTICIPANTS | 0 |
| REAL_PETS | 0 |
| PRODUCT_VALIDATION | NOT_YET_OBSERVED |

## 11. Stage V 将产出（本报告为第 1/24）

`DESIGN_TO_CODE_TRACEABILITY_MATRIX / SYNTHETIC_COHORT_SPEC / SCENARIO_REPLAY_REPORT / ADVERSARIAL_TEST_REPORT / PROPERTY_TEST_REPORT / TIME_TRAVEL_TEST_REPORT / AI_GOLDSET_REPORT / VISUAL_REGRESSION_REPORT / 3D_VIEWER_RUNTIME_REPORT / ARCHITECTURE_AUDIT / CODE_QUALITY_AUDIT / COMMENT_AND_DOCUMENTATION_AUDIT / DEAD_CODE_AND_GHOST_FEATURE_AUDIT / DATABASE_API_AUDIT / SECURITY_AUDIT / DEPENDENCY_AUDIT / PERFORMANCE_AUDIT / DOCUMENTATION_DRIFT_AUDIT / TEST_QUALITY_AUDIT / MULTI_CLIENT_PARITY_AUDIT / ACCESSIBILITY_FINAL_AUDIT / PRE_PILOT_TECHNICAL_AUDIT_FINAL / STAGE_V_ISSUE_LEDGER`（UX Copy 审计并入最终报告）。
