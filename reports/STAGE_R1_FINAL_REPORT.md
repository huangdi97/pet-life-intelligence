# STAGE R.1 FINAL REPORT — Real Access & Device Closure

> Stage: R.1 · 日期：2026-09-24 · 终态：`STAGE_R1_COMPLETE`
> 定位：从 `SOURCE RELEASE READY`（v0.1.0）推进到
> `REAL ACCESS READY + REAL DEVICE TESTABLE + CANONICAL v3.3 ALIGNED + FINAL VISUAL ACCEPTANCE READY`。
> 所有结论基于本轮真实命令输出 / 产物 / 复跑测试，非文档转述。

---

## 1. HEAD / Branch / Worktree

```text
Branch : main
HEAD   : 1bf7581996c9fc47f160a8cb63fad51d2a2a6308（本轮提交前的 in-sync 基线 = v0.1.0 tag）
v0.1.0 : 未移动 / 未删除 / 未改写（契约「历史版本不可变」遵守）
本轮   : 在保留前一会话全部未提交进行中改动的基础上收口为 v0.1.1 internal（见 git status 全量记录于 reports/STAGE_R1_PREFLIGHT.md §1.3）
```

## 2. v3.3 Canonical

```text
in repo        : YES —— docs/canonical/PLI_v3.3-R1.md（CURRENT）+ docs/canonical/README.md 索引
                 （v3.1/v3.2 = HISTORICAL；原始中文文件名保留在 README 历史映射）
delta audit    : YES —— reports/V3_3_CANONICAL_DELTA_AUDIT.md（Living Canvas / PLM / 3D Life View /
                 3D Capture / Versioning / Provenance / Fallback / Companion / Today state carrier /
                 Timeline×3D / Contextual Explain 全部有代码+测试证据）
missing        : V3_3_MISSING_CRITICAL = 0
UI re-accept   : reports/STAGE_R1_V3_3_UIUX_REACCEPTANCE.md → UI_UX_V3_3_ACCEPTED（6 屏 + 状态全覆盖）
```

## 3. Web

```text
production build : PASS（ui-tokens + next build；.next/BUILD_ID 生成；standalone 目录/入口存在）
API URL          : NEXT_PUBLIC_API_URL 环境注入 + window.location 运行时推导；
                   产物（含 standalone tgz）grep localhost:8800 / 127.0.0.1:8800 = 0 命中
public URL       : 无（PUBLIC_DEPLOYMENT = EXTERNAL_BLOCKED；无 VPS/域名/HTTPS）
remote smoke     : 本地 production 模式完整跑通（API /api/v1/health 200、Web 全部核心路由 200、
                   核心流程由 Playwright 27 功能 + 视觉链 3 真实点击通过）
细节             : reports/WEB_REAL_ACCESS_REPORT.md
```

## 4. Android

```text
version           : versionName 0.1.1 · versionCode 2
API environment   : EXPO_PUBLIC_PLI_API_URL=http://192.168.0.100:8800（LAN internal；无 localhost）
package           : com.pli.mobile
icon/splash       : PLI 品牌资源（icon.png 1024 / adaptive-icon.png 1024 / splash.png 1284×2778；
                    App 名=宠物生活智能，aapt 实测）——非 Expo 默认
APK path          : artifacts/release/v0.1.1/Pet-Life-Intelligence-v0.1.1-internal-lan.apk
APK 信息          : 88,151,802 B（84.1MB）；sha256=7A0C1B14…A72031（与 SHA256SUMS 一致，本轮复核）
signing type      : DEBUG_SIGNED_INSTALLABLE_APK（CN=Android Debug，apksigner 实测）
                    NOT_PLAY_STORE_SIGNED · PLAY_STORE_SIGNING=EXTERNAL_BLOCKED
cleartext         : release manifest usesCleartextTraffic=true（仅 http:// 构建，插件条件放行）
emulator QA       : 无可用模拟器（engine 未安装）→ 不冒充
real-device QA    : ANDROID_REAL_DEVICE_QA = NOT_YET_OBSERVED
                    （J1 安装 / J2 登录 / J3 核心流程 / J4 双宠切换 / J5 网络 / J6 返回 /
                    J7 键盘 / J8 安全区 checklist 见 reports/ANDROID_REAL_DEVICE_QA.md，预计 ≤15min）
```

