# OWNER_NAVIGATION_V4 — Owner 导航架构规范

> 阶段：Stage R.2（v0.2.0）· 日期：2026-09-26 · 状态：MOBILE + WEB + MINI IMPLEMENTED
> 依据 GOAL §16-§17（Navigation 必须先修，本轮 P0）；实现：apps/mobile/src/navigation.tsx

## 1. Canonical 一级 IA（冻结）

```text
今天（Today）
时间线（Timeline）
宠物（Pet）
助手（Assistant）
我的（Me）
```

对应英文：Today / Timeline / Pet / Assistant / Me（GOAL §16）。

## 2. 结构性漂移与修复

**Before（v0.1.2 实际底部导航）**：

```text
今日 / 时间线 / 在家 / 陪伴 / 我的
```

Monitoring（在家）与 Companion（陪伴）是**横向能力**，不能取代 Pet 与 Assistant 的一级入口（GOAL §1.1）。

**After（v0.2.0）**：

```text
今天 / 时间线 / 宠物 / 助手 / 我的
```

Monitoring 与 Companion 功能保留，重新安置为 stack 二级页面：

- Monitoring：Today「在家」entry、Pet 内 contextual entry、Companion 页；
- Companion：Today / Pet 内 contextual entry（「看看它」/ 陪伴入口）。

## 3. 架构

```text
RootStack
└── OwnerTabs
    ├── Today
    ├── Timeline
    ├── Pet
    ├── Assistant
    └── Me

Stack 二级：QuickLog(modal) / Notifications / Health / LifeView / Behavior /
           Training / Welfare / Social / Monitoring / Companion
```

实现：`apps/mobile/src/navigation.tsx` — TabParamList = Today/Timeline/Pet/Assistant/Me；StackParamList 含全部二级页；QuickLog 以 `presentation: "modal"` 打开。Tab icons 统一 Ionicons（active/inactive outline 语义）。

## 4. 不允许

- 二级能力挤占一级 IA（§17）；
- 用 4 个 Ghost Button 横排代替导航（§25）；
- Tab icon 语义混淆（§106 P1 项）。

## 5. Demo 导航（仅 demo 构建）

`pli-demo://nav?screen=...`（demoNav.ts，EXPO_PUBLIC_PLI_DEMO_ENV=1 才解析）：today/timeline/pet/assistant/me/quicklog/health/lifeview/behavior/training/welfare/social/monitoring/companion。生产构建不解析这些 URL。

## 6. 验收

- §105 P0：Bottom tabs = Today/Timeline/Pet/Assistant/Me（PASS）。
- §108：OWNER_NAVIGATION_CANONICAL_PASS。
- 证据：apps/mobile/src/navigation.tsx（5 Tab.Screen：今天/时间线/宠物/助手/我的）；截图 final/_s_01_Today.png 底部 Tab。
