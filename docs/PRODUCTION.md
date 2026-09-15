# PRODUCTION — 生产环境

## 上线判定

本仓库当前：`PLI_V1_0_PRODUCTION_READY_MULTI_CLIENT`（代码/构建/测试/安全全部 GREEN）。
真实发布依赖外部条件（见 PRODUCTION_READINESS_REPORT.md），未满足时如实标记 `EXTERNAL_BLOCKED`。

## 生产红线

- `DEV_AUTH_ENABLED=false`（无 dev header 认证）。
- CORS 白名单为真实域名；`RATE_LIMIT_ENABLED=true`。
- 日志 JSON；健康检查对外可用但只暴露状态。
- 生产不自动导入 seed/demo 数据（GOAL §56）。
- 医疗安全规则只在服务端；客户端展示服务端结果。

## 上线执行清单

1. [ ] `.env.production` 配置完成（密钥已生成，未入库）。
2. [ ] 镜像构建 + 签名（如需要）。
3. [ ] 迁移空库 → head 成功。
4. [ ] `/health` `/ready` 200。
5. [ ] 远程 smoke：创建宠物/Quick Log/Timeline/Health/Vet Brief。
6. [ ] 备份策略已接（pg_dump 定时 + S3）。
7. [ ] 监控告警（API p95 / 5xx / DB / 队列 / AI 成本 / 红旗事件）。
8. [ ] 事故响应 runbook 就绪。

## 生产数据迁移 Gate

- 支持 `empty → head` 与 `previous release → head`。
- 迁移不允许启动时隐式危险执行（由 deploy 步骤显式 `alembic upgrade head`）。

## 发布冻结

- 生产候选后进入 Release Freeze：只允许 bug/security/safety/critical UX/release blocker。
- 版本语义遵循 SemVer；本仓库已存在 v1.0.0 tag，后续为 v1.0.1…