## 5. Visual Regression

```text
approved baseline : artifacts/visual-baseline-approved/ 60 张（5 宽度 × 12 页，冻结）
diff test         : tests/e2e-browser/specs/visual-regression-v2.spec.ts
                    （per-channel tolerance 5/255；diff ratio > 0.2% → FAIL + actual/expected/diff 三件套）
refresh 协议      : PLI_UPDATE_VISUAL_BASELINE=1 显式刷新（本轮 2 次：demo 改名后 + 干净 seed/production 模式下）
result            : VISUAL_REGRESSION_V2_PASS（production 模式 60/60 = 0.0000% diff）
架构修复（本轮）  : ① 功能 spec 创建的 BW-* 事件污染 health 列表 → 视觉链与功能分离 + seed 重置；
                    ② dev server 与 production 渲染差异 → 基线一律在 production 渲染下冻结
细节             : reports/VISUAL_REGRESSION_V2_REPORT.md
```

## 6. Demo

```text
data integrity : seed 由 Coco/Mimi → 豆豆(dog)/咪咪(cat)；全仓 e2e/state probes 同步；
                 循环复测 /pilot/status 0/0/0 与 SYNTHETIC_NEVER_COUNTS_AS_REAL 保持
account        : 开发模式 owner@pli.demo / family@pli.demo / sitter@pli.demo（demo 数据，明确标注）
pets           : 豆豆（Dog）/ 咪咪（Cat）——Today/Timeline/Baseline/Health/Behavior/Training/
                 Companion/3D fallback 均可展示（Playwright 视觉 12 页 × 5 宽度证据）
```

## 7. Tests（本轮复跑全量）

```text
pytest       : 427 passed（253.5s，exit 0）
ruff         : All checks passed（0 issues）
typecheck    : web / admin / mini / mobile / pro 五端 = 0 errors
vitest       : 22/22 passed（apps/web，4 files）
build        : ui-tokens OK · web production OK · admin OK · mini OK · pro OK
Playwright   : 功能 27 + 视觉链 3（stage-v-visual 2 + visual-v2 1）= 30（production 模式全 PASS）
               —— CI 三步拆分（功能 → seed 重置 → 视觉）已完成并本地复现
```

## 8. GitHub Actions

```text
ci.yml   : e2e 步骤已拆为「Playwright (functional specs)」→「Reset demo data」
           →「Playwright (visual chain)」，保证视觉链在干净 seed + production 渲染下可复现
android.yml : APK + web-standalone 双 job（DEBUG_SIGNED_INSTALLABLE_APK 标注与
           working-directory/runs-on 修复后语法完整）
本轮未再次手动触发远端 workflow（本地全量 gate 已绿；推送后由 CI 复核，结果以 gh run 为准）
```

## 9. v0.1.1 Release

```text
本轮是否发 tag  : 未发（本地 gate 全绿 + 真机未测；按任务书「如果真机还没测，Release 标
                  Internal / Pre-Pilot」与用户的 LAN 真机优先策略，先交付
                  artifacts/release/v0.1.1/（APK + SHA256SUMS + screenshots/）供真机安装验证，
                  真机通过后按 §41 创建 v0.1.1 GitHub Release / tag）
v0.1.0 tag      : 未修改（绝对禁止 move/delete/force）
```

## 10. External Blockers

