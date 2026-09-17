# STAGE_F_FINAL_GATE — Stage F 部署激活 Gate（最终判定）

- 日期：2026-09-17（本阶段全部真实命令验证）
- 判定：PASS / PARTIAL / FAIL / EXTERNAL_BLOCKED / NOT_APPLICABLE

## Gate 判定

| Gate | 判定 | 证据 |
|---|---|---|
| F0 Local quality baseline | **PASS** | pytest **267 passed**；ruff All checks passed；web typecheck 0 error；web build OK（服务器 Docker 构建同源通过）；Playwright 本地 12/12 + 远程 12/12 |
| F1 Git remote | **EXTERNAL_BLOCKED** | 无 remote URL（GIT_REMOTE_EXTERNAL_BLOCKED）；不 force push |
| F2 Production configuration | **PASS** | production compose + env 模板齐备；fail-fast 校验（生产拒绝 dev-auth/弱 secret/缺 DB）；staging 实测 compose 正常 |
| F3 Real AI | **EXTERNAL_BLOCKED**（代码 REAL_PROVIDER_READY） | provider adapter/base_url/api_key/model/timeout/retry/fallback/schema validation/tracing 齐备；无 key → `/ai/status` 如实 `real:false`；远程医疗安全以独立规则引擎全路径验证（9/9） |
| F4 Real Email | **EXTERNAL_BLOCKED**（代码+模板完成） | console/test provider + verify/reset 模板 + 安全通知；staging token in-band 链接可用；无 SMTP 凭据 |
| F5 Server | **PASS** | zhishen-tokyo 可达：Ubuntu 24.04.4、Docker 29.1.3 + Compose 2.40.3、2 CPU / 3.6Gi RAM / 59G disk、Caddy 80/443、sudo NOPASSWD |
| F6 Staging | **PASS** | 真实部署：6 容器 Up（api healthy/worker/web/admin/redis healthy/postgres healthy）；公网 `/pli` 200 `/pli-api` health 200 `/pli-admin` 200；restart policy unless-stopped |
| F7 DNS | **PASS**（staging 子域） | `staging.haoleilab.com` → 43.153.166.191 真实解析；新子域控制无 → path-prefix 方案 |
| F8 HTTPS | **PASS** | Caddy Let's Encrypt 自动 TLS；HSTS max-age=31536000 + nosniff + DENY + no-referrer + Permissions-Policy（真实响应头验证）；证书自动续期 |
| F9 Remote DB | **PASS** | alembic head `3756fdb0fb13`（auth+pilot 迁移）；73 表 + 索引/约束；staging demo seed 补执行；恢复演练 counts 一致 |
| F10 Remote Storage | **PASS** | 上传 201 / 下载字节一致 / 未认证 401 / 跨用户 403 / MIME 422 / 签名伪装 422（9/9）；User A 无法访问 User B media |
| F11 Remote Auth | **PASS**（email 投递单独 BLOCKED） | 15/15 矩阵（register/verify/login/refresh 轮换+复用检测/logout/session revoke/错密/忘记重置/限流锁定/删号）；token/auth 核心全部真实通过 |
| F12 Remote E2E | **PASS** | Playwright 12/12 against 公网 staging（真实浏览器全流程）+ 全链路 smoke 20/20（register→…→cross-user deny 403→data persists） |
| F13 Remote Security | **PASS** | 跨用户 IDOR 403/404（pet/timeline/health/vet brief/artifact/export/list）、revoked token 401、限流 403、CORS 白名单、secrets 不落日志 |
| F14 Remote Privacy | **PASS** | 8/8（share 视图+bogus 404、export 本人/跨用户 403、consent 撤销、SERVICE_ESSENTIAL 不可撤、删除请求仅登记）+ share-revoke 7/7（撤销后 403） |
| F15 Remote Medical Safety | **PASS** | 9/9（红旗→EMERGENCY、owner 弱化不可降、prompt injection 不可绕、AI 观察不可降、单调升级、vet brief 红旗+免责、/ai/status 如实）；LLM 不单独决定 emergency（独立规则引擎） |
| F16 Monitoring | **ACTIVE** | `/metrics` 真实远程流量：events 25→158、security 14→59、audit 18→119、ai_calls 2→9、login_failures 0→11、open_incidents 0（时间戳快照 ×3）；JSON logs 开启 |
| F17 Backup / Restore | **PASS** | 远程 staging 演练 10/10 ALL-PASS exit 0：baseline 73 表→pg_dump -Fc→空库→restore→counts 一致→恢复库 API smoke（health/register/login/建宠物/metrics）→清理 |
| F18 Pilot | **PASS** | 远程 Pilot 检查 8/8（invite 创建/兑换/单次使用/pet+event/feedback/north-star 指标）+ 闸门演练 9/9（PILOT_MODE=true：无码 422、有码 201；恢复 false + 公网回归）；demo 账号不污染真实 analytics（独立审计） |
| F19 Production | **EXTERNAL_BLOCKED** | CONFIG_READY；同服务器可部署但无独立生产域名/DNS 控制 → DOMAIN_EXTERNAL_BLOCKED；不伪造 PASS |
| F20 Post-deploy Smoke | **PASS**（staging） | 部署后即时验证：health/readiness/register/login/create pet/quick log/timeline/health 事件/AI/vet brief/logout/login + IDOR/revoked token/share revoke/upload auth/CORS spot-check 全部真实执行 |

## WEB_LIVE 判定（§32）

| 条件 | 状态 |
|---|---|
| 公网地址 | PASS（staging.haoleilab.com/pli） |
| HTTPS | PASS（Caddy Let's Encrypt） |
| 真实 Auth | PASS（Argon2id + 全矩阵） |
| Persistent DB | PASS（Postgres 16 volume） |
| Redis | PASS |
| Worker | PASS |
| Storage | PASS（本地卷 + 权限/IDOR 验证） |
| Remote E2E | PASS（12/12 + 20/20） |
| Security | PASS |
| Privacy | PASS |
| Medical Safety | PASS |
| Monitoring | ACTIVE |
| Backup | PASS |

**结论：PLI_V1_0_WEB_LIVE_PILOT_LIVE（在 staging 公网环境）。**

Production（独立环境）因缺少独立生产域名（外部）保持 EXTERNAL_BLOCKED——属诚实标注，非伪造。
