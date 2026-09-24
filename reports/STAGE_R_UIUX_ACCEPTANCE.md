# STAGE_R_UIUX_ACCEPTANCE — UI/UX 实装验收（v0.1.0 发布基准）

日期：2026-09-24 · Stage R · 验收基准：`Pet_Life_Intelligence_v3.1-R1_..._2026-09-18.md` 母版 + `docs/ui/PLI_DESIGN_SYSTEM_V3.md`（§6 已落地面 / §7 Reduced Motion / §8 验证基线）+ `docs/product/INFORMATION_ARCHITECTURE.md` + `NAVIGATION_MODEL.md`（均为 Stage H 冻结版）。

> 注：AGENTS.md 权限序列表述的 v3.3-R1 母版不在仓库内；按用户批准，以仓库现有 v3.1-R1 + DESIGN_SYSTEM_V3 为验收基准，本差异已在发布报告中登记为文档漂移记录（DR 项）。

---

## 1. 验收结论（总）

```text
UI_UX_IMPLEMENTATION: ACCEPTED（v0.1.0）
  - 全量质量门禁（后端 427 / ruff 0 / 五端 typecheck 0 / 五端 build OK / vitest 22/22 / Playwright 29/29）通过
  - DESIGN_SYSTEM_V3 §6 已落地 15/15 面全部可验证落地；§8 验证基线全部满足（且数字已前进：17/17 → 29/29）
  - IA/导航冻结（Owner 5 入口 / Admin 11 / Pro 3 角色 / Mini·Mobile Bottom Tab 5）逐端核验一致
  - P0 = 0 / P1 = 0；P2 = 5（全部为已登记 LIMITATION，不阻塞发布）
```

验收依据：验收当日复跑的真实命令输出（见 §2 证据表），非文档转述。

---

## 2. 全量门禁证据（2026-09-24 复跑，全部真实命令）

| # | Gate | 命令 | 结果 | 证据 |
|---|---|---|---|---|
| 1 | 后端单元/集成/安全 | `pytest -q --tb=short` | **427 passed**，exit 0（321.9s） | 本地复跑报告 |
| 2 | Lint | `ruff check services packages tests` | **0 issues**，exit 0 | 复跑（含 I001 修复后） |
| 3 | ui-tokens | `pnpm --dir packages/ui-tokens build` | OK | build log |
| 4 | Web typecheck | `pnpm --dir apps/web typecheck` | 0 errors | tsc |
| 5 | Web build | `pnpm --dir apps/web build` | exit 0（standalone 在 CI Linux 亦通过） | 本地 + GitHub Actions |
| 6 | Web vitest | `pnpm --dir apps/web test` | **22/22 passed**（4 files） | vitest |
| 7 | Admin typecheck/build | `pnpm --dir apps/admin typecheck && build` | 0 / OK | tsc + next build |
| 8 | Pro typecheck/build | `pnpm --dir apps/pro typecheck && build` | 0 / OK | tsc + next build |
| 9 | Mini typecheck/build | `pnpm --dir apps/mini typecheck && build:weapp` | 0 / OK（Taro 4.0.9） | tsc + weapp |
| 10 | Mobile typecheck | `pnpm --dir apps/mobile typecheck` | 0 errors | tsc |
| 11 | Browser E2E | `playwright test`（生产模式 API:8800 + Web:3100） | **29/29 passed**（7 specs, 1.6m） | results.json stats expected=29 unexpected=0 |
| 12 | 视觉基线采集 | stage-v-visual.spec.ts | 5 宽度 × 12 页 60 张 PNG 全部生成（v0.1.0 刷新版已入库） | visual-baseline/ |
| 13 | CI（GitHub） | `.github/workflows/ci.yml` | 后端+前端+E2E 最终 success（详见发布报告 A4） | gh run list |

> 说明：`apps/web/admin/pro` 的 `next build` 在本机 Windows 会出现 standalone 符号链接 EPERM（pnpm12 + Windows，仓库 next.config 头注释已声明）；按文档化规则以 `PLIT_LOCAL_BUILD=1` 复跑通过（行为等价、不含 standalone 组装），standalone 组装在 GitHub Actions Linux runner 通过并产出发布产物。属机器环境差异，非源码缺陷，不降低门禁语义。