```text
PUBLIC_DEPLOYMENT        = EXTERNAL_BLOCKED（无 VPS / 域名 / HTTPS / 部署凭据）
ANDROID_REAL_DEVICE_QA   = NOT_YET_OBSERVED（无连接的 Android 设备 / 无可用模拟器）
真实 3D 生成 Provider    = EXTERNAL_BLOCKED（3D Life View 以诚实 blocked + real-photos fallback 呈现）
```

## 11. REAL_PARTICIPANTS

```text
REAL_PARTICIPANTS = 0（诚实保留；demo/synthetic 均不计入）
```

## 12. REAL_PETS

```text
REAL_PETS = 0（豆豆/咪咪为 DEMO/SYNTHETIC 数据，PILOT-INTEGRITY 排除机制回归通过）
```

## 13. PRODUCT_VALIDATION

```text
PRODUCT_VALIDATION = NOT_YET_OBSERVED（无真人用户反馈 / 留存 / 结果数据；不编造证据）
```

## 14. Final Stage R.1 Gate

```text
STAGE_R1_COMPLETE = TRUE（本地全部 gate 通过）

CANONICAL_V3_3_ALIGNED   = TRUE（入库 + delta audit + re-acceptance）
UI_UX_V3_3_ACCEPTED      = TRUE（reports/STAGE_R1_V3_3_UIUX_REACCEPTANCE.md）
ANDROID_API_ENV_READY    = TRUE（apiConfig + app.config.js + fail-safe + 0.0.0.0 绑定）
ANDROID_BRANDING_READY   = TRUE（icon/adaptive/splash 品牌资源 + App 名）
ANDROID_BUILD_PASS       = TRUE（v0.1.1 internal-LAN APK 实建 + 解包验证 env/cleartext/签名）
ANDROID_REAL_DEVICE_QA   = NOT_YET_OBSERVED（checklist 就绪，待真机回填）
VISUAL_REGRESSION_V2_PASS= TRUE（60/60 = 0.0000%，显式刷新协议成立）
WEB_PRODUCT_READY        = TRUE（production build + env 注入 + smoke）
WEB_PUBLIC_LIVE / API_PUBLIC_LIVE = FALSE（EXTERNAL_BLOCKED）
GITHUB_V0_1_1_RELEASED   = FALSE（待真机验证后发）
WAVE_0_REENTRY_READY     = TRUE（继承 Stage V 审计态；本次未回退）

REAL_PARTICIPANTS = 0 · REAL_PETS = 0 · PRODUCT_VALIDATION = NOT_YET_OBSERVED
```

## 边界遵守

```text
未进入 Stage I / v1.3 / Future 42 / PLI-229+ / 新业务域 / IA 重设计；无购买服务器域名付费服务；
无伪造真机 PASS / 无假装 LIVE / 无把 3D 包装成医学数字孪生。
下一步（用户确认真机体验后）：Stage G-W0A First Real Participants。
```

---

# Stage R.1 Continuation — v0.1.1 Release Round（2026-09-24 → 09-25）

> 本轮目标（用户批准的契约）：LAN 真机链路就绪 + 推送收尾 + 远端 CI 复核 +
> v0.1.1 GitHub Release（Internal / Pre-Pilot）；真机 QA 保持 NOT_YET_OBSERVED；
> 视觉逐屏收口留待用户截图后下一轮。

## 1. 推送 / HEAD 演进（全部真实提交，无 force）

