# Goal：PLI Stage R.2-P3D 全量产品体验、UI/UX、个体 3D Pet Twin 与 Release Closure

## Goal（结果，而非步骤）

以粘贴的规范母版 `pasted-177bbf3c-0382-47e4-8218-0b1e57a7db5e-PLI_Stage_R2P3D_全量产品体验_UIUX_个体3DPetTwin_ReleaseClosure_总Goal_2026-09-27.md`（下称「总 Goal」，其 §1–§86 为本轮唯一执行契约，与 `Pet_Life_Intelligence_v3.4-R1_..._2026-09-27.md` canonical 母版一致）为基准，在当前 dirty worktree（保留并提交全部未提交改动）之上连续执行 Phases A–I，把 R.2 范围内所有产品体验、UI/UX、Pet Living Model、个体 3D 形象生成、动画、数据联动、测试、证据与 Release Closure 一次做完，直到：

- 最终 Owner 体验 =「用户打开 PLI，看到的是自己的这只宠物，在一个真实生活与数字世界连续存在的生命界面里」；Today/Pet World/Life View/Timeline/Assistant 等全部页面围绕同一只宠物个体与 Warm Living Holographic Twin 视觉语言统一；
- Pet Twin 管线（Capture Wizard → QC → 模板拟合 + 真实照片纹理 → Rig/动画/LOD → Owner 核验 → 版本化 → 运行时渲染）真实实现，Provider 抽象就位，真实生成式 Provider 诚实标记 `REAL_3D_PROVIDER=EXTERNAL_BLOCKED`；
- 机器可执行事项全部完成：`R2P3D_ENGINEERING_COMPLETE=TRUE`、`CURRENT_MAIN_FULL_CI_GREEN=TRUE`、`OWNER_RUNTIME_INTERNAL_TERMS=0`、Release Closure（push + tag + GitHub Release 资产）；
- 最终 `HUMAN_VISUAL_ACCEPTANCE=PENDING`（不声称人工验收）。

已确认决策：① 在当前 dirty worktree 之上继续，全部未提交改动作为本轮工作的一部分提交；② 授权 push 到 origin/main、GitHub Actions 全绿、打 tag + 创建 GitHub Release 资产；③ Pet Twin 主路径 = 仓内参数化模板（狗/猫）+ 真实照片纹理投影 + Rig/动画/LOD，Provider 抽象就位，生成式 Provider 诚实标记 EXTERNAL_BLOCKED。

## Acceptance criteria（可由命令或可观测行为客观核验）

**A1 Preflight（先于任何生产代码修改）**
- `docs/r2p3d/R2P3D_PREFLIGHT_FACTS.md` 存在，内容为真实核验事实（HEAD=5c2707e、branch=main、origin/main、dirty worktree 清单、CI 现状=Frontend/Backend PASS + Browser E2E FAIL、tags、Release 资产、AVD），不复制旧报告文字。

**A2 Skill 审计文档（先于实现产出且简洁真实）**
- 按总 Goal §5/§6 加载并遵循 4 个已安装 skill（impeccable / frontend-design / ui-ux-pro-max / playwright-cli 的正式 metadata）；
- 以下文档存在且内容对应职责：`docs/r2p3d/R2P3D_UIUX_AUDIT.md`、`docs/r2p3d/R2P3D_VISUAL_FIDELITY_AUDIT.md`、`docs/r2p3d/R2P3D_PREFLIGHT_FACTS.md`、以及 Twin/3D 架构、Capture/QC、Provider Matrix、License Audit、Runtime QA 等总 Goal §76 要求的文档。

**A3 Pet Twin 后端管线（pytest 可验证）**
- 复用/补齐 `PetVisualModel / PetVisualCapture / PetVisualRenderManifest`（不平行创建第二套）；完整状态机 `UPLOADED→QC→PROCESSING→PREVIEW_READY→OWNER_REVIEW→ACTIVE / REJECTED / FAILED / RETIRED`；
- 生成任务为 async job，含 retry / idempotency / progress / error reason；`plm_version_id` 版本化字段齐全（source artifacts、provider、geometry/texture/rig version、owner_verified、identity_qc_score、OBSERVED/INFERRED surface manifest）；
- Owner 核验三档（很像/基本像/不像）；「不像」不得自动成为 active model，保留旧 active/fallback；
- 新增测试覆盖：capture QC、identity contamination、job state、versioning、owner verification、asset/render manifest、provider fallback、animation truth-source、provenance、privacy（§63），不只见「接口 200」。

**A4 Capture Wizard 真实实现**
- 覆盖状态显示（正面/左侧/右侧/背面/全身/头部 ✓/✗）；QC 检查（身份一致、混宠、模糊、曝光、遮挡、全身/头耳腿尾覆盖、人脸/隐私背景、多宠干扰、分辨率）；失败时给明确补拍提示；禁止低质图直接进入 active model。

