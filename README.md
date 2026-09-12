# Pet Life Intelligence — v0.1

宠物生命智能平台的最小可信闭环：**身份 + 事件时间线 / 今日与照护 / 行为与健康安全**。

v0.1 验证三角（GOAL 冻结范围）：

- **A. Identity + Timeline** — 这是谁？发生过什么？谁记录的？来源是什么？
- **B. Daily + Care** — 今天发生了什么？谁做的？重复执行冲突？临时照护？
- **C. Behavior + Health** — 可观察事实 → 独立红旗规则引擎 → 分级 → Vet Brief → 用药 → Outcome

50 个 P0 功能见 `docs/01_V01_SCOPE_50_P0.md`；实现状态见 `FINAL_RELEASE_REPORT.md`。

## Windows PowerShell 从零启动

```powershell
cd "E:\AI\Pet Life Intelligence"

# 1. 本地依赖（PostgreSQL 55432 / Redis 56379 / MinIO 59000）
docker compose up -d

# 2. Python 环境
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e "services/api[dev]" -e "packages/rules" -e "services/ai-gateway"

# 3. 前端依赖
corepack enable
pnpm install

# 4. 数据库迁移 + 演示数据
cd services\api
..\..\.venv\Scripts\python.exe -m alembic upgrade head
..\..\.venv\Scripts\python.exe -m app.seed
cd ..\..

# 5. 启动（三个窗口）
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir services\api --port 8800   # API
pnpm --dir apps\web dev -p 3100                                                          # Web
.\.venv\Scripts\python.exe services\worker\main.py --loop 60                             # Worker
```

或一键：`.\scripts\dev.ps1`

- API 文档：http://localhost:8800/docs
- Web：http://localhost:3100 （登录 owner@pli.demo / family@pli.demo / sitter@pli.demo）
- 端口说明：本机 5432/6379/9000/8000/3000 被其他项目占用，PLI 使用 55432/56379/59000/8800/3100。

## Docker

`docker-compose.yml` 提供 PostgreSQL(pgvector)+Redis+MinIO 及健康检查；应用本身用本地 venv/pnpm 运行（见上）。

## 迁移

```powershell
cd services\api
..\..\.venv\Scripts\python.exe -m alembic upgrade head      # 升级
..\..\.venv\Scripts\python.exe -m alembic downgrade -1      # 回退一个版本
```

## 测试

```powershell
.\.venv\Scripts\python.exe -m pytest -q        # 106 项（unit/safety/ai-evals/contract/integration/e2e）
.\.venv\Scripts\python.exe -m ruff check services/api services/worker packages/rules services/ai-gateway
pnpm --dir apps\web typecheck
pnpm --dir apps\web build
```

或一键：`.\scripts\test-all.ps1` / `.\scripts\ci-local.ps1`

## 重置演示数据

```powershell
.\scripts\reset-demo.ps1
```

## 关闭

关闭三个进程窗口；`docker compose down` 停依赖（数据保留在 volume；`docker compose down -v` 才会清库）。

## 安全边界（务必阅读）

- `docs/05_AI_AND_SAFETY.md`：红旗规则引擎独立，LLM 不得单独裁决 emergency
- `docs/08_SECURITY_PRIVACY.md`：权限/令牌/上传/删除策略
- `SECURITY.md`、`PRIVACY_MODEL.md`、`LIMITATIONS.md`、`RUNBOOK.md`
