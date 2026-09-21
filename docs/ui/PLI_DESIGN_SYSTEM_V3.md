# PLI_DESIGN_SYSTEM_V3 — Visual Design System v3（Stage H.2）

> 阶段：Stage H.2（GOAL PHASE M）· 日期：2026-09-20 · 状态：DESIGN DOC（冻结方向，随 H.2 落地）
> 依据：GOAL M1–M4 + v3.1-R1 母版视觉基调 + ui-tokens v2

## 1. 视觉目标（M1）

```
高级 · 真实 · 温暖 · 深度 · 可信 · 轻科技
```

- **不是**霓虹科幻、游戏 HUD、医疗科幻、过量辉光、全息母题。
- 语气：像一本被精心照料的宠物档案，而不是监控台。

## 2. 视觉基调

| 维度 | 规范 |
|---|---|
| 色彩 | 保持 ui-tokens v2 语义色（温暖米白 canvas + 苔绿 primary + 赭石 accent）；不引入荧光色系 |
| 字体 | 保持现有字体栈；3D 场景中的英文标注用 secondary/small |
| 卡片 | 现有 `.card`（surface + 1px line + 圆角 12px）；3D 区允许更深背景 |
| 状态色 | 语义总线不变（ok/notice/monitor/vet_soon/urgent/emergency）——颜色不是唯一表达 |
| 图标 | TokenIcon 保持；3D 用线性图标避免游戏化 |

## 3. 3D 场景风格（M2）

允许：
- soft volumetric light（柔和体积光）
- subtle depth ring（克制的景深环）
- transparent glass overlay（半透明玻璃信息层）
- warm dark background（暖色深底，仅 3D 场景内）
- natural pet texture（自然毛发/皮肤质感）

避免：
- neon cyber / gaming HUD / medical sci-fi / excessive glow / hologram cliché

## 4. 文案（M3）

**用**（事实陈述）：
- 「豆豆来到互动设备附近」
- 「豆豆最近一次活动在 3 分钟前」
- 「系统观察到豆豆在设备附近停留约 28 秒」
- 「今天进食 3 次，与近期基线一致」

**禁止**：
- 「豆豆想你了」「豆豆很开心」「情绪 88 分」「幸福指数」
- 「数字孪生」（用户侧主文案）
- 把 3D 外观写成「实时画面」

## 5. 3D 相关状态文案（诚实协议）

| 状态 | 前端文案 |
|---|---|
| 无真实 provider | 「3D 生成服务暂未开放」+「不会伪装生成成功」 |
| 生成中 | 「3D 形象生成中（演示路径）」 |
| 生成失败（provider blocked） | 「失败原因：REAL_3D_PROVIDER_EXTERNAL_BLOCKED」 |
| 待主人确认 | 「确认这个 3D 形象像它吗？ 像 / 基本像 / 不像」 |
| 已激活 | badge「GENERATED_3D」+ 说明「3D 形象只描述外观，不包含任何健康信息」 |
| Gate（无硬件） | 「现在看到的是 GENERATED_3D / 原型，不是实时画面（LIVE）也不是录像（RECORDED）」 |

## 6. 设计稿范围（M4）——已落地面与状态

| 稿 | 状态 | 落点 |
|---|---|---|
| Today / Living Canvas | 已实现 | apps/web/app/page.tsx（Pet→Now→Change→Attention→Action） |
| Timeline（生命流） | 已实现 + 回到那一天 | apps/web/app/timeline/page.tsx |
| Pet Profile | 已实现 | apps/web/app/pets/[id]/page.tsx（含生命视图入口） |
| 3D Life View | 已实现 | apps/web/app/pets/[id]/life-view/page.tsx |
| Health | 已实现（Stage H） | apps/web/app/health/* |
| Behavior / Training | 已实现（Stage H） | apps/web/app/behavior·training |
| Assistant | 已实现（Stage H） | apps/web/app/agent/page.tsx |
| Companion | 已实现 + H.2 标注 | apps/web/app/companion/page.tsx（gate 内 GENERATED_3D≠LIVE） |
| Me / Privacy | 已实现（Stage H） | apps/web/app/settings/page.tsx |
| Capture Wizard | 已实现（H.2） | apps/web/app/pets/[id]/capture/page.tsx |
| 3D Generation Progress | 已实现（状态列表） | life-view 版本列表 + Sandbox FAILED 诚实态 |
| 3D Verification | 已实现（后端 + E2E） | /visual-models/{version}/verify + contract test |
| 3D Failure / External Blocked | 已实现 | life-view「服务暂未开放」+ 失败原因展示 |
| Offline | 已实现（Stage H） | apps/web/app/offline + drafts |
| Permission Denied | 已实现（Stage H） | State(denied) + pets/[id] 403 |
| Safety Blocked | 已实现（Stage H） | RiskBanner / EmergencyAction |

## 7. Reduced Motion（M2 交互约束）

`@media (prefers-reduced-motion: reduce)` 关闭：auto rotate / breathing loop / orbit ring / parallax / glow pulse；
3D 保持静态可操作（globals.css 已实现，H.1 验证）。

## 8. 验证基线

- web typecheck 0 · vitest 22/22 · Playwright 17/17（H.2 起增加 stage-h2-3d 6 项）
- E2E 禁止文案：life-view `main` 无「数字孪生」（stage-h2-3d 断言）