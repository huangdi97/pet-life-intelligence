# R2P_PREFLIGHT — Stage R.2-P 事实与设计审计（PREFLIGHT 输出）

> 日期：2026-09-27
> 全部字段来自真实命令输出，不沿袭旧报告假设。
> 本文件属于 PREFLIGHT 交付物 A1。

## 1. Repo 事实（真实命令核验）

```text
Repo root      = E:/AI/Pet Life Intelligence
Branch         = main
HEAD           = 5c2707e2a28f16ed77d216bd155157dd2aaa8de3
origin/main    = 5c2707e2a28f16ed77d216bd155157dd2aaa8de3  (HEAD == origin/main，无落后)
Worktree       = 3 个未跟踪文件：
                  .pi/goal/pli-stage-r-2-p-...-pr-20260927-1212.md（本 Goal 工件）
                  Pet_Life_Intelligence_v3.4-R1_..._2026-09-27.md（用户放入的 v3.4-R1 母版）
                  artifacts/visual-reconstruction/v0.2.0/final/final.rar（既有用户文件，不改动）
                 无已提交而未推内容；git status 无其他脏项
Remote         = origin  https://github.com/huangdi97/pet-life-intelligence.git
Tag v0.2.0     = 存在（git tag --list 匹配 v0.2.0）
最近提交       = 5c2707e docs(r2): correct v0.2.0 APK path ...
                  ff719d1 docs(r2): pin final push state (8795f79) ...
                  8795f79 docs(r2): README screenshot evidence metrics ...
```

## 2. CI 状态（当前 HEAD 对应事实）

```text
GitHub Actions 工作流 = .github/workflows/android.yml + ci.yml
v3.4-R1 §48.7 记录：最新 CI run #51 overall = FAILURE
  Frontend = SUCCESS
  Backend  = SUCCESS
## 3.1 Canonical Read Log（A2 记录：实际阅读的章节）

```text
v3.4-R1（6446 行，逐段阅读）：
  §33 Pet Living Model（33.1-33.4：产品定义/认知模型/用户侧命名/三层真实度）
  §34 Living Canvas（34.1 视觉原则 / 34.2 Today / 34.3 Pet→3D Life View / 34.4 Timeline / 34.5 Assistant）
  §45 视觉真实性事件（45.1-45.3：VR=Change Detection、Screenshot=L0 Evidence、双门验收）
  §46 R.2（46.1 定义 / 46.2 版本 / 46.3 North Star / 46.4 Owner IA / 46.5 Visual System V4
        / 46.6 Today / 46.7 Pet / 46.8 Life View / 46.9 Timeline / 46.10 Quick Log
        / 46.11 Domain Experience / 46.12 Assistant / 46.13 Companion / 46.14 Me）
  §47 Visual System V4 规范（47.1 术语清零 / 47.2 Card Density Gate / 47.3 Forms Gate
        / 47.4 Empty/Error/Loading / 47.5 Motion / 47.6 Accessibility）
  §48 v0.2.0 基线（48.1 Emulator / 48.2 Web Parity / 48.3 Mini Parity / 48.4 VR V3
        / 48.5 Release / 48.6 测试基线 / 48.7 当前 main CI 例外状态）
  §49 验收治理（49.1 五级完成 / 49.2 Screenshot Gate 永久化）
v3.3-R1（4645 行，superseded 章节对照）：
  §34 Living Canvas（34.1-34.6，含 34.4 Timeline / 34.5 Assistant / 34.6 Companion 联动）
  §33 PLM、§41 路线用于 cross-check（v3.4 覆盖的差异已在 GAP 表内注明）
```
  Browser E2E = FAILURE（Playwright functional 阶段失败 → Visual chain skipped）
因此当前事实：R2_RELEASE_ACCEPTANCE_EVIDENCE = EXISTS；CURRENT_MAIN_FULL_CI_GREEN = FALSE
本轮 §D7 必须定位该 failure 并修正 functional/visual 阶段排序。
```

## 3. Canonical 事实

