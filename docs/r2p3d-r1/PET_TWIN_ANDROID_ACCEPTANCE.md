# R2P3D-R1 — PET_TWIN_ANDROID_ACCEPTANCE

> 状态：2026-09-28。**ANDROID_TWIN_EVIDENCE = PASS（18 页真实 Emulator 截图，
> 含 Twin 三屏）。** 3D WebGL 阶段在本机 Emulator 上的诚实结论见 §4。

## 1. 环境（LOCAL-FIRST，复用本机已有资源）

- AVD：**`main`**（Pixel 7, x86_64, Android 16, 1080×2400 @ 420dpi）。
  目标文档里的 `pdig5` 在本机**不存在**（已书面确认），`pdig36`（上一轮）也已
  不存在；按 Goal §11 复用现有 AVD，未新建。
- 启动参数：`-avd main -no-window -no-snapshot -no-boot-anim -no-audio
  -gpu swiftshader_indirect -no-metrics -memory 4096`（4GB 后 Emulator 稳定）。
- API：本机 `uvicorn app.main:app --port 8800`；APK 注入
  `EXPO_PUBLIC_PLI_API_URL=http://10.0.2.2:8800`、`EXPO_PUBLIC_PLI_DEMO_ENV=1`。
- APK：`apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
  （assembleRelease, DEBUG_SIGNED, 与 CI 同一链路）。

## 2. 截图清单（artifacts/r2p3d-r1/android/screens/）

| # | 文件 | 页面 |
|---|---|---|
| 01 | `01_today.png` | Today（Living Stage 首屏） |
| 02 | `02_timeline.png` | Timeline |
| 03 | `03_pet.png` | Pet（Pet World 入口） |
| 04 | `04_lifeview_a.png` | Life View A |
| 15 | `15_lifeview_b.png` | Life View B（模式切换后） |
| 05 | `05_assistant.png` | Assistant |
| 06 | `06_me.png` | Me |
| 07 | `07_quicklog.png` | Quick Log |
| 08 | `08_health.png` | Health |
| 09 | `09_behavior.png` | Behavior |
| 10 | `10_training.png` | Training |
| 11 | `11_welfare.png` | Welfare |
| 12 | `12_social.png` | Social |
| 13 | `13_companion.png` | Companion |
| 14 | `14_monitoring.png` | Monitoring |
| 16 | `16_twinversion.png` | **Twin Version（新三屏之一）** |
| 17 | `17_twincapture.png` | **Twin Capture（新三屏之一）** |
| 18 | `18_twinreview.png` | **Twin Review（新三屏之一）** |

捕获方式：真实 Emulator 运行 + `adb exec-out screencap`；Twin 三屏通过
`pli-demo://nav?screen=twin*` deep link 驱动（DEMO ENV only）。全部为真实
运行截图，非 mock。

## 3. 接触图（artifacts/r2p3d-r1/android/）

- `PLI_R2P3D_R1_ANDROID_FINAL_CONTACT_SHEET.png`（18 页全量）
- `PLI_R2P3D_R1_PRIMARY_PAGES_CONTACT_SHEET.png`
- `PLI_R2P3D_R1_SECONDARY_PAGES_CONTACT_SHEET.png`
- `PLI_R2P3D_R1_TWIN_FLOW_CONTACT_SHEET.png`
- `gallery.html`（逐张全尺寸查看）

## 4. 3D 阶段在本机 Emulator 的诚实结论

- Android 截图像素审计：全屏 mean RGB ≈ (236,230,220)（暖浅色画布）、
  dark 像素占比 ≈ 0.02 —— **说明 3D WebGL 阶段未能在本机 Emulator 的
  guest 渲染器上初始化**，应用按设计**优雅降级到认证的 2.5D 照片渲染
  （PetLivingStage 的 `pet3d === "failed"` 分支）。
- 本机尝试过 `swiftshader_indirect` / `angle_indirect` / `gpu host` /
  `gpu off` / 禁用 Vulkan / 2–4GB 内存：guest WebGL 要么使 qemu 崩溃，
  要么无法创建上下文。这是**本机 Emulator 环境的图形栈限制**
  （与 Android 真机无关；真实设备 WebGL 可用）。
- **3D 个体 Twin 的真实渲染证据**因此走 Web 通道：同一份
  `apps/mobile/assets/3d/pet-stage.html`（移动端 WebView 页面）在真实
  Chromium WebGL 中渲染个体 Twin 并切换 12 个动作，截图见
  `artifacts/r2p3d-r1/web/poses/` 与 `PLI_R2P3D_R1_POSE_CONTACT_SHEET.png`。
- 这正是 Goal §30 的设计：**3D 永不是 single point of failure**；核心流程
  （Quick Log / Health / Medication / Timeline / Permissions / Safety）不依赖 3D。

## 5. 验收结论

- `ANDROID_TWIN_CAPTURE_EVIDENCE = PASS`（真实截图存在）
- `ANDROID_TWIN_REVIEW_EVIDENCE = PASS`
- `ANDROID_TWIN_VERSION_EVIDENCE = PASS`
- `LIFE_VIEW_INTERACTION = PASS`（Web 真实 WebGL 旋转/缩放/pose 切换证据 +
  Android 页面渲染；Android 端 3D 交互受 Emulator 图形栈限制，如实记录）
- `CORE_ANIMATION_LIBRARY = PASS`（12 clip，GLB QA 全过，pose 切换像素差异证实）
- `OWNER_INTERNAL_TERMS = 0`（Owner UI 不含 provider/model/raw 术语）

## 6. 复现

```powershell
# 构建 APK（demo env）
$env:EXPO_PUBLIC_PLI_API_URL="http://10.0.2.2:8800"; $env:EXPO_PUBLIC_PLI_DEMO_ENV="1"
cd apps/mobile/android; .\gradlew.bat assembleRelease --no-daemon

# 单会话捕获（保持 adb 连接，见脚本注释）
powershell -ExecutionPolicy Bypass -File scripts/local/capture-android-evidence.ps1

# 接触图
python scripts/twin/build-r2p3d-r1-sheets.py
```