# GOAL — Stage R.1-E: Android Emulator 真实运行、逐屏视觉验收、交互修复与移动端最终收口

## Goal（本轮要达到的结果）

在本地 Android Emulator 上真实运行 PLI Android APK，连接本机真实后端（`0.0.0.0:8800`，模拟器内经 `http://10.0.2.2:8800`），使用真实 Demo 数据（豆豆/咪咪），以**真实点击**完成完整用户路径（Launch → Login → Today → Quick Log → Timeline → 在家 → 3D Life View(fallback) → Health → Behavior → Training → Welfare → Social → Assistant → Companion → Me → Pet Switch → Logout → Re-login），对移动端每个页面逐屏截图并做视觉/交互审计；发现的问题**直接修改代码**、重新构建、重新截图（Before/After），最终达到移动端验收通过。

经用户确认的本轮授权范围（超出原目标文档 §2/§28 的例外，以本契约为准）：
1. **移动端新增页面移植**：为 mobile 客户端新增 Behavior / Training / Welfare / Social / Assistant 五个屏幕——它们是 Web 端既有功能（apps/web 已有对应页面）的移动端移植，复用现有后端路由（behavior.py / v10_platform_training.py / v10_platform_welfare.py / v10_extras_social.py / v10_platform_agent.py 及 api-client 既有类型），**不是新业务 Domain**；必须在既有 5 Tab 结构内通过真实点击可达，**不修改五入口 IA**。
2. **登录入口补齐**：移动端 App 目前无任何登录 UI（api.ts 已有 `devLogin()` 但无页面调用），全新安装后无会话 → 401。作为本轮收口修复项，在 Me 页补充开发模式登录入口（复用 `devLogin` + demo 账号 owner@pli.demo / family@pli.demo / sitter@pli.demo），使 Login / Logout / Re-login 可真实点击完成。
3. **发布授权**：若本轮落地真实代码修复，commit + push origin/main，并创建 git tag v0.1.2 + GitHub Release（Internal / Pre-Pilot，附 emulator APK 资产）；不重写、不移动 v0.1.0 / v0.1.1。

保持以下诚实状态不变：`ANDROID_REAL_DEVICE_QA=NOT_YET_OBSERVED`、`REAL_DEVICE_PERFORMANCE=NOT_YET_OBSERVED`、`PLAY_STORE_SIGNING=EXTERNAL_BLOCKED`、`REAL_PARTICIPANTS=0`、`REAL_PETS=0`、`PRODUCT_VALIDATION=NOT_YET_OBSERVED`；模拟器 Demo 不等于真人产品验证。

## Acceptance criteria（完成后必须全部可客观验证）

