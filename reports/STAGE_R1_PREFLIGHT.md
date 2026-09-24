# STAGE R.1 Preflight — Repository Reality Record

> Stage: R.1 (Real Access & Device Closure, LAN 优先, v0.1.1)
> Generated: 2026-09-24 (local time, execution start)
> Purpose: 客观记录本轮开始时的仓库事实（git 输出），并声明对未提交进行中改动的保留承诺。

## 1. Git 事实（执行前原始输出）

### 1.1 HEAD / branch / remote / tags / describe

```text
git branch --show-current
main

git rev-parse HEAD
1bf7581996c9fc47f160a8cb63fad51d2a2a6308

git rev-parse origin/main
1bf7581996c9fc47f160a8cb63fad51d2a2a6308

git describe --tags --always
v0.1.0

git remote -v
origin  https://github.com/huangdi97/pet-life-intelligence.git (fetch)
origin  https://github.com/huangdi97/pet-life-intelligence.git (push)

git tag
v0.1.0
v1.0.0
v1.1.0
v1.1.1
v1.2.0
```

### 1.2 git log --oneline -12（节选）

```text
1bf7581 docs(stage-r): v0.1.0 release closure — CHANGELOG v0.1.0, README aligned,
        WORK_STATUS terminal, GIT_REMOTE_HANDOFF connected, STAGE_R release report [PLI-STAGER]
7717d7d fix(stage-r): pin Playwright config by root-relative path [PLI-STAGER]
81449bd fix(stage-r): explicit --config for Playwright e2e [PLI-STAGER]
2025390 chore(stage-r): regenerate OpenAPI artifact (187 paths) [PLI-STAGER]
ce6df09 chore(stage-r): fix CI/Android deps [PLI-STAGER]
a41f9ac fix(stage-r): CI minio image pinned; refresh visual baselines at 29/29 pass [PLI-STAGER]
... (完整 20 条在 `git log --oneline -20` 输出中，不再赘述)
```

### 1.3 git status --short（本轮开始时）

```text
 M apps/mobile/App.tsx
 M apps/mobile/app.json
 M apps/mobile/src/api.ts
?? .pi/goal/pli-stage-r-1-real-access-device-closure-收口-lan-优先-v0-1-1-20260924-1308.md
?? .pi/goal/stage-r-1-real-access-device-closure-lan-先行-v0-1-1-收口-20260924-1244.md
?? Pet_Life_Intelligence_v3.3-R1_产品技术UIUX多端体验Pilot前收口Companion与个体3D生命界面_统一全量母版_2026-09-20.md
?? apps/mobile/app.config.js
?? apps/mobile/src/apiConfig.ts
?? apps/mobile/src/screens/ApiConfigErrorScreen.tsx
```

> 注：`git status --short` 中的中文文件名在 Windows PowerShell 下以八进制转义显示，真实文件名为上表所示中文名。
> 另有 `.pi/goal/stage-r-1-...-20260924-1244.md`（更早一版 goal 草稿），同样保留。

## 2. 对未提交进行中改动的保留承诺（契约 A.1）

以下用户进行中改动在本轮**全部保留并纳入最终 commit**，禁止 `git clean` / `git reset --hard` /
`git checkout -- .` 等丢弃动作：

| 路径 | 状态 | 在本轮中的角色 |
|---|---|---|
| `apps/mobile/App.tsx` | M | API env fail-safe 渲染入口（保留并继续） |
| `apps/mobile/app.json` | M | version 0.1.1 / versionCode 2 / Android 显示名 / 图标引用（保留并继续） |
| `apps/mobile/src/api.ts` | M | env 驱动 API 基址（保留并继续；注释措辞微调见 B 章） |
| `apps/mobile/app.config.js` | ?? | EXPO_PUBLIC_PLI_API_URL 注入 + cleartext policy（保留） |
| `apps/mobile/src/apiConfig.ts` | ?? | API 配置解析 + fail-safe issue 判定（保留） |
| `apps/mobile/src/screens/ApiConfigErrorScreen.tsx` | ?? | 环境配置错误屏（保留） |
| `Pet_Life_Intelligence_v3.3-R1_..._2026-09-20.md` | ?? | v3.3-R1 母版 → 移入 `docs/canonical/PLI_v3.3-R1.md` |
| `.pi/goal/*` | ?? | goal 契约文件（保留） |

## 3. 本轮运行环境

```text
OS            Windows (PowerShell)
Node          v22.15.0
pnpm          12.4.1
Python        3.13.14 (.venv 同版本)
Java          Temurin 21.0.12.1 LTS
Android SDK   C:\Users\Kaiser\AppData\Local\Android\Sdk (存在)
LAN IP        192.168.0.103 (候选；172.25.64.1 / 172.29.160.1 为虚拟网卡)
GitHub CLI    gh 2.96.0, 已登录 huangdi97
```

## 4. 已知事实与约束（进入 Phase B 前）

- `main` 与 `origin/main` 一致（1bf7581），无未推送提交。
- tag `v0.1.0` → 1bf7581（本轮禁止移动/删除/改写其历史）。
- `apps/mobile/android/` 为 gitignored 生成目录（`git ls-files` 为空），`expo prebuild --clean` 安全。
- `apps/mobile/assets/` 当前仅有 Expo 默认 `icon.png`（7311 B），无 adaptive-icon / splash → Phase H 需生成品牌资源。
- 根目录游离 v3.3-R1 母版文件未跟踪 → Phase B 移入 canonical。
- `docs/canonical/` 当前为空目录 → Phase B 建索引。
- 本地 API 栈：backend uvicorn :8800 / web :3100 / postgres 55432 / redis 56379（docker-compose）。
- 远端 CI：`.github/workflows/ci.yml`（backend/frontend/e2e）+ `android.yml`（v* tag 触发 APK + web standalone）。

## 5. Preflight 结论

```text
WORKTREE        DIRTY (有未提交进行中改动, 契约允许并保留)
LOCAL/REMOTE    IN_SYNC @ 1bf7581
V0_1_0_TAG      INTACT
PROCEED_STAGE_R1 = TRUE
```