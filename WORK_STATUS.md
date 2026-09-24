# WORK_STATUS

## Current terminal

`PLI_V0_1_1_INTERNAL_READY`（Stage R.1 完成，2026-09-24）· `PRE_PILOT_TECHNICAL_AUDIT_PASS` 保持
（pytest 427 / ruff 0 / 五端 typecheck 0 / vitest 22/22 / Playwright 30（27 功能 + 视觉链 3）
production 模式全 PASS；GitHub 公开仓库 + Release v0.1.0；v0.1.1 为内部收口续版未发布 tag；
REAL_PARTICIPANTS=0 诚实保留）

## Stage R.1 完成情况（2026-09-24，全部真实命令/CI 验证）

| 交付项 | 状态 | 证据 |
|---|---|---|
| v3.3-R1 canonical 入库 | DONE | `docs/canonical/PLI_v3.3-R1.md`（CURRENT）+ `docs/canonical/README.md` 索引（v3.1/3.2=HISTORICAL）；`reports/V3_3_CANONICAL_DELTA_AUDIT.md` V3_3_MISSING_CRITICAL=0 |
| Android API 环境化 | DONE | 不再写死 localhost；`app.config.js`（EXPO_PUBLIC_PLI_API_URL）+ `apiConfig.ts`（fail-safe）+ `ApiConfigErrorScreen`；`dev.ps1` API 绑 0.0.0.0 |
| Android 品牌基线 | DONE | icon/adaptive-icon/splash 替换 Expo 默认；`scripts/gen-brand-assets.mjs`；App 名「宠物生活智能」 |
| Android v0.1.1 internal-LAN APK | DONE | `artifacts/release/v0.1.1/Pet-Life-Intelligence-v0.1.1-internal-lan.apk`（84.1MB，sha256 见 SHA256SUMS，DEBUG_SIGNED_INSTALLABLE_APK） |
| 真机 QA | NOT_YET_OBSERVED | `reports/ANDROID_REAL_DEVICE_QA.md` J1–J8 checklist 就绪，未实测（无设备） |
| Web env 化 + 部署就绪 | DONE | `NEXT_PUBLIC_API_URL` + runtime 推导；产物无 localhost:8800；standalone tgz 验证；PUBLIC_DEPLOYMENT=EXTERNAL_BLOCKED |
| Visual Regression V2 | DONE | `visual-regression-v2.spec.ts` 逐像素 diff（tolerance 5/255、≤0.2%）；冻结 `artifacts/visual-baseline-approved/` 60 张；显式刷新；修复跨测试数据污染（功能→seed→视觉链）与 dev/production 渲染差异；最终 60/60 = 0 diff |
| UI/UX v3.3 复验收 | ACCEPTED | `reports/STAGE_R1_V3_3_UIUX_REACCEPTANCE.md` → UI_UX_V3_3_ACCEPTED（6 屏 + 状态全覆盖，production 模式复跑） |
| Demo 双宠正式化 | DONE | seed Coco/Mimi → 豆豆(dog)/咪咪(cat)；全仓测试/文档同步；synthetic 排除机制回归通过 |
| signing 措辞统一 | DONE | 全库统一 DEBUG_SIGNED_INSTALLABLE_APK/NOT_PLAY_STORE_SIGNED/PLAY_STORE_SIGNING=EXTERNAL_BLOCKED；v0.1.0 历史只加注记 |
| 截图包 | DONE | `artifacts/release/v0.1.1/screenshots/web/` 12 张；android/ 为回填说明 |

```text
PLI_V0_1_1_INTERNAL_READY · REAL_PARTICIPANTS=0 · REAL_PETS=0 · PILOT_MODE=false
ANDROID_REAL_DEVICE_QA=NOT_YET_OBSERVED · PUBLIC_DEPLOYMENT=EXTERNAL_BLOCKED
PRODUCT_VALIDATION=NOT_YET_OBSERVED
下一步：Stage G-W0A First Real Participants（Web/Android 真可访问后）；不进入 Stage I / v1.3 / Future 42
```

