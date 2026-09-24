# LOCAL_DEVELOPMENT — 本地开发指南

## 前置

- Python 3.12+，Node 22+，pnpm 9+，Docker Desktop。
- 端口约定：API 8800 / Web 3000（dev）或 3100（prod build）/ PG 55432 / Redis 56379 / MinIO 59000 / Admin 3200。
  （本机若被 Windows WinNAT 占用，可用 `PLI_PG_PORT` / `PLI_REDIS_PORT` 覆盖，见 docker-compose.yml。）
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
cd services\api; ..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8800
cd apps\web; pnpm dev -p 3100
.\\.venv\Scripts\python.exe services\worker\main.py --loop 60
```

> **0.0.0.0 绑定仅限 DEV/INTERNAL**：`dev.ps1` 与上例把 uvicorn 绑到 `0.0.0.0`，
> 使同一局域网的手机/平板可访问 API。这不是 production change——
> production-like 部署只允许 HTTPS 且由反向代理暴露（见 DEPLOYMENT.md）。

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
## LAN 真机链路（DEV/INTERNAL，Stage R.1）

让同一 Wi-Fi 下的 Android 手机访问开发机后端（仅限 DEV/INTERNAL，不作 production）：

```powershell
# 1) 确认开发机 LAN IP（排除 172.x 虚拟网卡；以下为实测值，以你机器为准）
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "172.*" -and $_.IPAddress -ne "127.0.0.1" }
# 本机实测：192.168.0.100（WLAN）

# 2) API 已按 dev.ps1 绑定 0.0.0.0:8800（见上）

# 3) 放行 Windows 防火墙入站 TCP 8800（管理员 PowerShell；仅开发机放行）
New-NetFirewallRule -DisplayName "PLI dev API 8800 (LAN)" -Direction Inbound -Protocol TCP -LocalPort 8800 -Action Allow

# 4) CORS：在 .env 的 CORS_ORIGINS 追加 LAN Web origin（仅 DEV/INTERNAL）
#    CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3100,http://127.0.0.1:3100,http://192.168.0.100:3100
#    production 校验逻辑不允许 *，且 production-like 必须 HTTPS（config.py validate_production）

# 5) 构建 v0.1.1 internal-LAN APK（指向开发机 LAN IP）
$env:EXPO_PUBLIC_PLI_API_URL = "http://192.168.0.100:8800"
pnpm --dir apps/mobile exec expo prebuild --platform android --non-interactive
cd apps/mobile/android; .\gradlew assembleRelease --no-daemon
# 产物：app/build/outputs/apk/release/app-release.apk（DEBUG_SIGNED_INSTALLABLE_APK，见 MOBILE_RELEASE.md）
```

> HTTP 明文（cleartext）仅对 http:// 的 DEV/INTERNAL 构建放行（app.config.js + manifest-cleartext 插件）。
> 手机与电脑必须在同一局域网；手机通过 `http://<LAN_IP>:8800` 访问 API、`http://<LAN_IP>:3100` 访问 Web。
> 公网/生产部署必须 HTTPS，见 DEPLOYMENT.md。