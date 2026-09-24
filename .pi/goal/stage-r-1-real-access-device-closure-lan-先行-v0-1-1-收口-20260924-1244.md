# Stage R.1 GOAL — Real Access & Device Closure

## Goal 目标

把已发布的 `v0.1.0`（repo: github.com/huangdi97/pet-life-intelligence, HEAD `1bf7581`, worktree clean）推进到真实可用：

```
STAGE_R1_COMPLETE
CANONICAL_V3_3_ALIGNED          （v3.3-R1 母版正式入库 + 增量审计）
ANDROID_API_ENV_READY           （localhost 写死移除，env 注入，fail-safe）
ANDROID_BRANDING_READY          （Expo 默认资源替换）
ANDROID_BUILD_PASS              （v0.1.1 internal-LAN APK）
VISUAL_REGRESSION_V2_PASS       （真实 baseline diff）
WEB_PRODUCT_READY               （production build + env 注入 API URL）
GITHUB_V0_1_1_RELEASED          （用户已授权）
WAVE_0_REENTRY_READY
REAL_PARTICIPANTS = 0 / REAL_PETS = 0 / PRODUCT_VALIDATION = NOT_YET_OBSERVED
```

**执行优先级**：先打通 Mode A LAN 真机链路（电脑 API 0.0.0.0:8800 → 局域网 IP → v0.1.1 internal APK → 用户安卓手机测试），不等公网服务器；公网部署无服务器/域名/凭据 → 标记 `PUBLIC_DEPLOYMENT = EXTERNAL_BLOCKED`，只做 `DEPLOY_READY`。公网与真机状态单独如实判断，绝不混标。

不允许进入 Stage I / v1.3 / Future 42 / PLI-229+ / 新业务域；不重写架构、不重设计 IA。

## Acceptance criteria（完成后我必须能逐条客观验证）