## Stage R 完成情况（历史快照，2026-09-24，Stage R 当时全部真实命令/CI 验证）

> Historical wording note: v0.1.0 时期的「未签名」表述已由 Stage R.1 统一为
> `DEBUG_SIGNED_INSTALLABLE_APK` + `NOT_PLAY_STORE_SIGNED` + `PLAY_STORE_SIGNING=EXTERNAL_BLOCKED`。<br>
> 真机 QA 状态由当时的 `EXTERNAL_BLOCKED` 细化为本轮 `ANDROID_BUILD_READY` + `NOT_YET_OBSERVED`。

<table><tr><td>交付项</td><td>状态</td><td>证据</td></tr>
<tr><td>GitHub 正式化</td><td>DONE</td><td>github.com/huangdi97/pet-life-intelligence（public）；main + tags 全量推送；CI 全绿；LICENSE/CONTRIBUTING/README 对齐</td></tr>
<tr><td>Web 成品</td><td>DONE</td><td>生产构建 exit 0；GET /、/manifest.webmanifest、/sw.js 200；Playwright 29/29；standalone 产物入 Release</td></tr>
<tr><td>Android 成品</td><td>DONE</td><td>android.yml：expo prebuild + gradle assembleRelease；app-release.apk（84MB，debug 签名 = DEBUG_SIGNED_INSTALLABLE_APK）产出为 workflow artifact + Release 资产</td></tr>
<tr><td>UI/UX 实装验收</td><td>ACCEPTED</td><td>reports/STAGE_R_UIUX_ACCEPTANCE.md（P0=0/P1=0/P2=5 登记；基准 v3.1-R1 + DESIGN_SYSTEM_V3 + IA 冻结；v3.3 基准升级由 Stage R.1 完成）</td></tr>
<tr><td>v0.1.0 发布</td><td>DONE</td><td>git tag v0.1.0；CHANGELOG v0.1.0；README 对齐；GitHub Release 含 APK + Web 产物；reports/STAGE_R_RELEASE_REPORT.md</td></tr>
<tr><td>CI 修复（线上化首跑暴露）</td><td>DONE</td><td>minio→quay.io、jsonschema dev-extra、OpenAPI 再生成、pnpm autolinking 依赖补全、Playwright --config 显式化</td></tr>
</table>

```text
PLI_V0_1_0_RELEASED · REAL_PARTICIPANTS=0 · PILOT_MODE=false
PLAY_STORE_SIGNING=EXTERNAL_BLOCKED · 真机 QA=EXTERNAL_BLOCKED（当时）
```


## Stage H 完成情况（2026-09-20，全部真实命令验证）

