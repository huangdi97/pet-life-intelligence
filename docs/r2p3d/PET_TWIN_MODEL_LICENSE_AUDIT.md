# PET_TWIN_MODEL_LICENSE_AUDIT

> 责任项：总 Goal §62。审查为 3D Pet Twin 相关候选模型/资产的许可证。最新，2026-09-28。
> 结论先行：本轮主路径 = 仓内自研程序化模板（无外部权重分发），因此**不存在未授权商业分发风险**；
> 真实生成式 Provider（权重）全部处于 `REAL_3D_PROVIDER = EXTERNAL_BLOCKED`，未在产物中打包任何受限权重。
> 关键规则：**「GitHub 开源」不等于「可商用 / 可再分发」**。下表逐项记录。

| 候选 | 需评估的目标 | License（已知） | 商业化 | 权重 / 再分发 | 出处 / 建议 |
|---|---|---|---|---|---|
| SAM / SAM2（分割） | 影像分隔提供者可选项 | Apache-2.0（SAM）/ 见官方（SAM2 使用条款） | 一般可商用（需复核最新权重条款） | 权重再分发受其license约束 | `REAL_3D_PROVIDER=EXTERNAL_BLOCKED`；接入时须在 Provider 边界依据正式条款评审后方可启用 |
| Stable Fast 3D（通用图→3D） | Instant Preview / 几何先验 | License（Stability-AI，非商用/或 Research，视版本） | 需逐版本核实 | 权重下载/再分发受限 | 不打包；仅作为 Provider 选型候选，接入前完成 license 评审 |
| TRELLIS / TRELLIS.2 | 高保真重建 | MIT/研究（TRELLIS.2 权重条款建议复核） | 有版本差异 | 权重再分发受限 | 仅作候选；采购/接入走 Provider Matrix + license 门 |
| Hunyuan3D-2.1 | 生成式重建 | 其官方 license（Tencent，条款需复核） | 需复核 | 受限 | 不打包 |
| SMAL / SMAL-like（参数化动物模型） | 几何先验 | **研究用途（research-only）为已知风险** | ❌ 禁止直接商业打包 | ❌ | 仅借鉴方法（方案已记录「只借鉴方法，不分发」）；采用**自有模板** |
| 动物/宠物 3D 资产（模型库） | 直接资产 | CC / 商业授权不一 | 逐项核实 | 逐项核实 | 若购入，必须在发布说明中列出 license/provenance |
| 动画资产 | 骨骼动画 | 同上 | 同上 | 同上 | 本版本用程序化/自写姿态，不依赖第三方动画资产 |
| 本仓自研 `packages/pet-3d`（程序化模板 + 材质板） | 当前主路径 | MIT（本仓自有） | ✓ 可商用 | ✓ 可再分发 | 由本仓生成，无外部限制；截图资产标 `DEMO/SYNTHETIC dev-only` |

**决策记录**
- 本轮不引入第三方模型权重/3D 资产；`packages/pet-3d` 程序化模板为自研（MIT），满足「可商用模板」要求。
- 任何真实生成式 Provider 接入必须：先过本表 → Provider Matrix 注册 → 在 adapter 边界切换，且 `provider.real` 保持诚实（False 时 UI 不得声称真实）。
- 若未来采购外部宠物资产，必须在 `PET_TWIN_PROVENANCE.md` / release notes 记录其 license 与来源，禁止默认可商用。