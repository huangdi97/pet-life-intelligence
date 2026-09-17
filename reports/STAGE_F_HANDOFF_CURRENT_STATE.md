# STAGE_F_HANDOFF_CURRENT_STATE — 接手时真实状态审计（本次重新验证）

- 日期：2026-09-17
- 审计方式：全部以本次真实命令重新读取（L0 优先），未照抄旧文档。

## 4.1 Git

| 项 | 接手时 | 当前（本 Agent 完成后） |
|---|---|---|
| Branch | `main` | `main` |
| HEAD | `a222563`（real remote staging deployment） | 见 §GIT 最终报告 |
| Working tree | `scripts/remote_staging_smoke.py` 未跟踪（上一 Agent 遗留） | clean |
| Tags | `v1.0.0`, `v1.1.0`, `v1.1.1`（未触碰） | 同左 + `v1.2.0`（本次新增） |
| Remote | **无**（EXTERNAL_BLOCKED_REMOTE_URL） | 无（不变） |

## 4.2 已完成（逐项 + 实际证据）

| 项 | 状态 | 证据（真实命令） |
|---|---|---|
| Real Auth | DONE | Argon2id + rotating tokens + family reuse detection；migration `3756fdb0fb13`；远程 Auth 矩阵 **15/15 PASS**（register/duplicate 409/verify/login/sessions/refresh 轮换/复用 401/错密/revoke/忘记重置/限流锁定/删号） |
| Pilot Mode | DONE | invite-only + 单次使用 + 反馈 + north-star 指标；远程 Pilot 检查 **8/8 PASS** + 远程闸门演练 **9/9 ALL-PASS**（PILOT_MODE=true 下无码 422 / 有码 201 / 恢复 false） |
| Production Config | DONE | fail-fast 校验（生产拒绝 dev-auth/弱 secret）；staging compose `docker-compose.haoleilab.yml`（127.0.0.1 绑定 + 独立 DB/Redis/volume） |
| Server | DONE | `zhishen-tokyo` = 43.153.166.191:62222 可达；Ubuntu 24.04 + Docker/Compose + Caddy(Let's Encrypt)；6 容器全部 Up |
| Remote Staging | DONE | **真实公网部署并全链路验证**：`https://staging.haoleilab.com/pli`（web 200）/`/pli-api`（health 200）/`/pli-admin`（200） |
| DNS / HTTPS | DONE | `staging.haoleilab.com` → 43.153.166.191；Caddy 自动 TLS + HSTS/X-Frame-Options/Permissions-Policy 安全头（真实响应验证） |
| Remote DB | DONE | alembic head `3756fdb0fb13`（auth + pilot 表）；demo seed 补执行（owner/family/sitter@pli.demo） |
| Remote Storage | DONE | 远程存储检查 **9/9 PASS**（上传/下载字节一致/未认证 401/跨用户 403/MIME 422/签名伪装 422） |
| Remote Auth（公网） | DONE | 同上 15/15（email 真实投递单独 BLOCKED，见 4.5） |
| Remote E2E | DONE | Playwright **12/12 PASS against https://staging.haoleilab.com/pli**（真实浏览器注册→登录→退出→重置、PWA、H5 分享、IDOR、医疗安全、中文导航）+ 远程全链路 smoke **20/20 PASS** |
| Remote Security | DONE | 跨用户 IDOR 403（pet/artifact/export/list）、撤销 token 401、share 撤销 403、限流锁定 403、CORS 白名单（staging origin） |
| Remote Privacy | DONE | 远程隐私检查 **8/8 PASS**（care/vet-brief 分享视图、导出、consent 撤销、SERVICE_ESSENTIAL 不可撤、删除请求仅登记）+ share-revoke 演练 **7/7 ALL-PASS** |
| Remote Medical Safety | DONE | 远程医疗安全 **9/9 PASS**（呼吸困难+紫绀→EMERGENCY、owner 弱化不可降级、prompt injection 不可绕过、AI 观察不可降级、单调升级、vet brief 红旗+免责声明、/ai/status 如实） |
| Monitoring | ACTIVE | `/metrics` 真实远程流量证据：events 25→158、security 14→59、audit 18→119、login_failures 0→11、open_incidents 0；带时间戳快照（2026-09-16T16:06Z / 16:28Z / 2026-09-17T15:08Z） |
| Backup / Restore | DONE | 远程 staging 演练 **10/10 ALL-PASS，exit 0**：73 表 baseline→pg_dump→空库恢复→counts 一致→恢复库 API health/register/login/建宠物/metrics 全过→清理；不触碰真实数据 |

## 4.3 部分完成（IMPLEMENTED / EXTERNAL_BLOCKED_RUNTIME）

| 项 | 状态 | 说明 |
|---|---|---|
| Real AI adapter | IMPLEMENTED / AI_REAL_EXTERNAL_BLOCKED_API_KEY | OpenAI-compatible provider REAL_PROVIDER_READY（config-driven、schema+JSON 强制、mock fallback、超时/重试）；staging `AI_PROVIDER=mock`（无 key），`/ai/status` 如实 `real:false`；远程医疗安全以独立规则引擎全路径验证 |
| Email delivery | IMPLEMENTED / EMAIL_REAL_EXTERNAL_BLOCKED | console provider + verify/reset 模板 + 安全通知完成；staging `EMAIL_DELIVERY=console`（token in-band 返回，链接可用）；无 SMTP 凭据 |
| WeChat 登录 | IMPLEMENTED / EXTERNAL_BLOCKED | jscode2session exchange + find-or-create；无 AppID/Secret → 诚实 EXTERNAL_BLOCKED |
| Production | CONFIG_READY / DEPLOYMENT_NOT_EXECUTED | production compose + env 模板齐备；同一服务器可部署，但无独立生产域名（DNS 控制无）→ 见 4.5 |

## 4.4 未开始

- 无。接手清单中所有不依赖外部凭证的事项已全部完成或被上面覆盖。

## 4.5 External Blockers（真实）

| # | Blocker | 影响 |
|---|---|---|
| 1 | git remote URL 未提供 | 无法 push（GIT_REMOTE_EXTERNAL_BLOCKED） |
| 2 | 真实 AI Provider API key 未提供 | AI 运行时 mock（AI_REAL_EXTERNAL_BLOCKED_API_KEY） |
| 3 | SMTP 凭据未提供 | verify/reset 邮件真实投递（EMAIL_REAL_EXTERNAL_BLOCKED） |
| 4 | 独立生产域名 + DNS 控制未提供 | Production 无法获得真实独立公网地址（DOMAIN_EXTERNAL_BLOCKED）；staging 已用 path-prefix 方案上线 |
| 5 | 微信 AppID / 主体 / 备案；Apple / Google / HarmonyOS 账号与签名 | 小程序/App 提交（本轮非主任务，build 已 ready 未破坏） |

## 4.6 Next Executable Gate（本 Agent 执行记录）

接手时第一个未完成且可自执行的 Gate 是 **Remote Staging 验证链（F9–F20）**：staging 已部署但从未跑过远程 E2E/安全/隐私/医疗安全/备份恢复/Pilot 验证。

已按序执行并全部完成：
1. Handoff Reality Audit（git/docker ps/HTTP 全部真实读取）→ 本报告
2. Remote 全链路 smoke 20/20（+ 提交上一 Agent 遗留脚本）
3. Remote Auth 矩阵 15/15
4. Remote 医疗安全 9/9
5. Remote Pilot 检查 8/8 + 闸门演练 9/9
6. Remote 存储 9/9 + share-revoke 7/7
7. Remote 隐私 8/8
8. 备份/恢复演练 10/10（exit 0）
9. 远程执行暴露并修复 3 个真实部署 bug（bundle localhost 烘焙 / seed FK 顺序 / 健康页 basePath 跳转 + PWA basePath 缺口）
10. 修复后远程 Playwright 12/12 + smoke 20/20 回归
11. 报告入库 + `v1.2.0` tag

Production cutover（§27）唯一剩余条件：真实独立生产域名（外部）。
