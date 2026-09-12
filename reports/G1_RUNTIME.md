# G1 — Runtime Report

- Date: 2026-09-13
- Verdict: **PASS**

## Port remap (environment constraint)

Host ports 5432 / 6379 / 9000 / 9001 / 8000 / 3000 were already occupied by
other local projects (`petaccess-*` containers, `wslrelay`, another dev
server). Other projects' containers were **not touched**. PLI remapped:

| Service | Host port |
|---|---|
| PostgreSQL (pgvector pg16) | 55432 |
| Redis 7 | 56379 |
| MinIO | 59000 (console 59001) |
| FastAPI | 8800 |
| Next.js web | 3100 |

## Evidence (real commands)

```text
$ docker compose up -d
 petlifeintelligence-postgres-1 Started
 petlifeintelligence-redis-1 Started
 petlifeintelligence-minio-1 Started

$ docker compose ps
 all three containers Up (healthy)

$ pip install -e "services/api[dev]" -e "packages/rules" -e "services/ai-gateway"   → exit 0
$ pnpm install                                                                       → exit 0 (2m43s)

$ curl http://localhost:8800/api/v1/health
 {"status":"ok","service":"pli-api","version":"0.1.0"}

$ curl http://localhost:8800/api/v1/ready
 {"status":"ready","checks":{"postgres":"ok","redis":"ok"}}

$ curl http://localhost:8800/api/v1/ready/engine-info
 {"rule_engine":"pli_red_flag_engine","rule_engine_version":"1.0.0","rule_count":10}

$ curl http://localhost:3100/
 200 OK, <title>Pet Life Intelligence</title>

$ curl http://localhost:8800/api/v1/pets   (unauthenticated)
 {"error":{"code":"UNAUTHENTICATED",...}} — error envelope per docs/04
```

## G1 checklist

- [x] docker compose config 有效（3 healthy containers）
- [x] 依赖可安装（pip + pnpm，exit 0）
- [x] API `/health` 200
- [x] Web 首页可打开（3100，200 + 正确 title）
- [x] `.env.example` 完整（DB/Redis/S3/AI/dev-auth/ports）
- [x] secrets 未提交（.env gitignored；compose 里只有 dev 凭据）