1. **Preflight**：生成 `reports/ANDROID_EMULATOR_ACCEPTANCE_PREFLIGHT.md`，记录 HEAD（e5e5825361917f7670d1f0db01995d85b153c7a9）、branch（main）、worktree 状态、origin/main 同步状态；全程无 `reset --hard` / `clean -fd` / force push / 无授权 rebase。
2. **Backend 连通**：API 实际监听 `0.0.0.0:8800`；宿主机 `Invoke-RestMethod http://127.0.0.1:8800/api/v1/health` 返回 HTTP 200；**模拟器内** `http://10.0.2.2:8800/api/v1/health` 返回 200（adb shell curl 或 App 内证据）。
3. **Emulator**：AVD `pdig36`（API 36 / google_apis / x86_64，system image 已存在于 `D:\Code\Android\SDK`）成功启动并 online（`adb devices` 显示 emulator）；WHPX 加速生效；分辨率等效手机规格（目标 ~390×844dp 量级）。
4. **APK**：以 emulator profile 真实 clean build：`EXPO_PUBLIC_PLI_API_URL=http://10.0.2.2:8800` → `Pet-Life-Intelligence-v0.1.x-emulator.apk`；package=`com.pli.mobile`；versionName/versionCode/signing（DEBUG_SIGNED_INSTALLABLE_APK，NOT_PLAY_STORE_SIGNED）/大小/SHA256 全部记录在 `reports/ANDROID_EMULATOR_BUILD_REPORT.md`。
5. **安装与启动**：`adb install -r` 返回成功；真实启动 App 无 crash；首屏状态与 API 连通性记录在案。
6. **移动端收口改动落地**：a) Me 页开发模式登录入口（可真实点击登录/退出/再登录）；b) 新增 Behavior / Training / Welfare / Social / Assistant 五个移动端屏幕（既有功能移植），在既有 5 Tab 内可真实点击到达。所有改动遵守 AGENTS.md：源文件 ≤300 行、组件 ≤200 行、类型完整、使用 ui-tokens/ui-kit 既有 token，不新建散落 magic 样式。
7. **Core Flow 真实点击通过**：Launch → Login → Today → Quick Log（真实提交） → Timeline → 在家 → 3D Life View（fallback 完整，无空白 Canvas / 假 LIVE / 假医学模型） → Health → Behavior → Training → Welfare → Social → Assistant → Companion → Me → Pet Switch → Logout → Re-login，每步真实点击（非 route 直达），记录于 `reports/ANDROID_EMULATOR_INTERACTION_AUDIT.md`。
8. **Pet Switch 专项**：豆豆→咪咪→豆豆，每次验证 Today / Timeline / 在家 / Health / Assistant 全部使用当前 petId；0 例串宠 / 0 例 petId 为空 / 0 例 stale state。
9. **Android 系统行为**：Back、Home→Resume、background→foreground、键盘开合、Modal 开合、Bottom Tab、嵌套返回、滚动位置、Safe Area、Status Bar、手势导航——无明显 Android 体验错误，逐项记录。
10. **网络失败测试**：Backend Running / Stopped / Restarted 三态下观察 Loading / Error / Retry / Recovery；禁止白屏、无限 loading、静默失败、stack trace 暴露。
11. **截图**：`artifacts/emulator/v0.1.x/` 建立目录，按文档清单真实截图：`01_login` `02_today` `03_quick-log` `04_timeline` `05_pet`（映射到移动端宠物身份/上下文屏，映射在审计中注明）`06_3d-life-view` `07_health` `08_behavior` `09_training` `10_welfare` `11_social` `12_assistant` `13_companion` `14_me` `15_pet-switch` `16_error-offline`（.png，均来自 Emulator 真实截图，非浏览器 viewport）。
12. **视觉审计**：`reports/ANDROID_EMULATOR_VISUAL_AUDIT.md` 每页含 Screen/Screenshot/Visual Status/UX Status/Issues/Severity(P0-P3)/Fix/After Screenshot/Final Status；**P0=0、P1=0**，关键 P2 已修或明确 accepted；含 Today（Living Canvas：Pet→Now→Change→Attention→Action）、Timeline（Life Stream）、3D fallback、Health（非监护仪）、Assistant（Ask/Brief/Find/Plan/Explain）、Companion（可观察行为语言、无"豆豆想你了"类表述）专项审核结论。
13. **修改循环**：每批视觉/交互修改后执行 mobile typecheck + 相关 unit tests → 重新构建/安装 → Emulator 重开 → 重新截图；核心调整页保留 `before/` 与 `after/` 对比目录并写入报告。
14. **回归 Gate 全绿（不降标）**：ruff、`pytest -q`（unit/integration/contract/safety/ai-evals）、vitest、五端 typecheck、web build、Playwright 功能测试、Visual Regression V2（60/60）、source-size gate、secret scan、forbidden-pattern gate。
15. **Safety / Pilot 完整性**：Red Flag、Medication、Permissions、Synthetic Isolation、Fact vs Inference、Generated 3D Provenance 全部保持；`/api/v1/pilot/status` 实测 REAL participants=0、REAL pets=0、activated owners=0、PILOT_MODE=false。
16. **报告交付**：`reports/ANDROID_EMULATOR_ACCEPTANCE_PREFLIGHT.md`、`ANDROID_EMULATOR_BUILD_REPORT.md`、`ANDROID_EMULATOR_VISUAL_AUDIT.md`、`ANDROID_EMULATOR_INTERACTION_AUDIT.md`、`ANDROID_EMULATOR_FINAL_ACCEPTANCE.md`、`MOBILE_VISUAL_CLOSURE_REPORT.md`（有 UI 修改时）全部生成；最终状态写入最终验收报告与 `WORK_STATUS.md`。
17. **Git / Release**：按职责分开 commit（fix(mobile)/style(mobile)/docs…）并 push origin/main；有真实修复则创建 tag v0.1.2 + GitHub Release（gh 已登录，token 具 repo 权限），附 emulator APK 资产；v0.1.1 及其资产不动。
18. **最终状态声明**（写入报告与 WORK_STATUS）：`ANDROID_EMULATOR_ACCEPTANCE_PASS`、`MOBILE_CORE_FLOW_PASS`、`MOBILE_VISUAL_ACCEPTANCE_PASS`、`MOBILE_INTERACTION_ACCEPTANCE_PASS`、`MOBILE_V3_3_EXPERIENCE_ACCEPTED`；同时保持 `ANDROID_REAL_DEVICE_QA=NOT_YET_OBSERVED`、`REAL_DEVICE_PERFORMANCE=NOT_YET_OBSERVED`、`PLAY_STORE_SIGNING=EXTERNAL_BLOCKED`、`REAL_PARTICIPANTS=0`、`REAL_PETS=0`、`PRODUCT_VALIDATION=NOT_YET_OBSERVED`。

