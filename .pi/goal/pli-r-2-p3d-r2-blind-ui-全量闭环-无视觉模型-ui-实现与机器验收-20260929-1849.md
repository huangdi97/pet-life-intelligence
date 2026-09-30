# Goal：PLI Stage R.2-P3D-R2 — Blind UI Closure（无视觉模型全量 UI/UX 实现与机器可读视觉验收）

## Goal
在本地仓库 `E:/AI/Pet Life Intelligence`（origin `huangdi97/pet-life-intelligence`，分支 `main`）一次自主完成 §3 全部 28 项交付：建立一套无视觉模型即可运行的 **Blind Visual Contract System** 与机器验收仪器（语义/布局/样式提取、3D Scene Manifest、非 AI Pixel Oracle、ASCII 布局图、Anti-pattern 检测、Scorecard、Known-Bad 校准、Known-Good fixture），随后按 §64 顺序重构 Today / Pet World / Life View / Twin Review / Twin Capture / Twin Version / Timeline / Health / Behavior / Training / Welfare / Social / Assistant / Me / Quick Log / Companion / Monitoring 及 Empty / Attention / Offline / Multi-pet 特殊状态，使 17 个独立屏幕（18 张截图，含 lifeview_a/b）在 **Android 模拟器（主验收运行时）** 与 **Web（Blind Harness）** 上真实运行并满足每屏 Machine Visual Contract（所有主屏 ≥92；Today / Pet World / Life View / Twin Review ≥95；Critical Blocker = 0），Mini 保持身份/布局/状态/导航一致（3D 允许降级）。全量重拍 23 张截图与 Contact Sheet 供用户人工验收；新增盲测仪器测试与 CI 检查；按序 commit 并 push 到 origin/main。

## Acceptance criteria（全部可由 Agent 事后客观复验，不依赖任何视觉语义）

### A. Blind 仪器与契约系统
1. `packages/visual-contract/` 存在：`schema/`（screen/element/twin JSON Schema）、`tokens/`（color/spacing/typography/radius/motion）、17 个屏幕契约（today/timeline/pet-world/life-view/assistant/me/quick-log/health/behavior/training/welfare/social/companion/monitoring/twin-capture/twin-review/twin-version）+ 特殊状态契约、`index.ts`。每个契约由可执行、带权重的机器断言组成（布局比例、元素存在/缺失、内容纯净、3D 真值）。
2. `scripts/blind-ui/` 存在并可运行：`capture-web`（Playwright：每屏输出 screenshot.png / aria.yml / layout.json / styles.json / visual.json / report.md）、`ascii-layout`（每屏 ASCII 文本图）、`pixel-oracle.py`（输出 mean_luma / warm_pixel_ratio / cool_accent_ratio / white_surface_ratio / dark_surface_ratio / edge_density / center_contrast / ssim_to_negative 等字段）、`anti-patterns`、`scorecard`（8 维度加权，输出 `<screen>.score.json`）。
3. `pytest tests/blind_ui/` 全绿：known-bad 校准（known_bad_today / known_bad_pet / known_bad_lifeview / known_bad_twinreview 全部判 FAIL；known-bad Training 文本 fixture 检出 `OPEN`、Welfare 检出 `STRESS_RECOVERY`）；known-good fixture 判 PASS（ORACLE_INVALID ≠ TRUE）；FAKE_3D 检测器把「role=pet-twin 但实现为 img/静态图 且 manifest ready」判 FAIL。

### B. 3D Scene Manifest
4. mobile `Pet3DViewer` 与 web 3D 舞台在 test/debug 模式暴露 manifest：`ready / representation / fallbackUsed / assetVersion / meshCount / skinnedMeshCount / skeleton / animationClips / wireframe / materialMode / baseColorTexture / camera / screenBounds / activeClip / availableClips / playbackState / reducedMotion / pose / poseSource / poseConfidence`；Playwright 测试从页面读取并断言字段；Android 可通过 debug deep link / logcat dump。
5. 动画盲测：manifest 支持 Idle → Sit → Walk → Eat → Sleep 机读切换（Playwright 断言 activeClip 变化）。生产用户界面不暴露 manifest（仅 test/debug）。

