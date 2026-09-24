# MOBILE API CONFIGURATION REPORT — Stage R.1 (PLI-07 real access)

> Stage: R.1 · 日期：2026-09-24 · 状态：`ANDROID_API_ENV_READY`
> 目标：消除 APK 写死 localhost 的缺陷，建立 environment-driven API base URL + fail-safe。

## 1. 背景缺陷（v0.1.0 时的真实问题）

```text
apps/mobile/app.json  extra.apiUrl = http://localhost:8800
```

真机上 `localhost` = 手机自己，因此 v0.1.0 APK 无法默认连接电脑后端。
Stage R.1 将其改为 Environment-driven（app.config.js + apiConfig.ts + fail-safe 屏）。

## 2. 实现（已合入工作树，本轮复核）

| 文件 | 职责 |
|---|---|
| `apps/mobile/app.config.js` | 动态 manifest：从 `EXPO_PUBLIC_PLI_API_URL` 注入 `extra.apiUrl`；**无 localhost 回退** |
| `apps/mobile/src/apiConfig.ts` | 优先级：`process.env.EXPO_PUBLIC_PLI_API_URL` > `Constants.expoConfig.extra.apiUrl`；合法性校验（必须 `http(s)://` 开头） |
| `apps/mobile/App.tsx` | 入口 fail-safe：API URL 缺失/非法 → 渲染 `ApiConfigErrorScreen`（不无限 loading） |
| `apps/mobile/src/screens/ApiConfigErrorScreen.tsx` | 环境配置错误屏（用户可读，不暴露 stack） |
| `apps/mobile/manifest-cleartext.js` | 仅对 `http://` 的 DEV/INTERNAL 构建放行 `usesCleartextTraffic`（https/缺失保持默认禁明文） |
| `apps/mobile/package.json` | + `@expo/config-plugins`（本地插件支持） |

关键设计注释（apiConfig.ts）：

```ts
// Priority: EXPO_PUBLIC_PLI_API_URL (inlined at bundle time by
// babel-preset-expo AND carried via app.config.js into extra.apiUrl) over
// expoConfig.extra.apiUrl. There is deliberately NO localhost fallback:
// a build without a valid URL must surface a config-error screen instead of
// silently dialing the phone's own loopback.
```

## 3. 四档配置

| 档位 | EXPO_PUBLIC_PLI_API_URL 注入方式 | 明文 HTTP | 说明 |
|---|---|---|---|
| development（本地） | `http://localhost:8800`（本地 dev） | 允许（DEV） | 模拟器/同机调试 |
| **LAN（internal，本轮）** | `http://<实测LAN_IP>:8800`（如 `http://192.168.0.100:8800`） | 允许（INTERNAL） | 真机 + 电脑同 Wi-Fi；cleartext 仅此档放行 |
| staging | `https://<staging-api-domain>`（待公网资源） | 禁止 | EXTERNAL_BLOCKED 直到有服务器/域名/HTTPS |
| production | `https://<prod-api-domain>` | 禁止 | production-like 必须 HTTPS |

`app.config.js` 对三种情况处理：

- URL 为空 → 不写 `extra.apiUrl` → 运行时 `getApiConfigIssue() = "MISSING"` → fail-safe 屏。
- URL 非法（非 http/https 开头）→ `"INVALID"` → fail-safe 屏。
- URL 为 `http://` → manifest-cleartext 插件把 release `usesCleartextTraffic` 置 true（仅此档）。

## 4. Fail-safe 验证

- 无 env 构建：`apiConfig.resolveApiBaseUrl()` 返回 null → `App.tsx` 渲染 ApiConfigErrorScreen（不无限 loading、不静默连本机 loopback）。
- 已注入 LAN URL 构建：bundle 含 `192.168.0.100`、不含 `localhost:8800`（见 §5 实测证据）。

## 5. 本轮实测证据（真实命令输出）

### 5.1 LAN URL 注入（APK bundle 检查）

```text
$ env EXPO_PUBLIC_PLI_API_URL=http://192.168.0.100:8800 → expo prebuild → gradlew assembleRelease
解包 app-release.apk 后检查 assets/index.android.bundle：
  bundle contains 192.168.0.100: True
  bundle contains localhost:8800:   False
  bundle contains 127.0.0.1:       False
```

### 5.2 失败保护（无 env 构建）

```text
未注入 env 时 app.config extra = {}（无 apiUrl），运行时按 apiConfig.ts 进入
getApiConfigIssue()==="MISSING" → ApiConfigErrorScreen。已有 App.tsx 入口单测/渲染证据。
```

### 5.3 后端绑定（LAN 可达）

```text
scripts/dev.ps1: uvicorn app.main:app --host 0.0.0.0 --port 8800
实测：http://192.168.0.100:8800/api/v1/health -> 200 {"status":"ok"}
      http://localhost:8800/api/v1/ready     -> {"status":"ready","checks":{"postgres":"ok","redis":"ok"}}
0.0.0.0 绑定仅限 DEV/INTERNAL；production-like 仅 HTTPS（见 docs/LOCAL_DEVELOPMENT.md、DEPLOYMENT.md）。
```

### 5.4 CORS（LAN Web origin）

```text
.env 已记录 CORS_ORIGINS 追加 http://192.168.0.100:3100（DEV/INTERNAL 专用）。
实测：GET /api/v1/health 带 Origin: http://192.168.0.100:3100
  -> Access-Control-Allow-Origin: http://192.168.0.100:3100
production 校验逻辑（config.py validate_production）不允许 *，且要求 HTTPS。
```

### 5.5 Windows 防火墙（文档记录，不做系统自动修改）

```powershell
# 管理员 PowerShell（记录于 docs/LOCAL_DEVELOPMENT.md §LAN 真机链路）
New-NetFirewallRule -DisplayName "PLI dev API 8800 (LAN)" -Direction Inbound -Protocol TCP -LocalPort 8800 -Action Allow
```

## 6. 结论

```text
ANDROID_API_ENV_READY = TRUE
localhost 写死（extra.apiUrl=localhost:8800）已从构建路径移除
四档配置：dev / LAN(internal) / staging / production
fail-safe：无 env / 非法 env → ApiConfigErrorScreen（已实现）
LAN 链路实测：API 0.0.0.0:8800 + Web :3100 + CORS + bundle URL 注入 全部 PASS
```