**A5 3D Runtime（真实 WebGL/GL，非静态图）**
- Web（three.js 或 audit 后等价方案）：Today/Pet World/Life View 真实渲染，rotate / zoom / reset view / LOD / 轻量姿态切换 / 状态 Overlay / multi-client fallback；Playwright 断言 WebGL canvas 存在且渲染激活；
- Android（Expo 51 / RN 0.74，audit 选定机制，同一客户端不引入第二套 3D framework）：在 AVD pdig5（≈390×844dp）真实运行 interactive 3D；Life View 旋转角度 A/B 宠物区域像素差高于阈值（脚本实测）、zoom 改变相机、reset 恢复默认朝向；
- 同一豆豆个体资产贯穿 Today/Pet World/Life View，咪咪为独立 3D 模型（multi-pet 隔离测试）；2.5D/photo/species 仅作显式标注的 fallback，主 Android 目标不得停留在 species fallback（§79）。

**A6 全量 Owner 页面统一（DOM/交互 + 截图核验）**
- 一级页：Today（Living Canvas：Twin + 饮水/进食/活动/睡眠四大基础状态 + 健康 summary/deep-link + 「与它自己相比 → Attention → Action → 最近生活」叙事，禁止同权大 Card 堆砌）、Timeline（生命流 + 日常/健康/社交/训练/照片筛选 + 真实媒体 + 回到那一天）、Pet World（Twin 身份中心 + 生活/健康/行为/训练/福利/社交六域现状语义 + 宠物朋友/照护它的人真实可用）、Assistant（感知 current pet + 页面上下文 + 最近记录/baseline/timeline，提供 Ask/Search/Explain/Plan/Summary）、Me（Owner-first，含我的宠物/家庭照护网络/提醒/隐私/导出/帮助，禁止 developer mode/internal env/test account/raw IDs）；
- 二级页：Quick Log、Life View（此刻模式完整 + 趋势/时间线/外观为真实 minimal 或显式 disabled）、Health、Behavior、Training、Welfare、Social、Companion、Monitoring、Care Network/Handoff（若已有正式页面）、Pet Twin Capture Wizard、Pet Twin Review、Pet Twin Appearance/Version，以及所有实际存在的 v0.2 Owner route；不得删除当前合法已有能力；
- 特殊状态全套真实实现并测试：Empty、Attention（只强化一个主要 Attention）、Offline（当前离线/缓存数据/上次同步/重试）、Multi-pet（当前宠物头像+名字，切换清晰，不允许串宠）、Loading/No Device/Retry/Cached/Permission/Error；
- 健康/行为文案必须来自真实数据或明确来源：禁止「精神很好/更开心」类凭空结论、禁止肾脏 82/抑郁风险 31%/心脏健康 95 类伪指标、禁止因健康 Attention 驱动病态姿势（§24 Truth Model：AMBIENT/REPRESENTATIVE/OBSERVED，metadata 带 source/confidence/updated_at）。

**A7 Owner 运行时纯净度 + Clean Demo**
- 源代码 + 渲染 DOM 文本 + 截图层面 grep 核验：`BW-*`、raw UUID、`OWNER_REPORTED`、`OPEN`、`STRESS_RECOVERY`、provider key、model id、event key、internal feature id、developer mode、test fixture 等在 Owner UI 中 = 0（未知 enum 不得直接 return raw value，必须 translation）；
- `CLEAN_VISUAL_DEMO_PROFILE` 与 functional E2E 完全隔离；demo 宠物名如豆豆/咪咪/空空/关注（按实际 seed 命名），禁止测试名字；functional E2E 数据不得进入 screenshot household。

**A8 证据资产（重新生成，非旧图）**
- `artifacts/r2p3d/`（android/web/mini/twin-generation/before-after/final 子目录）：Android Owner screens 全高截图（≈390×844dp，AVD pdig5）覆盖 §65 全部页面；核心额外捕获 Today Twin loaded、Pet World Twin loaded、Life View angle A/B、Life View zoom、Twin Capture、Twin Review、Twin Version；
- 生成 `PLI_R2P3D_ANDROID_FINAL_CONTACT_SHEET.png`、`PLI_R2P3D_PRIMARY_PAGES_CONTACT_SHEET.png`、`PLI_R2P3D_SECONDARY_PAGES_CONTACT_SHEET.png`、`PLI_R2P3D_TWIN_PIPELINE_CONTACT_SHEET.png`、`v0.2.0_vs_R2P3D.png`、`gallery.html`；
- Life View 保留 rotate/zoom/pose switch 的短视频或可审计 frame sequence/metadata/command log（按 repo policy 二选一）。

**A9 功能回归基线（不删测试、不 skip、不降 threshold）**
- pytest ≥ 427 passed、ruff 0、vitest ≥ 22/22（含新增 3D/交互测试）、mobile/web/mini typecheck 0、Next build OK、Taro build OK、Gradle assembleRelease OK、Playwright functional 全绿（本地可执行项逐项真实运行并记录结果）。

