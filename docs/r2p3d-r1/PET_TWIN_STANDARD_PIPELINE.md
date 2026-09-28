# R2P3D-R1 — PET_TWIN_STANDARD_PIPELINE

> 标准个体 Twin 生产链路（R2P3D-R1 §35/§36/§37/§38）。
> 状态：2026-09-28。**STANDARD_INDIVIDUAL_TWIN_PIPELINE = PASS**（仓内确定性，零下载）。

## 1. 目标

把“有 3D Runtime / template fallback”推进到：**用户自己的宠物可本机生成、
校验、动画、持续修正的个体 Pet Twin**。不依赖任何外部生成式模型权重
（本轮用户决策：零外部模型权重下载），全部由仓内可商用确定性管线完成。

## 2. 链路总览

```text
Capture（6 角度 + 可选短视频）
  → QC / Segmentation（确定性背景分割，soft alpha）
  → Frame Selection（短视频 → 候选帧，blur/exposure 排序）
  → Shape Fitting（silhouette aspect + owner metadata 弱先验 → morph params）
  → Texture Projection（多视图区域颜色投影 → baseColor + observed/inferred）
  → Surface Manifest（OBSERVED / INFERRED 分离 + coverage_ratio）
  → Owner Review（很像/基本像/不像；不像不可激活）
  → Activation → Today / Pet World / Life View / Timeline / Assistant
  → Incremental Refinement（新增照片 → v1.x 局部更新，不全量重建）
```

## 3. 模块

| 模块 | 职责 |
|---|---|
| `services/api/app/services/twin_media.py` | 确定性图像 QC、背景分割、silhouette、帧选择、身份相似性（heuristic） |
| `services/api/app/services/twin_individual.py` | 个体 Twin 描述符构建：family/morph/texture/surface/identity |
| `services/api/app/services/visual_pipeline.py` | 生成任务主链路（模板族选择 + 媒体解析 + 持久化） |
| `services/api/app/services/visual_pipeline_meta.py` | 无媒体时的元数据兜底（全 INFERRED，诚实） |
| `packages/pet-3d/src/morph.ts` | Morph 参数契约（§29 18 字段）+ 模板族注册表 |
| `packages/pet-3d/src/rig.ts` | 四足骨骼关节层次（16 关节） |
| `packages/pet-3d/src/motion.ts` | 12 个动作 clip + True Model（AMBIENT/REPRESENTATIVE/OBSERVED） |
| `packages/pet-3d/src/twinScene.ts` | 个体 Twin 场景构建（rig + 区域纹理 + GLB 导出路径） |

## 4. 描述符格式（backend → client）

```json
{
  "family": "corgi-like | standard-dog | standard-cat | ...",
  "morph": { "body_length": 1.5, "body_height": 0.99, "...": 1.0 },
  "texture": {
    "observed": { "coat": "#E8C79A", "ear": "#D9A968" },
    "inferred": { "cream": "template_default", "tail": "template_default", "paw": "template_default" }
  },
  "surface": {
    "observed_regions": ["coat", "ear"],
    "inferred_regions": ["cream", "tail", "paw", "face"],
    "coverage_ratio": 0.4
  },
  "identity": {
    "consistency": 0.895,
    "similarity_provider": "heuristic_histogram",
    "embedding_provider_available": false,
    "gate": "heuristic_only | NEEDS_OWNER_CONFIRMATION"
  },
  "qc": [ { "blur_score": ..., "exposure": ... } ],
  "frame_candidates": [ ... ],
  "provenance": "DEMO_SYNTHETIC | OWNER_REPORTED | NOT_YET_OBSERVED"
}
```

## 5. 模板族（2026-09-28）

- **corgi-like**（柯基短腿长身，豆豆）
- **standard-dog**（田园/边牧等标准犬）
- **spitz-dog**（博美/萨摩/哈士奇先验）
- **retriever-dog**（金毛/拉布拉多先验）
- **standard-cat**（英短/美短/田园猫）

> Breed 只是弱先验（§29：breed ≠ shape truth）；最终形状由媒体 silhouette
> 拟合 + Owner 核验决定。更多 family 保留可扩展契约（`TWIN_TEMPLATES`）。

## 6. 形状拟合

`_fit_morph()`：从 silhouette aspect（宽/高比）推导 `body_height` 与
`leg_length_front/back`，其余字段继承 breed 先验并 clamp 到 `[0.35, 2.4]`。
这是 soft heuristic —— 不是生物测量，也不用于医疗判断。

## 7. 纹理投影

多视图区域颜色统计：每个角度照片（背景分割后）的 mask 内像素均值 →
exposure 归一 → 按角度覆盖权重聚合（median 抗离群）。输出：
- `baseColor`（每区域 hex）
- `observed mask`（来自真实/演示媒体的区域集合）
- `inferred mask`（模板默认区域集合）
- `coverage_ratio`（observed 区域数 / 可观察区域总数）

**诚实边界**：这是区域级颜色投影（v1），不是逐像素 UV 贴图；文档如实标注。

## 8. 版本化与增量完善

- 每个 generation → 新 version（`_next_version`，v1、v2…）。
- 激活一个版本后旧版自动 RETIRED（owner 三档核验 gate 前置）。
- 增量完善：新 capture 生成新 version；只投影新增照片对应的区域，
  未覆盖区域沿用模板默认（不全量重建 active model）。
- `PET_TWIN_TEXTURE_AND_SURFACE_PROVENANCE.md` 记录每版本来源与区域归属。

## 9. 质量与测试

- `tests/unit/test_r2p3d_r1_twin_pipeline.py`：分割/silhouette/身份相似性/
  morph 契约/纹理投影/元数据兜底/GLB QA + motion manifest。
- 集成：`tests/integration/test_plm_r2p3d_pipeline.py`（capture→generate→
  verify→activate 全链路，media-driven observed manifest）。
- GLB QA：`scripts/twin/twin_glb_qa.py`（场景/节点/动画清单/包围盒/校验和）。

## 10. 当前限制（诚实）

- 无真实宠物素材：`REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED`；
  全部 fixture 为 `DEMO_SYNTHETIC`（自绘，license-safe，见
  `tests/fixtures/media/README.md`）。
- 分割为确定性背景分割（无 SAM2 权重；`SegmentationProvider` 接口已预留）。
- 身份一致性为直方图启发式（无 embedding 模型；低置信 → NEEDS_OWNER_CONFIRMATION）。
- Owner review 是最终身份确认，工程 QA 数字不代表产品准确率。