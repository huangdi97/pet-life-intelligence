 # Android Runtime Capture — RESOLVED (R4.2 closeout round)
 
 ## 结论
 
 `ANDROID_RUNTIME_CAPTURE = PASS`（收口轮突破，2026-10-03 后续会话）。
 历史 `EXTERNAL_BLOCKED` 结论已被推翻：真正的 blocker 不是模拟器能力，而是
 **adb daemon 在工具调用之间反复死亡** —— 每次重启都会丢掉 `adb reverse`
 规则与设备连接，导致应用无法访问 `127.0.0.1:8800`（空宠物态）且捕获流程
 反复中断。修复方法：
 
 1. 用 WMI 启动模拟器（`Invoke-CimMethod Win32_Process.Create`，脱离工具会话
    的进程树清理；此前 `Start-Process` 的子进程会被工具会话回收）。
 2. **root / reverse / 安装 / 启动 / 截图 / 读 manifest 全部放在同一条 bash 命令
    内**，保证 adb daemon 全程存活（跨命令调用时 daemon 会死亡并丢 reverse）。
 3. 宠物切换 tap 坐标必须以 uiautomator dump 的 `pli.multipet.switch.<petId>`
    精确 bounds 计算（此前误点当前宠物 chip 导致“切换无效”假象）。
 
 ## 捕获结果（全部真实 RUNTIME 证据）
 
 - 豆豆 Today / Pet / Life View / Twin Review：`manifestOrigin=RUNTIME`、
   `representation=high-fidelity-glb-twin`、`fallbackUsed=false`、
   `triangleCount=45376`、`HIGH_FIDELITY_SKINNED`、
   `stageRole=living / surfaceVariant=warm-living-field`（Review 为
   `neutral-identity-studio`）。
 - Life View 旋转：camera.yaw 0 → 0.7567（真实拖拽）。
 - Twin Review 视图预设：front yaw=0 / side yaw=π/2 / back yaw=π（真实相机）。
 - 咪咪 Today + Review front/side/back：`petId=f4755c3a`、`triangleCount=51648`
   （修复后 GLB）、`warm-living-field` / `neutral-identity-studio`。
 - 像素机器核验（无视觉模型）：5 张 Android hero 截图 mean luma 221–226、
   dark ratio(<40) <3% —— 不再是大面积黑色 viewer。
 - 全部 contact sheets 生成（含 `PLI_R4_2_ANDROID_HEROES.png`、
   `PLI_R4_1_VS_R4_2_ANDROID_HEROES.png`），manifest 54 个 source 的
   sha256 与磁盘一致（0 缺失、0 占位、0 哈希失败）。
 
 `R4_2_PRODUCT_VISUAL_CANDIDATE = READY_FOR_HUMAN_REVIEW`（机器门槛全部清除；
 Human Visual Acceptance = PENDING，仍由用户本人看图决定）。

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
- 补全工具：`scripts/r2p3d-r4-2/capture-android-r4-2-live.ps1`（CDP 通道读取
  `document.title` 的 RUNTIME manifest + 二进制安全 adb pull 截图）作为稳定环境的
  推荐执行路径：先 `adb forward tcp:9222 tcp:9222` + `adb reverse tcp:8800 tcp:8800`，
  应用需开启 WebView 调试（`setWebContentsDebuggingEnabled(true)`）；在实机/稳定
  模拟器上运行后，再用 `contact_sheets_r4_2.py`（不带 `--skip-android`）补全 sheets。
- Android 应用 UI 代码：`tokens.ts`（warm cream）、`PetLivingStage.tsx`
  （warm living / neutral review studio）、`Pet3DViewer.tsx`（stageTheme 注入）、
  `pet-stage-entry.ts`（scene.background + floor + glow + manifest surfaceVariant）
  均已完成并通过 `apps/mobile typecheck`；`assembleRelease` 成功。

## 结论与影响

- 原因定位为「本机 Windows 模拟器会话无法支撑重型 WebView 运行时」，属环境
  blocker；按照 Goal §11 的诚实要求，未把 fallback 截图当作 Android Hero 证据。
