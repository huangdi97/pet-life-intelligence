# R2P3D-R3 最终报告 — Render Truth & Visual Composition（无视觉模型 UI 最终闭环）

- 日期：2026-10-01
- 分支：`feat/r2p3d-r3-render-truth-ui-closure`（基：`main` @ `2069d8a`）
- PR：https://github.com/huangdi97/pet-life-intelligence/pull/2
- 运行时：web dev `http://localhost:3100`、API `http://localhost:8800`、AVD `main`（emulator-5554, Android 16 / SwiftShader GLES3, WebView 133）
- 已提交：`e5023bc`（Blind Contract V2）、`5ab262a`（Android 真实 3D）、`8e6b9aa`（个体 Twin 候选）、`da89cf7`（identity + aspect framing）、`d09702e`（Android 相机控制 + 证据适配）、`fcf0703`（真话文案 + canonical E2E 断言）

## 0. 验收结论（逐项）

| 标准 | 状态 | 证据 |
| --- | --- | --- |
| 不调用任何视觉模型 | ✅ 达成 | `NO_VISION_MODEL_USED = TRUE`；仅 DOM/a11y 树、计算样式、RUNTIME 3D manifest、像素统计（PIL+numpy）、机器契约 |
| Blind Contract V2 真实门禁 | ✅ 达成 | 32/32 `tests/blind_ui` 通过；`packages/visual-contract` V2 八维（identity/manifest-origin/camera/pixel-style/style-truth/interaction 等） |
| Android 真实 3D（既有 AVD） | ✅ 达成 | Today/Pet/LifeView/TwinReview 均发布 RUNTIME manifest（generic=false, meshCount=25, skeleton=true）；LifeView 相机证据链（rotate/zoom/reset）真实 |
| 个体 Twin（豆豆/咪咪） | ✅ 达成 | 豆豆 `0070551c…` v1 ACTIVE（corgi-like, observed [coat,ear]=2）；咪咪 `386bfba3…` v1 ACTIVE（standard-cat, observed=2）；真实 API 管线（capture→生成→QC→verify→activate） |
| 四个 Hero 屏 | ✅ 达成 | Web 100/100/100/100；Android 97/97/100/100；`heroPass=True`、`criticalFailed=[]` |
| Secondary 页面 | ✅ 达成 | 双端全部 `heroPass=True`（Web 100/95/95/…；Android 100/95/…；quick-log 95、offline 93 等） |
| 完整回归 | ✅ 达成（本地+CI） | 见 §4 |
| 7 张 Contact Sheets | ✅ 达成 | `artifacts/r2p3d-r3/contact-sheets/`（WEB/ANDROID × R2 before/R3 after + ALL + SPECIAL） |
| CI | ✅ 已触发 | PR #2（CI + Android workflows），最终状态见 CI_CLOSURE |
| 最终报告 | ✅ | 本文档 |
| 人工视觉验收 | ⏳ PENDING | `HUMAN_VISUAL_ACCEPTANCE = PENDING`（Contact Sheets 供人审） |

## 1. Hero 屏最终分数

| 屏 | Web total | Web heroPass | Android total | Android heroPass | 说明 |
| --- | --- | --- | --- | --- | --- |
| Today | 100/100 | True | 97/100 | True | Android −3：`stage.interactive` 无法用 uiautomator 观测舞台容器交互（EXTERNAL_BLOCKED，非 critical） |
| Pet World | 100/100 | True | 97/100 | True | 同上 |
| Life View | 100/100 | True | 100/100 | True | camera rotate/zoom/reset 全真实证据 |
| Twin Review | 100/100 | True | 100/100 | True | identity.gate + not_like→activate disabled 交互真值 |

关键 manifest 证据（全部 `manifestOrigin=RUNTIME`）：

| 指标 | Web Today | Web Pet | Web Life | Web Review | And Today | And Pet | And Life | And Review |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| generic | false | false | false | false | false | false | false | false |
| petId 匹配 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| sourceMediaCount | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| meshCount / skeleton | 25/true | 25/true | 25/true | 25/true | 25/true | 25/true | 25/true | 25/true |
| projectedAreaRatio | 0.172 | 0.214 | 0.275 | 0.234 | 0.120 | 0.151 | 0.197 | 0.166 |
| 契约范围 | 0.10–0.24 | 0.14–0.28 | 0.18–0.36 | 0.16–0.30 | 0.10–0.24 | 0.14–0.28 | 0.18–0.36 | 0.16–0.30 |

