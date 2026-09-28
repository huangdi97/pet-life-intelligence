# R2P3D-R1 — Pet Twin Provider Benchmark

> 真实本机测量（2026-09-28，RTX 4060 Ti 16GB / Windows 11）。
> 本轮用户决策 = **零外部模型权重下载**，因此外部大模型一律按状态记录
> （NOT_AVAILABLE / SKIP_BY_POLICY / SKIP_BY_HARDWARE / BLOCKED_BY_LICENSE），
> 不做时间测量；可运行的仓内确定性管线完成真实 benchmark。
> 原始数据：`artifacts/r2p3d-r1/provider-benchmark/`.

## 1. 结论分类

| 分类 | 含义 |
|---|---|
| `RECOMMENDED_LOCAL_PREVIEW` | 本轮可立即用于 Instant Preview 的本地 Provider |
| `RECOMMENDED_STANDARD_PIPELINE` | 本轮标准个体 Twin 生产链路 |
| `RESEARCH_ONLY` | 只读方法参考，不进入运行时 |
| `SKIP_BY_HARDWARE` | 本机硬件不满足 |
| `BLOCKED_BY_LICENSE` | 许可证禁止产品使用 |
| `SKIP_BY_POLICY` | 用户零下载政策导致本轮不采用（未来可复议） |

## 2. 逐 Provider 状态矩阵

| Provider | 目的 | 本机可运行(硬件) | License | 状态(R2P3D-R1) | 备注 |
|---|---|---|---|---|---|
| **template_local（仓内）** | Preview + Standard 生产 | ✓（纯 CPU，<1ms/次） | MIT（仓内） | ✅ `RECOMMENDED_LOCAL_PREVIEW` + `RECOMMENDED_STANDARD_PIPELINE` | 确定性；无下载 |
| **pet-3d（仓内）** | 3D runtime / GLB / 动画 | ✓（构建 <30ms；web+mobile 双端） | MIT（仓内） | ✅ `RECOMMENDED_STANDARD_PIPELINE`（runtime 底座） | 见 §3 实测 |
| SPAR3D | 单/双图 → GLB Preview | 16GB VRAM 边界可行（10.5GB 默认/7GB low） | Stability Community（商业条件） | `SKIP_BY_POLICY`（零下载）→ 未来候选 | 需权重下载；Windows experimental |
| SF3D | 单图快速 3D | ✓ 估 ~7GB | Community（商业阈值/注册） | `SKIP_BY_POLICY` → benchmark 候选 | 需权重下载 |
| Hunyuan3D-2.1 | 生成式重建 | 16GB 仅 Shape（Texture 21GB ✗） | 地域/MAU 条件 | `SKIP_BY_POLICY` + `SKIP_BY_HARDWARE` | 需权重下载；受限 |
| TRELLIS.2 | 高保真重建 | ✗（需 ≥24GB VRAM + Linux） | MIT 代码/权重另议 | `SKIP_BY_HARDWARE` + `SKIP_BY_POLICY` | 本机不适合 |
| BITE/SMAL/AnimalAvatar | 参数化动物方法 | — | research-only | `BLOCKED_BY_LICENSE` | 只借鉴方法 |
| DeepLabCut | pose/tracking | ✓ | SuperAnimal 模型研究限制 | `RESEARCH_ONLY` | 不作为默认依赖 |
| SAM2 | 分割/追踪 | ✓ | Apache-2.0 | `SKIP_BY_POLICY`（零下载）→ 未来候选 | 接口已预留 |

## 3. template_local / pet-3d 实测（本机）

`scripts/bench/bench_template_local.py`（Python）:
```json
cases:
  dog corgi      family=spitz variant=corgi  ms≈0   observed=4 inferred=5
  dog retriever  family=retriever variant=retriever ms≈0 observed=4 inferred=5
  cat standard   family=cat variant=standard    ms≈0   observed=0 inferred=5
import_cold_sec ≈ 0.53
GPU VRAM 0 MiB（纯 CPU 确定性管线）
```

`scripts/bench/provider-bench-pet3d.mjs`（Node/esbuild 打包 @pli/pet-3d 源码）:
```json
doudou (corgi): buildMs=28  meshes=17 triangles≈7000 vertices≈4596 bounds 1.24×1.87×2.48
mimi (cat):     buildMs=15  meshes=16 triangles≈6400 vertices≈4064 bounds 0.76×1.54×3.02
lightRigBuildMs ≈ 1.4
```
> 说明：`bounds.z`（2.48 / 3.02）包含尾巴等纵向部件；动画 `setPose` 为动态运行时参考。
> 这些是 **runtime 构建成本**，不是 GLB 文件大小（GLB 大小在 GLB QA 阶段测量）。

## 4. 选型结论

- **LOCAL_PREVIEW_PROVIDER 状态**：`PASS`（template_local 确定性预览可用，无需下载）。
- **STANDARD_INDIVIDUAL_TWIN_PIPELINE 状态**：`PASS`（模板族 + Morph + 真实媒体纹理投影 + OBSERVED/INFERRED，全部仓内）。
- **PRODUCTION_3D_PROVIDER 状态**：`NOT_YET_QUALIFIED`（外部生成式 Provider 未接入；
  接入须：用户批准下载 → license audit → adapter 注册 → `real=True` 才可声称真实）。

## 5. 诚实性约束

- 外部 Provider 的「画质」「速度」本轮**未测**（没有下载权重 = 没有运行）；
  任何声称都必须等到真实 benchmark 后。
- 本表数字全部来自本机本次运行；CI 只跑 contract 测试（mock/确定性 provider），
  大模型权重永远不进 CI。