```text
5206736  docs(stage-r1): .tl-time 掩码 issue-3 记录              （原领先提交，本轮推送）
3c0bfb0  fix(ci): MinIO service 镜像 → alpine/minio 固定版        （quay.io 匿名拉取持续 unauthorized，5 连败；docker.io 官方仓库 manifest 已移除；实测 alpine/minio:RELEASE.2025-10-15T17-29-55Z 可匿名拉取）
16f0c4c  test: 显式刷新视觉基线（对齐 .tl-time 掩码，15/60 PNG）
59c6ec8  test: 掩码 token 改纯 ASCII（emoji 在无 emoji 字体的 headless Linux 下 glyph 回退宽度 run 间漂移）
cbfcaaf  test: 日期文本归一化 + CI 失败上传 Playwright 产物
aef802c  ci: pnpm --frozen-lockfile（4 处；消除依赖解析 run 间漂移）
6dd33ae  test: UUID 文本归一化（payload id / source_ref 每次 seed 变化）
24098a9  build: *.tsbuildinfo 移出跟踪（tsc 增量缓存与 CI 布局错配产生假类型错误，
         这是 workflow_dispatch 前端 typecheck 间歇性失败的根因）
2a5c35a  test: 显式刷新基线（UUID 归一化后 10/60 PNG；50/60 字节级一致）
v0.1.1 tag → 2a5c35a（不修改 v0.1.0）
```

## 2. 远端 CI 结果（gh run 实记）

```text
36011676855  push  5206736      FAIL — MinIO quay.io 匿名拉取 unauthorized（根因修复于 3c0bfb0）
36015840892  push  3c0bfb0      FAIL — 视觉链 timeline 超阈值（基线未对齐掩码）
36018197725  dispatch refresh  SUCCESS — 基线刷新（.tl-time 掩码对齐）
36021192489  push  16f0c4c      FAIL — 360/768 timeline ~1.5%（emoji 字体回退 → 修复于 59c6ec8）
36023188890  dispatch refresh  SUCCESS — ASCII 掩码基线
36024639677  push  2778890      FAIL — 跨午夜（CST 9/24→9/25）日期锚定内容：timeline 12–23%、today 0.2–15.9%（→ 日期归一化 cbfcaaf）
36027823902  dispatch refresh  FAIL — 前端 typecheck flake（→ tsbuildinfo 治理 24098a9 + frozen-lockfile aef802c）
36028672742  dispatch refresh  SUCCESS — 日期归一化基线（20/60）
36031182088  push  96d6ec7      FAIL — timeline 0.3–1.3%（UUID 文本 → 6dd33ae）
36033001925  dispatch refresh  FAIL — 前端 typecheck flake 复现（确认 frozen 不够，根因 = tsbuildinfo）
36033856405  dispatch refresh  SUCCESS — UUID 归一化基线（10/60）
36035035529  push  2a5c35a      SUCCESS — 全绿（Backend + Frontend + Browser E2E 视觉链 0 diff）
36035967319  tag   v0.1.1       SUCCESS — Android APK + Web standalone 双 job（8m49s）
```

## 3. Visual Regression V2 收口（真实 diff 验证）

```text
approved baseline : artifacts/visual-baseline-approved/ 60 张（Linux + fonts-noto-cjk 冻结）
diff 引擎          : per-channel tolerance 5/255；diff ratio > 0.2% → FAIL + expected/actual/diff 三件套
本轮根因修复       : ① ASCII 掩码 token；② 文本级日期归一化（ISO + 中文日期）；
                     ③ 文本级 UUID 归一化；④ tsc tsbuildinfo 移出 git；⑤ pnpm --frozen-lockfile
最终结果           : VISUAL_REGRESSION_V2_PASS —— 36035035529 视觉链 60/60 0 命中（跨 run 稳定）
显式刷新协议       : PLI_UPDATE_VISUAL_BASELINE=1（本轮 3 次显式刷新，每次记录原因；45–50/60 字节级不变）
```

## 4. Android v0.1.1（tag 构建产物验证）

