# R2P3D-R4.2 Final Report — Visual Reality Correction, Android Warm Living & Pet Identity Closure

 > 生成时间：2026-10-03（本地执行）。NO_VISION_MODEL_USED = TRUE（全程未调用任何视觉/多模态模型；机器检查仅使用 manifest / GLB 元数据 / bbox / 变换矩阵 / 权重统计 / DOM / computed styles / 像素统计 / SSIM 等允许手段）。
 > 收口复核：2026-10-03（Goal 收口/验证模式）—— Android 捕获再试 3 次（含新增候选 `pdig_tablet_api36`），仍为环境级失败；本地闸门复验通过；Final Report 结论未变化（NOT_READY，唯一阻断 = Android runtime 截图证据缺失）。
 
 ## 结论（先看这里）
 
 ```
 R4_2_PRODUCT_VISUAL_CANDIDATE = NOT_READY
 ```
 
 原因（唯一阻断项）：**Android 运行时截图证据无法在本机会话产出**
 （`docs/r2p3d-r4-2/ANDROID_CAPTURE_BLOCKED.md`；收口轮 3 次全新启动再试后
 仍为环境级失败：`pdig_tablet_api36` 启动即崩溃、`main` 窗口模式完整启动 +
 安装 APK + 应用 RESUMED 后消失、`main -no-window` 15 秒掉线；
 `ANDROID_RUNTIME_CAPTURE = EXTERNAL_BLOCKED`）。按 Goal §39/§40，
 任一 required Contact Sheet 缺失即 NOT_READY，不得宣布 READY_FOR_HUMAN_REVIEW。
 
 其余全部机器可验项均已通过（见下）。**Human Visual Acceptance = PENDING** ——
 豆豆像不像 Corgi、咪咪是否正常、Android 是否从 Viewer 变成 Living Experience，
 最终由用户本人看图判断。未伪造任何 Android 证据；未把 fallback/占位图当作
 Hero 证据。

---

## 1. 逐项状态（按 Goal §38 模板）

