# STAGE_F_PREFLIGHT — Stage F Reality Preflight

- Date: 2026-09-16
- 真实命令重新验证（L0 优先）。

## Git

| 项 | 值 |
|---|---|
| Branch | `main`（clean tree） |
| HEAD | `a4c2176`（Stage E 收尾） |
| Tags | `v1.0.0`, `v1.1.0`, `v1.1.1` |
| Remote | **无**（EXTERNAL_BLOCKED_REMOTE_URL） |

## 质量基线（真实执行）

| Gate | 结果 |
|---|---|
| Backend tests | **267 PASS** |
| ruff | PASS（Stage E 末验证） |
| Web build | PASS |
| Admin build | PASS |
| Mini builds | PASS |
| Mobile check | PASS |
| Playwright | 12/12 PASS |

## 服务器发现（新！）

通过 `~/.ssh/config` 发现可达服务器：

| 项 | 值 |
|---|---|
| Host | `zhishen-tokyo` → `43.153.166.191:62222` |
| OS | Ubuntu 24.04.4 LTS, 2 CPU, 3.6Gi RAM, 59G disk (14G free) |
| Docker | 29.1.3 + Compose 2.40.3 |
| HTTPS | Caddy 已在 80/443 运行（Let's Encrypt 自动证书） |
| 域名 | `staging.haoleilab.com` → 43.153.166.191（DNS 已解析） |
| 现有项目 | zhishen / wennian（端口 13000/18000/18443） |
| sudo | NOPASSWD |
| DNS 控制 | **无**（`pli.haoleilab.com` NXDOMAIN；无法新增子域） |

## 部署策略（根据真实环境）

- 无新子域 DNS 控制 → 采用与现有项目一致的 **path-prefix 路由**：
  ```
  https://staging.haoleilab.com/pli/*          → PLI Web
  https://staging.haoleilab.com/pli-api/*      → PLI API
  https://staging.haoleilab.com/pli-admin/*    → PLI Admin
  ```
- Caddy 已运行并自动签发 TLS → 无需额外证书管理。
- 独立端口 + 独立 DB/Redis + 独立 volume，隔离于现有项目。

## 当前状态汇总

| 项 | 状态 |
|---|---|
| AI mode | `real:false`（mock；无 key）→ AI_REAL_EXTERNAL_BLOCKED |
| Email mode | `console` → SMTP_EXTERNAL_BLOCKED |
| Deployment | **可执行：服务器可达 + Caddy TLS 就绪** |
| Public URLs | 计划：`staging.haoleilab.com/pli*` |

## 结论

Stage F 最大变化：**发现真实可达服务器与已配置的 Caddy HTTPS 域名**。
本阶段将真实部署 PLI 到该服务器（path-prefix），并执行远程 smoke / E2E / 备份恢复。
真实 AI 与 SMTP 仍为外部 blocker（无 key/凭据）。