# PLI LOCAL ↔ REMOTE TRUTH · 2026-10-17

本文件只记录本轮**实际执行并取得输出**的本地/远端事实。历史文档中的运行数字除非本轮复跑，否则不视为当前证据。

## 一、仓库与分支

| 项 | 值 |
|---|---|
| 本地仓库根 | `E:\AI\Pet Life Intelligence` |
| 分支 | `feat/r2p3d-r3-render-truth-ui-closure` |
| 起始本地 HEAD | `b52cd1ead98090e72f6168e9e293fe1cd7c7896d`（2026-10-11） |
| 远端 HEAD（`git ls-remote` + `git fetch`） | `06c0ba5ca35678c0e1d026c31e477f8135094667`（2026-10-17） |
| merge-base | 起始 `b52cd1ea`（本地无独有提交） |
| ahead / behind（对齐前） | 0 / 136 |
| 对齐方式 | `git merge --ff-only origin/feat/r2p3d-r3-render-truth-ui-closure` |
| 对齐后 HEAD | `06c0ba5c…`（与远端一致） |

## 二、远端核验（GitHub API）

- PR **#2 OPEN**，`MERGEABLE`，head `06c0ba5c…`，base `main`，1417 files / +392963 / −7695。
- exact-HEAD 三个 workflow 均 success：
  - `CI`（run 39026363521）
  - `Android + Release Artifacts`（run 39026363516）
  - `OpenAPI Artifact Sync`（run 39026363430）
- 产物：`pli-mobile-apk`（50,433,822 B）、`r5-6-android-runtime-evidence`（8,794,611 B）、`pli-web-standalone`（48,401,795 B），均未过期。
- `origin/main` = `2069d8a8…`，本分支未合并、未改 main。

## 三、本地工作保护（未删除任何用户工作）

- 未提交修改：`apps/mobile/assets/3d/pet-stage.html`（打包产物，含嵌入 GLB/光照模块）、`apps/mobile/src/three/petStageHtml.ts`（1 行）。
  - 处理：`git stash push -m local-wip-3d-stage-20261017`（可 `git stash list` 找回）；
  - 另存备份：`.local/backup-*/working-tree-tracked.patch` 与 `local-head.bundle`。
- 被误删的跟踪文件 `tests/e2e-browser/artifacts/test-results/.last-run.json` 已 `git checkout --` 恢复（远端仍存在该文件）。
- 未追踪文件保留原处：`PLI_Living_Pet_Android_Autonomous_Local_Agent_GOAL_2026-10-10.md`、`artifacts/r5-6-final/`、`artifacts/tmp/`、`artifacts/r2p3d-r5/product-twin-qa.json`。
- 未使用 `git reset --hard`、`git clean -fdx`、force push。

## 四、本机环境修复（使真实运行成为可能）

1. **Windows 文件权限**：DSH 沙箱以 Low 完整性级别运行，但工作区子对象缺少 Low 标签与沙箱 SID 写权限，导致 `git fetch`、目录创建、构建写入全部被拒。
   - 修复：为仓库根添加当前用户可继承 FullControl + 沙箱 SID 可继承 FullControl，递归设置 Low 完整性标签（595,358 个对象）。
   - 结果：受限模式可在 `.git`、`docs`、`services` 等任意子目录写入并成功 `git fetch`。
2. **Docker/WSL 网络**：`.wslconfig` 原为 `networkingMode=mirrored`，Docker Desktop 端口发布失效（Windows 与 WSL 均不可达容器端口）。
   - 备份：`.local/wslconfig.backup-20261017-205656`；改为 `networkingMode=NAT` 后重启 Docker Desktop。
3. **Windows 保留端口段**：`netsh interface ipv4 show excludedportrange protocol=tcp` 显示 56619–56718、57013–57212 等保留段，原 `56632/57032` 无法绑定。
   - 改用 `.local/compose.pli-local.yml`：Postgres `127.0.0.1:55532`、Redis `127.0.0.1:55533`、MinIO `127.0.0.1:55500/55501`。
4. **本地测试库**：`.env.local`（gitignored）的 `TEST_DATABASE_URL` 指向可用端口；`conftest._ensure_test_db()` 在该服务器创建独立 `pli_test`。
   - 结果：pytest session setup 从 **260 秒降到 1.6 秒**（原为 IPv4 拒连 + 重试）。

## 五、本地可复现命令

```powershell
# 依赖与环境
docker compose -p petlifeintelligence -f .local/compose.pli-local.yml up -d
pnpm install --frozen-lockfile

# 后端
.\.venv\Scripts\python.exe -m ruff check .
$env:PYTHONUTF8='1'
.\.venv\Scripts\python.exe -m pytest -q --basetemp=.local/pytest-tmp

# 前端
pnpm --dir apps/web typecheck
pnpm --dir apps/mobile typecheck
pnpm --dir apps/mini typecheck
pnpm --dir apps/web test
pnpm --dir apps/web build
```

> Windows 默认 GBK 会让部分 blind-UI 源文件读取失败；`PYTHONUTF8=1` 复现的是 CI（Linux UTF-8）行为，不是放宽测试。

## 六、本轮新增/变更的实现

- R8AK 后端：稳定游标分页 + 指标/时间/关键词检索；Case 来源重新授权详情；详情继续复核元数据。
- Android：完整历史页、旧 Case 继续复核、来源时间与数值分页明细、Today 全部档案入口。
- Web：`/pets/[id]/history` 与详情页、Today 观察回顾卡。
- Mini：`pages/observations/index` 与 `detail/index`、宠物页入口。
- **R8AL（Web）**：真实观察补录闭环——Today 识别 `followUpCase/followUpPet/followUpMetric`，
  只允许同一宠物/同一指标，保存真实事件后追加 `RECORD_OBSERVATION` 并跳回同一 Case 详情。
- 迁移：**无新增数据库迁移**（只读查询与响应字段扩展；R8AG 的 `evidence_role_by_event_id` 已存在）。

## 七、本轮 exact-HEAD 云端验证（`028d8f94`）

| Workflow | Run | 结论 |
|---|---|---|
| CI | 39090868894 | success（Backend / Frontend / Blind Visual Contract / Playwright） |
| Android + Release Artifacts | 39090868925 | success（APK / Web standalone / **真实 Android 运行取证**） |
| OpenAPI Artifact Sync | 39090868918 | success |

真实 Android 取证新增：`case-continue-review-truth.json`（同一 Case 恰好追加 1 条
`CORRECT_SOURCE`）、`case-history-truth.json`（从详情进入完整历史并列出同一 Case）、
`case-detail-truth.json`（原始来源 ID 全部在原生 XML 中出现），以及
`owner-case-history-list.png` 截图。本地 pytest 最终为 **770 passed / 0 failed / 0 error**。

本机 Android release APK 也已成功构建（`apps/mobile/android/app/build/outputs/apk/release/app-release.apk`，
102,056,745 B）。本机 Windows Gradle 曾遇到 Expo/Ninja 反复重生成 CMake 的问题，已用本地
`CMAKE_SUPPRESS_REGENERATION` 规避；该修改位于 gitignored 的 `node_modules`，不入库。

功能差距与终态见 `docs/R8_GAP_MATRIX.md`；R8AK 专项说明见 `docs/r8/R8AK_OWNER_CASE_HISTORY_AND_CONTINUATION.md`，
收口结果见 `docs/r8/R8AK_CLOSURE_REPORT.md`。
