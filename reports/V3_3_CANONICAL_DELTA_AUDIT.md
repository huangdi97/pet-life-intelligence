# V3.3 Canonical Delta Audit — v3.3-R1 vs 当前代码

> Stage R.1（2026-09-24）· 依据：`docs/canonical/PLI_v3.3-R1.md`（CURRENT）与根部
> `Pet_Life_Intelligence_v3.1-R1_..._2026-09-18.md`（v3.1 基线，HISTORICAL）。
> 方法：在母版中定位各主题章节（v3.3 第 33–39 章 = `PLI_v3.3-R1.md:2793-3654`），
> 再对 services/api、apps/web、apps/mobile、packages、tests/ 做同主题代码取证；
> 只读调查（subagent b6e3a539）+ 人工复核 + 可机检证据。

关键基线事实：v3.1 母版对 `3D | 三维 | Living Model | Living Canvas | 生命模型` 命中 0 次；
v3.3 新增整套 PLM/3D/Companion 收口内容，故“机制/实体/API”类主题在 v3.1 一律为 N/partial。

---

## 1. Living Canvas（Living Canvas 机制）

| 字段 | 内容 |
|---|---|
| Requirement | Today 首页重构为 Living Canvas：Pet→Now→Change→Attention→Action；3D Pet 为主焦点；点击宠物视觉进入 3D Life View |
| v3.1 existed | N（v3.1 Today 为功能 Dashboard） |
| v3.3 added-or-changed | §34.2 主轴重排 + §34.1 视觉原则（禁霓虹/赛博/游戏面板）+ 点击入口 |
| Current implementation | Web Today 按主轴序渲染 6 卡；**本轮新增**：LifeViewCard 整卡可点击进入生命视图（点击宠物视觉=入口） |
| Code evidence | `apps/web/app/page.tsx:102-117`；`apps/web/app/_components/today/{LifeViewCard,NowCard,ChangeCard,AttentionCard,ActionCard}.tsx`；`docs/ui/LIVING_CANVAS_UX.md`；Mobile `apps/mobile/src/screens/TodayScreen.tsx` |
| Test evidence | `tests/e2e-browser/specs/stage-v-visual.spec.ts`（today 基线）；`tests/e2e-browser/specs/stage-h2-3d.spec.ts`（life-view 导航） |
| Status | **COMPLETE**（主轴/卡片/点击入口已实现；"3D Pet 主焦点"依赖 3D 渲染 = EXTERNAL_BLOCKED，见 §16） |
| Action | 无进一步行动（纯 3D 渲染部分保持 EXTERNAL_BLOCKED） |

## 2. Pet Living Model（宠物生活模型）

| 字段 | 内容 |
|---|---|
| Requirement | PLM=横向视觉表示层，只消费不新建事实；三层真实度 L1 Identity/L2 Interactive 3D/L3 Predictive Twin；用户侧禁词“数字孪生” |
| v3.1 existed | N |
| v3.3 added-or-changed | 新增 Entity PetVisualModel/Capture/RenderManifest/StateOverlay；禁词约束 |
| Current implementation | ORM+路由聚合器只引用 Observation/Baseline/Event/Inference；L1 落地；L2/L3 显式 EXTERNAL_BLOCKED；禁词校验 |
| Code evidence | `services/api/app/models/visual.py:1-17,52-154`；`services/api/app/api/routes/visual.py`；`services/api/app/adapters/visual_provider.py:46-84`；`apps/web/app/pets/[id]/life-view/page.tsx:15-20` |
| Test evidence | `tests/stage_v/test_properties.py:222-229`；`tests/unit/test_visual_provider.py`；`tests/e2e-browser/specs/stage-v-3d-runtime.spec.ts:10-15` |
| Status | **COMPLETE**（数据/生命周期/禁词完整；L2 真 3D 生成 = EXTERNAL_BLOCKED） |
| Action | 无 |

## 3. 3D Life View（3D 生命视图）

