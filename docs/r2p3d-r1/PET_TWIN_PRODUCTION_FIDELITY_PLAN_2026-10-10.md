# PLI Pet Twin — Production Fidelity Plan（2026-10-10）

> Authority: v3.4-R1 §35–§38 的实现补充；不替代产品母版。  
> Status: **DESIGN CLOSED / EXTERNAL PRODUCTION PROVIDER NOT YET CONFIGURED**.  
> Truth: `REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED`.  
> UI evidence rule: `HUMAN_VISUAL_ACCEPTANCE = PENDING` until the owner reviews fresh runtime evidence.

## 1. 为什么需要这次收口

仓内 `template_local` 已经证明 Capture → candidate → review → activate → runtime
这条产品链可以工作，也证明 provenance、版本、动作、LOD、回退和主人确认能闭环。

但它不能证明：

- 生成的是用户自己的高保真宠物；
- 面部、耳形、身体比例、毛发与独特花纹达到身份级相似；
- demo Corgi / Cat 的模板质量代表最终生产质量。

因此从本文件开始：

`LOCAL_TEMPLATE_PIPELINE = READY`  
≠ `INDIVIDUAL_HIGH_FIDELITY_TWIN = READY`.

旧文档中的 `STANDARD_INDIVIDUAL_TWIN_PIPELINE = PASS` 只能解释为“确定性模板产品链已闭环”，
不得再解释为“真实个体高保真已完成”。

## 2. 两条并行 Track

### Track A — Template / Offline / Demo

用途：

- demo；
- 无外部 Provider 时的产品流程验证；
- 低资源 fallback；
- provenance / versioning / review / motion / runtime QA。

组成：

`template family → morph heuristic → region color projection → PLI rig/motion → GLB runtime`

强制标记：

- `provider.real = false`
- `local_candidate_fidelity = TEMPLATE_PROVISIONAL`
- 不得用“真实扫描 / 高保真个体 / 已复刻”等 Owner 文案。

### Track B — Individual Fidelity / Production Candidate

目标：

`real owner media → identity-bearing appearance → rigged interactive Twin`

推荐职责拆分：

1. Capture & Media QC
2. Appearance Reconstruction
3. Identity / Geometry / Surface Gate
4. Rig & Skin
5. PLI Motion Retarget
6. Runtime LOD Packaging
7. Owner Review
8. Activation / Versioning / Incremental Refinement

## 3. 推荐生产链

```text
Owner Photos / Optional Video
  ↓
Capture QC
  - required angles
  - blur / exposure / occlusion
  - source ownership / consent
  ↓
Segmentation / subject isolation
  ↓
Appearance Reconstruction
  - preferred candidate: TRELLIS.2 class high-fidelity image→3D
  - output must contain textured/PBR geometry
  ↓
Identity Gate
  - multi-view reprojection consistency
  - silhouette / landmark / coat-region checks
  - OBSERVED vs INFERRED surface manifest
  - no machine score may self-activate
  ↓
Rigging
  - preferred candidate: UniRig class automatic skeleton + skinning
  - quadruped topology/weight QA
  ↓
PLI Motion Layer
  - Idle / Stand / Walk / Run / Eat / Drink / Sit / Sleep...
  - true-model semantics remain AMBIENT / REPRESENTATIVE / OBSERVED
  ↓
Dual Runtime Packaging
  - review/master representation
  - interactive GLB
  - low LOD
  - poster / owner photo fallback
  ↓
Owner Review
  - 很像 / 基本像 / 不像
  - front / side / back + zoom
  - negative feedback never activates
  ↓
ACTIVE Twin
```

## 4. Provider 结论（截至 2026-10-10）

### TRELLIS.2

官方仓库当前明确：

- high-fidelity image-to-3D；
- 512³–1536³；
- Base Color / Roughness / Metallic / Opacity 等 PBR surface attributes；
- GLB export；
- Linux；
- NVIDIA GPU ≥24GB；
- model and code under MIT，依赖仍需逐项审计。

因此它适合 **server/cloud reconstruction candidate**，不适合要求用户当前
Windows + 16GB 主机强行本机运行。

Research source:
https://github.com/microsoft/TRELLIS.2

### UniRig

当前公开实现提供：

- skeleton prediction；
- per-vertex skinning prediction；
- 面向 humans / animals / objects 的统一 rigging 方向；
- current release 已公开 skeleton + skinning code/checkpoint；
- repository license = MIT。