```text
L3 最高设计母版 = 仓库根 Pet_Life_Intelligence_v3.4-R1_产品技术UIUX多端体验Release产品化LivingPetExperience与Pilot前收口_统一全量母版_2026-09-27.md（6446 行，用户确认放入）
L3 历史/细节   = docs/canonical/PLI_v3.3-R1.md（4645 行，仓库 canonical 索引标注 CURRENT，v3.4-R1 覆盖其 PLM/LivingCanvas/Visual 章节）
L2            = docs/reference/Pet_Life_Intelligence_v2.0_Feature_Inventory_228.xlsx（仓库 canonical README 索引）
权威顺序       = L0 runtime > L1 Git/schema/contracts/tests > L2 228 清单 > L3 v3.4-R1（旧 v3.1/3.2/3.3 仅 provenance）
冲突处理       = 不静默调和；以高层事实为准并显式记录（本目录文档均含 R2P_PREFLIGHT 同款记录）
```

## 4. 工具链 / 运行环境（真实核验）

```text
node      = v22.15.0
python    = Python 3.13.14（.venv：PIL 12.3.0）
emulator  = C:\Users\Kaiser\AppData\Local\Android\Sdk\emulator\emulator.exe
AVD 列表  = pdig5（Pixel5-like，R.2 验证的 390×844dp 规格）、pdig36、pdig36_tablet
adb       = 可用（daemon 已启动，当前无已连接设备，执行时启动 pdig5）
Mobile    = apps/mobile（Expo SDK 51 / RN 0.74；typecheck = tsc --noEmit）
Web       = apps/web（Next.js 15 / React 19；typecheck = tsc --noEmit；build = next build）
当前三屏  = TodayScreen.tsx(274) / PetScreen.tsx(210) / LifeViewScreen.tsx(166)
演示数据   = scripts/r2_demo_seed.py（豆豆/空空/咪咪 demo actors，后续子任务核验）
```

## 5. Skill 事实（PREFLIGHT B1 核验）

```text
impeccable   = C:\Users\Kaiser\.agents\skills\impeccable\SKILL.md（v4.0.4，scripts/ 完整）
               —— 本轮实际方法：context.mjs 已运行（无 PRODUCT.md → canonical/goal 视为结构化 brief）；
                  detect.mjs 对三屏源码运行 = 0 findings（代码层面干净，漂移在 presentation 结构）；
                  reference/critique.md + audit.native.md 已加载，R2P_VISUAL_FIDELITY_AUDIT.md 按
                  audit 报告骨架产出（5 维 0-4 评分）。
ui-ux-pro-max = C:\Users\Kaiser\.agents\skills\ui-ux-pro-max\SKILL.md
               —— 实际调用：search.py --design-system 两次 + --domain ux 两次（结果见 R2P_UIUX_AUDIT.md）。
playwright-cli= C:\Users\Kaiser\.claude\skills\playwright-cli\SKILL.md（commits 已读，用于 P0 取证阶段）
frontend-design = 本机无独立 SKILL.md 正式文档（已记录的限制）；按系统注册描述 + 仓库
               DESIGN 文档（docs/ui/PLI_VISUAL_SYSTEM_V4.md、PLI_DESIGN_SYSTEM_V3.md）落实实现。
```

## 6. 本阶段范围（来自已批准 Goal 契约）

```text
执行范围 = PREFLIGHT + P0（Today / Pet / Life View，mobile + web 双端）
Post-P0  = HARD STOP：R2P_PHASE_P0 = WAITING_FOR_HUMAN_VISUAL_ACCEPTANCE
锁       = 不 bump 版本 / 不发 Release / 不动 visual-v3-approved baseline / 不改其他页面
```

## 7. 已知与记录的限制

```text
- v3.4-R1 母版由用户放入仓库根（未纳入 git，本轮不改动其内容）。
- REAL_3D_PROVIDER = EXTERNAL_BLOCKED；REAL_PETS = 0（保持）。
- 截图人工审阅以「文件存在 + 尺寸 + 像素统计 + 源码结构」交叉核验；最终人眼验收归用户。
- frontend-design 无本地文档 → 以注册描述 + 仓库设计文档执行（已在 §5 显式记录）。
```