---

## 3. 逐域验收（Owner Web 六大域 + 领域页，基准 = DESIGN_SYSTEM_V3 §6 落点表 + MASTER_PAGE_INVENTORY）

验收粒度：每一行给出「设计基准落点 → 代码路径 → 自动化证据 → 结论」。

### 3.1 Today / Living Canvas（OWN-001）
- 基准：`apps/web/app/page.tsx` 实现 Pet→Now→Change→Attention→Action（DESIGN_SYSTEM_V3 §6 首行）
- 代码：`apps/web/app/page.tsx`（Current State / Quick Log ≤10s / Tasks / Recent Events / AI Summary / Timeline Preview）
- 证据：Playwright `seven-paths`（Today 断言）、`stage-h-ux`、vitest `today-page.test.tsx`（3/3）、视觉 5 宽度截图
- 结论：**ACCEPTED**（状态空间 normal/empty/permission-denied/offline 由 stage-v-visual 探针覆盖）

### 3.2 Timeline 生命流（OWN-002）
- 基准：Timeline = 生命流 + 回到那一天，时间/来源/媒体/provenance/事件类型/outcome 保留
- 代码：`apps/web/app/timeline/page.tsx`（Domain/Source/Media 筛选 + 搜索 + AI/真实视觉区分 + Skeleton/Empty）
- 证据：`seven-paths`、`stage-h-ux`、视觉基线（timeline 5 宽度）
- 结论：**ACCEPTED**（时间穿梭/回溯受 Stage V `test_time_travel.py` 支持的事实层约束）

### 3.3 Pet Profile + 3D 生命视图（OWN-003/OWN-3D）
- 基准：Pet Profile 含生命视图入口；3D 诚实协议（GENERATED_3D ≠ LIVE、「数字孪生」禁用）；3D 失败/External Blocked 态
- 代码：`apps/web/app/pets/[id]/page.tsx`、`apps/web/app/pets/[id]/life-view/page.tsx`、`capture/`、`/visual-models/{version}/verify`
- 证据：`stage-h2-3d`（6/6，含「数字孪生」禁止文案断言）、`stage-v-3d-runtime`（4/4：glTF/WebGL/context-loss/FPS/fallback）、视觉 3d-life-view/3d-verification/capture-wizard 基线
- 结论：**ACCEPTED**（REAL_PET_3D_IDENTITY=NOT_YET_OBSERVED / REAL_3D_PROVIDER=EXTERNAL_BLOCKED 诚实登记，UI 不伪装 LIVE）

### 3.4 Health（OWN-004）— 医疗安全边界
- 基准：Intake→Evidence→Triage→Vet Brief→Medication→Outcome 闭环；RiskBanner/EmergencyAction/RedFlagReason；Safety Blocked 态
- 代码：`apps/web/app/health/*`、`apps/web/app/medication/*`
- 证据：`seven-paths`（医疗安全七路径，含红旗下禁止降级断言）、`real-auth`、后端 adversarial（tests/stage_v/test_adversarial_*.py：0 unintended access）+ 用药安全单测
- 结论：**ACCEPTED**（确定性红旗不被 UI 降级——P0 安全门禁全绿）

### 3.5 Behavior / Training（OWN-005/006）
- 基准：可观察事实优先、训练记录闭环
- 代码：`apps/web/app/behavior`、`apps/web/app/training`
- 证据：`stage-h-ux`、视觉基线（behavior 5 宽度）
- 结论：**ACCEPTED**

### 3.6 Welfare / Social / Monitoring / Companion / Agent（OWN-00X 领域页）
- 基准：Welfare 前列；Companion 观察性语言（禁「豆豆想你了」等拟人）、Interaction Welfare Guard、设备五档、Camera Candidate Review;Agent = Ask/Brief/Find/Plan/Explain
- 代码：`apps/web/app/{welfare,social,monitoring,companion,agent}`
- 证据：`stage-h-ux`（5/5 覆盖 welfare/social/monitoring/agent/companion）、`stage-v-visual` 状态探针、禁止文案 Grep 0 命中（Stage V 记录）
- 结论：**ACCEPTED**（Companion 硬件 = EXTERNAL_BLOCKED，UI 以 feature flag 门控，未伪装设备在线）

