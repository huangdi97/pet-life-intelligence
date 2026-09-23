# DEPENDENCY AUDIT（Stage V）
- 报告日期：2026-09-23
- 范围：Python（services/api、ai-gateway、rules）、Node（apps/web、admin、mini、mobile、pro、packages/*）、Docker（docker-compose.yml）

## 1. Python

| 包 | 版本约束 | 判定 |
|---|---|---|
| fastapi | >=0.115 | ACCEPT（稳定线） |
| uvicorn[standard] | >=0.30 | ACCEPT |
| pydantic / pydantic-settings | >=2.9 / >=2.5 | ACCEPT |
| sqlalchemy[asyncio] | >=2.0 | ACCEPT |
| asyncpg / psycopg[binary] | >=0.29 / >=3.1 | ACCEPT（生产 PostgreSQL 双驱动兼容） |
| alembic | >=1.13 | ACCEPT |
| redis | >=5.0 | ACCEPT |
| httpx | >=0.27 | ACCEPT |
| minio | >=7.2 | ACCEPT |
| email-validator / structlog | >=2.1 / >=24.0 | ACCEPT |
| openpyxl | 3.1.5（本 Stage 仅审计工具安装于 venv，**不在项目依赖内**） | ACCEPT（工具用途） |

未发现已知高危 CVE 需 MUST_FIX 的 Python 运行时依赖；无重复版本（单一 venv）。license：全部 OSI 兼容（MIT/Apache/BSD/PSF）。**MUST_FIX=0**。

## 2. Node（pnpm workspace，lockfile 一致）

| 端 | 关键依赖 | 版本 | 判定 |
|---|---|---|---|
| web | next / react / react-dom | 15.1.6 / 19.0.0 | ACCEPT（Stage F 已锁定并修复 bundle 问题） |
| admin / pro | next / react | 15.1.6 / 19.0.0 | ACCEPT |
| mini | @tarojs/* | 4.0.9 | ACCEPT（Taro 4 稳定线；weapp 构建 PASS） |
| mobile | expo / react-native | ~51.0.0 / 0.74.5 | ACCEPT（typecheck 0；真机 EXTERNAL_BLOCKED） |
| api-client / ui-tokens / ui-kit | workspace 内 link | — | ACCEPT（无重复版本） |

`pnpm-lock.yaml` 一致（`pnpm install --frozen-lockfile` 语义：Stage H 提交含 lockfile 更新，无漂移）。**MUST_FIX=0**；Playwright 1.63 仅 devDependency。

## 3. Docker

- `docker-compose.yml`：postgres(pgvector:pg16) / redis(7-alpine) / minio——全部官方镜像，无废弃 tag；本 Stage 容器健康（docker ps 实测）。
- 端口环境变量覆盖（PG host 55679 等）已记录于 dev.ps1；无外部软件仓库强依赖。

## 4. 结论
`DEPENDENCY_AUDIT_PASS`：MUST_FIX=0；SHOULD_FIX=0；无未使用/重复版本；lockfile 一致；license 兼容。不盲目升级（依赖纪律），真实升级建议仅随 Pilot 反馈执行。
