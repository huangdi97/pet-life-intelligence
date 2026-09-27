# Goal: PLI Stage R.2-P3D Phase P0 — Individual Pet 3D Living Model & Spatial Living Experience

## Goal（结果，而非步骤）

重做 Owner 呈现层 P0 三屏（**Today / Pet / Life View**），使体验从"宠物管理 App / Dashboard / Profile"变为 **"一只具体宠物（豆豆，demo 柯基）持续存在于空间化、类全息、温暖高级的数字生命舞台中"**：
数据围绕它、状态在空间上锚定它、记忆属于它、同一只豆豆贯穿三屏；Life View 是真实可交互的 3D Living Stage（可旋转、缩放），Web 与 Android 均为真实 runtime 3D（非 3D 风格图片、非静态图伪装）。执行顺序为 Skill 审设计 → 设计综述 → 落地实现 → Android/Web 取证 → **HARD STOP**，最终状态停留在 `R2P3D_PHASE_P0 = WAITING_FOR_HUMAN_VISUAL_ACCEPTANCE`。

依据 canonical `Pet_Life_Intelligence_v3.4-R1_..._2026-09-27.md` §33–§40 与 §46.1–46.8；终止于目标文档 §43/§50 的 HARD STOP，不进入 P1、不刷新视觉基线、不发版。

## Acceptance criteria（可由命令或可观测行为客观核验）

**A1 Preflight（先于任何代码修改）**
- `R2P3D_PREFLIGHT.md` 存在，内容为真实 git/runtime 事实：HEAD=5c2707e、branch=main、origin/main=5c2707e、dirty worktree 清单、release/CI 现状、已知 blocker；不复制旧报告文本。

**A2 Skill 顺序与产物**
- 执行前已加载并遵循四个 skill 的 SKILL.md（impeccable / frontend-design / ui-ux-pro-max / playwright-cli，均已定位并读取）。
- 以下文档先于实现产出且简洁实质（每份 ≤150 行，引用证据）：
  - `R2P3D_UIUX_AUDIT.md`（ui-ux-pro-max 职责：UX 层级/交互模型/移动层级/认知负荷/a11y）
  - `R2P3D_VISUAL_FIDELITY_AUDIT.md`（impeccable 职责：视觉保真/构成/为什么"整洁但仍是普通宠物 App"）
  - `R2P3D_CURRENT_VS_CANONICAL.md`（Today/Pet/Life View 每页 CURRENT / CANONICAL / GAP / ROOT CAUSE / DESIGN ACTION，含 Pet Presence、3D Presence、Spatial Depth、State Relationship、Visual Identity、Card Density、Utility/Profile/Hub/Admin Feeling 判定）
  - `R2P3D_VISUAL_DIRECTION.md`（warm/living/premium/calm/spatial 方向；明确排除 cyberpunk/HUD/neon/grid/game ring/医疗监护仪）
  - `R2P3D_3D_STAGE_ARCHITECTURE.md`（统一 renderer contract：rendererType ∈ demo3d/real3d/photo/2.5d/fallback；demo 资产 provenance=DEMO/SYNTHETIC dev-only；选型含 Android 与 Web 各自 3D 栈 audit 结论，仅各引一套 3D framework）

**A3 真实 3D runtime（可核验，非声明）**
- Web：Today/Pet/Life View 由真实 WebGL 3D 场景渲染（three.js 或 audit 后等价方案）；Playwright 断言 WebGL canvas 存在且 renderer 处于激活加载态。
- Android：mobile App（Expo 51 / RN 0.74）内同构图由 audit 选定机制真实渲染（如 expo-gl+three 或 WebView 承载 three，二选一，记录于架构文档）；AVD（pdig5，约 390×844dp）上验证 3D 场景 live（可观测渲染循环/状态，非 poster、非扁平 2.5D 插图）。
- 同一豆豆身份资产贯穿 Today/Pet/Life View（单一共享 demo 资产注册 + 三屏截图宠物区域视觉一致）；咪咪为独立 3D 模型（确定性校验，如资产注册/渲染测试）。
- 2.5D/photo 只作为显式标注的 fallback，不得作为 P0 三屏交付目标。

**A4 Life View 交互证据（可核验）**
- 旋转：真实手势（Android：adb swipe/屏幕手势；Web：Playwright drag）改变模型朝向；产物 `04_life_view_angle_A.png` / `05_life_view_angle_B.png` 的宠物区域像素差高于阈值（脚本实测），禁止用两张静态图伪装。
- 缩放：真实操作改变相机 zoom（Web test 断言 delta；Android 如可自动化则留下证据或明确记录不可自动化原因）。
- Reset view 恢复默认朝向（Web 断言；Android 尽量留证据）。

**A5 三屏形态（可核验 DOM/交互 + 截图）**
- Today = Spatial Living Canvas：3D 宠物为构图中心，状态锚点（饮水/活动/睡眠/进食等）与宠物产生空间锚定关系；存在注意力块、主行动（+记录/看看豆豆/问助手）、最近发生预览。验证其非 Dashboard（Playwright 断言 + 截图人工佐证）。
- Pet = Pet World：3D 豆豆中心 + Identity + current pulse + 各 Domain 以"对豆豆现在意味着什么"呈现（健康：最近 7 天 N 条…等），非 Profile/宫格。
- Life View = Full 3D Living Stage：**此刻模式完整**（事实/与自己相比/来源/更新时间/证据，禁止肾脏评分/抑郁风险/心脏分数/疼痛位置类内容）；趋势/时间线/外观为真实 minimal 实现或显式 disabled（不得 dead button）。