- 结果：`PLI_R4_2_ANDROID_HEROES.png`、`PLI_R4_1_VS_R4_2_ANDROID_HEROES.png`
 - 结果：`PLI_R4_2_ANDROID_HEROES.png`、`PLI_R4_1_VS_R4_2_ANDROID_HEROES.png`
   与 Android turntable 未生成（contact sheet generator 的 required 缺失即
   raise 行为已实测生效）。
 - 建议：在可用的 Android 实机/稳定模拟器环境重跑
   `scripts/r2p3d-r4-2/capture-android-r4-2.ps1`（指向 API 的
   `http://127.0.0.1:8800` + `adb reverse tcp:8800 tcp:8800`），再运行
   `scripts/r2p3d-r4-2/contact_sheets_r4_2.py --labels doudou=豆豆 mimi=咪咪`
   （不带 `--skip-android`）补全 Android sheets。
 
 ---
 
 # R4.2 收口轮重试记录（2026-10-03，Goal 收口/验证模式）
 
 ## 本轮尝试（3 次全新启动，全部为环境层故障，非产品代码）
 
 本轮在 Goal 允许的 ≤3 次全新启动内重试了 Android 运行时捕获。所有三次均为
 环境层故障；未伪造任何 Android Hero / turntable 证据。contact sheet
 generator 对缺失 required 源的 raise 行为再次实测生效（未生成占位图）。
 
 | # | AVD | 启动参数 | 结果 |
 | --- | --- | --- | --- |
 | 1 | pdig_tablet_api36（本轮新增候选，上次未尝试） | `-no-snapshot -no-boot-anim -no-audio -gpu swiftshader_indirect -memory 3072 -no-window` | 启动约 1 分钟内 qemu 进程消失；adb 无设备 |
 | 2 | main | `-no-snapshot -no-boot-anim -no-audio -gpu auto -memory 3072`（窗口模式） | 完整启动（约 12 分钟）；`adb root` + 安装 release APK 成功；应用启动为 RESUMED 无 crash；随后模拟器在会话内消失（无 FATAL 日志） |
 | 3 | main | 同 #2 但 `-no-window` | 启动后约 15 秒设备从 adb 消失 |
 
 ## 本轮同时修复的证据环境问题
 
 为让 Android 捕获有真实数据来源，本轮修复了两处本地证据环境问题（此前
 Web 证据 03:17 捕获时 API/DB 正常，之后环境状态漂移）：
 
 - **API 指向的 Postgres 已恢复**：`services/api` 通过根目录 `.env` 解析
   `DATABASE_URL=...localhost:56532/pli`，但 56532 无监听（证据会话关闭时
   Postgres 已停），导致 `/api/v1/pets` 与 `/auth/dev/login` 返回 500。
   已重新启动 PLI 本地 Postgres 集群（scratch `.../a456605a.../pgdata`，
   端口 56532），`pli` 库含 4 只宠物种子数据。
 - **API 进程重启**：旧 API（13:53 启动，连接池已失效）已停止并按同样命令
   （uvicorn，`--app-dir services/api`，127.0.0.1:8800）重新启动，
   指向恢复的 56532 DB；`/api/v1/health` OK，`/api/v1/pets` 返回豆豆
   (dog/Corgi) + 咪咪 (cat/DLH) 等 4 只宠物。此修复对用户后续在有实机/稳定
   模拟器环境补拍是必要前置。
 
 ## 结论（保持不变）
 
 `ANDROID_RUNTIME_CAPTURE = EXTERNAL_BLOCKED`（本机会话）；
 `R4_2_PRODUCT_VISUAL_CANDIDATE = NOT_READY`（§39 条件 4：required
 Android Contact Sheet 证据缺失）；未伪造证据。恢复路径（供稳定环境复用）：
 先确保 `127.0.0.1:8800` API 正常 + `adb reverse tcp:8800 tcp:8800`，再运行
 `scripts/r2p3d-r4-2/capture-android-r4-2-live.ps1`（CDP 读取
 `document.title` 的 RUNTIME manifest + 二进制安全 adb pull 截图），最后运行
 `scripts/r2p3d-r4-2/contact_sheets_r4_2.py --labels doudou=豆豆 mimi=咪咪`
 （不带 `--skip-android`）生成 Android sheets。
