# WORK_STATUS

## Current terminal

`PLI_V1_0_WEB_READY_PILOT_READY`（真实 Auth/AI/Pilot 完成；公网部署与平台账号为外部 blocker → RELEASE_READY_EXTERNAL_BLOCKED）

## Stage E 完成情况

| 阶段 | 状态 | 证据 |
|---|---|---|
| Preflight | DONE | reports/STAGE_E_PREFLIGHT.md |
| Git Remote | BLOCKED_EXTERNAL | docs/release/GIT_REMOTE_HANDOFF.md |
| Real Auth | DONE | Argon2id + rotating tokens + 全流程；11 后端 + 2 浏览器 E2E |
| Real AI | DONE (adapter) | OpenAI-compatible provider REAL_READY；key EXTERNAL_BLOCKED |
| Production Config | DONE | fail-fast 校验（生产拒绝 dev-auth/弱 secret） |
| Domain/HTTPS | CONFIG READY | nginx HSTS/CSP/安全头；证书 BLOCKED_EXTERNAL |
| Staging | CONFIG READY | docker-compose.staging + nginx；无服务器 |
| Worker/监控 | DONE | crash/restart 测试 + /metrics 端点 |
| Pilot Mode | DONE | invite-only + 反馈 + 指标 + 业务包 |
| Mini Release | BUILD_READY | 真机构建 + 微信登录 adapter；AppID BLOCKED_EXTERNAL |
| Mobile | BUILD_READY_SIGNING_BLOCKED | bundle 绿；无签名 |
| Final Gate | DONE | reports/STAGE_E_FINAL_GATE.md |

## 最终验证（真实命令）

- `pytest -q` → **267 passed**
- `ruff check services packages tests` → All checks passed
- Web/Admin build → Compiled successfully；Mini（weapp/alipay/tt）build 绿；Mobile tsc 0 + bundle 绿
- Playwright → **12/12 PASS**
- Migration → head（含 auth + pilot 新表）
- Demo seed → PASS（虚构宠物"豆包"全链路）

## Current blockers（外部）

1. git remote URL
2. 生产服务器 SSH / 域名 DNS / TLS 证书
3. 真实 AI Provider API key
4. 微信 AppID / 主体 / 备案
5. Apple / Google / HarmonyOS 账号与签名
6. SMTP 邮件账号

## 下一步（真实输入驱动）

下一阶段输入必须来自真实用户行为 / 医院 / 门店 / 训练师反馈 / 监控 / Outcome，
不再凭空扩 Feature。