| 阶段 | 状态 | 证据 |
|---|---|---|
| Reality Audit（§6 十问） | DONE | reports/STAGE_H_DESIGN_PREFLIGHT.md |
| Feature → Experience Matrix | COMPLETE | docs/product/FEATURE_EXPERIENCE_MATRIX.md（PLI-001..228 全覆盖：FULL_UI 30 / PARTIAL_UI 128 / BACKGROUND_ONLY 17 / EXTERNAL_BLOCKED 11 / FUTURE 42） |
| Master Page Inventory | COMPLETE | docs/product/MASTER_PAGE_INVENTORY.md（OWN-001..021 / ADM-001..010 / PRO-001..006） |
| IA / 导航冻结 | COMPLETE | docs/product/INFORMATION_ARCHITECTURE.md + NAVIGATION_MODEL.md |
| Design System v1 | COMPLETE | docs/ui/PLI_DESIGN_SYSTEM_V1.md + COMPONENT_INVENTORY.md + COPY/RESPONSIVE/ACCESSIBILITY_GUIDELINES |
| ui-tokens 扩展 | COMPLETE | packages/ui-tokens（11 类 tokens + semantic + build OK） |
| ui-kit（新建） | COMPLETE | packages/ui-kit 30 组件；Web 10 核心页引用（契约 B6） |
| Owner Web 重构 | COMPLETE | Today/Timeline/Pet Profile/Health/Vet Brief/Medication/Behavior/Training/Welfare/Social/Monitoring/Companion/Agent/Notifications/Settings；PWA 保持 |
| Offline UX | COMPLETE | apps/web/lib/drafts.ts（Quick Log/Behavior/Health Intake/Care Note + 四档同步态） |
| i18n | COMPLETE | apps/web/lib/i18n.ts（zh-CN 全量集中 + mapErrorMessage 人类语言映射） |
| Mini 对齐 | COMPLETE | apps/mini（Bottom Tab 5 + Sheet + tokens.scss + companion 页；build weapp OK） |
| Mobile 对齐 | COMPLETE | apps/mobile（8 screens + tokens.ts；typecheck OK） |
| Admin 收口 | COMPLETE | apps/admin（11 项 IA；typecheck/build OK） |
| Professional（新建） | COMPLETE | apps/pro（Vet/Trainer/Service 角色 IA；typecheck/build OK） |
| Companion 设计与原型 | COMPLETE | COMPANION_DESIGN_COMPLETE + FRONTEND_PROTOTYPE_COMPLETE；HARDWARE_INTEGRATION_NOT_ACTIVATED（feature flag，不伪装硬件） |
| Monitoring UI | COMPLETE | MONITORING_UI_COMPLETE（connected/offline/empty/candidate/review/summary 状态完整；provider EXTERNAL_BLOCKED） |
| 前端测试 | PASS | apps/web vitest 22/22（i18n/today-page/topnav/ui-kit） |
| Browser E2E | PASS | Playwright 17/17（12 旧零回归 + 5 新：welfare/social/monitoring/agent/companion） |
| 质量回归 | PASS | pytest 273 / ruff 0 / 五端 typecheck 0 / web·admin·pro·mini build OK |
| 禁止文案扫描 | CLEAN | apps/ 无「AI 确诊/宠物想你了/98% 开心/100% 安全」及 Companion 拟人表述 |
| Pilot 数据治理 | 保持 | /pilot/status 实测：PILOT_MODE=false、REAL=0、excludes[demo,internal,synthetic_domain]；未部署 staging；未创建真实 Participant |
| 最终报告 | DONE | reports/STAGE_H_FINAL_REPORT.md（含 §116 状态块 + Known limitations + External blockers） |

## FINAL STATUS（Stage H）

```
PRODUCT DESIGN: COMPLETE / IA: COMPLETE / DESIGN SYSTEM: COMPLETE
OWNER WEB: COMPLETE / PWA: COMPLETE / MINI: COMPLETE(代码) / MOBILE: COMPLETE(代码)
ADMIN: COMPLETE / PROFESSIONAL: COMPLETE / MONITORING: COMPLETE / SOCIAL: COMPLETE
COMPANION: DESIGN_COMPLETE + FRONTEND_PROTOTYPE_COMPLETE（硬件 EXTERNAL_BLOCKED，不写 LIVE）
RESPONSIVE: PASS / ACCESSIBILITY: PASS(附 prefers-reduced-motion LIMITATION) / E2E: PASS(17/17)
FEATURE EXPERIENCE MATRIX: COMPLETE（228/228）
FREEZE: PRODUCT_DESIGN_FREEZE + UI_UX_FREEZE + MULTI_CLIENT_EXPERIENCE_FREEZE
WAVE_0_REENTRY_READY —— 下一步 Stage G-W0A First Real Participants；不自行进入 Stage I / v1.3
```
真实参与者仍 0（不伪造）；下一步 = Stage G-W0A First Real Participants）


## Stage V 完成情况（2026-09-23，全部真实命令验证）

