# PRODUCTIONIZATION PREFLIGHT — Reality Audit

- Audit date: 2026-09-14
- Branch: `main` @ `4a32e1e` (clean tree)
- 本报告依据真实代码 / 测试 / 运行结果生成（权威顺序 L0/L1）。

## 0. 重新验证结果（真实命令）

| 检查 | 结果 | 证据 |
|---|---|---|
| git status / log / tag | clean @ 4a32e1e, tag v1.0.0 | `git status` clean |
| Backend tests | **235 passed** | `.venv/Scripts/python.exe -m pytest -q` |
| ruff (api/worker/rules/ai-gateway/tests) | PASS | `ruff check services packages tests` → All checks passed |
| Alembic upgrade head | PASS | `alembic current` → `9b0058ac2e82 (head)` |
| Web typecheck + build | PASS | `pnpm --dir apps/web build` → Compiled successfully |
| Playwright browser E2E | PASS (7/7, 上次提交验证) | reports/G05_BROWSER_E2E.md |
| Staging smoke | PASS (12/12, 上次提交验证) | reports/G15_STAGING_SMOKE.md |
| Backup / Restore | PASS (上次提交验证) | reports/G07_BACKUP_RESTORE.md |

> 结论：上一阶段"PLI_V1_0_RELEASE_CANDIDATE_READY"基线仍然成立，数字与仓库一致。

## 1. 228 项当前状态

| 状态 | 数量 | 说明 |
|---|---|---|
| DONE | 160 | v0.1:46 + v0.2:47 + v1.0:67 |
| PARTIAL | 22 | 记录层完成，UI/下游通道未接（见 FULL_PRODUCT_AUDIT.md） |
| BLOCKED_EXTERNAL | 2 | PLI-141 服务者撮合、PLI-165 真实营养数据 |
| Future backlog | 42 | 按 GOAL 不强制上线 |
| **合计** | **228** | |

## 2. v0.1/v0.2/v1.0 实现缺口

- v0.1 (50 P0)：46 DONE，4 PARTIAL（PLI-003 头像 UI、PLI-025 趋势图、PLI-056 PDF、PLI-217 真实认证）。
- v0.2 (48 P1)：47 DONE，1 PARTIAL（PLI-005 QR 前端渲染）。
- v1.0 (88 P2)：67 DONE，17 PARTIAL（多为专业端 UI / 分析视图 / 离线下游），2 BLOCKED_EXTERNAL。
- 无 NOT_STARTED in A/B/C。

## 3. Web 当前完成度

- 16 routes：Today、Timeline、Tasks、Care、Behavior、Health(+detail)、Medication、Training、Search、Notifications、Settings、Login、Pets/New。
- 全部为 `"use client"` SPA 式页面；`State` 组件覆盖 loading/empty/error/denied。
- 缺口：
  - 无 `loading.tsx` / `error.tsx` / `not-found.tsx` 边界。
  - 无 PWA（无 manifest、无 service worker、无 public/ 静态资源、无 favicon）。
  - 无 i18n 基础；导航文案为英文混排（Today/Timeline…）。
  - 无设计系统 token 包（只有 8 个 CSS 变量 + 散落 hex）。
  - 无离线能力、无 H5 分享页面。
  - Dev-only 认证（X-Dev-User-Id），无真实登录页。

## 4. UI 完成度

- 功能可用；视觉为"可用的后台风格"，未达到消费级设计系统标准。
- 无 skeleton、无 offline 状态、无自定义 404/500。
- Dark mode 非 v1.0 blocker；light mode 基础可用。

## 5. API 完成度

- FastAPI，前缀 `/api/v1`；错误信封统一（code/message/request_id/details）。
- /health + /ready（DB+Redis）；请求 ID 中间件；权限 RBAC/ABAC；审计日志；feature flags；能力注册表。
- 缺口：无 OpenAPI 静态 artifact 提交；无生产 CORS 配置模板；rate limit 内存实现默认关闭；无 graceful shutdown；DB 使用 NullPool（无连接池）；无结构化 JSON 日志（structlog 未启用）。

## 6. Admin 是否存在

- **否**。无 `apps/admin`；后端有 `/ops/feature-flags`、审计、能力注册表等端点，但无管理端 UI。

## 7. Mobile 是否存在

- **否**。无 `apps/mobile`。

## 8. Mini Program 是否存在

- **否**。无 `apps/mini`。无 Taro 工程，无平台抽象层。

## 9. 生产部署能力

- `docker-compose.yml`：postgres/redis/minio（本地 dev 配置）。
- 无 `docker-compose.production.yml`、无 reverse proxy、无 CI/CD、无 .github workflows、无 production env 模板。
- 部署文档在 RUNBOOK.md / docs/，但无正式 STAGING/PRODUCTION 配置。

## 10. 当前最大上线 blocker

| # | Blocker | 类型 | 影响 |
|---|---|---|---|
| 1 | 无真实账号体系（仅 dev auth） | GA BLOCKER | 上线注册/登录/密码重置 |
| 2 | 无小程序 / 移动端 / Admin 客户端 | 交付缺口 | 多端矩阵未达成 |
| 3 | 无 CI/CD 与生产部署栈 | 工程缺口 | 上线发布不可控 |
| 4 | Web 无 PWA / 分享页 / 离线 | 交付缺口 | 移动浏览器体验 |
| 5 | 无平台账号（微信 AppID / App Store / 备案等） | EXTERNAL_BLOCKED | 真实发布 |
| 6 | 无 git remote | EXTERNAL_BLOCKED | push / tag 同步 |

## 11. 结论

当前为 `PLI_V1_0_RELEASE_CANDIDATE_READY`（后端强、安全基线全绿），但多端客户端、生产 UI、生产工程、真实认证、CI/CD 均未达成，无法直接宣称 `PRODUCTION_READY_MULTI_CLIENT`。本阶段将按 GOAL Phase A→R 顺序推进。