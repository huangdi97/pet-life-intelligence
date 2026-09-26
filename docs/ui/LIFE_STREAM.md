# LIFE_STREAM — 时间线（Life Stream）体验规范

> 阶段：Stage R.2（v0.2.0）· 日期：2026-09-26 · 状态：MOBILE + WEB + MINI IMPLEMENTED
> 依据 GOAL §37-§40；实现：apps/mobile/src/screens/TimelineScreen.tsx、apps/mobile/src/components/timeline/LifeStream.tsx、lifeStreamUtils.ts、apps/web/app/timeline/page.tsx、apps/mini/src/pages/timeline/index.tsx

## 1. 定义

Timeline 是**生命流（Life Stream）**，不是日志表格，也不是每条同质大白卡的列表（GOAL §37）。

## 2. 结构：Day Group + time spine

```text
9月25日 · 今天
● 14:05  散步        户外 30 分钟   [photo thumbnail]
● 11:28  饮水        150 ml
● 09:41  行为        客厅休息
```

- Day Group 为一级容器；组内事件沿时间轴（time spine）排布。
- 事件项不是每条独立大 Card；时间轴本身是视觉骨架（§38）。
- 「回到那一天」只显示那一天已有的数据/媒体；禁止用当前 Pet Photo / current state 冒充历史状态（§40）。

## 3. 事件语义

- 每一条 = 时间 + 事件 + 元数据（payload 用户语言摘要）+ 来源/actor + outcome（撤回等）。
- 类型区分靠 icon / small semantic marker / media / copy，不依赖彩色大卡（§39）。
- 元数据示例：进食「狗粮 120 g」、饮水「180 ml」、散步「户外 25 分钟」、排泄「stool · normal → 便便 · 正常」。

## 4. Source Provenance（用户语言）

| 内部 | 用户语言 |
|---|---|
| OWNER_REPORTED | 主人记录 |
| DEVICE | 设备记录 |
| PROFESSIONAL | 专业人员 |
| AI_STRUCTURED / AI_INFERENCE | AI 整理 |
| RECORDED / LIVE / GENERATED_3D | 按事实区分，不混用 |

小型 provenance treatment（chip/文字），不上 internal enum（§62 / §98）。

## 5. 过滤

- 顶部 chips：全部 / 健康 / 行为 / 训练 / 护理 / 媒体（TIMELINE_FILTERS，zh 标签）。
- 过滤只改查询（event_type），不改语义结构。

## 6. 禁止

- 每条事件独立白卡（§90：independent full cards per visible event = NO）；
- raw `event_type`、`source:` 前缀、内部 key 出现在可见 copy（web EventList 已清零）。

## 7. 空态

「豆豆的时间线还很安静 —— 第一次喂食、散步或健康记录会从这里开始」+ [快速记录]（meaning + next action，§61）。

## 8. 验收

- §90：time grouping = YES；source semantics = YES；independent full cards per visible event = NO。
- 截图：artifacts/visual-reconstruction/v0.2.0/wave-03-timeline-quicklog/after/timeline-390.png；final/_s_02_Timeline.png。