| 阶段 | 状态 | 证据 |
|---|---|---|
| Repository Baseline | DONE | reports/STAGE_V_REPOSITORY_BASELINE.md |
| Design→Code Traceability | COMPLETE | reports/DESIGN_TO_CODE_TRACEABILITY_MATRIX.md（228/228；MISSING=0 / DOC_DRIFT=0） |
| Synthetic Cohort | COMPLETE | reports/SYNTHETIC_COHORT_SPEC.md（40 pets / 12 households，SYN-01..20；SYNTHETIC_NEVER_COUNTS_AS_REAL 回归 + 查询级过滤 Grep 双验证） |
| Scenario Replay | PASS | tests/scenarios/test_replays.py（REPLAY-01..12 全 PASS） |
| Adversarial | PASS | tests/stage_v/test_adversarial_*.py（§14 输入 / §15 权限 0 unintended access / §16 医疗安全） |
| Property | PASS | tests/stage_v/test_properties.py（§18 全部 invariants） |
| Time Travel | PASS | tests/stage_v/test_time_travel.py（§19 可控时钟 1d..3y） |
| AI Goldset | PASS | evals/PLI_AI_GOLDSET_V1（21 例，§20-22 全覆盖，离线确定性） |
| Visual Regression | PASS | stage-v-visual.spec.ts（12 页 × 5 宽度 = 60 张基线 + 状态空间探针） |
| 3D Viewer Runtime | READY | stage-v-3d-runtime.spec.ts（glTF 加载/WebGL/context-loss/FPS/fallback；REAL_PET_3D_IDENTITY=NOT_YET_OBSERVED） |
| 架构/代码质量/注释 | PASS | ARCHITECTURE_AUDIT / CODE_QUALITY_AUDIT / COMMENT_AND_DOCUMENTATION_AUDIT |
| 死代码/Ghost | PASS | DEAD_CODE_AND_GHOST_FEATURE_AUDIT（DOC_ONLY_GHOST=0 / CODE_ONLY_GHOST=0；FUTURE 42 预期冻结） |
| DB/API 审计 | PASS | DATABASE_API_AUDIT（11 迁移链可重放；OpenAPI 187 ↔ routes 186 ↔ 0 未匹配） |
| Security（重写） | PASS | SECURITY_AUDIT（2026-09-23 版；SV-001 ops 门禁已修；secrets 无提交） |
| 依赖/性能 | PASS | DEPENDENCY_AUDIT（MUST_FIX=0）+ PERFORMANCE_AUDIT（50/200/1000 事件实测平坦） |
| 文档漂移 | PASS | DOCUMENTATION_DRIFT_AUDIT（§56 十项全对齐） |
| 测试质量 | PASS | TEST_QUALITY_AUDIT（含 Mutation-thinking 人工 review） |
| 多端一致性 | PASS | MULTI_CLIENT_PARITY_AUDIT（Welfare/Social Mini 入口级为设计差异，已登记） |
| 无障碍最终 | PASS | ACCESSIBILITY_FINAL_AUDIT（含 3D textual equivalent；真机朗读 EXTERNAL_BLOCKED 登记） |
| UX Copy | CLEAN | 禁止文案 Grep 0 命中（「数字孪生」仅注释声明禁用） |
| Issue Ledger | 收口 | STAGE_V_ISSUE_LEDGER.md（P0=0 / P1=0 / P2=0 剩余） |
| 全量回归 | PASS | pytest **420 passed**（339s）/ ruff 0 / 五端 typecheck 0 / 五端 build OK / vitest 22/22 / Playwright **29/29**（123.6s） |
| /pilot/status | 诚实 | PILOT_MODE=false、pets_total=0、activated_owners=0、excludes[demo,internal,synthetic_domain]；perf 探针 1250 synthetic 事件零污染 |

## FINAL STATUS（Stage V）

```
STAGE V: COMPLETE / PRE_PILOT_TECHNICAL_AUDIT_PASS
DESIGN_COMPLETE / ENGINEERING_LOCALLY_VERIFIED / SYNTHETIC_VALIDATION_COMPLETE
SCENARIO_REPLAY_PASS / SAFETY_AUDIT_PASS / ARCHITECTURE_AUDIT_PASS / CODE_QUALITY_AUDIT_PASS
DOCUMENTATION_AUDIT_PASS / MULTI_CLIENT_AUDIT_PASS / 3D_VIEWER_RUNTIME_READY
REAL_PET_3D_IDENTITY=NOT_YET_OBSERVED / REAL_3D_PROVIDER=EXTERNAL_BLOCKED
WAVE_0_REENTRY_READY / REAL_PARTICIPANTS=0 / REAL_PETS=0 / PRODUCT_VALIDATION=NOT_YET_OBSERVED
下一步 Stage G-W0A First Real Participants；不自行进入 Stage I / v1.3 / Future 42
```


