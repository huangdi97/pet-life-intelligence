# R2P3D_P0_EVIDENCE — 证据清单与运行事实（Phase P0）

> 生成时间：2026-09-27 · 阶段终点：`R2P3D_PHASE_P0 = WAITING_FOR_HUMAN_VISUAL_ACCEPTANCE`

## 1. 交付证据（artifacts/r2p3d/）

### core/（验收命名，来自真实运行）
- `01_today_3d.png` / `02_pet_world_3d.png` / `03_life_view_3d.png` — Web 390×844 真机全页截图（3D stage ready，剪裁自 R2P3D-01）。
- `04_life_view_angle_A.png` / `05_life_view_angle_B.png` — Life View 舞台**拖拽前后**截图（同一页面、真实手势）。
  - 像素差实测：宠物区域 86,460 像素中 8,844 像素变化（阈值 >15/255，比例 10.2%）→ 旋转真实发生。
- `R2P3D_CORE_CONTACT_SHEET.png` — 六图联系表。
- `v0.2.0_vs_R2P3D_{Today,Pet,LifeView}.png` + `R2P3D_BEFORE_AFTER_CONTACT_SHEET.png` — 前后对比。
- `android_runtime_01_today.png` — **真实 Android 模拟器运行截图**（新 App 启动后：暖炭 3D 舞台 + 品牌绿 + 暖白内容区；该构建为 expo-asset 版本，宠物渲染被资产注册问题阻塞——已在代码修复且后续构建通过，但设备侧最终渲染因环境无法再取证）。

### web/（Playwright 390/1440 全六张 + fold）
- today/pet/life-view × 390/1440（R2P3D-01 产物，repo 级拷贝）。

## 2. 测试与门禁（本会话实测）

| 门禁 | 结果 |
|---|---|
| mobile typecheck（tsc --noEmit）| PASS（exit 0）|
| web typecheck | PASS（exit 0）|
| web vitest | 5 文件 / 33 用例 PASS（含 pet-3d 资产注册/构建/姿态/轨道数学 11 例）|
| next build（PLIT_LOCAL_BUILD=1）| PASS |
| 后端 pytest | **427 passed**（6m22s，无回归）|
| Playwright functional 链（grep-invert VISUAL-V3/V2）| **35/35 PASS** |
| R2P3D-01..06（3D ready / 旋转 / 缩放 / 术语门 / Android 同源页渲染+旋转）| **6/6 PASS** |
| Android release APK（含 WebView 3D）| assembleRelease PASS（84.7MB；expo-gl 因 CMake 路径超限弃用，见架构文档）|
| artifacts/visual-v3-approved/ | 零改动（git 干净）；未执行 baseline 刷新 |

## 3. 关键实现（变更面）

- `packages/pet-3d/`（新）：注册表（豆豆/咪咪，DEMO_SYNTHETIC provenance）+ 程序化低模资产 + 轨道数学（旋转/缩放/复位纯函数）。
- Web：`apps/web/components/three/pet3d-viewer.tsx`（WebGL 场景、拖拽旋转、滚轮缩放、Reset、reduced-motion、status/orientation 透出）+ pet-living-stage 三屏接入（失败回退 2.5D）。
- Mobile：`apps/mobile/src/components/three/Pet3DViewer.tsx`（WebView 承载自包含页面）+ `scripts/build-3d-page.mjs` 生成 `src/three/petStageHtml.ts`（与 Web 同一 @pli/pet-3d 场景打包）；Life View 交互舞台 + 锚点详情 sheet（事实/相比/来源/时间/证据）。
- 视觉：暖炭 3D 舞台（#171310 + 雾 + 暖光 + 接触阴影）、深色玻璃锚点、canonical 文案（豆豆·此刻 / 演示 3D 形象）、术语门零泄漏。

## 4. 诚实边界（HARD STOP 依据）
- REAL_3D_PROVIDER = EXTERNAL_BLOCKED；REAL_PETS = 0；demo 3D 资产为 DEMO/SYNTHETIC dev-only，非事实源。
- **Android 设备端 3D 渲染/旋转截图：环境阻断**（本机 adb daemon 在安装传输期间被外部进程反复杀死，模拟器不稳定；最终内联-HTML 构建未能装入设备）。等价证明：R2P3D-06 在 Chromium 中驱动与设备 WebView **完全相同的 pet-stage.html**，渲染豆豆并拖拽旋转通过。此条不声明为 PASS。
- 视觉验收由人类判定（Q1–Q12）；本报告只提供证据，不做视觉裁决。