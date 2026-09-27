# PET_TWIN_PROVIDER_MATRIX

> Provider / 能力矩阵（诚实状态，2026-09-28）。

| 能力 | 主路径（已实现） | 备选 Provider（未接入） | 状态 |
|---|---|---|---|
| Capture/采集 | Owner Capture Wizard（6 角度覆盖 + QC） | 真实相机/相册上传 | Wizard 已实现；上传=EXTERNAL_BLOCKED（无真实媒体管线） |
| QC | 确定性覆盖门（front+full_body+head）+ 补拍提示 + heuristic 质量标记 | SAM2/视觉模型 | 本轮 QC=通过；AI 视觉=EXTERNAL_BLOCKED |
| 分隔/追踪 | —（启发式） | SAM2 | EXTERNAL_BLOCKED |
| 形状重建 | 仓内参数化模板族（dog/cat 多种 family） | TRELLIS/Hunyuan3D/SMAL-like | 模板=READY；生成式=EXTERNAL_BLOCKED |
| 纹理 | 真实照片纹理投影（OBSERVED manifest） | Stable Fast 3D / TRELLIS | 照片投影逻辑已实现；生成式补全=EXTERNAL_BLOCKED |
| Rig/动画 | `rig-anim-v1`（程序化姿态 setPose） | 外部动画资产 | READY（动作库=基础集） |
| LOD | client policy poster→low→interactive→turntable | — | 架构完成 |
| 渲染运行时 | WebGL(web) + WebView(mobile) 同场景 | — | READY（真实 3D runtime） |

**切换规则**：新 Provider 必须实现 `VisualProvider` 协议 → 过 License Audit 门 → 在
`get_provider()` 注册（feature-flag），且 `real=True` 前 UI 不得声称真实生成。