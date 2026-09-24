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