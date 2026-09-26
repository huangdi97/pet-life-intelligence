# PET_3D_LIFE_VIEW — 生命视图页面规范（Photo-first）

> 阶段：Stage R.2（v0.2.0）· 日期：2026-09-26 · 状态：MOBILE + WEB + MINI IMPLEMENTED
> 更新说明：由 Stage H.2 版升级为 R.2 版（§31-§36）——Life View 从「3D 服务状态页」重建为「豆豆的可视生命状态入口」（Photo-first）。
> 实现：apps/mobile/src/screens/LifeViewScreen.tsx、apps/web/app/pets/[id]/life-view/page.tsx、apps/mini/src/pages/pets/life-view/index.tsx

## 1. 页面角色

Life View = 「豆豆的可视生命状态入口」，不是 3D Service Diagnostics（GOAL §1.5）。

## 2. 三层严格分离（§32）

```text
Presentation：photo / 3D representation / visual overlay / timeline memory
Inference    ：change signal / AI summary（带标签）
Fact         ：event / observation / baseline / outcome / provenance
```

Presentation 永远不能成为 Fact；禁止 organ health score / pain map / emotion score / disease probability 等未验证可视化（PROVENANCE INVARIANT）。

## 3. Photo-first 结构（§33，REAL_3D_PROVIDER = EXTERNAL_BLOCKED）

```text
[豆豆大图 / full body]        ← PetMedia full-bleed，暖深色沉浸舞台（ImmersiveStage）
此刻                           ← 最近一次记录 / 当前有来源的数据
[生命轨迹 preview]             ← 4 条以内的 Life Stream
3D 形象                        ← 尚未创建 / 等待连接真实 3D 服务（诚实，不伪装）
```

真实状态 REAL_3D_PROVIDER = EXTERNAL_BLOCKED，不等于 Life View 必须是失败页。

## 4. 技术信息下沉（§34）

以下禁止出现在 Owner 主页面：`provider_real`、`model_id`、`today.viewed`、`health.event_opened`、`health.outcome_recorded`、provenance 内部 enum、failure_reason raw text、raw event keys。

它们只进入 Developer diagnostics / Admin / Model details advanced page。Owner 只看到产品语义。

实现：LifeViewScreen 主视觉为 PetMedia + 此刻 + 生命轨迹 + 「3D 形象：尚未创建 / 等待连接真实 3D 服务后生成。当前以照片与记录呈现。」

## 5. 3D Available State（§35，未来）

中心 3D Pet，周围只显示真实来源存在的状态；禁止心率/呼吸/体温等无真实数据源的指标。

## 6. Immersive Surface（§36）

- 允许：warm-dark surface、subtle depth、soft volumetric、transparent state overlay。
- 禁止：neon cyber、gaming HUD、medical sci-fi、continuous glow、fake hologram。

## 7. 加载策略（Mini 优先性能）

poster first → low LOD → interactive if capable → fallback turntable / 2D；**不阻塞 Today**（§72）。

## 8. 3D Failure 回退

真实宠物照片（species visual fallback）+ Current State + Baseline + Actions；核心产品流程（Quick Log/Health/Timeline/Permissions/Safety）不依赖 3D（§30）。

## 9. Reduced Motion

prefers-reduced-motion 下关闭 auto rotate / breathing loop / orbit ring / parallax / glow pulse；3D 保持静态可操作（§67）。

## 10. 验收

- §80 Gate：PHOTO_FIRST_LIFE_VIEW_PASS（主视觉是宠物视觉，非 provider 诊断）；provider diagnostics dominant = NO；raw internal event keys = 0。
- 截图：artifacts/visual-reconstruction/v0.2.0/wave-02-pet-life-view/after/lifeview-390.png；final/_s_05_LifeView.png。
- 无障碍：重要状态必须有文字等价物，不能只在图片上（§68）。
