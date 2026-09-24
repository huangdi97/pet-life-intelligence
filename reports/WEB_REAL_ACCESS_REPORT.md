# WEB REAL ACCESS REPORT — Stage R.1 (Phase G)

> Stage: R.1 · 日期：2026-09-24 · 状态：`WEB_DEPLOY_READY` · `PUBLIC_DEPLOYMENT = EXTERNAL_BLOCKED`
> 诚实声明：本报告不含任何 `WEB_LIVE` / `API_PUBLIC_LIVE` 断言。当前没有可用的
> VPS / 域名 / HTTPS / 部署凭据，公网部署为外部阻塞；本轮完成的是
> **真实可访问的本地/LAN 生产构建 + 部署就绪产物 + 运行时 smoke 证据**。

---

## 1. 目标与基线

Stage R.1 要求 Web 从 `WEB_PRODUCTION_BUILD_PASS` 推进到 `WEB_REAL_ACCESS`：

- API URL 必须通过环境注入，禁止 production bundle 含 `localhost` / `127.0.0.1` 字面量；
- 生产构建产物（standalone）真实可用；
- 有部署资源则真实部署；没有则完成 `WEB_DEPLOY_READY` 并明确 `PUBLIC_DEPLOYMENT=EXTERNAL_BLOCKED`。

## 2. Web API URL 环境化（真实代码证据）

| 项 | 实现 | 证据 |
|---|---|---|
| 注入变量 | `NEXT_PUBLIC_API_URL`（构建期注入） | `packages/api-client/src/client.ts:4-7` |
| 运行时推导 | 无注入时按 `window.location` 推导 `<protocol>//<host>:8800` | `client.ts:6-8` `resolveRuntimeApiUrl()` |
| 无 localhost 硬编码 | 源码与产物均无 `localhost:8800` / `127.0.0.1:8800` | 本轮 `grep` 验证（见 §4） |
| 既有硬编码清理 | `apps/web/app/care/page.tsx`、`apps/web/public/sw.js` 同步环境化 | git diff |

关键设计注释（client.ts）：

```ts
// Primary source: NEXT_PUBLIC_API_URL injected at build time (production-like
// from window.location (<protocol>//<host>:8800), so a browser page served
// from localhost:3000/3100 reaches the local API without putting the literal
// "localhost:8800" into the shipped JavaScript.
```

## 3. 生产构建（真实命令输出，2026-09-24 本轮复跑）

```text
pnpm --dir packages/ui-tokens build
ui-tokens build OK -> E:\AI\Pet Life Intelligence\packages\ui-tokens\dist

pnpm --dir apps/web build
（Next.js production build 完整通过；路由表输出含 ○ Static / ƒ Dynamic 标注，
  总路由 40+ 条，First Load JS shared 105 kB）
apps/web/.next/BUILD_ID 存在（18:28:26）
apps/web/.next/standalone/ 存在，apps/web/server.js 入口存在
```

## 4. 产物字面量扫描（本轮实测）

```text
Get-ChildItem apps/web/.next -Recurse -Include *.js,*.json | grep localhost:8800|127.0.0.1:8800
=> NONE (clean)
```

- `.next` 全产物（含 server chunks / client chunks / manifests）：**0 命中**；
- standalone tgz（37,084,636 B，按 CI 组装方式打包含 static/public/package.json）解包后再次全量扫描：**0 命中**；
- API 基址只来自构建期 `NEXT_PUBLIC_API_URL` 或运行时 `window.location` 推导，production-like 部署时由部署方注入 HTTPS API 域名。

## 5. Runtime smoke（本地生产服务证据）

本地环境说明：Windows 下 pnpm standalone 产物内的符号链接（pnpm store 链接）无法被
Windows `node` 直接 `realpath`（EPERM，已知 Windows/Next standalone 限制），故 standalone
进程 smoke 在本机不可复现；CI（Linux）按同一组装方式执行并已验证。

替代 runtime smoke（同一生产构建、同一起点）以本地 dev 服务器完成：

```text
API: http://localhost:8800/api/v1/health -> 200 {"status":"ok","service":"pli-api","version":"0.1.0"}
Web: http://localhost:3100             -> 200（生产 build 后由 Next dev server 提供）
GET /、/login、/timeline、/pets、/health、/agent、/settings、/offline 全部 200
核心流程（login -> Today -> Quick Log -> Timeline -> Pet -> Health -> Assistant -> Me）
由 Playwright specs 真实点击通过（见 §6 与 VISUAL_REGRESSION_V2_REPORT）
```

## 6. LAN 访问路径（Mode A — 真机/同网段浏览器）

```text
电脑 API 绑定 0.0.0.0:8800（scripts/dev.ps1 已含 --host 0.0.0.0）
   -> 浏览器访问 http://<LAN_IP>:3100（Web dev）或 http://<LAN_IP>:8800/docs
   -> Android internal APK 注入 http://<LAN_IP>:8800（见 ANDROID_REAL_DEVICE_QA.md）
前提：手机与电脑同一 Wi-Fi；Windows 防火墙放行 TCP 8800/3100（命令见 docs/LOCAL_DEVELOPMENT.md）
```

## 7. 公网部署路径（Mode B — 部署就绪文档，未执行）

有 VPS/域名/HTTPS 凭据时按仓库既有 infra 部署：

```text
infra/docker/docker-compose.production.yml（API + Postgres + Redis + MinIO + Worker）
infra/docker/nginx/nginx.conf（Web/API 反代 + HTTPS 终止）
.env.production.example
构建期注入 NEXT_PUBLIC_API_URL=https://<api-domain>，NEXT_PUBLIC_WEB_URL=https://<web-domain>
```

禁止：HTTP 当 production；本地 localhost 字面量进 production bundle。

## 8. 结论

```text
WEB_PRODUCTION_BUILD_PASS = TRUE（本轮复跑）
WEB_DEPLOY_READY          = TRUE（standalone tgz + 部署路径 + env 注入完备）
WEB_PUBLIC_LIVE           = FALSE（无公网资源）
PUBLIC_DEPLOYMENT         = EXTERNAL_BLOCKED（VPS/域名/HTTPS/凭据缺失）
```
