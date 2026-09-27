# PET_TWIN_ARCHITECTURE

> 总 Goal §9/§13/§14/§75。2026-09-28。

## 1. 定位

Pet Living Model（PLM）是横切表现层，不是新事实源。分层：

```text
Fact Layer      Event / Observation / Outcome / Provenance
Inference Layer Inference / AI Summary / Change Signal
Presentation   3D Identity + State Overlay + Timeline Memory + Companion Presence
```

表现层永不反向生成事实。Owner 文案用「3D 形象 / 生命视图 / 看看它 / 回到那一天」，内部以
Pet Twin / PLM 命名。

## 2. 数据模型（后端）

- `PetVisualCapture`：素材采集（artifact_ids + coverage 角度覆盖 + QC 结果 + privacy scan）。
- `PetVisualModel`：版本化候选模型（geometry/texture/rig version、`observed_surface_manifest`
  /`inferred_surface_manifest`、owner_verified、identity_qc、provenance_kind=GENERATED_3D、artifact_map）。
- `PetVisualRenderManifest`：活动模型的渲染目标（poster/low/interactive/turntable + LOD/fallback policy）。
- `PetVisualJob`：异步生成任务（QUEUED→GENERATING→READY/FAILED/CANCELLED，progress、attempts、
  error_reason、idempotency_key）。

状态机：`UPLOADED→QC→∞→GENERATING→READY(OWNER_REVIEW)→VERIFYING→ACTIVE | REJECTED | RETIRED | FAILED`。
「不像（not_like）」不得自动激活；激活先停用旧 ACTIVE。

## 3. Provider 抽象（adapter）

`app/adapters/visual_provider.py` 定义 `VisualProvider`（generate/status/cancel/artifacts/metadata）：

- `TemplateLocalProvider`（默认，`real=False`）：仓内确定性管线 — 参数化模板族（dog/corgi、spitz、
  retriever、shepherd、short_leg、brachycephalic、toy、sighthound；cat/standard、long_hair、
  short_leg、slender）+ 真实照片纹理投影（OBSERVED）+ 模板补全（INFERRED）+ 版本元数据 + 渲染描述符。
- `SandboxProvider` / `ExternalBlockedProvider`：诚实失败/阻断路径（PILOT 无同意等场景）。
- 真实生成式 Provider（TRELLIS/Hunyuan3D/SAM2…）仅作为未来接入候选，**一律
  `REAL_3D_PROVIDER=EXTERNAL_BLOCKED`**；`provider_status()` 同时报告
  `generative_status=EXTERNAL_BLOCKED` 与 `local_pipeline=READY`。

## 4. 客户端渲染（packages/pet-3d）

- 同一 `@pli/pet-3d` 程序化场景（three.js）作为唯一共享资产注册表（豆豆=spitz/corgi、咪咪=cat）。
- Web：`components/three/pet3d-viewer.tsx`（rotate/zoom/reset/LOD 能力；reduced-motion 冻结漂移）。
- Mobile：WebView 承载自包含 `pet-stage.html`（同场景，拖拽/捏合/按钮；postMessage 上报状态）。
- 降级链：interactive 3D → 2.5D/photo → species fallback（显式标注）；3D 永不成为核心健康/安全动作单点依赖。

## 5. 状态 Truth Model（§24）

- AMBIENT：中性 idle/微小 weight shift（数字存在感，不表达情绪）。
- REPRESENTATIVE：由已记录事件驱动的视觉表示（如刚记录散步→walk 动作；带 source/confidence/updated_at）。
- OBSERVED：仅真实 Camera/视频/人工确认可表示「它此刻真的在…」。
- 健康推断不得驱动病态姿势。

## 6. 隐私 / 溯源（§61）

- 素材 EXIF 清洗、人脸/背景策略、删除/重建/停用、source artifact 关联、provenance；
- 候选模型为 GENERATED_3D（presentation），绝不写入 Observation/Event 事实层。