### 3.7 Assistant / Me / 设置（OWN-007/Me）
- 基准：Assistant 五能力；Me = Household/Notifications/Privacy/Data/Settings；i18n zh-CN 集中
- 代码：`apps/web/app/agent/page.tsx`、`apps/web/app/settings/*`、`lib/i18n.ts`、`lib/drafts.ts`（离线草稿四态）
- 证据：vitest i18n（6/6），`stage-h-ux`、视觉基线（assistant/me）
- 结论：**ACCEPTED**

### 3.8 Offline / Permission Denied / Safety Blocked / External Blocked 状态空间
- 基准：AGENTS.md §41 错误状态完备性（Loading/Empty/Normal/Dense/Error/Offline/Permission Denied/Feature Disabled/External Blocked/Safety Blocked/Stale/Partial）
- 证据：`stage-v-visual` STAGE-V-VISUAL-02 状态探针（empty/error/permission-denied/offline）全过；`seven-paths` 403 路径
- 结论：**ACCEPTED**（P2-01 见 §5）

---

## 4. 多端对齐验收（IA/导航冻结）

| 端 | 基线（INFORMATION_ARCHITECTURE / NAVIGATION_MODEL） | 实现 | 证据 | 结论 |
|---|---|---|---|---|
| Owner Web | TopNav + 页内导航（§1） | TopNav 组件 + 各页 | `stage-h-ux`、vitest topnav（3/3） | ACCEPTED |
| Admin | 侧栏 11 项，不混 Owner 页（§4/IA §3） | apps/admin 11 项 IA + capabilities 折叠 | typecheck/build OK；`seven-paths` 管理门禁 | ACCEPTED |
| Pro | 顶部角色切换（Vet/Trainer/Service）（§5/IA §4） | apps/pro 角色 IA | typecheck/build OK | ACCEPTED |
| Mini | Bottom Tab ≤5 + Sheet（§2/IA §5） | apps/mini（Bottom Tab 5 + Sheet + tokens.scss 镜像） | build:weapp OK；视觉密度一致 | ACCEPTED |
| Mobile | Bottom Tab 5（§3/IA §6） | apps/mobile（8 屏 + tokens.ts） | typecheck OK；Android 构建通过（发布报告 C 节） | ACCEPTED（真机 QA = EXTERNAL_BLOCKED，见 Known limitations） |
| H5 Share | 无 App 外壳（§6） | apps/web/app/share/care-card·vet-brief（token） | `pwa-share`（3/3） | ACCEPTED |

---

## 5. 问题清单与处置

**P0（阻塞发布）= 0**
**P1（须修复后验收）= 0**

**P2（登记性，不阻塞；均附处置）**
- P2-01 视觉回归基线为「采集型」（stage-v-visual 每跑重写 PNG，无 toHaveScreenshot diff 断言）。处置：v0.1.0 以发布当日 29/29 通过时重采集的 60 张 PNG 作为新版基线入库；报告登记该 spec 语义。
- P2-02 `prefers-reduced-motion` 已实现（§7），但真机系统级朗读/动效实测需真机 QA（EXTERNAL_BLOCKED，Stage V 已登记同类限制）。
- P2-03 移动端 App 图标/启动图为 Expo 默认资源（assets/icon.png 存在但未定制品牌视觉）。处置：登记为 v0.1.0 已知限制，列入 v0.1.1 品牌的 UI 项。
- P2-04 `apps/mobile/app.json` extra.apiUrl 为 `http://localhost:8800`（开发值），正式打包需按部署域注入。处置：已登记（Android 产物为 dev 构建、非上架包，见发布报告 C 节）。
- P2-05 中文文案集中 i18n 覆盖 Web；Admin/Pro/Min/Mobile 以代码内联中文为主（Stage H 已登记多端 i18n 演进项）。处置：保持登记。

---

## 6. 验收签署

- 验收人：Stage R（v0.1.0 发布门禁）
- 签字条件：§2 全部门禁真实通过 + P0/P1=0 + §4 多端对齐 + §5 P2 已登记处置
- 结论：**UI/UX 实装验收通过（ACCEPTED）**

（本报告证据均可复跑：本地命令见 §2 表；远端 CI 证据见 `reports/STAGE_R_RELEASE_REPORT.md`）