# R2_NAVIGATION_ALIGNMENT — 导航对齐报告

> 阶段：Stage R.2 · 日期：2026-09-26 · 依据 GOAL §16-§17（Navigation 必须先修，本轮 P0）

## 1. Before（v0.1.2 实际底部导航）

```text
今日 / 时间线 / 在家 / 陪伴 / 我的
```

结构性漂移（GOAL §1.1）：Monitoring（在家）与 Companion（陪伴）是横向能力，却占用了 Pet 与 Assistant 的一级入口。canonical Owner IA（§18 AGENTS）为 Today / Timeline / Pet / Assistant / Me。

## 2. After（v0.2.0）

```text
今天 / 时间线 / 宠物 / 助手 / 我的
```

实现：`apps/mobile/src/navigation.tsx` — RootStack → OwnerTabs（5 Tab.Screen：今天/时间线/宠物/助手/我的）；QuickLog 以 modal presentation 打开；Notifications/Health/LifeView/Behavior/Training/Welfare/Social/Monitoring/Companion 全部为 stack 二级页。

## 3. Monitoring / Companion 重新安置

| 能力 | Before | After |
|---|---|---|
| Monitoring（在家） | 一级 Tab | Today「在家」entry（SecondaryAction）、Pet/Companion contextual entry；无设备显示「尚未连接设备」 |
| Companion（陪伴） | 一级 Tab | Today / Pet contextual entry（「看看它」/陪伴）；graceful empty/preview |

功能未删除（§16「不要删除 Monitoring / Companion 功能」）。

## 4. Demo 导航支持

`pli-demo://nav?screen=...`（demoNav.ts，仅 EXPO_PUBLIC_PLI_DEMO_ENV=1 解析）映射 today/timeline/pet/assistant/me + 全部 stack 二级页，用于确定性截图运行。

## 5. Checklist

| 检查 | 结果 |
|---|---|
| Bottom tabs = Today/Timeline/Pet/Assistant/Me（§105 P0） | PASS（navigation.tsx 5 Tab.Screen，zh 标签今天/时间线/宠物/助手/我的） |
| Monitoring 不再是一级 Tab | PASS |
| Companion 不再是一级 Tab | PASS |
| 二级能力不挤占一级 IA（§17） | PASS |
| 4 Ghost Button 横排不代替导航（§25） | PASS（Today 为 1 Primary + 2 Secondary 行） |
| Tab icon 语义清晰（Ionicons active/inactive outline） | PASS |
| OWNER_NAVIGATION_CANONICAL_PASS（§108） | PASS |

## 6. 证据

- 代码：apps/mobile/src/navigation.tsx（TabParamList / StackParamList / TAB_ICONS）。
- 截图：final/_s_01_Today.png 等（底部 5 Tab）；wave-05/after/monitoring-390.png（Monitoring 作为二级页呈现）。
- 无障碍：demo deep-link 不影响生产（demoNav 仅在 DEMO_ENV 解析）。