## Wave 0（Stage G-W0）完成情况（真实命令验证）

| 阶段 | 状态 | 证据 |
|---|---|---|
| Wave 0 Preflight | DONE | reports/pilot/WAVE_0_PREFLIGHT.md（FINAL STATUS 块 + 全部证据） |
| demo/internal 工程隔离 | DONE（已上线） | is_demo/is_internal 列 + pilot_orgs 表 + 回填（migration c4d8e2a71b93）；/pilot/status 7→0 诚实化 + excludes 声明 |
| P1 测量 bug 修复 | DONE | 合成域过滤 OR→AND（8bcc0bf）+ 回归测试；由 live dry-run DR-11 发现 |
| 邀请制门控演练 | 9/9 PASS | scripts/pli_pilot_gating_drill.sh（临时 true 全链路 → 恢复 false） |
| 无干预 dry-run | 11/11 PASS | scripts/pli_wave0_dryrun.sh（新增入库；注册(带码)→登录→建宠→Quick Log→Timeline→Today→反馈→指标排除） |
| 数据保护复查 | 8/8 PASS | scripts/remote_privacy_check.py（跨用户 403/导出/consent/删除登记） |
| 浏览器回归 | 12/12 PASS | Playwright against 公网 staging（含七路径医疗安全/IDOR） |
| PRE_WAVE0_BACKUP | 10/10 PASS | scripts/pli_backup_drill.sh（74 表 + 恢复库 API smoke） |
| W0 运营模板 | DONE | reports/pilot/ORG_LEDGER.md（W0-OWNER-01 / W0-PROFESSIONAL-01 占位 LEAD，不伪造机构） |
| 部署 | DONE | 服务器源码备份 → 三镜像重建 → 迁移 c4d8e2a71b93 → 容器重建（回滚可用） |
| 质量回归 | PASS | pytest 273（+1 回归）/ ruff clean / web+admin typecheck 0 |
| 真实参与者 | AWAITING | 0（NOT_YET_OBSERVED，不伪造） |

## FINAL STATUS（W0）

```
PILOT MODE: OFF（演练后恢复；正式切换待第一波真实邀请）
WAVE 0: READY / REAL PARTICIPANTS: 0 / REAL PETS: 0 / ACTIVATED OWNERS: 0
P0: 0 未解决 / P1: 3（外部 blocker：AI key / SMTP / git remote）
AI: EXTERNAL_BLOCKED / EMAIL: LIMITED(console) / PUBLIC STAGING: LIVE
BACKUP: PASS / MONITORING: PASS / NEXT: 真实用户确认后 Wave 0-A
```

## Stage G 启动完成情况（真实命令/代码验证）

| 阶段 | 状态 | 证据 |
|---|---|---|
| Reality Audit（§6 十五问） | DONE | reports/STAGE_G_PILOT_READINESS.md（15 问逐条 + 缺口清单） |
| 注册页邀请码输入 | DONE | apps/web/app/register/page.tsx + api-client authApi.register(…, invite_code?) |
| 产品内反馈 UI | DONE | 设置页「试点反馈」10 类卡片 + pilotApi.feedback()；后端类别集合扩展 |
| Admin Pilot 状态卡 | DONE | apps/admin/app/page.tsx（/pilot/status 实时） |
| 运营文档 | DONE | docs/pilot/：PILOT_OPERATIONS / PILOT_ONBOARDING / PILOT_METRIC_DEFINITIONS / INTERVIEW_GUIDES / PILOT_SUPPORT |
| 周报体系 | DONE | reports/pilot/：README + ACTIVATION_FUNNEL / UX_FRICTION_LOG / FEATURE_USAGE / FEATURE_REQUEST_BACKLOG / COMPANION_DISCOVERY / DEVICE_DISCOVERY / COMMERCIAL_DISCOVERY / WEEK_01 |
| 回归 | PASS | pytest 267 / web+admin typecheck 0 / ruff clean |
| 真实参与者 | AWAITING | 尚无真实用户/机构/宠物（NOT_YET_OBSERVED，不伪造） |