### C. 屏幕机器验收（17 屏全部 ≥92；母页面 ≥95；Critical Blocker = 0）
6. **Today**：身份来自 `currentPet`（name/avatar/species，禁止硬编码）；`pli.today.living-stage` 43–53% 内容高、Twin 水平中心偏差 ≤10% 视口宽、stage 盒 28–48% 视口高；四个锚点 `water/food/activity/sleep` 全部存在并围绕 stage；Health 独立于四基础状态；叙事遵循 Now → Change → Attention → Action → Memory；above-fold 大 surface ≤2（无 Card Dashboard）；底导 5 项（今天/时间线/当前宠物/助手/我的），中间项 = currentPet 头像 + 名字；raw internal terms = 0；attention ≤1 个。
7. **Pet World**：顶部 3D Individual Twin stage ≥35% 内容高；六生命侧面（生活/健康/行为/训练/福利/社交）每项含 label + 当前含义摘要（非纯 `> ` 入口）；宠物朋友 + 照护它的人存在；非宫格 / 非 grid-only；hero stage > 任一 domain row。
8. **Life View**：stage ≥52% 内容高；真实 3D；rotate/zoom/reset 可用，且通过 manifest camera/orbit 状态证明 A→B 变化（lifeview_a/lifeview_b 像素有差异）；wireframe=false、fallbackUsed=false；默认锚点 2–4 个；模式「此刻」完整工作，趋势/时间线/外观若未完成则 disabled + 诚实文案（无 dead button）。
9. **Twin Review**：真实 3D Individual Twin + rotate/zoom/front/side/back；Owner 按钮「很像 / 基本像 / 不像」；点「不像」后 activate（启用）disabled（机器测试断言）。
10. **Twin Capture**：正面/左侧/右侧/背面/全身/头部 6 视图各标 complete/missing，QC 维度（清晰度/遮挡/覆盖/身份一致性）+ retake guidance。
11. **Twin Version**：当前版本/版本时间/来源素材数/Owner verification/identity completeness/历史版本（非普通设置列表）。
12. **次级页契约**：Timeline（current pet 身份、可见主过滤器 ≤5、时间分组、story row、首屏大 surface ≤2）；Health（近期状态/近期变化/预防与计划/用药/近期记录，无 fake 数据）；Behavior（近期观察/模式与倾向/上下文 trigger/最近记录，无 raw enum、无凭空情绪判断）；Training（当前目标/进度/最近训练/奖励偏好/下一步，`OPEN/PAUSED/ACTIVE` 已本地化）；Welfare（丰富化/休息与舒适/最近喜欢的活动，无 `STRESS_RECOVERY`/`OWNER_REPORTED`、无虚构评分）；Social（宠物朋友/最近互动/社交偏好，1–2 个可解释好友关系，非公开 Feed）；Assistant（currentPet + recent context + 当前有意义变化 + 建议动作，无 provider/debug UI）；Me（Owner/我的宠物/Care Network/通知/隐私/数据/帮助，无开发模式/raw env/test pet list）；Quick Log（喂食/饮水/排泄/散步首屏可达，非重表单）；Companion（无设备完整态：能力说明/设备 empty/最近可用信息/下一步；无 prototype/TODO/coming soon）；Monitoring（状态机 LOADING/CONNECTED/NO_DEVICE/OFFLINE/ERROR/CACHED/PERMISSION_REQUIRED 有真实呈现，无一直「正在连接」/大片空白）。
13. **特殊状态**：Empty（Pet Presence + 为何为空 + 一个主动作）、Attention（单 attention + evidence + action）、Offline（状态 + cached 内容 + last sync + retry）、Multi-pet（当前宠物 + switch + 无 context leak）各自契约 PASS。

### D. Pixel / 内容 / 上下文门
14. pixel-oracle 对 Today：warm_pixel_ratio ≥0.35、cool_accent_ratio ≤0.12、light-card ratio ≤0.45（按 ROI 归一化并记录方法）；candidate 截图与 known-bad 的 SSIM/pHash 距离被记录，且代码声称重构的页面（Today/Pet/LifeView/TwinReview）像素确有变化（negative distance gate，不设「越不同越好」）。
15. **内容纯净**：owner runtime 全文本（Web capture + Android 无障碍树）中 `BW- / OWNER_REPORTED / STRESS_RECOVERY / OPEN / provider_ / model_id / event_key / PLI-` = 0；hard-coded `豆豆/咪咪` 仅存在于 demo seed / fixture / test / story，production 组件必须读 `currentPet.name`。
16. **Pet Context Gate**：每屏 machine snapshot 带 pet_id + pet_name；导航中不变；multi-pet 切换后 name/avatar/twin asset/Today/Health/Social/Assistant 上下文随之变化（Playwright 断言，禁止只换标题）。

