# Goal：PLI Stage R.1 收口 — Real Access & Device Closure

将已发布 v0.1.0 的 Pet Life Intelligence（repo: `E:\AI\Pet Life Intelligence`，GitHub huangdi97/pet-life-intelligence，main @ 1bf7581）推进到 **REAL ACCESS READY + REAL DEVICE TESTABLE + CANONICAL v3.3 ALIGNED + FINAL VISUAL ACCEPTANCE READY**，发布 v0.1.1（internal）。

已确认的用户决策（本契约默认成立）：
- 验收通过后允许 push 到 origin/main、创建 tag v0.1.1、创建 GitHub Release v0.1.1（附 APK + web standalone + SHA256 + Release Notes）。
- 本轮不做真机 QA：构建 v0.1.1 internal-LAN APK + 极短人工安装检查清单，`ANDROID_REAL_DEVICE_QA = NOT_YET_OBSERVED`（有真机出现则随时可执行 checklist，但不做虚假 PASS）。
- 本轮不部署公网 staging：交 `WEB_DEPLOY_READY` + 部署文档，标记 `PUBLIC_DEPLOYMENT = EXTERNAL_BLOCKED`，不写 WEB_LIVE。
- Demo 调整为双宠：豆豆(dog) + 咪咪(cat)，必要时同步更新依赖测试。

执行顺序以用户要求为准（LAN 真机链路优先），最终验收按下列可检查标准判断。

## Acceptance criteria（全部必须客观可验证）

### A. 仓库事实与 Canonical（v3.3 入库）
1. `reports/STAGE_R1_PREFLIGHT.md`：真实记录 git 输出（HEAD、branch、remote、tags、describe、status）。当前未提交的进行中改动（`apps/mobile/App.tsx`、`app.json`、`src/api.ts`、`app.config.js`、`src/apiConfig.ts`、`src/screens/ApiConfigErrorScreen.tsx`、根目录 v3.3-R1 母版文件等）全部保留并纳入最终 commit，不丢失、不 `git clean`/`reset --hard`。
2. `docs/canonical/PLI_v3.3-R1.md` 存在且内容为 v3.3-R1 母版；根目录游离的未跟踪 v3.3-R1 母版文件被移入 canonical；`docs/canonical/README.md` 索引：L2 Feature Index、v3.1/v3.2=HISTORICAL、v3.3-R1=CURRENT、Authority Order；旧版不删除。
3. `reports/V3_3_CANONICAL_DELTA_AUDIT.md`：字段齐全（Requirement / v3.1 existed / v3.3 added-or-changed / Current implementation / Code evidence / Test evidence / Status / Action），覆盖 Living Canvas、Pet Living Model、3D Life View、3D Capture、3D Versioning、3D Provenance、3D Fallback、Companion integration、Today state carrier、Timeline×3D、Contextual Explain；`V3_3_MISSING_CRITICAL = 0`（真正缺失项在不扩 Scope 前提下补齐）。
4. `reports/STAGE_R1_V3_3_UIUX_REACCEPTANCE.md`：基于 v3.3-R1 + DESIGN_SYSTEM_V3 + 实际 runtime 逐屏复核；只有真实通过才标 `UI_UX_V3_3_ACCEPTED`。

