# PET_LIVING_MODEL_IDENTITY_QA — 3D 身份核验

> 日期：2026-09-20 · 阶段：Stage H.2（GOAL PHASE G/O6）

## 1. 身份核验流程（已实现 + contract 测试）

- 主人选择：像 / 基本像 / 不像（result: like | basic_like | not_like）。
- 问题类型：脸不像/耳朵不对/毛色不对/花纹不对/体型不对/尾巴不对/四肢不对/其他。
- **Active Model Rule：不像不能默认 active**（activate 校验 owner_verified，contract 测试 test_verify_not_like_cannot_activate）。

## 2. 版本化（PetVisualModel）

version / source_artifact_ids / provider / provider_model_version / geometry_version / texture_version / rig_version / owner_verified / identity_qc / created_at / activated_at / retired_at —— 全部落库（migration 21b4b571112a）。

## 3. 身份核验矩阵（O6 自动/人工）

| 属性 | 状态 |
|---|---|
| Face / Ear / Coat / Pattern / Body / Tail / Legs / Unique marks | identity_qc.issues 记录；人工确认后写入 |
| OWNER_IDENTITY_VALIDATION | **NOT_YET_OBSERVED**（真实 owner 未参与；不伪造） |

## 4. 结论

**PET_LIVING_MODEL_IDENTITY_FLOW: PASS（流程+规则+测试）；OWNER_IDENTITY_VALIDATION = NOT_YET_OBSERVED**
