# PET_TWIN_PROVIDER_MATRIX

> Provider / 能力矩阵。原始矩阵建立于 2026-09-28；本页已按 2026-10-10
> Fidelity 收口更新。产品母版仍是 v3.4-R1；本页只负责 Provider truth。

| 能力 | 当前已实现主路径 | 生产候选 / 备选 | 当前状态 |
|---|---|---|---|
| Capture/采集 | Owner Capture Wizard（多角度覆盖 + QC + provenance） | 真实相机/相册 owner media | 产品机制 READY；真实个体样本验收仍未完成 |
| QC | 确定性覆盖门 + blur/exposure/occlusion 检查 | 可插拔 segmentation / identity QA | READY for deterministic gate；视觉模型不得自行批准身份 |
| 分割/主体隔离 | 确定性 heuristic | SAM2 等可插拔 Provider | 当前 fallback READY；production provider 未配置 |
| 外观重建 | `template_local` 模板族 + Morph + 区域颜色投影 | **TRELLIS.2 class** high-fidelity PBR reconstruction；Hunyuan3D 等隔离 benchmark | `template_local=TEMPLATE_PROVISIONAL`；`INDIVIDUAL_HIGH_FIDELITY=NOT_YET_QUALIFIED` |
| Surface/纹理 | OBSERVED / INFERRED surface manifest | TRELLIS.2 PBR / future texture refiners | provenance contract READY；真实个体 fidelity 未验收 |
| Rig/Skin | 当前 demo/template 自有 `rig-anim-v1` | **SkinTokens/TokenRig** preferred；UniRig predecessor/reference | current template motion READY；production auto-rig NOT_YET_CONFIGURED |
| Motion | PLI AMBIENT / REPRESENTATIVE / OBSERVED 动作语义 | Provider rig → PLI motion retarget | motion semantics READY；production deformation QA 待真实资产 |
| LOD | poster → low → interactive → fallback policy | review master + rigged GLB + low GLB + real photo | 架构 READY；real production artifacts 未生成 |
| 渲染运行时 | WebGL(web) + WebView(mobile) 同 scene/runtime manifest | 同上 | runtime READY；不得把 runtime READY 等同 identity fidelity READY |
| Owner Review | 很像 / 基本像 / 不像；不像不可激活 | same gate for every provider | READY；仍是身份激活最终门 |
| Real pet identity validation | — | fresh real owner media + production candidate | **NOT_YET_OBSERVED** |
| Human visual acceptance | — | fresh exact-SHA runtime evidence + owner review | **PENDING** |

## Provider selection truth

当前推荐的生产职责拆分：

```text
owner media
  → capture/QC
  → high-fidelity appearance reconstruction (TRELLIS.2 class)
  → identity + geometry + surface gates
  → auto rig/skin (SkinTokens / TokenRig preferred; UniRig reference)
  → PLI motion retarget
  → review master + interactive/low LOD
  → owner review
  → activate/version/retire
```

这只是 **production candidate architecture**，不是已接通的 Provider。仓内
`get_provider()` 当前默认仍是 `TemplateLocalProvider(real=False)`。

## 切换规则

任何新 Provider 必须：

1. 通过 license / checkpoint / dependency / data provenance 审计；
2. 通过 privacy / retention / deletion 设计；
3. 实现 Provider contract 与 immutable artifact metadata；
4. 真实运行并留下 benchmark 与 QA 证据；
5. 不把模型自动分数作为 Owner 身份批准；
6. 在 `real=True` 且真实任务成功前，Owner UI 不得声称真实生成；
7. 即使 `real=True`，也只有主人确认后才能将 candidate 激活为个体 Twin。

详细权威补充：
`docs/r2p3d-r1/PET_TWIN_PRODUCTION_FIDELITY_PLAN_2026-10-10.md`。