它适合作为 **重建后的独立 Rig 阶段候选**，而不是外观重建器。

Research source:
https://github.com/Seed3D/UniRig
（如官方组织/仓库迁移，以论文与官方发布页复核为准。）

### Hunyuan3D-2.1

能力层面可做 image-to-3D + PBR，但其许可不是本项目此刻默认商业主链的无条件 MIT 路径。
因此继续保留 benchmark / alternate provider 位置，不写死为默认 production provider。

Research source:
https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1

## 5. Provider 接入契约

任何 Track B Provider 在注册为 `real=True` 前必须同时满足：

- license audit = PASS；
- deployment/privacy design = PASS；
- owner-media retention/deletion policy = PASS；
- input media provenance = known；
- result artifacts have immutable hashes；
- PBR/geometry QA = PASS；
- rig QA = PASS or explicit static-only state；
- multi-view identity QA = recorded；
- Owner Review remains mandatory；
- negative review cannot activate；
- source regions remain OBSERVED/INFERRED；
- provider/model internals do not dominate Owner UI。

Provider 成功只表示“生成任务真实执行”，**不表示宠物身份相似通过**。

## 6. Quality Gates

### G0 — Capture
Required views are present; obvious unusable frames fail early.

### G1 — Reconstruction
A real non-template output artifact exists with geometry + material provenance.

### G2 — Geometry
No catastrophic holes/self-intersections that break owner-facing review; bounds and orientation valid.

### G3 — Surface
PBR/base texture readable; coat/marking provenance retained; no template-default region presented as observed.

### G4 — Identity
Cross-view geometry/surface consistency recorded. Automatic score may reject obvious failure but may never auto-approve identity.

### G5 — Rig
Skeleton hierarchy and skin weights pass deformation QA for mandatory poses.

### G6 — Runtime
Interactive GLB and low LOD load on supported Web/Android surfaces within target memory/frame budgets.

### G7 — Owner Review
Only `like` / `basic_like` may proceed to activation. `not_like` persists issue categories and keeps prior active Twin.

### G8 — Fresh Visual Evidence
Fresh screenshot/contact-sheet evidence must be from the exact final source SHA. Machine evidence cannot set Human Visual Acceptance PASS.

## 7. Dual Representation

Do not force the review-quality asset and mobile interactive asset to be identical byte-for-byte.

Recommended manifest:

```json
{
  "review_master": "high-fidelity PBR representation",
  "interactive": "rigged GLB",
  "low": "decimated/texture-reduced GLB",
  "poster": "owner media or verified render",
  "fallback": "real owner photo"
}
```

Identity/provenance belongs to the **Twin version**, not to one renderer file.

## 8. Incremental Refinement

New owner media creates a new candidate version.

Never silently mutate ACTIVE bytes in place:

`ACTIVE v3 → new capture → candidate v4 → review → activate v4 → retire v3`.

Owner “不像” feedback should become structured refinement input:

- face
- ear
- coat
- pattern
- body
- tail
- legs
- unique marks

but is not a training-consent grant.

## 9. Runtime visual language

High-fidelity does not mean cyberpunk.

Owner surfaces continue to use Warm Living Intelligence:

- cream / beige living field；
- transparent/integrated 3D canvas；
- soft daylight；
- grounded contact shadow；
- restrained warm projection footprint；
- no blue wireframe；
- no neon HUD；
- no black viewer card。

Twin Review remains neutral identity studio.

## 10. Current truth table

| Capability | Current status |
|---|---|
| Capture / review / versioning / activation | READY |
| Template-local candidate pipeline | READY |
| Web + Android real 3D runtime | READY |
| PLI rig/motion layer | READY for current demo/template assets |
| Owner photo fallback | READY |
| High-fidelity real-pet reconstruction provider | **NOT YET CONFIGURED** |
| Automatic production rigging provider | **NOT YET CONFIGURED** |
| Real pet identity validation | **NOT YET OBSERVED** |
| Human visual acceptance | **PENDING** |

## 11. Release rule

PR #2 may continue to collect implementation and runtime evidence, but until explicit user approval:

- do not merge to main；
- do not promote a new approved visual baseline；
- do not publish a stable release；
- do not turn `TEMPLATE_PROVISIONAL` into a “high-fidelity” marketing label；
- do not set `HUMAN_VISUAL_ACCEPTANCE = PASS`.