### E. 运行时与证据
17. **Android**（复用现有设备：运行中 emulator-5554 或 AVD `main`/`zhishen_rc`，禁止新模拟器）：23 屏（01–18 + 19_lifeview_zoom + 20_empty + 21_attention + 22_offline + 23_multipet）真实运行，每屏输出 screenshot.png + 无障碍树/ui.xml + layout.json + 3d.json + report.md；全量重拍。
18. **Web**：capture-web 对每屏输出 screenshot.png / aria.yml / layout.json / styles.json / visual.json / report.md。
19. **Mini**：身份/布局/状态/导航一致性契约检查 PASS（3D 降级 low LOD/poster/turntable 允许，不影响 Android 主视觉目标）。
20. 证据目录 `artifacts/blind-ui/{known-bad,candidate,web,android,mini,reports,ascii,manifests,pixel,contact-sheets}`；known-bad 18 张复用 R1 提取集（hash 登记、不重复复制）；Contact Sheets 5 张（PRIMARY/SECONDARY/TWIN/SPECIAL_STATES/ALL）+ `KNOWN_BAD_vs_CANDIDATE.png`；`docs/blind-ui/` 8 份文档（ARCHITECTURE / VISUAL_CONTRACT / SCREEN_CONTRACTS / 3D_SCENE_MANIFEST / PIXEL_ORACLE / KNOWN_BAD_CALIBRATION / ACCESSIBILITY_AS_VISUAL_INFRA / FINAL_REPORT）。每屏输出 `today.png + .aria.yml + .layout.json + .styles.json + .3d.json + .pixel.json + .ascii.txt + .contract.json + .score.json + .report.md`（Android 以无障碍树替代 aria）。

### F. 测试 / CI / Git
21. 本地全量重跑通过：pytest、ruff、vitest、mobile/web/admin/mini typecheck、web build、mini build、Android build（expo run:android / Gradle 按 repo 事实）、Playwright 全量（含新增 blind-ui.spec.ts：契约断言、3D manifest、rotation A→B、multi-pet）、blind contract tests、known-bad calibration、3D manifest tests、Android smoke；`EMULATOR_RUNTIME_METRICS`（time_to_first_pet / time_to_3d_ready / FPS / memory / GLB 与 texture 尺寸）记录进报告（仅称 EMULATOR_RUNTIME_METRICS，不称真机性能）。
22. CI：`.github/workflows/ci.yml` 增加 Blind Visual Contract job（契约测试 + known-bad 校准 + 内容纯净 + 3D manifest 契约 + 布局契约 + 可访问性快照），不下载、不运行任何视觉模型。
23. Git：按 §105 顺序分组 commit；最终 `git status --short` clean（untracked `screens.zip` 经 hash 核验：与 R1 18 张重复则删除并在报告中记录，否则收为 known-bad 证据）；push 到 origin/main 成功；最终报告包含 §108 完整 flags 块（NO_VISION_MODEL_USED=TRUE、KNOWN_BAD_CALIBRATION、BLIND_VISUAL_CONTRACT、TODAY/PET_WORLD/LIFE_VIEW/TWIN_REVIEW_BLIND_ACCEPTANCE、OWNER_RUNTIME_INTERNAL_TERMS=0、CURRENT_MAIN_FULL_CI_GREEN、HUMAN_VISUAL_ACCEPTANCE=PENDING）与 Honest Limit。
24. Release：所有机器 Gate 通过后准备 v0.2.x next preview 发布说明（版本按 repo 事实，不自动跳 v1.0）。

## Boundaries
- **NO_VISION_MODEL = TRUE**：全程不调用、不下载任何 VLM / multimodal screenshot review / CLIP / OCR 模型 / aesthetic model / image caption / 用作审美判断的 object detector / image-generation-as-critic；不把截图交给任何有眼模型；Agent 不得以「看起来好/更漂亮/更高级」作为任何 PASS 依据；最终审美判断只归用户。
- 只允许无眼仪器：Playwright DOM/ARIA/geometry/computed style、RN testID/accessibilityLabel/role、adb/UIAutomator、getBoundingClientRect、3D runtime manifest / GLB scene-graph introspection、PIL/OpenCV/scikit-image 传统算子、SSIM/MSE/histogram/edge/pHash/deterministic diff、ASCII layout map、JSON/YAML 契约比较。
- **HUMAN_VISUAL_ACCEPTANCE 保持 PENDING**，Agent 不得将其置为 PASS；candidate baseline 不覆盖 approved；`VISUAL_BASELINE_UPDATE = CANDIDATE_ONLY`。
- 只在当前仓库本地工作：不重新 clone、不 repo 外 worktree、不云工作区、不新建 Docker/WSL、不新模拟器（除非现有设备/AVD 无法启动或 API 不兼容且有证据）、不全局 npm/pip 安装（新增工具 repo-local）。
- 遵守仓库 AGENTS.md 与母版设计（Pet Living Model、Warm Living Intelligence、Card is not the default container），不重新发明 canon；不做范围外无关重构；保留用户既有改动；不通过删测试/弱化断言/关 lint/加 ignore 降低质量门。
- 报告禁止「截图看起来」式表述；只允许 contract passed / layout metrics within range / 3D runtime verified / pixel metrics within thresholds / negative-baseline distance sufficient / raw internal terms = 0 等数据陈述。