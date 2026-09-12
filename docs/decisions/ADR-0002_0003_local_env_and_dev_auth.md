# ADR-0002 — 端口重映射与存储降级策略

Status: Accepted
Date: 2026-09-13

## Context

本机 5432 / 6379 / 9000 / 9001 已被其他项目容器占用，8000 被 wslrelay
占用，3000 被另一开发服务占用。PLI 不能影响既有服务，也不能删除它们。

## Decision

1. PLI 本地端口整体迁移：PostgreSQL 55432、Redis 56379、MinIO 59000/59001、
   API 8800、Web 3100。`.env.example` / docker-compose / 脚本统一。
2. 对象存储实现 StorageBackend 接口：MinIO 优先，不可用时自动降级本地磁盘
   （artifacts/uploads/）。artifact 行记录 storage_backend 以便追溯。
3. AI Gateway 以 Python 包（接口契约）为边界：默认进程内调用（离线可测），
   预留 HTTP 服务形态。不做跨进程部署要求。

## Consequences

- 新环境需同步更新防火墙/脚本中的端口号。
- 本地磁盘存储模式仅限开发/降级场景；生产使用 MinIO/S3。
- gateway 真实 provider 接入时保持同一接口与元数据审计。

---

# ADR-0003 — Dev 认证（v0.1）

Status: Accepted
Date: 2026-09-13

## Context

v0.1 聚焦事件图/权限/安全闭环验证，登录方式不是 P0；但权限测试需要
可切换的多用户身份。

## Decision

- `POST /auth/dev/login` 用 email 换取 HMAC 签名会话 cookie；
  测试可使用 `X-Dev-User-Id` 头。`DEV_AUTH_ENABLED=false` 时拒绝。
- 种子账号：owner/family/sitter@pli.demo。
- 真实认证（密码+OIDC+设备管理）推迟至 v0.2，PLI-217 记录部分完成
  （SecurityEvent/audit 已落）。

## Consequences

- 不能部署到公网作为生产实例。
- 权限矩阵与越权负例已按"真实认证将来的语义"设计，切换登录方式
  不需要改授权层。