**A6 证据产物（Android ~390×844dp 全高截图，AVD pdig5）**
- `artifacts/r2p3d/core/`：`01_today_3d.png`、`02_pet_world_3d.png`、`03_life_view_3d.png`、`04_life_view_angle_A.png`、`05_life_view_angle_B.png`、`R2P3D_CORE_CONTACT_SHEET.png`、`v0.2.0_vs_R2P3D_Today.png`、`v0.2.0_vs_R2P3D_Pet.png`、`v0.2.0_vs_R2P3D_LifeView.png`、`R2P3D_BEFORE_AFTER_CONTACT_SHEET.png`。

**A7 Playwright 证据**
- Web 三页 390 与 1440 截图通过；相关功能断言通过（3D stage 加载态、旋转改变渲染状态、clean-demo 文本约束）。
- Playwright 只作运行事实取证，不作人工视觉裁决（在报告中如实说明）。

**A8 Clean Visual Demo & 术语门**
- 三屏渲染输出（DOM 文本 + 截图层面）无：`BW-*`、raw UUID、`today.viewed`/`model_id`/`provider_real`/`OWNER_REPORTED`/事件 key 等内部词、测试 fixture 名；来源标签用用户语言（主人记录/设备记录/专业人员/AI 整理）。
- Owner 主文案使用 canonical 语言（豆豆·此刻/生命视图/看看豆豆/…），禁止主文案"数字孪生/生理仿真/AI 诊断体/预测生命/虚拟生命体"，禁止伪造医学/情绪/评分（情绪 88、肾脏状态 82、抑郁风险 31%、心脏健康评分等），禁止 LIVE/实时伪证。
- 验证方式：源码+渲染 DOM grep 断言 + 截图抽查；visual evidence 仅允许演示角色 豆豆/咪咪/空空/关注，demo 数据不得与 functional E2E 污染数据混用（E2E 数据隔离于视觉证据）。

**A9 质量门（本地可执行并记录结果）**
- mobile typecheck（`pnpm --dir apps/mobile typecheck`）PASS；web typecheck PASS；vitest（web，含新增 3D/交互测试）PASS；`next build` PASS；后端 pytest PASS（无回归）。
- Android：App 含 3D 渲染器后构建成功（gradle assembleDebug 或等价可安装产物）并在 pdig5 安装/启动；3D renderer smoke 与 Life View 旋转交互测试 PASS。
- 既有 Playwright functional 链（CI 同款 grep-invert 排除 VISUAL-V3）本地 PASS。
- `artifacts/visual-v3-approved/` 零改动（git 该路径干净）；不执行 `PLI_UPDATE_VISUAL_BASELINE`；唯一允许的 CI 红 = 受控的 VISUAL-V3 冻结基线 diff（文档化，保持原状）。

**A10 Final response（§49 格式）**
- 按 Repository / Skills / Canonical audit / 3D Architecture / Implementation / Runtime / Evidence / Tests / Honest limitations / Human Gate 输出；如实回答 Q1–Q12（不得声称无人验证项 PASS）；诚实 limitation 含 REAL_3D_PROVIDER=EXTERNAL_BLOCKED、REAL_PETS=0、demo 资产 provenance、性能观察。
- 末尾唯一状态行：`R2P3D_PHASE_P0 = WAITING_FOR_HUMAN_VISUAL_ACCEPTANCE`。

## Boundaries（不得逾越）

- **范围**：仅 Today / Pet / Life View 三屏 + 极小的共享编译兼容改动；不进入 Timeline/Health/Behavior/Training/Welfare/Social/Assistant/Companion/Me/Monitoring/QuickLog 等的 P1 扩散。
- **产品面**：不新增 Domain、不新增 PLI-229+、不做 Stage I/v1.3/Future 42；不改后端 domain、Event Graph、Safety semantics、Permission model、API/schema、不产生 migration。
- **诚实边界**：不声明 REAL_3D_PROVIDER 已接通、不伪装 LIVE/实时、不 fake 医疗推断/情绪/诊断/生理孪生；demo 3D 资产仅 DEMO/SYNTHETIC dev-only，绝不写回事实层、不冒充已记录观察。
- **发布面**：不更新视觉基线、不发 Release、不 bump 版本、不做 Android 真机 QA、不 Public Deployment、不启动 Wave 0、不推送远端。
- **工作区**：保留当前全部未提交用户修改（在其上重建），禁止破坏性 git 操作/重写他人改动/全仓格式化；修改最小化且聚焦三屏 + 3D 呈现层。
- **质量**：遵循仓库 AGENTS.md（production 文件 ≤300 行；高内聚低耦合；renderer/provider 抽象；UI 与 provider 实现解耦；强类型；provenance/安全注释；禁止 raw enum 直出 UI）；不引入第二个 3D framework 于同一客户端；3D 不得成为核心健康/安全动作的单点依赖（无 3D 时文字/数据/操作仍可用，fallback 显式标注）。
- **视觉面**：warm / living / premium / calm / spatial / organic / restrained intelligence；明令禁止 cyberpunk、neon、laser、grid floor、sci-fi HUD、游戏属性环、医疗监护仪观感。
- **Skill 执行**：impeccable 按 SKILL.md（会话内先跑 context.mjs 定位目标、act 前加载 new-work.md、编辑 UI 前加载 craft-floor.md）；ui-ux-pro-max 用其 search.py（--design-system/--domain ux/--stack react-native|nextjs）与 quick-reference/pro-rules；frontend-design 按两遍法（先个性化 token 方案并对照反模板清单自检，再写代码）；playwright-cli 用于浏览器交互取证。所有 skill 执行情况如实写入 final response 的 Skills 段。
- **终止**：A1–A10 完成后立即 HARD STOP，不再进行任何后续页面、baseline、发版动作，等待人工查看 Today/Pet/Life View 真实 Android 截图并给出 Q1–Q12 裁决。