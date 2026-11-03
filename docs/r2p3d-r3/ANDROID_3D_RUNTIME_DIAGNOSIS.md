# Android 3D Runtime 诊断 — R2P3D-R3

- Commit：`5ab262a`（真实 3D runtime + manifest 通道）+ `d09702e`（RN 相机控制）
- 运行环境：AVD `main`（emulator-5554, Android 16/SDK36, WebView 133.0.6943.137, SwiftShader GLES3 `ro.boot.opengles.version=196608`）

## 根因更正（R2 结论被推翻）

R2 曾判定「emulator WebGL unavailable」。R3 实机诊断推翻该结论，根因有两个：

1. **挂载死锁**：mobile `PetLivingStage` 只在 `pet3d === "ready"` 时挂载 viewer，而 ready 只在 viewer 挂载后才会出现 → 页面永远 loading。修复：`use3d = identity !== null && pet3d !== "failed"`（与 web 一致）。
2. **release Hermes 剥离 console.log**：旧 `[plimanifest]` logcat 通道在 release 下 0 次触发（此前 android `3d.json` 恒为 `{}`，extractor 只能合成 manifest）。修复通道：
   - WebView 页面 `document.title = "PLI_MANIFEST:" + JSON`（uiautomator/页面可达）
   - RN `Pet3DViewer` 把 runtime manifest 持久化到 `expo-file-system` 的 `documentDirectory/pli_manifest.json`（release-proof，harness 通过 `adb root cat /data/data/com.pli.mobile/files/pli_manifest.json` 读取）
   - `load-start / load-end / render-process-gone` 标记区分「未加载」与「渲染进程崩溃」

## 一个附加根因（deep link）

`pli-demo://nav?screen=…` 此前全部失效，根因是 release 构建未带 `EXPO_PUBLIC_PLI_DEMO_ENV=1`：`App.tsx` 的 `DemoSession` 直接 `return`（无自动登录、无 Linking 导航）。修复构建参数后 deep link 全通（含登录切换）。

## 实机证据（RUNTIME manifest）

| 屏 | generic | petId | sources | meshCount | skeleton | projectedAreaRatio | camera radius |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Today | false | 0070551c | 2 | 25 | true | 0.120（范围 0.10–0.24） | 8.59 |
| Pet | false | 0070551c | 2 | 25 | true | 0.151（0.14–0.28） | 7.75 |
| LifeView | false | 0070551c | 2 | 25 | true | 0.197（0.18–0.36） | 6.88 |
| TwinReview | false | 0070551c | 2 | 25 | true | 0.166（0.16–0.30） | 6.17 |

LifeView 相机交互证据（RN 层控件 → WebView `window.zoom/resetView` + 真实拖拽）：

- rotate：yaw 0.35 → 1.1838（Δ0.834 ≥ 0.03）✅
- zoom：radius 6.881 → 5.734（Δ1.147 ≥ 0.05）✅
- reset：yaw 0.35（相对 canonical 偏差 0 ≤ 0.05）✅

## 已证伪 / 未宣称

- 未宣称真实设备 QA（`ANDROID_REAL_DEVICE_QA = NOT_YET_OBSERVED`，仅在模拟器 SwiftShader 验证）。
- 未宣称 3D 由外部生成式 provider 产出（`REAL_3D_PROVIDER = EXTERNAL_BLOCKED`，本地模板管线 `template_local`）。
