# PLI Stage R.1 收口计划（继续先前会话）

仓库：`E:\AI\Pet Life Intelligence` · branch `main` @ `1bf7581`（与 origin/main 一致，v0.1.0 tag 不动）
执行顺序以合同要求为准：**LAN 真机链路优先**，公网部署=EXTERNAL_BLOCKED，真机 QA=NOT_YET_OBSERVED（只交极短人工 checklist，不写真机 PASS）。

## 0. 现状基线（前一会话已完成、未提交，全部保留）

| 项 | 状态 |
|---|---|
| reports/STAGE_R1_PREFLIGHT.md | ✅ 已生成 |
| docs/canonical/PLI_v3.3-R1.md + README.md 索引 | ✅ 已入库（v3.1/3.2=HISTORICAL, v3.3=CURRENT） |
| reports/V3_3_CANONICAL_DELTA_AUDIT.md | ✅ V3_3_MISSING_CRITICAL=0 |
| mobile API env 注入（apiConfig.ts / App.tsx / api.ts / ApiConfigErrorScreen / manifest-cleartext / package.json +@expo/config-plugins） | ✅ 已实现 |
| web API_URL env 化（packages/api-client client.ts / care/page.tsx / sw.js 注释） | ✅ 已实现 |
| 品牌资源 icon/adaptive-icon/splash + scripts/gen-brand-assets.mjs，app.json name=宠物生活智能 v0.1.1 versionCode=2 | ✅ 已生成 |
| artifacts/visual-baseline-approved/（60 张冻结）+ README + visual-regression-v2.spec.ts | ✅ 已就位 |
| Demo 种子豆豆(dog)/咪咪(cat)（seed.py 系列 + reset-demo.ps1） | ✅ 已改名 |
| signing 措辞统一（android.yml 头注、STAGE_R_RELEASE_REPORT 注记） | ✅ 部分完成 |

## 1. 必须先修复的 3 处破损（进行中改动的真实 bug）

1. **`.github/workflows/android.yml`**（当前会破坏 CI/本地构建）：
   - 修复第 35–36 行重复 `name:` 键 → 保留新措辞一条；
   - 恢复 `runs-on: ubuntu-latest`（当前被误删，job 无 runner）；
   - 第 52–53 行修复为完整单步：`name: Gradle assembleRelease` + `working-directory: apps/mobile/android` + `run: ./gradlew assembleRelease --no-daemon`（`working-directory` 丢失会从 repo 根跑 gradlew 而失败）。
2. **`tests/e2e-browser/specs/stage-v-visual.spec.ts`**：
   - 删除第 14 行旧 `const OUT`（与第 15 行 `visual-current` 重复声明，TS 编译失败，Playwright 收集即挂）；
   - 第 45/69 行 `startsWith("Coco")` → `startsWith("豆豆")`（种子已改名，否则 find 不到 pet 直接失败）。
3. **`tests/e2e-browser/specs/seven-paths.spec.ts`**：把剩余 `"Mimi"` → `"咪咪"`、`"Coco"` 字符串断言 → `"豆豆"`（保留 `BW-Coco-${stamp}` 自建临时宠名不变）；同时全仓 grep 复核 `Coco|Mimi` 生产/测试代码残留。

## 2. LAN 真机链路（用户第一优先，先做通）

1. **后端绑定**：`scripts/dev.ps1` 的 uvicorn 启动补 `--host 0.0.0.0`（LAN 设备可达，非 production change）；在 docs（RUNBOOK/部署文档）写明 dev/INTERNAL 专用。
2. **CORS**：`.env`/文档记录 `CORS_ORIGINS` 需追加 LAN web origin（如 `http://192.168.0.100:3100`）——仅 DEV/INTERNAL；production 校验逻辑（不允许 `*`）不动。
3. **探测真实 LAN IP**：以运行时 `Get-NetIPAddress` 实测为准（当前 192.168.0.100；preflight 记的 103 是候选，最终以实测写报告），排除 172.x 虚拟网卡。
4. **Windows 防火墙**：README/RUNBOOK 记录放行 TCP 8800 的 PowerShell 命令（`New-NetFirewallRule`），不做自动执行越权动作之外的系统修改。
5. **本地启动验证**：启动 Postgres/Redis/API(:8800)/Web(:3100) 全栈，从 `http://<LAN_IP>:3100` 与 `http://localhost:3100` 各跑核心流程（login → Today → Quick Log → Timeline → Pet → Health → Assistant → Me），为真机 checklist 留证据。

## 3. Android v0.1.1 internal-LAN APK（Phase I/J/H 收口）

1. `apps/mobile` 确认 version=0.1.1、versionCode=2、package=com.pli.mobile（已配好）。
2. 本地实建：`$env:EXPO_PUBLIC_PLI_API_URL = "http://<实测LAN_IP>:8800"` → `pnpm --dir apps/mobile exec expo prebuild --platform android --non-interactive` → `.\gradlew assembleRelease --no-daemon`（在 `apps/mobile/android` 内）。
3. verificação env 注入：产物 grep 含 LAN URL 且不含 `http://localhost:8800`；无 env 构建时 App 应渲染 ApiConfigErrorScreen（fail-safe 已验证在 App.tsx 入口）。
4. cleartext：prebuild 输出的 release AndroidManifest 确认含 `usesCleartextTraffic="true"`（仅 http:// 构建）。
5. APK 记录：filename=Pet-Life-Intelligence-v0.1.1-internal-lan.apk、package、versionName、versionCode、API environment、size、sha256、signing=`DEBUG_SIGNED_INSTALLABLE_APK`/`NOT_PLAY_STORE_SIGNED` → 放入 `artifacts/release/v0.1.1/`（gitignored，随 Release 附件上传）。

