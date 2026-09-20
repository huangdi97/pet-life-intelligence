# NAVIGATION_MODEL — Stage H 冻结版

> 状态：`FROZEN（Stage H）` · 依据：INFORMATION_ARCHITECTURE.md + 真实代码审计

## 1. Owner Web（TopNav + 页内导航）

- **TopNav**（E2E 契约：`.topnav` 含 今日/时间线/宠物/助手/我的 + `<select>` 宠物切换器）：
  - 今日 → `/`
  - 时间线 → `/timeline`
  - 宠物 → `/pets`
  - 助手 → `/agent`
  - 我的 → `/settings`
- **Pet Switcher**：TopNav 内 `<select>`（保持现有实现；列当前 household 可见宠物）。
- **页内二级导航**（不做侧栏，用页内 tab/chip）：
  - Pet：档案(/pets) · 健康(/health) · 行为(/behavior) · 训练(/training) · 福祉(/welfare) · 社交(/social) · 在家(/monitoring) · 照护(/care) · 用药(/medication)
  - Assistant：问 · 摘要 · 找 · 计划 · 解释（/agent 页内 5 tab；找含 /search 能力）
  - Timeline：全部/健康/行为/训练/照护/媒体（页内 filter chips）+ 搜索框
  - Today：快速记录(Sheet) / 任务区 / 关注区 / 看看它(Companion) / 查看时间线
- **Me**（/settings 页内分区）：家庭 · 通知(/notifications) · 隐私 · 数据 · 设置。

## 2. Owner Mini（Bottom Tab 5 + Sheet）

- Tab：今日(`/pages/index`) · 时间线(`/pages/timeline`) · 健康(`/pages/health`) · 助手(`/pages/agent`) · 我的(`/pages/mine`)
- Quick Log：今日页内 Bottom Sheet（tap → minimum input → save）。
- Companion：今日页入口卡 → `/pages/companion`（feature-flagged 原型）。
- 二级页保留：pets/tasks/training/behavior/medication/notifications；从对应 tab 页内入口进入。
- 不使用：大表格 / 复杂侧栏 / 多层 Modal。

## 3. Owner Mobile（Bottom Tab 5）

- Tab：Today · Timeline · Monitoring · Companion · Me
- Quick Log：Today 页打开 modal screen（≤10 秒路径）。
- Notifications：Today 与 Me 顶部入口进入。
- Camera：Quick Log / Health 证据内 expo-camera / image-picker。
- 顶层导航库：@react-navigation/bottom-tabs + native-stack（现有依赖）。

## 4. Admin（侧栏导航 11 项）

```
Overview / · Pilot /pilot · Users /users · Pets /pets · Safety /safety
AI /ai · Devices /devices · Integrations /integrations · Audit /audit
Incidents /incidents · Feature Flags /flags（含 capabilities）
```

- 不混 Owner 页面；Admin 无 TopNav 宠物切换器。

## 5. Professional（apps/pro，顶部角色切换 + 页内导航）

- 顶部：角色显示（Vet/Trainer/Service，由 grant 决定）+ 宠物切换。
- Vet：Assigned Pets(/) · Vet Brief(/vet-briefs) · Timeline(/pets/[id]/timeline) · Outcome(/pets/[id]/outcome)；Pet Brief/Evidence 在 Assigned Pet 详情页内分区。
- Trainer：Assigned Pets(/) · Behavior(/behavior) · Training(/training)（Plan/Progress 页内分区）。
- Service：Assigned Pets(/) · Care Card(/care-cards) · Tasks(/tasks)（Medication/Updates/Incident 页内分区）。

## 6. H5 Share

- 无导航壳；单一内容卡 + 撤销说明 + 过期时间可见 + "no app required"。

## 7. 导航规则（跨端）

1. 一级导航任何端 ≤ 5 项（Admin 侧栏例外 ≤ 11）。
2. 二级一律页内 tab/chip/sheet，不用多层 Modal 嵌套。
3. 每页 Primary CTA 唯一明确；Secondary CTA ≤ 2。
4. 返回路径始终存在（浏览器返回 / 页内返回按钮）。
5. 未授权（Permission Denied）、未登录、离线、Feature Disabled 状态在导航层不隐藏入口，由页面状态表达。
