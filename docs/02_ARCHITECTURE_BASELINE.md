# Architecture Baseline

## Seven layers

1. Identity & Permission
2. Event & Timeline Fabric
3. State / Baseline
4. Behavior / Health Intelligence
5. Relationship / Care Network
6. External Service / Device Adapters（v0.1 only boundary）
7. Agent Orchestrator

## Monorepo

```text
apps/
  web/
services/
  api/
  worker/
  ai-gateway/
packages/
  domain-schema/
  api-client/
  rules/
docs/
data/
tests/
infra/
scripts/
```

## v0.1 runtime

```text
Next.js Web
    |
    v
FastAPI API ---- PostgreSQL/pgvector
    |                  |
    |                  +-- canonical records/events
    |
    +---- Redis
    |
    +---- MinIO/S3
    |
    +---- AI Gateway
              |
              +-- Mock Provider (required)
              +-- Real Provider (optional)
```

## 不做过早微服务

`api / worker / ai-gateway` 是清晰边界，不要求今晚部署为复杂 K8s 微服务。
优先保证：
- contract 清楚
- 可测试
- 可观测
- 可替换
