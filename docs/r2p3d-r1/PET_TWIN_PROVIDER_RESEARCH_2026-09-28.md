# R2P3D-R1 — Pet Twin Provider Research (2026-09-28)

> 本轮外部研究结论与本地策略。与 `docs/r2p3d/PET_TWIN_PROVIDER_MATRIX.md`
> 和 `docs/r2p3d/PET_TWIN_MODEL_LICENSE_AUDIT.md` 衔接；本文档面向 R2P3D-R1
> 决策：**零外部模型权重下载**（用户批准的战略），把「个体 Pet Twin」用
> 仓内可商用确定性管线（模板族 + Morph 参数 + 真实媒体纹理投影）做成产品。

> **2026-10-10 superseding fidelity note**：本文件的“最终生产候选”仅代表
> 2026-09-28 零下载阶段的可运行主路径，不再代表“真实个体高保真已完成”。
> `template_local` 的当前分类为 `TEMPLATE_PROVISIONAL`；真实个体高保真状态为
> `NOT_YET_QUALIFIED`。新的生产候选拆为 TRELLIS.2 类外观重建 +
> SkinTokens/TokenRig 类自动 Rig，均尚未配置。权威补充见
> `PET_TWIN_PRODUCTION_FIDELITY_PLAN_2026-10-10.md`。

## 1. 结论分类法

- **研究参考**: 只读方法启发，不进入本机运行/生产链。
- **本机可运行候选**: 硬件/OS 允许，但本轮因零下载策略不取权重。
- **许可证可用于产品的候选**: license 允许商用且可再分发。
- **最终生产候选**: 本轮实际采用。

## 2. 逐 Provider 研究结论

| Provider | 研究定位 | 本机可行性 | License 结论 | 本轮决策 |
|---|---|---|---|---|
| **SAM2** | 图片/视频分割、首帧 prompt、跨帧 mask 传播 (Apache-2.0 官方权重) | RTX 4060 Ti 16GB 可跑；需下载 checkpoint | Apache-2.0 官方代码/权重；衡量标准允许 | `SKIP_BY_POLICY`（用户零下载决策）。保留 `SegmentationProvider` 接口 + 确定性 fallback |
| **SPAR3D** | Instant Preview（单/双图→GLB，point-aware backside） | Windows experimental；默认≈10.5GB、low≈7GB VRAM；本机 16GB 边界可试 | Stability Community License 有商业条件，须先 license audit | `SKIP_BY_POLICY`（零下载）；文档记为本机最有价值的未来 Preview 候选 |
| **SF3D (Stable Fast 3D)** | 单图快速 3D（~0.5s 量级、≈7GB VRAM、GLB/UV/materials） | 本机可行 | Community License 有商业阈值/注册要求 | `SKIP_BY_POLICY`（零下载）；benchmark/optional 候选，不设默认生产底座 |
| **Hunyuan3D-2.1** | Shape≈10GB / Texture≈21GB / 全链≈29GB VRAM | 16GB 主机 Shape 可尝试，完整 PBR 不应强跑 | 自有 Community License：地域/MAU/分发条件 | `SKIP_BY_POLICY` + `SKIP_BY_HARDWARE`（16GB）；仅 isolated benchmark，绝不默认 |
| **TRELLIS.2** | 高保真重建（Spatial VAE） | 官方要求 Linux + ≥24GB VRAM；本机 Windows+16GB 不满足 | MIT 代码；权重条款建议复核 | `SKIP_BY_HARDWARE`（本机不满足）+ `SKIP_BY_POLICY` |
| **BITE** | 参数化狗模型（skeleton/形状拟合） | 公开实现受研究许可 | non-commercial scientific research license | `BLOCKED_BY_LICENSE`（不得打进产品）；**方法参考**：参数化动物形体/统一 topology/skeleton/shape fitting |
| **AnimalAvatar** | casual video 可动画动物重建 | 依赖 SMAL/BITE 外部数据 | 研究依赖强 | `BLOCKED_BY_LICENSE`（依赖 BITE/SMAL 受限资产）；**方法参考** |
| **SMAL 依赖** | 参数化动物主体 | 外部数据 | Research-only | `BLOCKED_BY_LICENSE`；不直接使用 |
| **DeepLabCut** | 动物 pose/tracking（SuperAnimal） | 可跑 | SuperAnimal 模型研究限制 | `RESEARCH_ONLY`，不默认 production dependency |
| **仓内 `packages/pet-3d` 程序化模板族** | 自有模板（corgi/standard dog/cat） | ✓ | **MIT（本仓自有）** | ✅ **最终生产候选（本轮主路径）** |
| **仓内确定性 2D 媒体管线（PIL/numpy-free heuristic）** | 从 demo 媒体做 frame selection / mask / morph / texture projection | ✓ | 本仓自研 | ✅ **最终生产候选（本轮主路径）** |

## 3. 本机最终分层（本轮）

```text
Track A — Instant Preview:
  template_local（确定性模板 + 真实媒体纹理投影预览）  ← 已实现/增强
  SPAR3D        → SKIP_BY_POLICY（零下载；未来候选）
  SF3D          → SKIP_BY_POLICY（零下载;benchmark 候选）

Track B — Stable Individual Interactive Twin:
  PLI 自有 Template Family（corgi-like / standard dog / cat）
  + Morph 参数（§29 17 字段，从媒体 silhouette + owner 元数据拟合）
  + 多视图真实媒体纹理投影（OBSERVED/INFERRED 表面清单）
  + 确定性 rig + 动作层（AMBIENT/REPRESENTATIVE/OBSERVED）
  ↑ 允许零权重达成产品闭环的铁律：observed surface > generated prior
```

## 4. 为什么零下载仍能达成 Goal

Goal 的核心不是「换一个更强的 image-to-3D 模型」，而是「Individual Pet Twin
System：快、像、可动画、可修正、可版本化、有来源、本机可跑、不污染用户电脑」。
这可由确定性模板 + Morph + 真实媒体纹理投影达成：
- **像**：真实照片/视频投影的 coat/pattern/unique_marks + Morph 形状拟合 + Owner 三档核验；
- **可动画**：仓内骨骼层次 + 12 个动作 clip（非整模浮动）；
- **可信**：OBSERVED/INFERRED 分离 + 版本化 + provenance（GENERATED_3D/DEMO_SYNTHETIC）。

外部大模型线保持 `NOT_AVAILABLE`（政策）并记录，不为它阻塞本轮其余工作（Goal §95）。

## 5. 未来接入条件（记录，不在本轮执行）

1. 用户批准权重下载（>5GB 必须人审）。
2. 完成 license audit 通过（SPAR3D/SF3D 商业条件 / Hunyuan 地域-MAU / 权重条款复核）。
3. 在 `VisualProvider` 边界注册（feature-flag），`real=True` 前 UI 不得声称真实生成。