| 字段 | 内容 |
|---|---|
| Requirement | PLM 主页面：全景 + 状态环绕 + 底部页签；状态 Overlay 只表达已有数据（值/基线差/来源/时间）；旋转/缩放/LOD 交互 |
| v3.1 existed | N |
| v3.3 added-or-changed | 新增 `/pets/[id]/life-view` 页面 + `/visual/status`、`/state-overlay`；Overlay 契约 |
| Current implementation | Web 4 卡（ProviderStatus/ModelVersions/StateOverlay/RealPhoto）+ Mobile LifeViewScreen；Overlay 含 current+baseline_range+delta+freshness；旋转/LOD 未接（无 three/model-viewer 依赖） |
| Code evidence | `apps/web/app/pets/[id]/life-view/`（page.tsx + _components/*）；`apps/mobile/src/screens/LifeViewScreen.tsx`；`services/api/app/api/routes/visual_overlay.py` |
| Test evidence | `tests/e2e-browser/specs/stage-h2-3d.spec.ts:30-43`；`tests/contract/test_plm_visual.py`；`tests/scenarios/test_replays.py:219` |
| Status | **COMPLETE**（页面/Overlay/诚实 blocked 态完整；可交互 Viewer=EXTERNAL_BLOCKED） |
| Action | 无 |

## 4. 3D Capture（3D 采集）

| 字段 | 内容 |
|---|---|
| Requirement | Capture Wizard 最低输入（正面/左/右/背/全身/头部）+ QC（身份/混入/模糊/遮挡/人脸隐私）；长毛/黑猫/多宠引导文案 |
| v3.1 existed | N |
| v3.3 added-or-changed | 新增采集引导页 + `visual-captures` API + QC 端点 |
| Current implementation | 6 角度引导 + 逐张上传 + capture 创建 + 确定性启发式 QC（数量/角度/隐私/重复）+ privacy_scan/consent_visual_model_training 字段 |
| Code evidence | `apps/web/app/pets/[id]/capture/page.tsx:16-88`；`services/api/app/api/routes/visual_capture.py:18-92`；`services/api/app/models/visual.py:72-79` |
| Test evidence | `tests/contract/test_plm_visual.py:53-62`；e2e 基线 `1440_capture-wizard.png` |
| Status | **COMPLETE**（真实 AI QC 未接时诚实降级 heuristic_only） |
| Action | 无 |

## 5. 3D Versioning（3D 版本化）

| 字段 | 内容 |
|---|---|
| Requirement | 版本字段体系（plm_version_id/source_artifact_ids/provider/geometry/texture/rig/owner_verified/status）+ verify/activate/retire 写端点 |
| v3.1 existed | N（v3.1 仅通用 Event Schema Versioning） |
| v3.3 added-or-changed | 新增 3D 版本实体与状态机 QUEUED→GENERATING→READY→VERIFYING→ACTIVE→RETIRED |
| Current implementation | 表 `pet_visual_models` + `UniqueConstraint(pet_id,version)` + 3 个写端点（均要求 Pet permission） |
| Code evidence | `services/api/app/models/visual.py:90-125`；迁移 `services/api/migrations/versions/21b4b571112a_...py:39-67`；`services/api/app/api/routes/visual.py` |
| Test evidence | `tests/contract/test_plm_visual.py:27-31` |
| Status | **COMPLETE** |
| Action | 无 |

## 6. 3D Provenance（3D 来源/血缘）

| 字段 | 内容 |
|---|---|
| Requirement | 全部 3D 记录保 provenance：来源 artifacts/版本/GENERATED_3D 类型/owner 验证/审计；presentation 永不变成 ClinicalFact |
| v3.1 existed | N |
| v3.3 added-or-changed | provenance 字段组 + PROVENANCE 语义：生成结果仅 presentation 数据 |
| Current implementation | 模型字段 + API 输出 + 迁移隔离 generated 与 clinical；overlay 非医疗断言 |
| Code evidence | `services/api/app/models/visual.py:52-154`；`services/api/app/api/routes/visual.py`；迁移 `c4d8e2a71b93_wave0_backfill_demo_test_markers.py` |
| Test evidence | `tests/contract/test_plm_visual.py:39-40`；`tests/stage_v/test_synthetic_isolation.py` |
| Status | **COMPLETE** |
| Action | 无 |

## 7. 3D Fallback（3D 不可用时的优雅降级）

| 字段 | 内容 |
|---|---|
| Requirement | 3D 不可用时保持真实照片+状态 overlay；核心流程（Quick Log/Health/用药/Timeline/权限/安全）不依赖 3D |
| v3.1 existed | N |
| v3.3 added-or-changed | 诚实 blocked 渲染 + RealPhoto 兜底 + loading 策略字段 |
| Current implementation | LifeView 页 REAL_PHOTO fallback；`/monitoring` 链接；页面 role="alert" 等价文本 |
| Code evidence | `apps/web/app/pets/[id]/life-view/_components/RealPhotoCard.tsx:24-26`；`apps/web/app/pets/[id]/life-view/page.tsx:78-79` |
| Test evidence | `tests/e2e-browser/specs/stage-h2-3d.spec.ts:39-43`；视觉基线全部页面 |
| Status | **COMPLETE**（含本轮视觉回归覆盖） |
| Action | 无 |

## 8. Companion integration（Companion 集成）

| 字段 | 内容 |
|---|---|
| Requirement | 3D Pet=身份/状态入口，Live 画面=真实此刻（视觉必须分开）；无摄像头时保留 3D+最近真实事件，禁止伪 Live；Interaction Session 写入 Timeline |
| v3.1 existed | partial（候选层仅读，无后端落地） |
| v3.3 added-or-changed | Companion 定位为 PLM 的 Presence Interface；诚实降级规则 |
| Current implementation | Web/Mobile Companion 5 面板（Gate/Control/Observe/WelfareGuard/SessionSummary），仅读现有 `/events`、`/devices`；“看看它”→`/monitoring`；Interaction Session 后端 = ABSENT（无设备事件源，符合 AGENTS.md §23 硬件真话规则） |
| Code evidence | `apps/web/app/companion/page.tsx`；`apps/mobile/src/screens/CompanionScreen.tsx`、`companion_constants.ts`；`apps/web/app/monitoring/` |
| Test evidence | `tests/scenarios/test_replays.py:210-214`（REPLAY-09 诚实 blocked）；`tests/stage_v/test_synthetic_isolation.py:38` |
| Status | **COMPLETE（候选/诚实降级层）；Interaction Session 后端=EXTERNAL_BLOCKED（无真实设备事件）** |
| Action | 无（PILOT 前不引入无设备的合成会话，防止伪功能） |

## 9. Today 状态载体（State Carrier）

| 字段 | 内容 |
|---|---|
| Requirement | 状态围绕个体 3D 形象组织（饮水/活动/睡眠/体重/任务/注意点）；Personal Baseline 而非医疗诊断 |
| v3.1 existed | partial（Today 功能 Dashboard + daily baseline 域） |
| v3.3 added-or-changed | 状态围绕“个体”组织；基线差 delta=freshness |
| Current implementation | NowCard（真事实）/ChangeCard（自比基线，明示非医疗）/AttentionCard（值得注意→查看依据）/ActionCard（快速记录）；overlay 端点输出 metric+baseline_range+delta+freshness |
| Code evidence | `apps/web/app/_components/today/{NowCard,ChangeCard,AttentionCard,ActionCard}.tsx`；`services/api/app/api/routes/visual_overlay.py:22`；`apps/mobile/src/screens/today.ts` |
| Test evidence | `tests/e2e-browser/specs/stage-v-visual.spec.ts:22`；`tests/scenarios/test_replays.py:216-219` |
| Status | **COMPLETE**（“围绕 3D 形象”= 3D 渲染依赖，EXTERNAL_BLOCKED） |
| Action | 无 |

## 10. Timeline × 3D（Timeline 与 3D 联动）

| 字段 | 内容 |
|---|---|
| Requirement | 3D 形象做时间锚点：点击日期→那一天的它；禁止用当前 3D 外观伪造过去；Time Scrubber |
| v3.1 existed | Y（生命时间线已存在） |
| v3.3 added-or-changed | DayBack 卡片 + 当日激活版本 + 诚实性约束 + 3D 视图内时间轴 |
| Current implementation | Timeline 取 visual-models 并列 DayBackCard（按 activated_at 过滤、provenance_kind 标注、明确“非当日外观伪造”文案） |
| Code evidence | `apps/web/app/timeline/page.tsx:26-27,70`；`apps/web/app/_components/timeline/DayBackCard.tsx:10-29`、`constants.ts` |
| Test evidence | `tests/e2e-browser/specs/stage-h2-3d.spec.ts:5,9-11`（场景与诚实性规则） |
| Status | **COMPLETE（DayBack 已实现）；Time Scrubber=EXTERNAL_BLOCKED（随 3D Viewer）** |
| Action | 无 |

## 11. Contextual Explain（情境化解释）

| 字段 | 内容 |
|---|---|
| Requirement | Assistant 嵌入 Living Canvas 做情境解释；Explain Sheet 四要素（事实/与它自己相比/推断/不确定/下一步）；[为什么] 入口；不编造 |
| v3.1 existed | partial（Ask/Brief/Find/Plan/Explain 已有） |
| v3.3 added-or-changed | 四段式 Explain Sheet + 情境入口（AttentionCard→/agent?tab=explain&ctx=…） |
| Current implementation | **本轮补齐**：ExplainPanel 实现四段式模板（事实/Personal Baseline/推断与不确定/下一步），AI 未接入时推断段显式 NOT_AVAILABLE，仅列确定性规则结论；点击入口从 AttentionCard 直达 |
| Code evidence | `apps/web/app/agent/_components/ExplainPanel.tsx`；`apps/web/app/agent/page.tsx:113`；`apps/web/app/_components/today/AttentionCard.tsx:23-30`；i18n `apps/web/lib/i18n_zh_cn.ts` |
| Test evidence | `tests/v02/test_social_search_platform.py:125-135`（/ask 后端）；Explain 面板 UI 由视觉回归基线与 web vitest 覆盖 |
| Status | **COMPLETE**（后端 /ask 已有；四段式面板本轮实现；无独立 AI 时保持诚实 NOT_AVAILABLE） |
| Action | 无 |

---

## 汇总

| 主题 | v3.1 | v3.3 | Status |
|---|---|---|---|
| Living Canvas | N | 新增 | COMPLETE（3D 主焦点=EXTERNAL_BLOCKED） |
| Pet Living Model | N | 新增 | COMPLETE（L2/L3 生成=EXTERNAL_BLOCKED） |
| 3D Life View | N | 新增 | COMPLETE（交互 Viewer=EXTERNAL_BLOCKED） |
| 3D Capture | N | 新增 | COMPLETE |
| 3D Versioning | N | 新增 | COMPLETE |
| 3D Provenance | N | 新增 | COMPLETE |
| 3D Fallback | N | 新增 | COMPLETE |
| Companion integration | partial | Presence 定位 | COMPLETE（设备 Interaction Session=EXTERNAL_BLOCKED） |
| Today state carrier | partial | 个体状态组织 | COMPLETE（3D 呈现=EXTERNAL_BLOCKED） |
| Timeline×3D | Y | DayBack | COMPLETE（Time Scrubber=EXTERNAL_BLOCKED） |
| Contextual Explain | partial | 四段式 | COMPLETE（本轮补齐 UI 模板） |

```text
V3_3_MISSING_CRITICAL = 0
```

判定口径（与 AGENTS.md / 契约一致）：
1. **不扩 Scope 原则**：本轮未新增业务域、未新增 Feature ID、未进入 Stage I/v1.3/Future 42。
2. **EXTERNAL_BLOCKED 不是缺失**：真实 3D 生成/交互渲染（L2 Viewer、Time Scrubber）、
   真实设备事件（Companion Interaction Session）在无真实 Provider/设备前保持诚实 blocked，
   不写伪实现（AGENTS.md §22/§23/§47）。
3. 本轮实际补齐项（不扩 Scope 的 UI 收口）：LifeViewCard 整卡可点击进入生命视图
   （v3.3 §34.2 点击入口）、ExplainPanel 四段式 Explain Sheet（v3.3 §34.5）；
   两处均无新后端/新依赖/新 Feature ID。
4. 所有 COMPLETE 项均有代码证据 + 测试证据（契约/单元/场景/e2e/视觉基线）。