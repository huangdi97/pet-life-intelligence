# COMPANION_UX — Stage H 冻结版

> 状态：`COMPANION_DESIGN_COMPLETE + FRONTEND PROTOTYPE COMPLETE` · 真实硬件：`FEATURE_FLAGGED + EXTERNAL_BLOCKED`（绝不写 COMPANION_LIVE）

## 1. 顶层原则（§35，冻结）

**Zero-cognition First · Observation First · Welfare First · Privacy First · Human-in-Control**

核心：不要求宠物理解复杂人机界面；不宣称宠物理解「视频电话」。

## 2. 四层模型（§36-40）

| 层 | 内容 | 状态 |
|---|---|---|
| 1 Observe | Live View / Recent Activity / Last Seen / Device Status / Recent Events（宠物无需理解任何东西） | 设计完成；真实摄像头 EXTERNAL_BLOCKED → 显示 Demo/Prototype |
| 2 Presence | Owner Voice / Short Audio / Two-way Audio / Optional Screen（宠物熟悉的刺激） | 原型；不宣称「视频电话」 |
| 3 Enrichment | Treat / Toy / Short Play / Simple Cue（受 Interaction Welfare Guard 保护） | 原型；真实设备 EXTERNAL_BLOCKED |
| 4 Learned Interaction | Physical Button / Learned Cue / Conditioned Trigger（可训练能力） | 设计完成；事实表达=「宠物触发了互动按钮」 |

## 3. Room UI（§41-42）

```
豆豆 · 客厅 · LIVE（无真实 provider 时显示 PROTOTYPE）
[ video / demo placeholder ]
🎤 讲话   🦴 零食   🎾 玩耍
今天已互动 3 次 · 11 min
当前建议：刚结束休息，可短时互动
Session Timer · Welfare State · Session Summary
```

- 无真实 provider（Camera/Treat Device/Toy/Robot）必须显示 **Demo / Prototype / Unavailable**，不得假装执行成功。
- CompanionControl 组件：prototype=true 时渲染 PROTOTYPE 标签 + 原型提示，不伪装成功。

## 4. Interaction Welfare Guard（§43，完整设计）

| 保护 | 规则（默认） |
|---|---|
| Rest protection | 刚结束休息 → 建议短时互动；连续休息不强行唤醒 |
| Cooldown | 互动间隔 ≥30 min（可配置） |
| Treat limit | 每日零食上限（默认 3 次） |
| Session duration | 单次 ≤15 min |
| Repeated non-response | 连续 2 次无响应 → 停止并提示 |
| Avoidance behavior | 出现回避（离开/躲藏）→ 立即结束并记录 |
| Noise limit | 音量上限；Short Audio 优先 |
| Night quiet mode | 22:00-07:00 静默（仅 Observe） |
| Device safety | 设备安全检查通过才可互动 |

Guard 状态在 Room UI 常驻可见（Welfare State 区）。

## 5. Session 模型（§44，DESIGN CANDIDATE）

```
RemoteInteractionSession:
  session_id · pet_id · actor_id · device_id · started_at · ended_at
  interaction_types[] · pet_observations[] · owner_feedback[] · safety_events[] · outcome
```

**后端 canonical schema 尚未批准 → 只作为 DESIGN CANDIDATE**；前端类型定义标注 `DESIGN CANDIDATE`，不擅自迁移正式 schema，不产生真实后端写入（原型数据标 PROTOTYPE）。

## 6. 前端原型（§83 Prototype C）

流程：Today → 看看它 → Observe → Presence → Interaction → Session Summary。
- Web：`/companion`（feature flag `NEXT_PUBLIC_PLI_FLAG_COMPANION`，默认 off → PROTOTYPE gate 页）。
- Mini：`pages/companion`（入口卡在今日页）。
- Mobile：CompanionScreen（tab 5）。
- 真实硬件调用：Feature Flag / Sandbox；不进入真实 Pilot 数据。

## 7. 文案（§76）

见 COPY_GUIDELINES §3/§4。禁止「豆豆想你了」「正在给你打电话」；使用「豆豆刚刚来到互动设备附近」「豆豆触发了互动按钮」。

## 8. 外部 Blocker 单列（§118）

Camera Provider / Two-way Audio / Treat Device / Toy Provider / Robot —— 均为 `EXTERNAL_BLOCKED / DESIGN_ONLY`（无真实集成）。
