# STAGE_R_RELEASE_REPORT — v0.1.0 发布报告

日期：2026-09-24 · Stage R（Repository, UI & Release Productization Closure）
前置：Stage V / V.2 完成态（HEAD 演进见下）；本报告证据全部为当日真实命令/CI 输出。

---

## 1. FINAL STATUS

```text
PLI_V0_1_0_RELEASED
GitHub: https://github.com/huangdi97/pet-life-intelligence (public)
pytest 427 passed / ruff 0 / 五端 typecheck 0 / 五端 build OK / vitest 22/22 / Playwright 29/29
UI_UX_IMPLEMENTATION: ACCEPTED（reports/STAGE_R_UIUX_ACCEPTANCE.md）
REAL_PARTICIPANTS=0 / REAL_PETS=0 / PILOT_MODE=false（诚实保留）
PLAY_STORE_SIGNING=EXTERNAL_BLOCKED / 真机 QA=EXTERNAL_BLOCKED / STAGING_DEPLOY=EXTERNAL_BLOCKED
```

---

## 2. 交付摘要（对照 GOAL 契约）

| 交付 | 结果 | 证据 |
|---|---|---|
| GitHub 正式化（公开仓库 + push + CI 绿） | DONE | §A |
| Web 成品（生产构建 + 冒烟 + 产物） | DONE | §B |
| Android 成品（CI 构建 APK，未签名） | DONE | §C |
| UI/UX 实装验收 | ACCEPTED | §D + reports/STAGE_R_UIUX_ACCEPTANCE.md |
| v0.1.0 发布（tag + CHANGELOG + README + Release 资产） | DONE | §E |

---

## A. GitHub 正式化

| 验收项 | 证据 |
|---|---|
| A1 公开仓库存在 | `gh repo view huangdi97/pet-life-intelligence` → 返回仓库（public） |
| A2 origin 与远端同步 | `git remote -v` 指向 github.com/huangdi97/pet-life-intelligence.git；`git ls-remote origin refs/heads/main` == 本地 main HEAD（最终 release commit） |
| A3 tags 全量在远端 | `git ls-remote --tags origin`：v0.1.0 / v1.0.0 / v1.1.0 / v1.1.1 / v1.2.0 |
| A4 CI 最终绿 | `gh run list` 最新 push 触发的 CI 运行 success（backend=lint+migration+pytest+OpenAPI freshness，frontend=五端 typecheck/build/expo export，e2e=Playwright） |
| A5 无 secret 提交 | `git ls-files` 中 `.env`（含值）为 0；唯一相关为 `*.example` 模板；`infra/docker/deploy/staging.env` 本身已是 CHANGE_ME 占位符（文件头声明 NO real secrets） |

仓库元数据：README（真实数字对齐）、LICENSE（MIT）、CONTRIBUTING.md、SECURITY.md（既有）、AGENTS.md。

---

## B. Web 成品

| 验收项 | 证据 |
|---|---|
| B1 生产构建 | `pnpm --dir apps/web build` exit 0（本地 PLIT_LOCAL_BUILD=1；Linux CI 上 standalone 组装成功） |
| B2 生产模式冒烟 | `next start -p 3100`：`GET /` → 200（text/html）；`/manifest.webmanifest` → 200（application/manifest+json）；`/sw.js` → 200（application/javascript） |
| B3 Playwright 全量 | 29/29（production-mode API:8800 + Web:3100），results.json expected=29 unexpected=0 |
| B4 Web 发布产物 | `android.yml` web-standalone job 产出 `pli-web-standalone.tgz`（Next standalone + static + public + PWA），作为 v0.1.0 Release 资产 |

---

## C. Android 成品（CI 构建、未签名）