```text
CI APK（tag v0.1.1 构建）: com.pli.mobile · versionCode 2 · versionName 0.1.1 · label 宠物生活智能
                            aapt badging 实测；sha256=6F79B4D49929FEB6F724E14CB3B7D34911EE29CFDCC51042C0FE5A3290A8A44D
                            （CI 无 EXPO_PUBLIC_PLI_API_URL → 不含 LAN 地址、cleartext 关闭、fail-safe 生效）
LAN APK（发布主资产）    : Pet-Life-Intelligence-v0.1.1-internal-lan.apk（88,151,802 B）
                            bundle 含 http://192.168.0.100:8800、0 命中 localhost:8800；
                            sha256=7A0C1B14…A72031 与 SHA256SUMS 一致；DEBUG_SIGNED_INSTALLABLE_APK
Web standalone          : pli-web-standalone.tgz（38,652,717 B；sha256=151AF9…EB09；解包 4320 文件，
                            0 命中 localhost:8800 / 127.0.0.1:8800）
```

## 5. v0.1.1 GitHub Release

```text
https://github.com/huangdi97/pet-life-intelligence/releases/tag/v0.1.1
tag v0.1.1 → 2a5c35a（= 推送后的 HEAD；v0.1.0 未移动/未删除，peeled 前后一致 1bf7581）
assets : Pet-Life-Intelligence-v0.1.1-internal-lan.apk · SHA256SUMS · pli-web-standalone.tgz ·
         pli-screenshots.zip
定位   : Internal / Pre-Pilot（真机未测，按任务书 §39 标注）
```

## 6. 本轮验收标准逐项

```text
A1 推送        : PASS — origin/main == HEAD == 2a5c35a（无 force；含 10 个真实提交）
A2 远端 CI     : PASS — 最终 push run 36035035529 全绿；全部失败 run 均已根因修复并记录
A3 Release     : PASS — gh release view v0.1.1 可查；tag=HEAD；Notes 标 Internal/Pre-Pilot；
                  assets 含 internal-lan.apk + SHA256SUMS + web standalone tgz + screenshots
A4 v0.1.0 不可变: PASS — peeled commit 前后均为 1bf7581
A5 LAN 就绪    : PASS — 0.0.0.0:8800 监听；http://192.168.0.100:8800/api/v1/health HTTP 200；
                  防火墙命令已文档化（docs/LOCAL_DEVELOPMENT.md，仅文档未越权执行）
A6 checklist   : PASS — reports/ANDROID_REAL_DEVICE_QA.md J1–J8（≤15min）；
                  ANDROID_BUILD_READY + REAL_DEVICE_QA = NOT_YET_OBSERVED（无真机 PASS 声明）
A7 无 localhost: PASS — LAN APK bundle 0 命中 localhost:8800；Web 产物（.next + standalone tgz）0 命中
A8 报告收口    : PASS — 本文档即终态；无 WEB_LIVE/API_PUBLIC_LIVE/真机 PASS 等无证据声明
A9 版本信息    : PASS — versionName 0.1.1 / versionCode 2 / com.pli.mobile；Release SHA256 与 APK 一致
```

## 7. 最终状态（本轮）

```text
STAGE_R1_COMPLETE = TRUE
GITHUB_V0_1_1_RELEASED = TRUE（Internal / Pre-Pilot）
ANDROID_REAL_DEVICE_QA = NOT_YET_OBSERVED（LAN 链路与 checklist 就绪，待用户真机实测回填）
PUBLIC_DEPLOYMENT = EXTERNAL_BLOCKED
VISUAL_REGRESSION_V2_PASS = TRUE（跨 run 复现稳定）
REAL_PARTICIPANTS = 0 · REAL_PETS = 0 · PRODUCT_VALIDATION = NOT_YET_OBSERVED
```

## 边界遵守（本轮）

```text
未进入 Stage I / v1.3 / Future 42 / PLI-229+；无新业务域；无 IA 重设计；未购买任何服务器/域名/付费服务；
未伪造真机 PASS / 未声称 LIVE / 未把 3D 包装成医学数字孪生；v0.1.0 tag 与既有 Release 历史不可变；
未删测试 / 未弱化断言 / 未加 ignore 过关（所有失败均按根因修复：MinIO 镜像、掩码确定性、tsbuildinfo、frozen-lockfile）。
```