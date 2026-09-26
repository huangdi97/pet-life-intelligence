# R2_LIFE_VIEW_ACCEPTANCE — Life View 验收

> 阶段：Stage R.2 · 日期：2026-09-26 · 依据 GOAL §80（Photo-first Life View）+ §34（技术信息下沉）；实现：apps/mobile/src/screens/LifeViewScreen.tsx

## 1. 截图证据

Before：`artifacts/emulator/v0.1.2/06_3d-life-view.png`（3D 服务诊断页：provider/model/raw event key）

After：

- `artifacts/visual-reconstruction/v0.2.0/wave-02-pet-life-view/after/lifeview-390.png`
- `artifacts/visual-reconstruction/v0.2.0/final/_s_05_LifeView.png`

## 2. 页面结构（Photo-first）

```text
[生命视图] 标题 + 「豆豆 · 此刻」
[ImmersiveStage：PetMedia full-bleed 宠物大图为焦点]
[此刻：最近一次记录 / 今天还没有记录 / 暂时连接不上]
[生命轨迹 preview（Life Stream ≤4 条）]
[3D 形象：尚未创建 / 等待连接真实 3D 服务后生成。当前以照片与记录呈现。]
```

## 3. Checklist

| 条件 | 结果 | 证据 |
|---|---|---|
| PHOTO_FIRST_LIFE_VIEW_PASS | PASS | 宠物视觉为焦点（full-bleed PetMedia + stage overlay） |
| provider diagnostics dominant = NO | PASS | 主视觉为宠物；3D 仅一行诚实状态 |
| raw internal event keys = 0 | PASS | 可见 copy 无 today.viewed / health.event_opened / model_id / provider_real / DrawState |
| owner surface hides provider diagnostics | PASS | 技术信息下沉 Developer/Admin（§34） |
| Presentation ≠ Fact（§32 / §27 AGENTS） | PASS | 无 organ score / pain map / emotion score；无未验证可视化 |
| REAL_3D_PROVIDER 诚实态 | PASS | EXTERNAL_BLOCKED → 「尚未创建 / 等待连接真实服务」，不伪装 |

## 4. 三层分离落地

- Presentation：species visual（照片管道就绪）+ stage overlay + 生命轨迹；
- Inference：无未标注推断展示；
- Fact：此刻/轨迹均来自 /today events（真实 API），撤回等状态如实。

## 5. Remaining Issues

- P2/ACCEPTED_DEFER：REAL_3D_PROVIDER = EXTERNAL_BLOCKED；3D Available State（§35）未发生（如实）。
- P2/ACCEPTED_DEFER：无 Demo 照片，full-bleed 以 species visual 呈现（ACCEPTED_LIMITATION，2026-09-26）。
- P2/ACCEPTED_DEFER：生命轨迹为今日 4 条 preview（数据源 /today；跨日轨迹待 /events 全量接入）。

## 6. 结论

PHOTO_FIRST_LIFE_VIEW_PASS：**PASS**。
