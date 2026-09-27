# Goal — PLI Stage R.2-P（P0 段）

## Goal

在仓库 `E:/AI/Pet Life Intelligence`（origin: huangdi97/pet-life-intelligence，当前 HEAD `5c2707e2a28f16ed77d216bd155157dd2aaa8de3`，branch `main`，tag `v0.2.0` 已存在）上执行 Stage R.2-P：
**Living Pet Experience Fidelity Reconstruction**，范围 = **PREFLIGHT → P0 → HUMAN GATE 硬停**。

- 修复已由真实截图证实存在的 Owner Presentation 与 canonical design 之间的 Experience Drift。
- 以 v3.4-R1 母版（已由用户放入仓库根目录 `Pet_Life_Intelligence_v3.4-R1_产品技术UIUX多端体验Release产品化LivingPetExperience与Pilot前收口_统一全量母版_2026-09-27.md`）+ v3.3-R1 细节（`docs/canonical/PLI_v3.3-R1.md`）为 canonical；L0 runtime > L1 Git > L2 228 清单 > L3 母版，冲突不准静默调和、必须显式记录。
- P0 只重构 **Today / Pet / Life View** 三屏（移动端 `apps/mobile` + 用户已确认的 Web 端 `apps/web` 同设计语言实现），使其从 "warm beige + generic glyph + flat utility + vertical lists" 变成 "一只具体宠物（豆豆）持续存在的生命界面"：PET → NOW → CHANGE → ATTENTION → ACTION → MEMORY，三层视觉深度（Background/Midground/Foreground），Warm Living Intelligence。
- 必经技能工作流：先读四个 Skill 的正式说明 → ui-ux-pro-max 先审 → impeccable 视觉审 → 设计综合 → frontend-design 落实 → 实现循环 → Android Emulator（pdig5，约 390×844dp 全高截图）→ Playwright（390/1440）取证 → 展示给用户 → **HARD STOP，等待人工视觉验收**。
- 最终状态：`R2P_PHASE_P0 = WAITING_FOR_HUMAN_VISUAL_ACCEPTANCE`，不宣布 PASS，不进入 P1。

## Acceptance criteria（执行结束后我本人可客观核验）

### A. PREFLIGHT / Canonical
- A1. `artifacts/r2p/R2P_PREFLIGHT.md` 由真实命令生成并记录：HEAD、branch、worktree、remote、`git rev-parse origin/main`、tag v0.2.0、CI 工作流文件（.github/workflows）、模拟器 AVD 列表（含 pdig5）。
- A2. Canonical read 覆盖 v3.4-R1 与 v3.3-R1 中至少：Pet Living Model、Living Canvas、Today、Pet World、Life View、Timeline、Assistant、Companion、Visual System V4、R.2 North Star、Screenshot Gate；在审计文档中记录"读了哪些章节"。
- A3. `artifacts/r2p/R2P_CURRENT_VS_CANONICAL_GAP.md` 存在，含 GAP 表（Current Screenshot / Canonical Intent / Observed Gap / Severity / Planned Correction），至少包含 Today、Pet、Life View 三行，且内容来自对 `artifacts/visual-reconstruction/v0.2.0/` 真实截图与 canonical 的比对。

### B. Skill 驱动审计（先诊断、后写代码）
- B1. 真实读取 skill 文档：impeccable（v4.0.4 `C:\Users\Kaiser\.agents\skills\impeccable\SKILL.md`）、ui-ux-pro-max（`.agents\skills\ui-ux-pro-max\SKILL.md`，用其 `search.py` 工具）、playwright-cli（`.claude\skills\playwright-cli\SKILL.md`）。frontend-design 无磁盘正式文档 → 作为已记录限制，按其注册描述 + 仓库 DESIGN 文档落实。
- B2. `artifacts/r2p/R2P_UIUX_AUDIT.md` 存在：经 ui-ux-pro-max 工作流产出，回答 §13 Today/Pet/Life View 的 UX/层次/密度/导航/可访问性问题。
- B3. `artifacts/r2p/R2P_VISUAL_FIDELITY_AUDIT.md` 存在：经 impeccable 工作流产出，解释"干净但无 Pet Presence/premium spatial/warmth/identity"的根因，并明确反对 "米白背景+圆角+icon=高级" 捷径。
- B4. `artifacts/r2p/R2P_VISUAL_DIRECTION.md` 存在：定义 Warm Living Intelligence 关键词、三层深度系统、motion 规则（subtle/calm/natural + reduced motion）。