## Stage F 完成情况（跨 Agent 接续，全部真实命令验证）

| 阶段 | 状态 | 证据 |
|---|---|---|
| Handoff Reality Audit | DONE | reports/STAGE_F_HANDOFF_CURRENT_STATE.md |
| Remote Staging | DONE（LIVE） | 6 容器 Up + Caddy TLS；https://staging.haoleilab.com/pli · /pli-api · /pli-admin 全 200 |
| Remote 全链路 smoke | DONE | scripts/remote_staging_smoke.py **20/20 PASS**（register→…→cross-user deny→data persists） |
| Remote Auth 矩阵 | DONE | scripts/remote_auth_matrix.py **15/15 PASS**（Argon2id 全流程 + 限流 + 删号） |
| Remote 医疗安全 | DONE | scripts/remote_medical_safety.py **9/9 PASS**（红旗/弱化/injection/单调升级/免责） |
| Remote 存储 | DONE | scripts/remote_storage_check.py **9/9 PASS**（上传/下载/IDOR/MIME/签名） |
| Remote 隐私 | DONE | scripts/remote_privacy_check.py **8/8 PASS** + share-revoke 演练 7/7（撤销 403） |
| Remote Pilot | DONE | scripts/remote_pilot_check.py **8/8** + 闸门演练 **9/9**（PILOT_MODE=true 无码 422/有码 201；恢复 false） |
| 备份/恢复 | DONE | 远程 staging 演练 **10/10 ALL-PASS exit 0**（73 表 counts 一致 + 恢复库 API smoke） |
| Monitoring | ACTIVE | /metrics 真实流量（events 25→158、security 14→59、audit 18→119，时间戳快照 ×3） |
| Remote E2E | DONE | Playwright **12/12 PASS** against 公网 staging（真实浏览器注册→登录→退出→重置、PWA、分享、IDOR） |
| 部署 bug 修复 | DONE | bundle localhost 烘焙 / seed FK 顺序 / 健康页 basePath 跳转 / PWA basePath 缺口（4 项，详见 STAGE_F_FINAL_GATE） |
| Local 质量回归 | DONE | pytest 267 / ruff clean / typecheck 0 / 本地 Playwright 12/12 |
| Final Gate | DONE | reports/STAGE_F_FINAL_GATE.md（F0–F20 逐 Gate 判定） |
| 完成报告 | DONE | PLI_STAGE_F_HANDOFF_COMPLETION_REPORT.md |

## FEATURE FREEZE

已达到 WEB_LIVE + PILOT_LIVE（staging 公网）。停止功能开发。
下一阶段：**REAL PILOT OPERATIONS**（真实反馈/usage/errors 驱动），不再扩 Feature。

## Current blockers（外部）

1. git remote URL（仓库就绪，提供即 push）
2. 真实 AI Provider API key（代码 REAL_PROVIDER_READY，配置即激活）
3. SMTP 邮件账号（代码+模板齐备）
4. 独立生产域名 + DNS 控制（staging 已 path-prefix 上线；生产需独立域名）
5. 微信 AppID / 主体 / 备案；Apple / Google / HarmonyOS 账号与签名

## 下一步（真实输入驱动）

下一阶段输入必须来自真实用户行为 / 医院 / 门店 / 训练师反馈 / 监控 / Outcome，
不再凭空扩 Feature。

## Stage H.1（2026-09-20，GOAL PLI_v3.3-R1 PHASE A–B）—— 进行中

