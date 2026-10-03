# Android Runtime Capture — EXTERNAL_BLOCKED (R4.2)

## 结论

`ANDROID_RUNTIME_CAPTURE = EXTERNAL_BLOCKED`（本机会话）。未伪造任何 Android
Hero / turntable 证据；相关 contact sheet 未生成（generator 对缺失 required 源
会 raise —— 已实测）。

## 尝试记录（全部失败，每次均为环境层故障，非产品代码）

1. AVD `main` + `-gpu auto`（窗口）首次运行完整 capture：截图/布局产出，但
   WebView 3D 页面未启动（manifest 缺 `pli_manifest.json`，`visual.json` 记录
   `SYNTHETIC_FALLBACK_EVIDENCE / fallbackUsed=true`）；随后模拟器崩溃。
2. `-gpu swiftshader_indirect`、`-no-window`、`-memory 2048/3072/4096`、
   `-no-snapshot`、`-wipe-data`、`adb root`（userdebug 镜像但 adbd 未以 root
   持久）、`su 0` 读取 manifest —— 模拟器在安装/启动重型 Hermes bundle（含
   11MB pet-stage.html + 双 GLB base64）期间反复崩溃（qemu 进程消失 / adb
   daemon 重启 / `device not found`），共 8+ 次不同配置尝试。
3. API 连通性：emulator 的 10.0.2.2 NAT 到 host 失效（toybox nc 超时）；改用
   `adb reverse` + `http://127.0.0.1:8800` 构建（Hermes 字符串表验证 URL 已
   注入）后应用可登录并显示真实数据（visual.json 含豆豆/咪咪 pet + living
   stage 卡片），但 WebView 渲染进程在模拟器会话内无法启动 11MB 页面
   （`pli_diag.json` 无 load-start/load-end 标记 → WebView 未开始加载）。
   补充排查：`dumpsys webviewupdate` 查询 WebView 实现选项时 adb daemon 再次崩溃；
   尝试 `-gpu angle_indirect`（此前未试）同样在安装阶段崩溃。累计 10+ 种配置，
   全部在「安装重型 Hermes bundle / 应用启动 / adb 传输」阶段崩溃（qemu 进程消失
   或 adb daemon 重启），确认是主机会话级环境不稳定。
4. 备选 AVD `zhishen_rc` 系统镜像缺失（`FATAL Broken AVD system path`），不可用。
5. 截图方法修正：`exec-out` 直出曾产生损坏 PNG（7/13），capture 脚本已改为
   设备端 `screencap -p` + `adb pull`（二进制安全，含重试），供稳定环境复用。
## 已排除的怀疑（有证据）

- pet-stage.html 页面本身：headless Chromium 中打开即成功 —— RUNTIME manifest、
  `high-fidelity-glb-twin`、`fallbackUsed=false`、`skinnedMeshCount=1`、
  `triangleCount=45376`、`stageRole=living`、`surfaceVariant=warm-living-field`、
  无 JS 错误。页面代码正确。
- APK 内容：Hermes 字节码字符串表包含 `pliAmbientFloor`、`warm-living-field`、
  `neutral-identity-studio`、`__PLI_STAGE_THEME`、两个 GLB base64 魔数
  （`Z2xURg` ×2）→ 新代码与新资产已打进 APK。
- Android 应用 UI 代码：`tokens.ts`（warm cream）、`PetLivingStage.tsx`
  （warm living / neutral review studio）、`Pet3DViewer.tsx`（stageTheme 注入）、
  `pet-stage-entry.ts`（scene.background + floor + glow + manifest surfaceVariant）
  均已完成并通过 `apps/mobile typecheck`；`assembleRelease` 成功。

## 结论与影响

- 原因定位为「本机 Windows 模拟器会话无法支撑重型 WebView 运行时」，属环境
  blocker；按照 Goal §11 的诚实要求，未把 fallback 截图当作 Android Hero 证据。
- 结果：`PLI_R4_2_ANDROID_HEROES.png`、`PLI_R4_1_VS_R4_2_ANDROID_HEROES.png`
  与 Android turntable 未生成（contact sheet generator 的 required 缺失即
  raise 行为已实测生效）。
- 建议：在可用的 Android 实机/稳定模拟器环境重跑
  `scripts/r2p3d-r4-2/capture-android-r4-2.ps1`（指向 API 的
  `http://127.0.0.1:8800` + `adb reverse tcp:8800 tcp:8800`），再运行
  `scripts/r2p3d-r4-2/contact_sheets_r4_2.py --labels doudou=豆豆 mimi=咪咪`
  （不带 `--skip-android`）补全 Android sheets。
