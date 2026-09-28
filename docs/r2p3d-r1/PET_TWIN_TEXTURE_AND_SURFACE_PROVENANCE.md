# R2P3D-R1 — PET_TWIN_TEXTURE_AND_SURFACE_PROVENANCE

> 表面来源与纹理投影来源的可追踪性（R2P3D-R1 §36/§37/§63）。
> 状态：2026-09-28。**铁律：observed surface > generated prior；
> OBSERVED 只能来自真实/演示媒体；INFERRED 只能是模板补全。**

## 1. 三来源模型

| 来源 | 含义 | 本轮实现 |
|---|---|---|
| `OBSERVED` | 来自用户真实媒体（或 DEMO_SYNTHETIC 演示媒体）的投影 | 区域颜色统计（背景分割后 mask 内像素均值 + exposure 归一 + 视角加权 median） |
| `INFERRED` | 未拍到，由模板族补全 | `template_default`（模板材质板） |
| `NOT_YET_OBSERVED` | 无媒体，仅元数据兜底 | `visual_pipeline_meta`（全部区域 INFERRED） |

## 2. 可观察区域清单

`coat, cream, ear, tail, paw, face`（`OBSERVABLE_REGIONS`）。

- `coat`：只要有照片即 OBSERVED（主要视觉特征）。
- `ear`：头部特写照片存在时 OBSERVED。
- `cream/tail/paw/face`：默认 INFERRED，除非有对应照片/特写。

## 3. 每版本来源记录

`PetVisualModel.metadata_json.opts`:

```json
{
  "observed_photo_count": 6,
  "media_provenance": "DEMO_SYNTHETIC | OWNER_REPORTED | NOT_YET_OBSERVED",
  "identity": { "consistency": 0.895, "gate": "heuristic_only" }
}
```

`observed_surface_manifest` / `inferred_surface_manifest` 是每版本 DB 事实，
版本升级时由 `visual_pipeline` 重新计算（只投影新照片对应区域）。

## 4. 版本与增量完善

- v1（6 角度全拍）→ observed `[coat, ear]`（demo dog），coverage 0.4。
- v1.1（新增背面照片）→ 只更新新增区域；未覆盖区域继续模板默认；
  不重建整个 active model。
- 激活后旧版本 RETIRED；历史 manifest 保留（审计/provenance 可重建）。

## 5. Identity QA（工程级，非产品准确率）

- `identity.consistency`：掩膜宠物图直方图交并比（heuristic）。
- `identity.gate`：`heuristic_only`（默认）或 `NEEDS_OWNER_CONFIRMATION`
  （低置信 <0.55 时）。
- 没有 embedding 模型 → `embedding_provider_available: false`（诚实）。
- **Owner review 仍是最终身份确认**；工程 QA 数字不代表“产品准确率”。

## 6. 诚实边界（禁止项）

- 禁止把 INFERRED 写成 OBSERVED（反方向同样禁止）。
- 禁止把演示媒体（DEMO_SYNTHETIC）当作真实宠物验证。
- 禁止把区域颜色统计说成逐像素 UV 贴图（当前为 v1 区域级投影）。
- 禁止把 3D 外观当成临床/医疗事实（PROVENANCE: GENERATED_3D）。
- `REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED`（REAL_PETS = 0）。