| 阶段 | 状态 | 证据 |
|---|---|---|
| PHASE A Reality Audit | DONE | reports/STAGE_H1_PREFLIGHT_CURRENT.md（git/repo/canonical 全记录；pytest 273 / ruff 0 / 五端 typecheck 0 / 四端 build OK / vitest 22 / PW 17 复跑通过） |
| L3 母版差异 | 已记录 | GOAL 引 v3.3-R1（09-20），repo 实为 v3.1-R1（09-18）——以 repo 实际为准 |
| PHASE B H.1 Audit（128 PARTIAL_UI） | DONE | reports/STAGE_H1_FEATURE_CLOSURE_AUDIT.md + STAGE_H1_FINAL_CLASSIFICATION.md；FEATURE_EXPERIENCE_MATRIX 更新（PARTIAL_UI=0） |
| B5 prefers-reduced-motion | DONE | globals.css + mini app.scss 全局 `@media (prefers-reduced-motion: reduce)`；ACCESSIBILITY LIMITATION 归零 |
| 终态分布 | 186 | FULL_UI 77 / BACKGROUND_ONLY 47 / PRO_ONLY 13 / EXTERNAL_BLOCKED 21 / ACCEPTED_UI_LIMITATION 28 / FUTURE 42（未开发） |

下一步：PHASE C+（Stage H.2 Living Pet）——Living Canvas / Pet Living Model / 3D Life View（provider 外部受限时 adapter+fallback）。

## Stage H.2（2026-09-20，GOAL PHASE C–P）—— 进行中

| 阶段 | 状态 | 证据 |
|---|---|---|
| Living Canvas Today 重构 | DONE | apps/web/app/page.tsx（Pet→Now→Change→Attention→Action 主轴）；vitest 22/22 + Playwright 17/17 |
| Pet Living Model 数据层 | DONE | models/visual.py（Capture/Model/RenderManifest）+ migration 21b4b571112a（3 表，可回滚） |
| PLM API | DONE | routes/visual.py（capture/qc/model/verify/activate/retire/manifest/state-overlay/status）；event_types 注册 visual.* |
| Provider 适配层 | DONE | adapters/visual_provider.py（Provider protocol + Sandbox + ExternalBlocked）；REAL_3D_PROVIDER_EXTERNAL_BLOCKED 诚实 |
| 3D Life View（Web+Mini） | DONE | /pets/[id]/life-view + pages/pets/life-view（诚实 blocked 态 + 版本 + overlay + 照片 fallback） |
| PLM contract 测试 | DONE | tests/contract/test_plm_visual.py 8/8（含 not_like 不能激活安全规则） |
| 文档 | DONE | docs/architecture/PET_LIVING_MODEL_ARCHITECTURE + THREED_PROVIDER_ADAPTER + docs/safety/PET_LIVING_MODEL_SAFETY + docs/ui/LIVING_CANVAS_UX + PET_3D_LIFE_VIEW |
| 报告 | DONE | reports/LIVING_CANVAS_UX_ACCEPTANCE + PET_LIVING_MODEL_IDENTITY_QA + PRIVACY_SAFETY + PERFORMANCE（3D 性能 EXPLICIT LIMITATION：无真实资产） |
| 回归 | PASS | pytest 281（+8 PLM）· ruff 0 · web/mini typecheck 0 · vitest 22 · Playwright 17 |

外部 blocker：REAL_3D_PROVIDER（无真实生成服务）· OWNER_IDENTITY_VALIDATION=NOT_YET_OBSERVED（无真人）。

## Stage H.2 收尾（2026-09-20）—— 最终验收

| 交付 | 状态 |
|---|---|
| PHASE E Capture Wizard | DONE（web /pets/[id]/capture：6 角度引导 + 上传 + QC + 隐私提示；life-view 入口） |
| PHASE J Timeline 回到那一天 | DONE（日期过滤 + 仅真实事件 + 当日激活模型版本提示；禁用 3D 伪装过去） |
| PHASE K Companion 标注 | DONE（GENERATED_3D ≠ LIVE/RECORDED 显式声明） |
| 最终验收报告 | DONE（MULTI_CLIENT_FINAL_ACCEPTANCE / WAVE_0_REENTRY_READINESS / FINAL_PRODUCT_READINESS_REPORT） |
| 回归 | PASS（web typecheck 0 · vitest 22 · Playwright 17） |