| 项 | 状态 | 证据 |
| --- | --- | --- |
| NO_VISION_MODEL_USED | TRUE | 全程工具清单（inspect_glb / pixel_oracle / DOM / GLB 字节解析） |
| ANDROID_GLTF_RUNTIME | PASS（代码/构建层）；RUNTIME CAPTURE = EXTERNAL_BLOCKED | Hermes 字节码含新 stage 代码 + 双 GLB；`assembleRelease` 成功；模拟器无法运行页面（文档记录） |
| ANDROID_WARM_LIVING_IMPLEMENTED | PASS（代码/样式实现，不代表 human verdict） | `tokens.ts` warm cream；`PetLivingStage.tsx` warm living / neutral review studio；`pet-stage-entry.ts` themed scene.background + floor + glow；manifest stageRole/surfaceVariant/realityField |
| DOG_CONTINUOUS_MESH | PASS | GLB 单 skinned mesh，triangleCount=45376 |
| DOG_CORGI_GEOMETRY_PROXY | PASS（machine proxy only） | body_length/height=1.442、leg/height=0.238、head_width/head_h=1.03、ear/head_h=1.0、muzzle/head_l=0.072、chest/head_w=0.935（`artifacts/r2p3d-r4-2/geometry/doudou_corgi_proxies.json`） |
| DOG_CORGI_HUMAN_RECOGNITION | PENDING | 需用户看图 |
| CAT_REST_GEOMETRY | PASS | mimi bind bbox size=[0.3157,1.0,1.265]，h/l=0.791（修复前为 h/l=3.17 竖直细柱） |
| CAT_IDLE_GEOMETRY | PASS | Idle @ t=1.0 size=[0.3157,0.99,1.31]，max|disp|<0.03，无 spike / collapse / joint explosion |
| CAT_VISUAL_HUMAN_REVIEW | PENDING | 需用户看图 |
| WEB_HERO_CAPTURE | PASS | `artifacts/r2p3d-r4-2/web/{today,pet,lifeview,twinreview}/screenshot.png`，manifest：HIGH_FIDELITY_SKINNED / fallbackUsed=false / warm-living / review-studio |
 | DOUDOU_TURNTABLE_COMPLETE | PASS（web runtime camera presets，5 角度：front/front-left/side/rear/front-right，真实 yaw 0/0.35/π/2/π/−0.35） | `artifacts/r2p3d-r4-2/web/turntable/doudou/*.png+*.json` |
 | MIMI_TURNTABLE_COMPLETE | PASS（同上 5 角度；mimi front.json triangleCount=51648 = 修复后 GLB） | `web/turntable/mimi/*` |
 | ANDROID_HERO_CAPTURE | EXTERNAL_BLOCKED | 见 ANDROID_CAPTURE_BLOCKED.md（含收口轮 3 次全新启动再试记录）；未伪造证据 |
 | CONTACT_SHEET_INTEGRITY | PASS（web sheets + manifest 有效；Android sheets 因证据缺失未生成而非占位） | `contact-sheets/manifest.json` sha256 与磁盘一致 |
    | CI_BACKEND | PASS（本地复验 + 远程） | ruff check services packages tests scripts → 0 errors（收口复验 2026-10-03）；远程 CI job `Backend` ✓ |
    | CI_FRONTEND | PASS（本地 + 远程） | pet-3d build/typecheck、web/mobile/mini/admin typecheck、web build（PLIT_LOCAL_BUILD）、web vitest 33 passed、mobile export android/ios（本地）；远程 CI job `Frontend` ✓ |
    | CI_BLIND | PASS（收口复验 + 远程） | `pytest tests/blind_ui --confcutdir tests/blind_ui -q` → 32 passed（收口复验 2026-10-03，venv）；远程 CI job `Blind Visual Contract` ✓ |
    | CI_FUNCTIONAL_E2E | PASS（本地 + 远程） | Browser E2E functional（不含 visual）→ 42 passed（本地）；远程 CI `Playwright (functional specs)` 步 ✓（最终 head `fd62549` run 37117968170 job 111188797021 该步 SUCCESS；`808f677` run 37117011900 job 111186198275 同证 42 passed） |
    | CI_ANDROID | PASS（远程） | 远程 CI `Android + Release Artifacts` ✓（APK + Web standalone artifact，最终 head `fd62549` run 37117968231 两个 job 均 SUCCESS） |
    | CI_VISUAL_CHAIN | EXPECTED_BASELINE_DRIFT（唯一红因 = OLD APPROVED BASELINE） | 最终 head `fd62549` run 37117968170 job 111188797021：`Playwright (visual chain)` 仅 VISUAL-V2-01 / VISUAL-V3-01 失败；`066b664` run 37114153709 job 111178151124 同证 —— V2 diffs（1024_3d-life-view 61.890%、1024_3d-verification 61.890%、today-390 63.3%、life-view-390 60.2%、pet-390 53.5% 等）、VISUAL-V3 24 pages max diff 63.291%；红因 = R4.2 twin 资产变更 vs OLD APPROVED BASELINE；approved baseline 未更新；该 job 唯一失败步 = visual chain，其余全部 success |
    | VISUAL_V2 / VISUAL_V3 | EXPECTED_BASELINE_DRIFT | 同上（远程 CI 日志证明；本地 DB 被证据流程污染无法 clean-seed，视觉链以远程为准） |
    | APPROVED_VISUAL_BASELINE | OLD（未 promote） | — |
    | PR | OPEN（#2，未 merge） | `gh pr view 2`：state=OPEN / MERGEABLE / baseRefName=main / headRefOid=`fd62549`（CI 证据核验头；其后仅 docs 同步提交，代码等价） |
    | MERGED / RELEASED | FALSE / FALSE | — |
    | REAL_PET_IDENTITY_VALIDATION | NOT_YET_OBSERVED | 无真实豆豆照片验证 |
    | ANDROID_REAL_DEVICE_QA | NOT_YET_OBSERVED | — |
    | PRODUCT_VALIDATION | NOT_YET_OBSERVED | — |
    | HUMAN_VISUAL_ACCEPTANCE | PENDING | — |
## 2. 本轮改动（commit 摘要）

1. `fix(ci)`：`contact_sheets_r4_1.py` W292 + hard-coded 宠物名 → 移除（neutral label）；ruff 全绿 + blind_ui 32 passed。
2. `fix(twin)`：**咪咪 root cause** —— `meshops.normalize_mesh` 的 numpy 视图别名 bug（原地旋转第二轴读到已旋转的 X，双轴塌缩成竖直细柱 h/l≈3.17）。修复后 bake+GLB 重建，REST/Idle/Stand 正常（h/l≈0.79），权重对称化（head count 1→10512）。文档：`docs/r2p3d-r4-2/MIMI_RENDER_ROOT_CAUSE.md`；工具：`scripts/r2p3d-r4-2/inspect_glb.py`。
3. `feat(android)`：warm living reality field —— tokens 暖奶油色、PetLivingStage 不再 dark viewer（review=neutral studio）、Pet3DViewer 注入 `__PLI_STAGE_THEME`、pet-stage-entry 绘制 themed scene.background + ambient floor/glow + manifest `stageRole/surfaceVariant/realityField`（living/review/engineering 三态）；`build:3d-page` 重建嵌入新 GLB。
4. `feat(twin)`：**豆豆 Corgi-like silhouette** —— 更强 region-aware morph（body 1.30 / legs 0.50 / head 1.28 / ears 1.40-1.18 / muzzle 0.68），warm sable/tan + cream 区域纹理（去 muddy 噪声），新增 `corgi_proxies` 机器代理，meta 增加 `provenanceMode: DEMO_TEMPLATE`。
5. `feat(review)`：Twin Review neutral identity studio（web 已有 review-studio；Android review 态实现）。
6. `test(r4)`：R4.2 证据 —— web heroes + web turntable（`capture-web-turntable.mjs`，真实 yaw）+ contact sheet generator（required 缺失即 raise）+ `manifest.json`（sha256/dims/timestamp）。
7. `docs(r4)`：preflight / mimi root cause / android blocked / final report。

