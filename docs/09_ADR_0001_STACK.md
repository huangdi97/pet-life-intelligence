# ADR-0001 — v0.1 技术栈

Status: Proposed baseline

## Decision
- Next.js + React + TypeScript
- FastAPI + Python
- PostgreSQL + pgvector
- Redis
- MinIO/S3
- Alembic
- Docker Compose
- JSON Schema / Pydantic
- independent AI gateway

## Context
项目 AI-heavy，但事务、权限和 Event Graph 同样关键。首版避免过早 K8s 与复杂微服务。

## Consequence
- Python AI 生态顺畅
- TS Web 快速
- 两端模型需要统一 canonical JSON schema，而不是各自定义类型
