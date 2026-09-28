# R2P3D-R1 — VISUAL_ACCEPTANCE_REPORT

> 状态：2026-09-28。**HUMAN_VISUAL_ACCEPTANCE = PENDING（由用户最终审阅）。**
> Agent 已完成全部工程视觉证据与内部 audit；最终签字仍属于用户（Goal §89）。

## 1. 证据资产

| 资产 | 位置 | 说明 |
|---|---|---|
| Android 18 页真实截图 | `artifacts/r2p3d-r1/android/screens/` | 真实 Emulator 运行 + screencap |
| Android 全量接触图 | `artifacts/r2p3d-r1/android/PLI_R2P3D_R1_ANDROID_FINAL_CONTACT_SHEET.png` | 18 页 |
| 主页面接触图 | `PLI_R2P3D_R1_PRIMARY_PAGES_CONTACT_SHEET.png` | Today/Timeline/Pet/LifeView/Assistant/Me |
| 次页面接触图 | `PLI_R2P3D_R1_SECONDARY_PAGES_CONTACT_SHEET.png` | QuickLog/Health/Behavior/Training/Welfare/Social/Companion/Monitoring |
| Twin Flow 接触图 | `PLI_R2P3D_R1_TWIN_FLOW_CONTACT_SHEET.png` | Capture/Version/Review/LifeView/Today |
| v0.2.1 vs R2P3D-R1 | `v0.2.1_vs_R2P3D_R1.png` | 左=已批准 v0.2.1 基线(web)，右=R2P3D-R1(Android) |
| Web 3D 个体 Twin 12 pose | `artifacts/r2p3d-r1/web/poses/` | 真实 Chromium WebGL，同一 demo Twin |
| Web Pose 接触图 | `artifacts/r2p3d-r1/web/PLI_R2P3D_R1_POSE_CONTACT_SHEET.png` | 12 pose + 2 framing |
| Twin 3D Review 接触图 | `PLI_R2P3D_R1_TWIN_3D_REVIEW_CONTACT_SHEET.png` | front/stand/sit/walk/eat/sleep |
| 在线相册 | `artifacts/r2p3d-r1/android/gallery.html` | 逐张全尺寸 |

## 2. Android 端视觉结论

- 18 页全部真实渲染（Today/Timeline/Pet/Life View×2/Assistant/Me/QuickLog/
  Health/Behavior/Training/Welfare/Social/Companion/Monitoring/Twin
  Version/Capture/Review）。
- **Twin 新三屏证据补全**：`16_twinversion / 17_twincapture / 18_twinreview`
  （上轮遗留限制已消除）。
- Android 端 3D WebGL 阶段在本机 Emulator 的 guest 渲染器上无法初始化
  （qemu 崩溃或上下文创建失败，已尝试 4 种 GPU 模式 + 2–4GB），应用按设计
  降级到认证 2.5D 照片渲染。完整说明：`PET_TWIN_ANDROID_ACCEPTANCE.md` §4。
- 页面方向与锁定视觉方向一致（暖家居/生活化/浅色画布 + 深色 3D 舞台仅在
  3D 可用时出现）；**无蓝色 wireframe / mesh / 扫描线 / 全身 neon**。

## 3. Web 端 3D 个体 Twin 视觉结论

- 同一份移动端页面（`pet-stage.html`）在真实 Chromium WebGL 渲染
  **DEMO_SYNTHETIC 个体 Twin**（corgi-like family + morph + 区域纹理）。
- 12 个动作逐一截图，pose 切换像素差异已由 Playwright gate 证实
  （`R2P3D-R1-01`，真实 WebGL）。
- 合成到暖色舞台后（与 App 内合成一致）即为产品视觉效果。

## 4. 内部 visual audit pass 内容

- Owner 界面不出现 provider/model/raw/checkpoint 术语（`OWNER_INTERNAL_TERMS = 0`）。
- Health 不驱动姿态；动作文案为中性行为语言（坐/趴/走/吃/喝…）。
- 3D 优雅降级存在且被验证（Android 端实际发生 → 2.5D 可用）。
- 演示数据明确标注（demo chip / 演示 3D 形象 文案），不冒充真实宠物。

## 5. 剩余人工闸门

- **HUMAN_VISUAL_ACCEPTANCE = PENDING**：需要用户查看
  `artifacts/r2p3d-r1/android/gallery.html` 与 `web/PLI_R2P3D_R1_POSE_CONTACT_SHEET.png`
  后，才能 PASS。Agent 不代替用户签字。