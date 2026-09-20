# MONITORING_UX — Stage H 冻结版

> 状态：`MONITORING_UI_COMPLETE`（真实设备 provider 仍 EXTERNAL_BLOCKED 时，UI 仍须完整）

## 1. 定位（§29-30）

OWN-013 Monitoring（/monitoring）——Home Intelligence 的产品页，**不是工程 IoT dashboard**。

必须回答五问：
1. 宠物现在在哪里？
2. 最近发生了什么？
3. 今天整体状态怎么样？
4. 设备是否正常？
5. 与自己的历史相比有什么变化？

## 2. 首页结构（§31 示例）

```
豆豆 · 家中
最近看到：14:32 客厅活动
今天：进食 3 次 · 饮水 5 次 · 排泄 2 次 · 活动 1h42m · 睡眠 8h20m
设备：摄像头 在线 · 喂食器 在线 · 饮水机 2 分钟前 · 猫砂盆 在线
近期变化：饮水比自己的 30 日范围低
```

信息层级：最近看到 → 今天汇总（MetricCard）→ 设备（DeviceStatus 列表）→ 近期变化（TrendCard，强调 Evidence/Uncertainty）→ 最近事件（TimelineItem 精简）。

## 3. Device UI（§32）

状态五档：**Connected / Offline / Degraded / Needs Review / Unknown**（DeviceStatus 组件：中文标签 + 状态点，颜色不是唯一表达）。
显示：Last sync / Pet association / Data quality / Source。
- 无真实设备 provider 时：显示 PROTOTYPE/DEMO 标签 + Unknown 状态；**不得伪装在线**。

## 4. Camera Candidate Event（§33）

摄像头 AI **不直接写成事实**。流程：

```
Camera Candidate → Review Queue → Owner Confirm / Correct / Reject → Canonical Event
```

UI 必须表现这个区别：候选事件卡片带「待确认」徽章 + Confirm/Correct/Reject 操作；确认后才成为 Canonical Event（Timeline 内显示 provenance=设备/AI 来源）。
- 无真实 provider 时：Review Queue UI 完整保留（空状态 + PROTOTYPE 标记）。

## 5. 状态模型（§61/§102）

connected / offline / empty / candidate event / review / summary 全部有 UI：
- Loading（Skeleton）→ Empty（「还没有设备数据」）→ Partial（部分设备在线）→ Populated → Error（人类语言）→ Offline（离线提示）→ External Blocked（「设备接入暂未开放」+ PROTOTYPE 说明，不显示工程术语）。

## 6. 与 Today / Companion 的关系

- Today 提供 Monitoring 入口（「看看它」）+ 精简监测卡。
- Companion Observe 层复用 Monitoring 的设备状态/最近事件数据。
- 设备管理（Admin 视角）在 ADM-007 Devices；Owner 端只表达「设备是否正常」。

## 7. 基线对比（§30 第 5 问）

「与自己的历史相比」：TrendCard 基于 Personal Baseline（30 日范围），措辞「比自己的近期范围低/高」，带 Evidence 与 Uncertainty 提示；**不做跨宠物对比，不做医疗结论**。