## Boundaries（不可逾越）

- **禁止**：Stage I / v1.3 / Future 42 / PLI-229+ / 新业务 Domain / 重新设计产品方向 / 修改五入口 IA / 修改 canonical event 与 schema / 削弱权限与医疗安全规则 / 将 Generated 3D 标成 LIVE / 将 Demo 数据标成真实用户数据 / 进入真实 Pilot。
- 新增的 5 个移动端屏幕**只允许**是既有 Web 功能的移动端移植（复用既有后端路由与语义），不允许发明新业务字段或新领域逻辑；前端不得自行定义与后端漂移的业务模型（schema-first）。
- UI 修改仅限允许清单：spacing、font hierarchy、layout、component composition、Pet 视觉主体性、card hierarchy、icon、导航间距、空/错误态、Android safe-area、modal、触摸反馈、响应式、Living Canvas 精化；禁止为了好看削弱安全。
- 性能证据仅记录为 qualitative emulator smoke，**不得**写成 REAL_DEVICE_PERFORMANCE_PASS；模拟器运行 ≠ 真机验证。
- Git：禁止 force push、移动 v0.1.0/v0.1.1 tag、丢弃未提交工作；不做无关的大规模重构（Minimum Safe Refactor）。
- 回归门禁不得通过删测试/弱断言/加 ignore 等方式降标通过；问题必须修根因。
- 开始修改前必须读取：全局 AGENTS.md、仓库 AGENTS.md、docs/canonical/PLI_v3.3-R1.md、reports/STAGE_R1_FINAL_REPORT.md、STAGE_R1_V3_3_UIUX_REACCEPTANCE.md、VISUAL_REGRESSION_V2_REPORT.md、ANDROID_REAL_DEVICE_QA.md、README.md、WORK_STATUS.md。

## 完成定义

满足全部 Acceptance criteria（含 P0=0 / P1=0、0 crash、0 死交互、0 布局阻塞、0 petId 串扰、0 权限回归、回归 Gate 全绿）后才允许 `ANDROID_EMULATOR_ACCEPTANCE_PASS` / `MOBILE_VISUAL_ACCEPTANCE_PASS`，然后 STOP；不自行进入 Stage I / v1.3 / Future 42。