## 3. NOT_READY 自动条件核验（Goal §39）

| 条件 | 结果 |
| --- | --- |
| Android Hero 仍 dark viewer | 无法核验（capture blocked）；代码已移除 dark viewer（PASS at code level） |
| 豆豆仍 generic terrier silhouette | PENDING（机器 proxy 显著 Corgi-like：body/height 1.44、leg/height 0.24；human 判断待定） |
| 咪咪仍 spike/拉伸/爆炸 | PASS（已修复，机器几何正常） |
| required Contact Sheet 出现 placeholder/错误图 | **触发**：Android sheets 未生成（generator raise，非占位）→ NOT_READY |
| Mimi turntable <4 角度 | PASS（5 角度，web runtime） |
 | CI 因新增代码红 | PASS（本地全绿 + 远程功能层收口；最终 run 111175429455 中 functional specs 步 SUCCESS、唯一失败步 = visual chain） |
 | Runtime fallbackUsed=true | PASS（web 全部 false；Android 捕获未能获得 runtime，见 blocker 文档） |
 
 ## 3b. 远程 CI 复核（收口轮，headRefOid=`fd62549`）
 
 最终 `gh pr checks 2`（run 37117968170 / 37117968231，head `fd62549`）：
 Backend ✓ / Frontend ✓ / Blind Visual Contract ✓ / Android APK ✓ /
 Web standalone artifact ✓；
 - `Browser E2E (Playwright)` job：唯一失败步 = `Playwright (visual chain)`
   （VISUAL-V2-01 / VISUAL-V3-01，approved baseline 像素 diff ——
   EXPECTED_BASELINE_DRIFT，红因 = R4.2 twin 资产变更 vs OLD APPROVED
   BASELINE，approved baseline 未更新）；`Playwright (functional specs)` 步
   SUCCESS（42 passed）。详情：job 111188797021；`808f677`/`066b664` run 同证。
 - 说明：E2E / Web standalone job 曾在 runner 侧 `pnpm install` 缓存态下于
   `apps/web next build` 阶段偶发 `Suspense`/`@types/react@19.0.6` 类型解析
   漂移（相同 lockfile `4c26537e…`、相同提交在 Frontend job 与 rerun 均构建
   成功），属 runner/pnpm 缓存非确定性，非本分支代码问题；最终 functional
   层收口已确认。未修改任何依赖/lockfile/测试来规避。
## 4. 遗留与建议

 - 唯一阻断项：Android 运行时截图。收口轮已用现有 3 个 AVD（含新增候选
   `pdig_tablet_api36`）再试 3 次全新启动，仍全部为环境级失败（详见
   `docs/r2p3d-r4-2/ANDROID_CAPTURE_BLOCKED.md` 收口轮重试记录）。建议在可用
   实机/稳定模拟器环境（先确认 `127.0.0.1:8800` API 正常 + `adb reverse`）重跑
   `scripts/r2p3d-r4-2/capture-android-r4-2-live.ps1`（CDP 读取 RUNTIME
   manifest）+ `scripts/r2p3d-r4-2/contact_sheets_r4_2.py --labels doudou=豆豆
   mimi=咪咪`（不带 `--skip-android`），即可把 `R4_2_PRODUCT_VISUAL_CANDIDATE`
   推进到 READY_FOR_HUMAN_REVIEW 的最后一个证据门槛。
 - 收口轮已推送 `43f8484` → `066b664`（纳入 2 个未提交文件：
   capture-android-r4-2-live.ps1 + ANDROID_CAPTURE_BLOCKED.md 引用更新；
   及收口轮文档与远程 CI 复核记录）。请复核远程 GitHub Actions（Backend /
   Frontend / Blind / Functional E2E / Android workflow；Visual V2/V3 允许
   EXPECTED_BASELINE_DRIFT，唯一允许的红因 = OLD APPROVED BASELINE）。
 - 用户看图后给出 Human PASS/PENDING 判断；未经批准不 merge、不 push main、不
   promote baseline、不 release。

## 5. 边界合规声明

- 未 merge PR #2；未 push main；未 promote 任何 baseline；未发 release。
- 未使用视觉模型；未编造证据；未把 GENERATED/RECORDED 标为 LIVE。
- 未修改既有测试规避扫描；未弱化断言/跳过 lint/typecheck。
- repo 外写入 = 0；未下载新 emulator / 新 3D 资产（继续使用 Jack Russell base +
  更强结构 morph，未触发 base 替换条款）。