**A10 CI Closure（origin/main）**
- push 后 GitHub Actions：Frontend=PASS、Backend=PASS、Browser Functional=PASS、Visual Regression=PASS（按 §73 协议：新截图 → visual audit → 文档化 explicit baseline update（记录哪些 routes 与原因）→ no-flag rerun → pass，不降低阈值）、Android 相关检查=PASS；禁止「本地绿=main 绿」。

**A11 报告与诚实状态**
- 完成总 Goal §76 文档（README/CHANGELOG/R2P3D_FINAL_REPORT/PET_TWIN_* /R2P3D_VISUAL_ACCEPTANCE_REPORT/R2P3D_CI_CLOSURE_REPORT/WORK_STATUS 等，只更新必要事实，不整份复制母版）；`docs/r2p3d/PET_TWIN_MODEL_LICENSE_AUDIT.md` 覆盖候选（SAM2/Stable Fast 3D/TRELLIS/Hunyuan3D/SMAL-like/pose/3D assets/animation assets）记录 license/commercial/weights/redistribution/attribution/risk，禁止默认「GitHub 开源=可商用」；
- 最终诚实标记：`R2P3D_ENGINEERING_COMPLETE=TRUE`、`CURRENT_MAIN_FULL_CI_GREEN=TRUE`、`HUMAN_VISUAL_ACCEPTANCE=PENDING`、`REAL_3D_PROVIDER=EXTERNAL_BLOCKED`、`REAL_PARTICIPANTS=0`、`REAL_PETS=0`、`PRODUCT_VALIDATION=NOT_YET_OBSERVED`、`PLAY_STORE_SIGNING=EXTERNAL_BLOCKED`（除非已有新事实）。

**A12 Release Closure**
- 依据仓库语义与 CHANGELOG 决定版本号（不擅自跳 v1.0）；打 tag + GitHub Release 资产：Android APK、screenshots zip、SHA256SUMS、release notes；Twin demo 资产若包含须带 license/provenance；最终 `git status` clean；最终回复按 §85 格式给出 Repository / Skills Used / Pet Twin / UI/UX / Tests / Runtime Evidence / Visual Evidence / Release / Honest Remaining Blockers + 三行最终状态。

## Boundaries（不得逾越）

- **范围**：仅 R.2 当前域；不进入 Stage I / v1.3 / Future 42 / 真实参与者 Pilot（`REAL_PARTICIPANTS=0`）/ Play Store 上架；不新增 Domain、不新增 PLI-229+；后端 domain / Event Graph / safety semantics / permission model / API/schema 保持兼容，仅在 Twin 管线必需时补齐并文档化，不产生无关 migration。
- **诚实边界**：不声称 REAL_3D_PROVIDER 已接通、不伪造 LIVE/实时、不 fake 医学推断/情绪/诊断/生理孪生；demo 3D 资产仅 `DEMO/SYNTHETIC dev-only` provenance，绝不写回事实层；外部 blocker 一律 `EXTERNAL_BLOCKED` 而非 `PASS_WITH_ASSUMPTION`，同时架构/Provider 抽象/fallback 完整；最终不声称人工验收（HUMAN_VISUAL_ACCEPTANCE 保持 PENDING）。
- **工作区**：保留并提交当前全部未提交改动（在其上重建）；禁止破坏性 git 操作、全仓格式化、与任务无关的大规模重构；修改最小化且聚焦总 Goal 范围；遵守仓库 AGENTS.md 与全局工程规则（production 文件 ≤300 行、高内聚低耦合、强类型、renderer/provider 抽象、禁止 raw enum 直出 UI、provenance/安全注释）。
- **视觉**：Warm Living Holographic（真实/温暖/生活化/有生命感/高级/可信/克制智能/空间感/个体感/数字存在感）；明确禁止纯赛博/钢铁侠 HUD/满屏蓝色/霓虹网格/游戏属性页/儿童玩具/医疗监护仪/普通 SaaS/卡片 Dashboard；Twin 95% 个体外观 + 5% 投影语言，无蓝色 wireframe/扫描线/网格 body；视觉验收按 §70 硬标准逐项判定，任何 FAIL 项必须继续修。
- **质量**：不删除测试、不 skip、不弱化 assertion、不降低 threshold、不关闭 lint/typecheck；3D 不得成为核心健康/安全动作的单点依赖（无 3D 时文字/数据/操作仍可用，fallback 显式标注）；同一客户端不引入第二套 3D framework。
- **终止**：A1–A12 全部完成并核验后即达 Goal 终态（HUMAN_VISUAL_ACCEPTANCE=PENDING），不因等待人工验收提前停工，也不在人工验收前声称 R2P3D_PRODUCT_EXPERIENCE_ACCEPTED / R2_FREEZE。