### C. P0 实现（mobile + web 三屏 + 共享 presentation 层）
- C1. `apps/mobile` 的 TodayScreen/PetScreen/LifeViewScreen 重构为 Pet-centric 构图（首屏 Pet First、状态围绕 Pet 组织、最多 1 个主 CTA + 2–3 轻量入口），建立至少三层视觉深度；新增高内聚低耦合 presentation primitives，不产生超过仓库 AGENTS.md 行数限制的大文件。
- C2. `apps/web` 新增 Today / Pet / Life View 三个页面（用户批准完整实现），应用同一设计语法与 token。
- C3. CLEAN_VISUAL_DEMO：固定 actors 豆豆/咪咪/空空；三屏 Owner 可见输出不含 BW-*/raw enum/raw UUID/test pet/developer mode/内部 event key（以对三屏源码 grep + 运行截图双证据核验）。
- C4. Enum 严格做用户语言翻译（如 STRESS_RECOVERY→压力恢复、OWNER_REPORTED→主人记录）；未知 enum 走安全本地化 fallback，绝不 rawValue 直出。
- C5. PetStageRenderer 式 renderer 抽象（photo/2.5D/generated/3D），REAL_3D_PROVIDER=EXTERNAL_BLOCKED 诚实上报但不抢戏：用户看到的是豆豆，不是 "3D 未接入" 占位。
- C6. 数据诚实：不伪造 health state/mood/emotion/未来风险；demo 布局可 deterministic，但语义来自真实 domain 值/现有 API。

### D. 门禁与证据
- D1. Typecheck：`apps/mobile` 与 `apps/web` 的 `tsc --noEmit` PASS。
- D2. 相关单元/组件测试通过；不删除测试、不弱化断言。
- D3. Build：apps/web `next build` PASS；mobile bundle/build（仓库既定工具链）PASS。
- D4. Android Emulator：启动 pdig5，安装真实 app（非 mock/静态图），全高截图 Today/Pet/Life View → `artifacts/r2p/core/01_today.png`、`02_pet.png`、`03_life_view.png`（~390×844dp，真实捕获）。
- D5. Playwright（web）：Today/Pet/LifeView 三个页面在 viewport 390 与 1440 各截图 + 至少一次交互 smoke，存 `artifacts/r2p/playwright/`。
- D6. 合成图：`R2P_CORE_CONTACT_SHEET.png`、`CURRENT_v0.2.0_vs_R2P_Today.png`、`CURRENT_v0.2.0_vs_R2P_Pet.png`、`CURRENT_v0.2.0_vs_R2P_LifeView.png`、`R2P_CORE_BEFORE_AFTER_CONTACT_SHEET.png` 均在 `artifacts/r2p/core/` 下由新截图与 v0.2.0 旧截图真实合成。
- D7. CI 顺带修复（§41）：定位 Browser E2E FAILURE 根因并修正 functional 阶段误跑 VISUAL-V3 的排序问题（functional → reset deterministic visual DB → visual capture/diff 分离）；运行相关 browser E2E 并如实记录结果；CI 实际状态在最终报告如实填写。
- D8. 截图直接展示给用户（通过浏览器面板打开 HTML gallery 或等价方式）。
- D9. 最终回复采用 §65 格式，明确列出 Q1–Q9 待人工裁决，最后一行必须是 `R2P_PHASE_P0 = WAITING_FOR_HUMAN_VISUAL_ACCEPTANCE`；不宣称视觉 PASS。

## Boundaries

- **范围锁**：P0 只改 Today / Pet / Life View（mobile+web）及其依赖的 presentation components / tokens / styles / demo media / pet media layer / navigation transitions；Health/Behavior/Training/Welfare/Social/Assistant/Companion/Me/Timeline/QuickLog/Monitoring 不做重构，仅允许为共享组件编译做极小兼容改动。
- **发布锁**：不 bump 版本（无 v0.3.0）、不发新 Release、不进 Play Store、不进真机 QA、不进 Pilot、不 Public Deployment。v0.2.0 既有 release 资产不动。
- **Baseline 锁**：`artifacts/visual-v3-approved` 及等价 approved baseline 一律不动；visual diff 失败只上报，绝不自动更新 baseline。
- **数据锁**：不伪造任何领域事实与未来风险；Owner 界面零内部术语泄漏。
- **文件锁**：不删除/修改未跟踪用户文件（`artifacts/visual-reconstruction/v0.2.0/final/final.rar`）与既有 v0.2.0 截图资产；不静默调和冲突，冲突显式记录。
- **进程锁**：尊重仓库 AGENTS.md/全局工程规范（行数、内聚、命名、无 ts-ignore 等）；不借小任务做大规模无关重构。
- **Skill 锁**：按 Skill 自身说明使用；Skill 输出是指导，repo/canonical/runtime 事实仍为权威；不得虚报未运行的 Skill。
- **HARD STOP**：P0 全部产出 + 截图展示给用户后立即停止；不进入 P1、不宣布 R2 Freeze、不宣布最终 UI 完成、不更新 baseline，等待用户对 Q1–Q9 的人工视觉裁决。