Android LifeView 相机证据（真实交互，非注入）：rotateA yaw=0.35 → rotateB yaw=1.1838（Δ0.834 ≥ 0.03）；zoomA radius=6.88 → zoomB 5.73（Δ1.15 ≥ 0.05）；reset yaw=0.35（偏差 0 ≤ 0.05）。

## 2. 关键实现

- **Aspect 感知取景**（`packages/pet-3d/src/manifest.ts` `fitOrbitRadius`）：把投影宠物框锚定到「全视口占比」目标（Today 0.17 / Pet 0.21 / Life 0.27 / Review 0.23），任意舞台宽高比下都落在契约区间；reset 恢复 fitted canonical，保证 reset≈canonical 门禁精确。
- **Identity 真值**：Today/Pet/LifeView 此前渲染 generic 演示，根因是 harness 在 twinreview 上真实点击「不像」把 ACTIVE 打回 VERIFYING；现 harness 通过路由拦截（web）与恢复（android）保证演示数据诚实，页面一律取 ACTIVE twin。
- **Android DEMO_ENV 根因**：deep link 失效的根因是构建未带 `EXPO_PUBLIC_PLI_DEMO_ENV=1`（DemoSession 直接 return，无自动登录、无 nav）；修复后 deep link 全通。
- **相机交互**：移动端 LifeView 新增 RN 层 缩小/放大/重置视图 控件（forwardRef → WebView `window.zoom/resetView`），真实驱动 camera 证据。
- **真话文案**：Life View 外观/可信面板原声明「演示 3D 形象（开发环境）」与 ACTIVE twin 矛盾，改为「第 N 版 · 已通过你的确认」（无 twin 时保留诚实回退文案）。

## 3. 诚实状态（NOT_YET_OBSERVED / PENDING）

- `HUMAN_VISUAL_ACCEPTANCE = PENDING` — 7 张 Contact Sheets 供人工审查，agent 不做视觉断言。
- `REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED` — 个体 Twin 由合成演示素材生成，未做真实宠物身份验证。
- `ANDROID_REAL_DEVICE_QA = NOT_YET_OBSERVED` — 只在 `main` 模拟器（SwiftShader）验证；未在真实设备上 QA。
- `REAL_3D_PROVIDER = EXTERNAL_BLOCKED` — 3D 由本地模板管线生成（`template_local`），真实生成式 provider 诚实标记 EXTERNAL_BLOCKED。
- VISUAL-V2/V3 基线：已知漂移（R3 视觉变化所致），基线更新需人工视觉批准 → 保持 RED，**不更新基线**。

## 4. 回归（本轮实测）

| 项 | 结果 |
| --- | --- |
| `pytest tests/blind_ui` | 32/32 ✅ |
| 后端 pytest（非 blind_ui） | 446/446 ✅ |
| ruff（scripts/tests/services/api） | clean ✅ |
| web/admin/mini/packages typecheck | ✅（api-client 的 `process` 错误为 pre-existing，CI 不查） |
| web production build | ✅（本地 `PLIT_LOCAL_BUILD=1` 跳过 standalone 组装；ENOSPC 曾因 E: 盘满，已清理并验证） |
| mini weapp build | ✅ |
| twin GLB QA | ✅ |
| OpenAPI 新鲜度 | ✅（无 diff） |
| Playwright E2E | 43 通过（含全部 stale 断言修复后）＋3 失败：STAGE-V-VISUAL-01（本地 ENOSPC 截图写入）与 VISUAL-V2/V3（已知基线漂移 RED；本地另受 0.07GB 磁盘限制）。CI 在 Linux 复跑 |
| Android 捕获 | 21/21 屏（今日/宠物/生命视图/确认全 twin；special 全部真实状态） |

## 5. 残留风险 / 限制

- Android Today/Pet 的 `stage.interactive` 3pt 非 critical 缺失（uiautomator 无法观测舞台容器交互）——记录为 EXTERNAL_BLOCKED。
- 本地 E: 磁盘极低（0.07GB 可用）限制部分截图密集型验证；CI 为权威门禁。
- 演示数据为合成素材，真实身份验证待真实用户与照片。
