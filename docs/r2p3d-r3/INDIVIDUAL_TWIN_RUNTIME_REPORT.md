# 个体 Twin Runtime 报告 — R2P3D-R3

- Commit：`8e6b9aa`（个体候选接入 web+android）+ `da89cf7`/`d09702e`（identity 门禁适配）
- 管线：真实 API（capture → `visual-models` 生成（`template_local`）→ `verify` → `activate`）

## 当前 ACTIVE 状态（DB 实时）

| 宠物 | id | version | 状态 | family | observed regions | coverage | owner_verified |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 豆豆 | `0070551c-8634-42b1-a361-81a635b66653` | 1 | ACTIVE | corgi-like | coat, ear（photo_projection） | 0.333 | true |
| 咪咪 | `386bfba3-5485-4d4f-90f9-9a775d546259` | 1 | ACTIVE | standard-cat | coat, ear | 2 regions | true |

来源：合成演示素材（`tests/fixtures/media/doudou-demo-dog` / `mimi-demo-cat`，6 视角）。`REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED`。

## Runtime 表现（RUNTIME manifest）

- 渲染 = `procedural-twin`（`createTwinScene`：rig + 原语网格 + 每区域材质），**不是** generic 演示、**不是** 2.5D 回退、**不是** wireframe。
- meshCount=25、skeleton=true、动画 clips 12（Idle…Stretch）。
- `generic=false`、`petId` 匹配、`sourceMediaCount=2`（identity gate 全过）。
- WebView 以 `key = petId:twinVersion` 强制重挂载，避免「twin 迟到被 demo 抢占」。

## 诚实约束

- 合成 manifest 绝不能通过 REAL_3D_PRODUCT_GATE（`manifestOrigin=RUNTIME` 是硬性要求；`SYNTHETIC_FALLBACK_EVIDENCE` 只在 WebGL 失败时出现）。
- generic 演示 twin 不是产品候选（identity.gate 拒绝 `generic=true`）。
- 未硬编码 Twin Review 的 selected 状态（交互真值来自真实点击后的 DOM/a11y）。