**FINAL PRODUCT READINESS：H.1 COMPLETE + H.2 CORE COMPLETE + WAVE_0_REENTRY_READY**
（3D provider / AI / staging 部署 / 真人均为诚实 EXTERNAL_BLOCKED，不伪造）

## Stage H.2 补充（2026-09-21 凌晨）—— PHASE M / N 完成

| 交付 | 状态 |
|---|---|
| PHASE M 视觉系统 v3 | DONE（docs/ui/PLI_DESIGN_SYSTEM_V3.md：M1 视觉目标 / M2 3D 场景风格 / M3 文案规范 / M4 设计稿范围 16 项落点） |
| PHASE N 报告更新 | DONE（RESPONSIVE：3D Life View + Capture Wizard 断点行；ACCESSIBILITY：H.2 新页面原生语义复核） |
| web build 回归 | PASS（全部 H.2 前端页面可完整编译） |
| vitest | PASS（22/22） |
| 环境 blocker | Docker Desktop 引擎持续故障（7 轮恢复未稳定）；PG/Redis/MinIO 容器 Exited(255)；stage-h2-3d 补跑待环境恢复 |


## Stage H.2 环境 blocker 解除（2026-09-21）—— 全量回归闭环

- **根因**：C 盘空间耗尽（<7GB）+ Agent 工具会话结束清理子进程树 → Docker Desktop 引擎反复被终止。
- **修复**：清理缓存释放 ≈24GB · 写 .wslconfig 限 WSL2 6GB/4核/2GB swap · explorer detach 启动 Docker Desktop · docker start 恢复容器。
- **全量回归（真实通过）**：Playwright **23/23**（17 旧 + 6 stage-h2-3d，含 companion GENERATED_3D≠LIVE）· pytest **281** · ruff **0** · vitest 22/22。
- PHASE O E2E 闭环。环境 blocker 解除。


## Stage H.2 本地剩余项补齐（2026-09-21）—— 完成

| 项 | 状态 |
|---|---|
| PHASE O provider adapter 单测 | DONE（tests/unit/test_visual_provider.py 6/6：sandbox contract / 诚实失败 / cancel / artifacts+metadata / status / singleton） |
| PHASE C6 状态位 Explain | DONE（Timeline 每条事件「[为什么]」+ Today 关注区「[查看依据]」→ /agent?tab=explain&ctx=… 带上下文；agent 页支持 URL 进入 explain） |
| Mobile 3D Life View | DONE（apps/mobile LifeViewScreen：诚实 blocked + 版本 + overlay；Me 页入口；navigation 注册） |
| 全量回归 | Playwright **23/23** · pytest **287**（+6）· ruff 0 · vitest 22/22 · web/mobile typecheck 0 · web build OK |


## Stage V.2 全仓质量收口（2026-09-24）—— 完成

| 项 | 状态 |
|---|---|
| 规模收口 | 生产源码 >300 行 = 0、React 页面/组件 >200 行 = 0、非组件 TS >300 行 = 0（scripts/scan_codebase_scale.py 503 文件可复现扫描；3 个原超限测试文件已拆分，全仓含测试 0 超限） |
| 历史违规清单 | 14 Python + 12 React + 1 TS 全部有处置记录（10 个 Python 为既有工作树拆分映射；本轮拆分 4 Python + 16 React + 1 TS） |
| 逐文件审核报告 | reports/STAGE_V2_FULL_CODEBASE_REVIEW.md（方法 + 证据 + 映射表 + 例外表） |
| Issue Ledger | reports/STAGE_V2_ISSUE_LEDGER.md：SV-006 = CLOSED、SV-007 = CLOSED、P0/P1 剩余 = 0 |
| 注释/类型收口 | 裸 TODO = 0；28 个类型逃逸标记逐条判定；代码级转义 0 新增（network.ts `unknown as` 已消除） |
| 回归 | pytest **427** passed / 0 failed · ruff 0 · 五端 typecheck 0 · 五端 build OK · vitest 22/22 · Playwright **29/29**（真实完整套件，Postgres 55679 + API 8800 + Web 3100） |
