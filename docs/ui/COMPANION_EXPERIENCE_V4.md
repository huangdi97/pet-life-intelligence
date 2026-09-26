# COMPANION_EXPERIENCE_V4 — 陪伴模式体验规范

> 阶段：Stage R.2（v0.2.0）· 日期：2026-09-26 · 状态：MOBILE + WEB + MINI IMPLEMENTED
> 依据 GOAL §54-§56；实现：apps/mobile/src/screens/CompanionScreen.tsx

## 1. 定位

当前真实状态：真实硬件未接入（Camera / Two-way Audio / Treat Device / Toy / Robot = EXTERNAL_BLOCKED，§23 AGENTS）。这不等于 Owner 必须看到一个「Prototype 技术说明」失败页（§54）。

Companion = **陪伴模式** 的完整 Empty / Preview Experience：宠物身份 + 用户语言能力说明 + 诚实设备状态。

## 2. 四层能力（§55，用户语言）

```text
观察（Observe）        — 在不打扰它的前提下，留意它的活动、休息与互动。
在场（Presence）       — 连接设备后，可以知道它是否来到附近、停留多久。
丰富化（Enrichment）   — 在合适的时候提供游戏与探索机会，由你控制节奏。
习得互动（Learned）    — 根据长期观察逐渐了解它的偏好，但不猜测情绪。
```

## 3. 诚实设备状态

- 无设备：「尚未连接设备」——不是超时红字反复刷屏（§57）。
- 说明：「连接支持的设备后，可以在不打扰它的前提下观察和互动。」
- 不伪装 LIVE / 不展示 fake video / 不假装在观察（§23-§29 AGENTS）。

## 4. 禁止暴露（§56）

Owner UI 禁止：`PLIDEBUG_COMPANION=1`、feature flag、prototype implementation note、internal architecture terms。可在 Developer Mode 查看。

## 5. 文案原则（§22 AGENTS）

避免拟人化；禁止「豆豆想你了」「豆豆在给你打电话」；优先可观察语言（「豆豆来到互动设备附近」「豆豆触发了互动按钮」「豆豆在设备附近停留约 28 秒」）。

## 6. 入口

Companion 不是一级 Tab；入口来自 Today / Pet contextual entry（§16）。功能保留。

## 7. 福利边界（§24 AGENTS）

远程互动必须考虑频率/时长/零食量/反复无响应/回避/休息打扰/终止；Welfare overrides engagement。

## 8. 验收

- §105 P0：Companion 不再只有 Prototype 技术说明（PASS — graceful empty/preview）。
- §108：COMPANION_EMPTY_EXPERIENCE_PASS。
- 截图：artifacts/visual-reconstruction/v0.2.0/wave-05-assistant-companion-me/after/companion-390.png；final/_s_12_Companion.png。
- Copy：无 feature flag / prototype tag（web owner copy zero gate 同步通过）。