| 验收项 | 证据 |
|---|---|
| C1 workflow 可审查 | `.github/workflows/android.yml`：install → mobile typecheck → expo prebuild android → gradle assembleRelease（unsigned）→ upload artifact |
| C2 构建成功 + artifact | `gh run list` Android 工作流最新运行 success；artifact `pli-mobile-apk` 含 `*.apk` |
| C3 Release 资产 | v0.1.0 Release assets 含 APK 与 Web tgz（`gh release view v0.1.0`） |
| C4 包信息/签名状态 | package=com.pli.mobile / versionName=0.1.0 / versionCode=1（app.json 钉定）；签名=UNSIGNED，PLAY_STORE_SIGNING=EXTERNAL_BLOCKED（无 Google Play 账号） |

构建链说明：pnpm 严格 node_modules 下 expo/RN autolinking 需顶层解析 → 已把 `@react-native/gradle-plugin`、`@react-native/*`(0.74.x) 与 expo SDK51 原生模块（asset/file-system/font/image-loader/keep-awake/modules-core/system-ui）、`babel-preset-expo` 声明为直接依赖（版本与锁文件一致，零新增下载）；本地 `expo-modules-autolinking search --platform android` 与 `require.resolve` 探针全部 OK。

---


## D. UI/UX 实装验收

结论：**ACCEPTED**。基准 = v3.1-R1 母版 + DESIGN_SYSTEM_V3（§6 落地 15/15、§8 基线全满足）+ IA/导航冻结。
逐域结论、P0/P1/P2 清单见 `reports/STAGE_R_UIUX_ACCEPTANCE.md`（P0=0/P1=0/P2=5 登记）。
全量门禁：pytest 427 / ruff 0 / 五端 typecheck 0 / 五端 build OK / vitest 22/22 / Playwright 29/29（含视觉基线 60 张刷新）。

---

## E. v0.1.0 发布

| 验收项 | 证据 |
|---|---|
| E1 tag v0.1.0 | 本地 + `git ls-remote` origin 可见，指向最终 release commit |
| E2 CHANGELOG / README | CHANGELOG.md 新增 v0.1.0 条目；README 状态块/测试数字对齐 427/29/22 |
| E3 GitHub Release | `gh release create v0.1.0`（含发布说明）；assets：pli-web-standalone.tgz + pli-mobile-apk（≥2 类） |
| E4 本报告 | 即本文件 |
| E5 git 干净 | 最终 `git status --short` 为空 |

---

## F. 守恒与诚实

- F1 未进入 Stage I / v1.3 / Future 42 / 新领域功能（本次为发布/产品化/验收/修复）。
- F2 未删测试/弱化断言/新增 ignore；全部 CI 修复为根因修复（minio 镜像下线、缺包依赖声明、OpenAPI 再生成、ruff 排序）。
- F3 既有 tags 未删除/覆盖；无 force push；无历史重写。
- F4 外部平台不可用项（如 GitHub API 瞬时失败）如实降级并记录；无编造通过。
- F5 新增文件合规：workflow/android.yml 97 行、CONTRIBUTING.md 66 行、报告均为文档；无裸 TODO。

---

## Known limitations（诚实登记）

- Android APK 未签名、未上架（Play/Apple 账号缺失）；不可视为商店版。
- `apps/mobile` 图标为 Expo 默认资源；apiUrl 为开发值（正式部署需注入）。
- 真机 QA、公网部署、SMTP、真实 AI key、真实 3D provider：EXTERNAL_BLOCKED / NOT_YET_OBSERVED。
- 视觉基线为采集型 spec（每次运行重写 PNG，无 diff 断言）——已登记 P2-01。
- OpenAPI 产物含 FastAPI 生成的路由级重复 tags（cosmetic，登记 P2）。

## External blockers（不变）

PLAY_STORE_SIGNING · 真机 QA · STAGING/PRODUCTION_DEPLOY · REAL_3D_PROVIDER · SMTP · AI provider · REAL Participants(WAVE_0)

## 停止点

```text
v0.1.0 发布完成（首次对外公开版本）
PRE_PILOT_TECHNICAL_AUDIT_PASS 保持；下一步 Stage G-W0A First Real Participants
不自行进入 Stage I / v1.3 / Future 42 / 新功能开发
```