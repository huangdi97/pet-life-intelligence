# PLI_STAGE_E_REAL_LAUNCH_REPORT

- Date: 2026-09-14
- 起点：`PLI_V1_0_PRODUCTION_READY_MULTI_CLIENT`
- 终点（诚实）：**`PLI_V1_0_WEB_READY_PILOT_READY` / `RELEASE_READY_EXTERNAL_BLOCKED`**

## Git

| 项 | 值 |
|---|---|
| Branch | `main` |
| 本阶段提交 | 12 个（auth / ai / infra / pilot / mini / docs） |
| Tags | `v1.0.0`, `v1.1.0`（保留） |
| Remote | 无（EXTERNAL_BLOCKED；GIT_REMOTE_HANDOFF.md） |

## 客户端

| 客户端 | 状态 |
|---|---|
| Web | **READY**（build 绿；12/12 Playwright；注册/登录/重置 UI 完成） |
| PWA | **READY** |
| H5 Share | **READY** |
| WeChat Mini | **BUILD_READY + 真实登录 adapter**；SUBMISSION BLOCKED（无 AppID/主体） |
| Alipay / Douyin Mini | BUILD_READY |
| iOS / Android | BUILD_READY_SIGNING_BLOCKED |
| HarmonyOS | PORT_READY |
| Admin | READY |
| Professional | READY |
| **Pilot** | **READY（模式已实现，待公网部署）** |

## 环境 / 部署

| 环境 | 状态 |
|---|---|
| Local | **DONE**（全部 GREEN） |
| Staging | CONFIG READY（compose + nginx）；无服务器 → BLOCKED |
| Pilot | CONFIG READY（PILOT_MODE=true + invite-only）；待部署 |
| Production | CONFIG READY（fail-fast 校验）；待部署 |

## Auth

- Argon2id 密码；opaque rotating tokens（access 30min / refresh 14d, rotating + family reuse detection）
- 注册/登录/刷新/登出/忘记密码/重置/邮箱验证/会话列表/撤销会话/改密/删号/限流
- dev-auth 仅限 local/test；生产 fail-fast 拒绝 DEV_AUTH_ENABLED=true
- 微信登录 adapter（jscode2session，无凭据时诚实 EXTERNAL_BLOCKED）
- **注册自动创建 household**（修复真实用户无法建档的 blocker）

## AI Provider

- OpenAI-compatible provider REAL_READY（通过 AI Gateway，schema+JSON 强制）
- 无 key → 诚实 `/ai/status` real:false + mock fallback（产品不崩）
- 真实 key 需外部提供（EXTERNAL_BLOCKED）

## 测试

| 项 | 值 |
|---|---|
| pytest | **267 PASS**（含 auth 11、pilot 5、config 4、onboarding 2、worker crash 2、ai provider 4） |
| Playwright | **12/12 PASS**（含 2 条真实注册/登录/重置浏览器 E2E） |
| ruff | PASS |
| Web/Admin/Mini/Mobile build | PASS |
| Migration | head |

## 安全 / 隐私 / 医疗安全

- Security：ga 全绿 + IDOR E2E + 生产配置 fail-fast + 限流 + 审计
- Privacy：导出/删除/撤销/邀请码审计 + 登录尝试记录
- Medical Safety：规则引擎独立 + AI 决策字段禁止 + 医疗攻击测试全绿

## 性能

- 本地 perf 基线 p95<1s（历史）；公网性能未测（无服务器）

## 备份 / 恢复

- 历史 backup/restore round2 PASS + runbook；生产正式备份待部署后执行

## 监控

- /metrics 端点（pets/events/AI/登录失败/安全事件/未关事件）+ 结构化日志 + health/ready + 事故 runbook

## Pilot

- Invite-only（管理员生成单次码）；注册门禁；反馈通道（bug/confusing/feature/health/other）
- 指标（北极星：Active Pets with Continuous Evidence Chain）
- 业务包：DEMO_SCRIPT / VET_PILOT / PET_STORE_PILOT / TRAINER_PILOT / CARE_SERVICE_PILOT / PILOT_CONSENT / SUPPORT_OPS
- Demo 数据集脚本（虚构宠物"豆包"全链路）

## Blockers（真实外部）

1. 无 git remote URL
2. 无生产服务器 SSH / 域名 DNS / TLS 证书
3. 无真实 AI Provider API key
4. 无微信 AppID / 主体 / 备案
5. 无 Apple / Google / HarmonyOS 账号与签名
6. 无邮件 SMTP 账号（EMAIL_DELIVERY=smtp 待接）

## 结论

```text
PLI_V1_0_WEB_READY_PILOT_READY
RELEASE_READY_EXTERNAL_BLOCKED
```

不是 `WEB_LIVE`：因为公网部署/域名/HTTPS/平台账号均为外部条件。
所有不依赖外部条件的 Stage E 工作已真实完成并验证。