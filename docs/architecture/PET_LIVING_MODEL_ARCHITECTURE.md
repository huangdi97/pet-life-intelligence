# PET_LIVING_MODEL_ARCHITECTURE — Pet Living Model（PLM）数据架构

> 阶段：Stage H.2（GOAL PHASE D）· 日期：2026-09-20 · 状态：DESIGN + BACKEND IMPLEMENTED（provider EXTERNAL_BLOCKED）

## 1. 命名

- 内部：Pet Living Model / PLM / Living Pet Representation
- 用户侧：3D 形象 / 生命视图 / 状态视图 / 此刻 / 看看它 / 和它在一起
- **禁止用户侧主文案「数字孪生」**

## 2. 数据模型（3 张新表，migration 21b4b571112a）

| 表 | 职责 | 关键字段 |
|---|---|---|
| `pet_visual_captures` | 主人采集的原始媒体组（照片/环绕视频） | artifact_ids(JSONB)、capture_type、qc_result、qc_passed、privacy_scan、consent_visual_model_training |
| `pet_visual_models` | 版本化的 3D 表示（按 pet_id+version 唯一） | provider、provider_model_version、geometry/texture/rig_version、status、owner_verified、identity_qc、provenance_kind(GENERATED_3D)、artifact_map |
| `pet_visual_render_manifests` | 已激活模型的渲染目标（LOD 策略） | render_targets、lod_policy、fallback_policy |

## 3. 规则（GOAL D2/I4/L1）

- State Overlay **不复制业务事实**，只引用 Observation / Baseline / Event / Inference。
- 禁止从 3D 外观生成：器官状态、疾病位置、疼痛位置、情绪指数、寿命、疾病概率、治疗效果。
- 生成模型 provenance = `GENERATED_3D`，与 `RECORDED` / `LIVE` 严格区分（用户必须知道看到的是什么）。
- 3D 源媒体默认 NOT FOR GENERAL MODEL TRAINING，除非用户独立授权。

## 4. API（routes/visual.py，prefix /api/v1）

```
POST   /pets/{pet_id}/visual-captures
GET    /pets/{pet_id}/visual-captures/{capture_id}
POST   /pets/{pet_id}/visual-captures/{capture_id}/qc
POST   /pets/{pet_id}/visual-models
GET    /pets/{pet_id}/visual-models
GET    /pets/{pet_id}/visual-models/{version}
POST   /pets/{pet_id}/visual-models/{version}/verify   (like|basic_like|not_like)
POST   /pets/{pet_id}/visual-models/{version}/activate (owner_verified 才可激活)
POST   /pets/{pet_id}/visual-models/{version}/retire
GET    /pets/{pet_id}/visual-model/render-manifest
GET    /pets/{pet_id}/state-overlay
GET    /visual/status                                  (REAL_3D_PROVIDER_EXTERNAL_BLOCKED 诚实报告)
```

## 5. 状态机

capture: UPLOADED → QC_PASSED/QC_FAILED → USED
model:   GENERATING → (sandbox FAILED: REAL_3D_PROVIDER_EXTERNAL_BLOCKED)
         → READY → VERIFYING(owner_verified) → ACTIVE | RETIRED
