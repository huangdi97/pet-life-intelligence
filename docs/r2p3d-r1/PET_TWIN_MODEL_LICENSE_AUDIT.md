# PET_TWIN_MODEL_LICENSE_AUDIT — R2P3D-R1

> 审查对象：所有 3D Pet Twin 候选模型/资产/动画的许可证（R2P3D-R1 §101）。
> 状态：2026-09-28。**结论先行：本轮零外部模型权重下载，主路径全部仓内自研
> （MIT），不存在未授权商业分发风险；受限 License 候选一律 `BLOCKED_BY_LICENSE` /
> `SKIP_BY_POLICY`，只做方法参考，绝不打包进产品。**
> 铁律：**「GitHub 开源」≠「可商用 / 可再分发」**。

## 1. 候选模型许可证逐项审计

| 候选 | 用途 | License 已知状态 | 可商用/可再分发 | 本轮处置 |
|---|---|---|---|---|
| SAM2 | 分割/追踪（图片+视频） | Apache-2.0（官方代码/权重条款按官方标准评估） | 一般可商用（接入前复核最新权重条款） | `SKIP_BY_POLICY`（零下载）；预留 SegmentationProvider 接口 + 确定性 fallback |
| SPAR3D | Instant Preview（单/双图 → GLB） | Stability Community License（含商业使用条件；Windows experimental） | 有商业条件，须逐版本复核 | `SKIP_BY_POLICY`（零下载）；文档记读为未来 Preview 候选；不默认生产 |
| SF3D (Stable Fast 3D) | 单图快速 3D | Stability Community License（商业阈值/注册要求） | 有条件 | `SKIP_BY_POLICY`（零下载）；benchmark 候选 |
| Hunyuan3D-2.1 | 生成式重建（Shape/Texture） | 腾讯自有 Community License：地域限制/MAU/分发要求 | 有条件且地域限制 | `BLOCKED_BY_LICENSE`（本轮全球产品语境）+ `SKIP_BY_HARDWARE`（16GB VRAM）；仅 isolated benchmark 在条件允许时 |
| TRELLIS / TRELLIS.2 | 高保真重建 | MIT（代码）；权重条款建议复核 | 有版本差异 | `SKIP_BY_HARDWARE`（≥24GB VRAM 要求；本机 16GB 不满足）+ `SKIP_BY_POLICY` |
| BITE | 参数化 dog 模型 | non-commercial scientific research license | ❌ 禁止商业打包 | `BLOCKED_BY_LICENSE`；方法参考（统一 topology/skeleton/shape fitting） |
| SMAL / SMAL deps | 参数化动物主体 | research-only（依赖外部数据） | ❌ | `BLOCKED_BY_LICENSE`；不使用 |
| AnimalAvatar | casual video 可动画重建 | 依赖 SMAL/BITE 受限资产 | ❌ | `BLOCKED_BY_LICENSE`（依赖受限资产）；方法参考 |
| DeepLabCut | 动物 pose/tracking | SuperAnimal 模型研究用途限制 | ❌ 默认生产 | `RESEARCH_ONLY`（可选 internal benchmark，不默认） |
| Mixamo / Sketchfab / 第三方宠物动作资产 | 动画来源 | 许可不一；Mixamo 非标准导出风险 | 逐项核实 | **本轮不使用**；动作全部仓内程序化自写（见 §3） |

## 2. 仓内自有资产（MIT，可商用可再分发）

| 资产 | License | 说明 |
|---|---|---|
| `packages/pet-3d` 程序化模板族 + morph + rig + 动作 | MIT（本仓） | 构图、材质板、骨骼层次、动画参数全部由本仓代码生成 |
| 确定性 2D 媒体管线（frame select / mask / morph fit / texture projection） | MIT（本仓） | 无外部权重依赖 |
| Demo 宠物媒体（生成式 demo fixture） | 本仓生成，`DEMO_SYNTHETIC` | 非真实宠物照片；用于 pipeline/UI/rig/version 测试 |

## 3. 动作（Animation）来源合规

- 所有动作（Idle/Stand/Sit/Lie/Sleep/Walk/Run/Eat/Drink/Play/Sniff/Stretch）由
  本仓 `packages/pet-3d` 程序化定义（骨骼旋转关键帧），**无第三方动画资产**。
- 不引入来历不明的 Sketchfab/Mixamo 动画。
- 动画 manifest 记录每个 clip 的名称/时长/来源（self-authored）。

## 4. 决策记录与门禁

1. 不引入第三方权重/3D/动画资产到 Release。
2. 任何真实生成式 Provider 接入必须：过本表 → Provider Matrix 注册 →
   adapter 边界切换 → `provider.real=True` 前 UI 不得声称真实生成。
3. 未来若采购外部宠物资产/动画，必须在 release notes + provenance 记录
   license 与来源；禁止「默认可商用」。
4. 本轮 `REAL_3D_PROVIDER` 细粒度状态见 `R2P3D_R1_FINAL_REPORT.md`：
   `LOCAL_PREVIEW_PROVIDER`/`STANDARD_INDIVIDUAL_TWIN_PIPELINE`/
   `PRODUCTION_3D_PROVIDER` 诚实标注。

## 5. 与既有审计的衔接

本文档扩展并取代 `docs/r2p3d/PET_TWIN_MODEL_LICENSE_AUDIT.md` 中的候选表
（该表保持历史记录）。新决策以本文档为准。