## 4. Web 生产构建 + env 验证（Phase G）

1. `pnpm --dir apps/web build`（先 `pnpm --dir packages/ui-tokens build`）PASS。
2. 产物 grep 无 `localhost:8800` / `127.0.0.1` 字面量（API_URL 已改为 env + runtime 推导，无硬编码）。
3. `reports/WEB_REAL_ACCESS_REPORT.md`：standalone 产物验证 + 基于 repo 现有 infra 的部署路径（docker compose / nginx/caddy 指南）；`PUBLIC_DEPLOYMENT=EXTERNAL_BLOCKED`，不写 WEB_LIVE/API_PUBLIC_LIVE。

## 5. Visual Regression V2 实跑（Phase L）

1. 先启动全栈（API/Web/seed），跑 `stage-v-visual.spec.ts`（修复后）生成 `visual-current/`（60 张）。
2. 跑 `visual-regression-v2.spec.ts`：approved vs current 逐像素 diff（tolerance 5/255、diff ratio ≤0.2%）。
3. 若 demo 宠物改名/品牌资源导致合理 diff：走**显式** baseline 刷新（`PLI_UPDATE_VISUAL_BASELINE=1`，并记录理由），禁止无脑 update；刷新后重新冻结并提交 baseline。
4. `reports/VISUAL_REGRESSION_V2_REPORT.md`：架构、阈值、一次真实 diff 的 before/after 证据、最终结果。

## 6. 报告补齐（本轮必须）：7 份

- `reports/STAGE_R1_V3_3_UIUX_REACCEPTANCE.md`（依据 v3.3-R1 + DESIGN_SYSTEM_V3 + 实际 runtime 逐屏复核；真实通过才标 UI_UX_V3_3_ACCEPTED）
- `reports/MOBILE_API_CONFIGURATION_REPORT.md`（dev/LAN/staging/production 四档、EXPO_PUBLIC_PLI_API_URL、fail-safe、0.0.0.0 绑定、防火墙/CORS 要点）
- `reports/ANDROID_BRANDING_REPORT.md`（设计原则 warm/intelligent/clean/premium non-medical non-game、来源/生成方式/尺寸、禁用清单）
- `reports/ANDROID_REAL_DEVICE_QA.md`（极短人工 checklist：安装→登录→核心流程→双宠切换→网络/返回/键盘/安全区；状态=`ANDROID_BUILD_READY` + `ANDROID_REAL_DEVICE_QA=NOT_YET_OBSERVED`）
- `reports/WEB_REAL_ACCESS_REPORT.md`（见 §4）
- `reports/VISUAL_REGRESSION_V2_REPORT.md`（见 §5）
- `reports/STAGE_R1_FINAL_REPORT.md`（§50 的 14 项字段全齐；终态 STAGE_R1_COMPLETE + REAL_PARTICIPANTS=0/REAL_PETS=0/PRODUCT_VALIDATION=NOT_YET_OBSERVED/ANDROID_REAL_DEVICE_QA=NOT_YET_OBSERVED/PUBLIC_DEPLOYMENT=EXTERNAL_BLOCKED）

## 7. Demo 双宠与数据完整性（Phase K）

- 复核豆豆(dog)/咪咪(cat) 可展示 Today/Timeline/Baseline/Health/Behavior/Training/Companion/3D fallback；依赖测试（e2e PET 查找逻辑、custom pet 名生成）全部更新通过。
- 回归验证 demo/synthetic 排除机制（`SYNTHETIC_NEVER_COUNTS_AS_REAL`、`/pilot/status 0/0/0`）在改名后仍通过。

## 8. 全量回归（Phase O）

- pytest（全量，基线 427）、ruff、五端 typecheck、五端 build、vitest（22/22）、Playwright（29 + visual-v2 全部 spec）、受影响 contract/safety/Pilot-integrity/secrets/source-size 门禁。
- 判定标准不降低：不删测试、不弱化断言、不加 ignore。

## 9. 文档 & Release

1. README：What is PLI / Screenshots（真实链接才加）/ Web / Android 状态；v1.x tags=historical internal milestones、v0.1.x=public release line 说明。
2. CHANGELOG v0.1.1 条目；`artifacts/release/v0.1.1/screenshots/{android,web}/` 核心 6 页截图包。
3. 全库 signing 措辞漂移复核（README/CHANGELOG/WORK_STATUS/docs），历史快照只加 `Historical wording corrected by Stage R.1` 注记。
4. 本地所有 Gate 绿后：一个（或少量有界）commit → `git push origin main`（无 force）→ `git tag v0.1.1` → 创建 GitHub Release v0.1.1（APK + pli-web-standalone.tgz + SHA256 + Release Notes）；记录 GHA ci/android 结果。**不修改/移动/删除 v0.1.0 tag**。

## 10. 验证方法

- 每阶段产物以真实命令输出为准（git 输出、gradle 输出、curl/playwright 结果、截图、sha256），报告一律引用证据而非"完成"。
- 真机/公网状态按"没有就不写 PASS"原则，只给准备态与 checklist。
- 以 `reports/STAGE_R1_FINAL_REPORT.md` 14 项 + Exit Criteria 清单作为最终门禁逐条勾验。

## 边界

禁止 Stage I / v1.3 / Future 42 / PLI-229+ / 新业务域 / 五入口 IA 改动 / 架构重写 / 购买服务器域名 / 伪造证据。LAN HTTP 仅限 DEV/INTERNAL；production-like 仅 HTTPS。