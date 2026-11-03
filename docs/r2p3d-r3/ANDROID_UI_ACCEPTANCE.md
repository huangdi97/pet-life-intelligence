# Android UI 验收 — R2P3D-R3

捕获：`capture-android.ps1 -Out artifacts/r2p3d-r3/android`（AVD `main`；demo-link 驱动 + `adb root` 读持久化 manifest）。
评分：`scorecard.py artifacts/r2p3d-r3/android android --out artifacts/r2p3d-r3/reports-android`。

## 全屏结果（21/21 heroPass）

| 屏 | total | heroPass | 屏 | total | heroPass |
| --- | --- | --- | --- | --- | --- |
| today | 97 | ✅ | behavior | 95 | ✅ |
| timeline | 100 | ✅ | training | 100 | ✅ |
| pet | 97 | ✅ | welfare | 95 | ✅ |
| lifeview | 100 | ✅ | social | 95 | ✅ |
| assistant | 100 | ✅ | companion | 100 | ✅ |
| me | 100 | ✅ | monitoring | 95 | ✅ |
| quicklog | 95 | ✅ | twincapture | 95 | ✅ |
| health | 95 | ✅ | twinreview | 100 | ✅ |
| twinversion | 100 | ✅ | special-* | 92–100 | ✅ |

Hero 四屏关键证据（全部 RUNTIME、generic=false、petId 匹配、sources=2、meshCount=25、skeleton=true）：

- Today 0.120（0.10–0.24）、Pet 0.151（0.14–0.28）、Life 0.197（0.18–0.36）、Review 0.166（0.16–0.30）
- LifeView 相机证据：rotate yaw 0.35→1.1838（Δ0.834）、zoom radius 6.881→5.734（Δ1.147）、reset yaw 0.35（偏差 0）
- TwinReview：真实「不像」点击 → 8 项 issue、activate disabled（a11y enabled=false）

## 已文档化限制（非 critical）

- `stage.interactive`（today/pet 各 3pt）：Android uiautomator 无法观测舞台容器指针交互 → `EXTERNAL_BLOCKED`（LifeView/TwinReview 的交互真值由相机证据与选中态覆盖）。

## 关键工程修复

1. DEMO_ENV 构建开关（deep link / 自动登录复活）。
2. RN 层 缩小/放大/重置视图 控件（真实 camera 证据）。
3. release-proof manifest 通道（文件持久化 + document.title）。
4. extractor：tab 语义适配、interactive/selected 优先去重。
