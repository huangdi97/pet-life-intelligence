# LOCAL_DEVELOPMENT — 本地开发指南

## 前置

- Python 3.12+，Node 22+，pnpm 9+，Docker Desktop。
- 端口约定：API 8800 / Web 3000（dev）或 3100（prod build）/ PG 55432 / Redis 56379 / MinIO 59000 / Admin 3200。

## 一键启动

```powershell
.\scripts\dev.ps1
```

等价手工步骤：

```powershell
docker compose up -d                     # postgres/redis/minio
.\.venv\Scripts\python.exe -m pip install -e "services/api[dev]" -e "packages/rules" -e "services/ai-gateway"
pnpm install
cd services\api; ..\..\.venv\Scripts\python.exe -m alembic upgrade head; ..\..\.venv\Scripts\python.exe -m app.seed
# 三个进程
cd services\api; ..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8800
cd apps\web; pnpm dev -p 3000
.\.venv\Scripts\python.exe services\worker\main.py --loop 60
```

## 环境文件

- `.env.example` → 复制为 `.env`（根目录）。
- 前端 API 地址：`apps/web` 用 `NEXT_PUBLIC_API_URL`（默认 `http://localhost:8800`）；
  `apps/mini` 用 `TARO_APP_API_URL`；`apps/mobile` 用 `app.json extra.apiUrl`。

## Demo 账号（dev-auth）

- owner@pli.demo（Owner）/ family@pli.demo（Family）/ sitter@pli.demo（临时照护）。

## 测试

```powershell
.\.venv\Scripts\python.exe -m pytest -q            # 239 全量
.\.venv\Scripts\python.exe -m ruff check services packages tests
.\.venv\Scripts\python.exe scripts\staging_smoke.py # 需 API 已起
cd tests\e2e-browser; pnpm exec playwright test     # 需 API+Web 已起
```

## 各客户端构建

```powershell
pnpm --dir packages/ui-tokens build
pnpm --dir apps/web build
pnpm --dir apps/admin build
pnpm --dir apps/mini build:weapp     # 或 build:alipay / build:tt
pnpm --dir apps/mobile exec expo export --platform android
```

## 重置数据

```powershell
.\scripts\reset-demo.ps1
```