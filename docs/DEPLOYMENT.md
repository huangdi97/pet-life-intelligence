# DEPLOYMENT — 部署指南

## 目标拓扑

```
                reverse-proxy (nginx, HTTPS)
                 │         │         │
            api:8800   web:3100   admin:3200
                 │
           postgres / redis / S3（外部）
```

## 环境

- 复制 `.env.production.example` → 服务器 `.env.production`，填写真实密钥（openssl rand -hex 32 生成 SESSION_SECRET / CARE_CARD_SIGNING_SECRET）。
- 生产禁止 `DEV_AUTH_ENABLED=true`；`JSON_LOGS_ENABLED=true`；`RATE_LIMIT_ENABLED=true`；`DB_POOL_ENABLED=true`。

## 构建镜像

```bash
docker compose -f infra/docker/docker-compose.production.yml --env-file .env.production build
```

## 部署

```bash
docker compose -f infra/docker/docker-compose.production.yml --env-file .env.production up -d
docker compose -f infra/docker/docker-compose.production.yml --env-file .env.production exec api alembic upgrade head
```

## 发布顺序（GOAL §51）

```
main → staging 构建 → 冒烟/E2E → 人工批准 → canary/feature flag → 生产部署 → post-deploy smoke
```

禁止 push main 直接自动全量生产。

## 健康检查

- `GET /api/v1/health` — liveness。
- `GET /api/v1/ready` — readiness（校验 DB + Redis；AI provider 故障不使整体失败）。
- `GET /api/v1/ready/db` — DB 专项。

## 回滚（GOAL §75）

1. 应用回滚：docker compose 指定上一 tag 重新 up。
2. 立即止血：Feature Flag 关闭（`POST /api/v1/ops/feature-flags`）。
3. 模型回滚：改 `AI_MODEL` / prompt version 配置重启。
4. DB 迁移：forward-fix 优先；不假设回滚 DDL 安全。

## 注意事项

- 生产不用 `--reload` / `next dev`。
- 媒体对象存 S3（`STORAGE_BACKEND=minio` 指向 S3-compatible），数据库不存二进制。
- 日志 JSON 格式输出到 stdout，由外部采集（ELK/Loki）聚合。