### B. Mobile API 配置（Phase D/E）
5. `git grep -n "localhost" apps/mobile`（排除 node_modules 与测试）生产代码为 0；`apps/mobile/app.json` 不再含 `extra.apiUrl` 且无写死 localhost。
6. 环境注入验证：`EXPO_PUBLIC_PLI_API_URL=http://<LAN_IP>:8800 pnpm --dir apps/mobile exec expo export --platform android` 产物包含该 URL 且**不包含** `http://localhost:8800`；无 env 构建时 App 走 `ApiConfigErrorScreen`（环境配置错误明确提示，非无限 loading）。
7. cleartext：LAN(http://) 构建的 prebuild 输出 `AndroidManifest` 含 `usesCleartextTraffic="true"`（或等效 networkSecurityConfig）；https / 无 URL 保持 Android 默认（cleartext 禁止）。
8. `reports/MOBILE_API_CONFIGURATION_REPORT.md`：dev / LAN / staging / production 四档 profile、变量名（EXPO_PUBLIC_PLI_API_URL 等）、fail-safe 行为、后端绑定 0.0.0.0:8800 与 Windows 防火墙/CORS 要点。

### C. Android 品牌（Phase H）
9. `apps/mobile/assets/` 存在非 Expo 默认的 `icon.png`、`adaptive-icon.png`、`splash.png`（尺寸符合 Expo/Android 要求：icon ≥1024、adaptive 1024+安全区、splash 宽 ≥1024）；app.json 引用一致。
10. Android 显示名为 `宠物生活智能`（非 Expo App / React Native App），prebuild 生成的 manifest label 可验证。
11. `reports/ANDROID_BRANDING_REPORT.md`：设计原则（warm / intelligent / clean / premium / non-medical / non-game）、来源与生成方式、尺寸、明确不使用医疗十字/机器人头像/Swirl/霓虹赛博。

### D. v0.1.1 internal-LAN APK（Phase I/J/H 收口）
12. `apps/mobile/app.json`: version = 0.1.1、versionCode = 2（保持进行中改动并验证）。
13. 本地 `expo prebuild --platform android` + `gradlew assembleRelease` 成功；产出 `artifacts/release/v0.1.1/Pet-Life-Intelligence-v0.1.1-internal-lan.apk`。
14. APK 信息记录（ANDROID_REAL_DEVICE_QA.md + final report）：filename、package=com.pli.mobile、versionName、versionCode、API environment=http://<LAN_IP>:8800、size、sha256、signing=`DEBUG_SIGNED_INSTALLABLE_APK` / `NOT_PLAY_STORE_SIGNED`。
15. 全库 signing 措辞漂移修复：README / CHANGELOG / WORK_STATUS / reports / docs 里 UNSIGNED / 未签名 / debug-signed 矛盾统一为 `DEBUG_SIGNED_INSTALLABLE_APK` + `NOT_PLAY_STORE_SIGNED` + `PLAY_STORE_SIGNING=EXTERNAL_BLOCKED`；v0.1.0 历史快照不改写，旧报告仅加 "Historical wording corrected by Stage R.1" 注记。
16. `reports/ANDROID_REAL_DEVICE_QA.md`：含安装→登录→Today→Quick Log→Timeline→Pet→Health→Assistant→Me→双宠切换→网络/返回/键盘/安全区的人工 checklist（极短）；显式状态 `ANDROID_BUILD_READY` + `ANDROID_REAL_DEVICE_QA=NOT_YET_OBSERVED`，不写真机 PASS。

### E. Web（Phase G）
17. Web API 基址由 env 注入（NEXT_PUBLIC_API_URL 或统一改名）；care-card 等用户可见文案不再硬编码 `localhost:8800`。
18. `pnpm --dir apps/web build` 生产构建 PASS；生产构建产物 grep 无 `localhost:8800` / `127.0.0.1` 字面量（若有被接受例外须在报告中明示理由）。
19. `reports/WEB_REAL_ACCESS_REPORT.md`：standalone 产物验证、部署路径（docker compose staging/nginx 或 caddy，基于 repo 现有 infra）、`PUBLIC_DEPLOYMENT=EXTERNAL_BLOCKED`（本轮未部署），不写 WEB_LIVE / API_PUBLIC_LIVE。

### F. Visual Regression V2（Phase L）
20. 现有 60 张截图迁移并冻结为 `artifacts/visual-baseline-approved/`（含清单/说明）；对照流程改为 approved baseline vs current 的 pixel/perceptual diff：超阈值→失败，输出 actual / expected / diff 三件套。
21. baseline 更新是显式动作（独立命令/flag + 文档），禁止用无脑 "update snapshots" 使 CI 变绿。
22. 覆盖页面：Today / Timeline / Pet / 3D Life View / Health / Assistant / Companion / Me；宽度 ≥ 360 / 390 / 768 / 1440。
23. `reports/VISUAL_REGRESSION_V2_REPORT.md`：架构、阈值、一次真实 diff 的 before/after 证据、结果。

### G. Demo（Phase K）
24. Demo 种子调整为双宠：豆豆(dog) + 咪咪(cat)，可展示 Today/Timeline/Baseline/Health/Behavior/Training/Companion/3D fallback；依赖测试（含 e2e-browser visual spec 的宠物查找逻辑）同步更新；`is_demo/synthetic` 标志保持正确；Demo 数据禁止进入真实 Pilot metrics 的既有排除机制回归通过。

### H. 全量回归与 Release（Phase O + 41/42）
25. 本地门禁全绿并记录：pytest、ruff、五端 typecheck、五端 build、vitest、Playwright、受影响 contract/safety/Pilot-integrity 测试；通过标准不降低（不删测试、不弱化断言、不加 ignore）。
26. README（What is PLI / Screenshots 真实链接 / Web / Android 状态）、CHANGELOG v0.1.1 条目、v1.x tags=historical internal milestones / v0.1.x=public release line 说明；`artifacts/release/v0.1.1/screenshots/{android,web}/` 核心 6 页截图包。
27. 全部本地/远端 Gate 通过后：push to origin/main（无 force）、tag v0.1.1、创建 GitHub Release v0.1.1（APK + pli-web-standalone.tgz + SHA256 + Release Notes），记录 GHA android/ci 结果；不修改/移动/删除 v0.1.0 tag。
28. `reports/STAGE_R1_FINAL_REPORT.md`：最终回复 14 项字段齐全，终态 `STAGE_R1_COMPLETE`，并精确标注 `REAL_PARTICIPANTS=0`、`REAL_PETS=0`、`PRODUCT_VALIDATION=NOT_YET_OBSERVED`、`ANDROID_REAL_DEVICE_QA=NOT_YET_OBSERVED`、`PUBLIC_DEPLOYMENT=EXTERNAL_BLOCKED`。

## Boundaries（禁止越界）
- 禁止进入 Stage I / v1.3 / Future 42 / PLI-229+ / 新业务域 / 改动五入口 IA / 重写架构。
- 禁止修改、移动、删除 v0.1.0 tag 及其 Release 历史；历史报告只加注记不改写事实。
- 禁止伪造证据：无真机不写真机 PASS；未部署不写 WEB_LIVE/API_PUBLIC_LIVE；demo/synthetic 数据不得冒充真实；无真实 3D Provider 不伪装 3D LIVE。
- 禁止购买服务器/域名/付费服务；日志与报告中不得泄露 secrets（AI key、密码、token 等）。
- LAN HTTP 仅限 DEV/INTERNAL 构建使用；production-like 必须 HTTPS。
- 禁止丢弃未提交用户工作（`git clean` / `git reset --hard` 禁用）；commit 保持有界、与改动内容一致。
- 禁止为让 CI 变绿而删测试/弱化断言/关闭 lint/type/safety gate；安全、Pilot-integrity、provenance 门禁必须保持。
- 3D 不可用时保持真实照片 + 状态 overlay 的优雅 fallback，核心流程（Quick Log/Health/用药/Timeline/权限/安全）不得依赖 3D。