1. **预检**：`reports/STAGE_R1_PREFLIGHT.md` 存在，内容与运行时事实一致（HEAD=`1bf7581`、main、origin、tag v0.1.0、worktree clean）；不回退 HEAD、不修改 v0.1.0/v1.x 任何 tag。
2. **v3.3 入库**：工作区根目录的 `Pet_Life_Intelligence_v3.3-R1_...2026-09-20.md` 正式纳入 `docs/canonical/PLI_v3.3-R1.md`（保留原始文件名作为映射引用）；新增 `docs/canonical/README.md` 索引（v3.1/v3.2=HISTORICAL，v3.3-R1=CURRENT，权威顺序 L0>L1>L2>L3）；旧 v3.1 文件不删除。
3. **增量审计**：`reports/V3_3_CANONICAL_DELTA_AUDIT.md` 字段齐全（Requirement / v3.1 existed / v3.3 added / Current implementation / Code evidence / Test evidence / Status / Action），覆盖 §7 重点清单（Living Canvas、PLM、3D Life View、3D Capture、3D Versioning、3D Provenance、3D Fallback、Companion integration、Today state carrier、Timeline×3D、Contextual Explain）；`V3_3_MISSING_CRITICAL = 0`（真正遗漏在 scope 内补齐，不扩业务域）。
4. **UI 复审**：`reports/STAGE_R1_V3_3_UIUX_REACCEPTANCE.md` 依据 v3.3-R1 + DESIGN_SYSTEM_V3 + runtime 复审 Today/Timeline/Pet/3D Life View/Assistant/Companion；只有真实通过才标 `UI_UX_V3_3_ACCEPTED`。
5. **Signing 文档修复**：全仓搜索 `UNSIGNED`/`未签名`/`debug signing`/`debug signed`，README/CHANGELOG/WORK_STATUS/Release 文档统一为 `DEBUG_SIGNED_INSTALLABLE_APK / NOT_PLAY_STORE_SIGNED / PLAY_STORE_SIGNING = EXTERNAL_BLOCKED`；历史报告只加"Historical wording corrected by Stage R.1"注释，不改事实。
6. **Mobile API 正式化**：`apps/mobile/app.json` 不再以写死 localhost 为唯一路径；支持 dev/LAN/staging/production 环境注入（`EXPO_PUBLIC_PLI_API_URL` 等），生产 APK 禁止写死 localhost；API URL 缺失/非法时 App 明确显示环境配置错误而非无限 loading；HTTP 仅限 DEV/INTERNAL（含 cleartext 策略说明）；`reports/MOBILE_API_CONFIGURATION_REPORT.md` 记录方案。
7. **Web**：production standalone build PASS；API 基址经环境变量（`NEXT_PUBLIC_API_URL` 链路）注入，production bundle 中 grep 无 `localhost:8800`/`127.0.0.1` API base；`reports/WEB_REAL_ACCESS_REPORT.md` 记录（无公网 → `WEB_DEPLOY_READY`、不写 WEB_LIVE）。
8. **LAN 链路实测（模拟器）**：本地 API 以 0.0.0.0:8800 启动并记录 LAN IP；Android internal APK 以 LAN URL 构建；在 pdig36 模拟器实际安装→启动不崩→register/login→token 持久→Today→Quick Log→Timeline→Pet→Health→Assistant→Me→豆豆/咪咪切换不串宠（petId 与 UI 一致）；`reports/ANDROID_REAL_DEVICE_QA.md` 诚实区分模拟器 PASS 与真机状态。
9. **真机闭环**：产出 v0.1.1 internal-LAN APK + 最短人工测试 checklist 给用户；用户真机反馈后如实标注 `ANDROID_REAL_DEVICE_ACCEPTANCE_PASS` 或保持 `REAL_DEVICE_QA_NOT_YET_OBSERVED`，绝不混标。
10. **品牌资源**：设计并接入 icon.png / adaptive-icon.png / splash.png（warm、clean、premium、非医疗十字、非游戏/赛博风），Android 显示名为产品名（非 Expo/RN 默认）；`reports/ANDROID_BRANDING_REPORT.md`。
11. **v0.1.1 构建**：versionName=0.1.1、versionCode=2；产出 `Pet-Life-Intelligence-v0.1.1-internal-lan.apk`，记录 filename/package/versionName/versionCode/API env/size/sha256/signing type。
12. **Visual Regression V2**：冻结 approved baseline（`artifacts/visual-baseline-approved/`）；对比测试用 pixel/perceptual diff 断言（超阈值 CI FAIL，输出 actual/expected/diff），禁止用无脑 "update snapshots" 让 CI 变绿；重点页面 Today/Timeline/Pet/3D Life View/Health/Assistant/Companion/Me，宽度含 360/390/768/1440；`reports/VISUAL_REGRESSION_V2_REPORT.md`。
13. **全量回归**：pytest / ruff / format / 五端 typecheck / vitest / 五端 build / Playwright / visual regression / contract / safety / secret scan / source-size gate 全部 PASS（以命令输出为证据，不降低任何 gate）。
14. **安全与 Pilot 完整性回归**：Red Flag、Medication、Permissions、Synthetic exclusion、Fact vs Inference、Generated 3D provenance 相关测试全部保持通过。
15. **§44 报告齐全**：STAGE_R1_PREFLIGHT / V3_3_CANONICAL_DELTA_AUDIT / STAGE_R1_V3_3_UIUX_REACCEPTANCE / MOBILE_API_CONFIGURATION_REPORT / ANDROID_BRANDING_REPORT / ANDROID_REAL_DEVICE_QA / WEB_REAL_ACCESS_REPORT / VISUAL_REGRESSION_V2_REPORT / STAGE_R1_FINAL_REPORT 全部生成且内容与运行证据一致。
16. **文档收口**：README/CHANGELOG/WORK_STATUS 更新（README 首屏含 What is PLI / 截图 / Web / Android，只放真实链接；说明 v1.x=historical internal milestones、v0.1.x=public product line）；截图包含 `artifacts/release/v0.1.1/screenshots/{android,web}` 核心页面真实截图。
17. **v0.1.1 Release**：以上全部本地/远端 Gate 通过后，创建 tag `v0.1.1` + GitHub Release，附 Android APK、Web standalone、Release Notes、SHA256（用户已授权；若无真机结果则标注 Internal / Pre-Pilot）。
18. **最终状态**：`reports/STAGE_R1_FINAL_REPORT.md` 按 §50 的 14 项格式输出真实证据；对外状态如实为 `WEB_DEPLOY_READY / API_DEPLOY_READY / PUBLIC_DEPLOYMENT = EXTERNAL_BLOCKED`，`REAL_PARTICIPANTS=0 / REAL_PETS=0 / PRODUCT_VALIDATION = NOT_YET_OBSERVED`；无公网不写 WEB_LIVE/API_PUBLIC_LIVE。

## Boundaries（不可跨越）

- 禁止：Stage I、v1.3、Future 42、PLI-229+、新业务域、架构重写、五入口 IA 重设计；把 3D 包装成真实医学数字孪生（PROVENANCE/事实层不可被展示层覆盖）；假装有真人/真实 3D Provider。
- 不可变：v0.1.0 与 v1.x tags 不删除/不动/move；HEAD 不回退；历史报告事实不改写（只加校正注释）。
- 不购买服务器/域名/任何付费服务；无凭据不部署公网。
- 不通过 update snapshots / 弱化断言 / 加 ignore 让 CI 变绿。
- DEMO/SYNTHETIC 数据标记保持正确，绝不进入真实 Pilot 指标（PILOT-INTEGRITY INVARIANT）。
- LAN 的 HTTP 仅限 DEV/INTERNAL，不冒充 production。
- 真机 PASS 与实际结果严格对应，无证据不声称。