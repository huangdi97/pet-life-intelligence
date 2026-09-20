# INFORMATION_ARCHITECTURE — Stage H 冻结版

> 状态：`FROZEN（Stage H）` · 依据：v3.1-R1 母版 §11/§67/§69/§70/§71/§72 + 真实代码审计
> 权威顺序：真实代码/测试 > 本文档 > Feature Inventory > 母版辅助

## 1. 原则

- 16 个业务域（Identity/Daily/Care/Health/Behavior/Training/Welfare/Social/Devices/Services/Nutrition/Insurance/Timeline/Agent/Companion/Platform）**不得**展开为 16 个一级导航。
- 所有域最终回到：**Pet Timeline + Personal Baseline + Outcome + Provenance**。
- Owner 默认 zh-CN；专业术语中文 + secondary English；禁止 §75 文案。
- 用户不需要知道系统背后有 228 个 Feature。

## 2. Owner 端顶层 IA（5 个一级入口）

```
Today        Timeline       Pet           Assistant      Me
├─ 快速记录   ├─ 全部        ├─ 档案        ├─ 问          ├─ 家庭
├─ 任务      ├─ 健康        ├─ 健康        ├─ 摘要        ├─ 通知
├─ 关注      ├─ 行为        ├─ 行为        ├─ 找          ├─ 隐私
├─ 监测入口   ├─ 训练        ├─ 训练        ├─ 计划        ├─ 数据
├─ 陪伴入口   ├─ 照护        └─ 福祉        └─ 解释        └─ 设置
└─ AI 摘要      └─ 媒体
（ Welfare / Social / Devices(Services) 从 Pet 下沉访问；Companion 从 Today 入口进入 ）
```

- Today 回答五问：现在怎么样 / 今天做什么 / 刚刚发生什么 / 值得注意什么 / 我能做什么。不是数据库 dashboard。
- Timeline 是核心资产（What/When/Who/Source/Evidence/Outcome + Filter/Search）。
- Social 不做传统 Feed：关系图谱 + 互动历史 + 安全 + 反馈 + Baseline。
- Monitoring 不是 IoT dashboard：宠物在哪 / 最近发生什么 / 今天状态 / 设备是否正常 / 与自己历史相比的变化。
- Companion 为 feature-flagged 前端原型（四层：Observe/Presence/Enrichment/Learned Interaction）。

## 3. Admin 端 IA（11 个一级入口，不混 Owner 页面）

```
Overview · Pilot · Users · Pets · Safety · AI · Devices · Integrations · Audit · Incidents · Feature Flags
```

- Safety：红旗规则 / triage 审计 / 医疗安全事件。
- AI：ai-gateway 状态 / AI 输出审计（model/prompt/schema version）。
- Devices：设备 registry / 数据质量 / source 审计（Admin 视角）。
- Feature Flags：含 capabilities（原 /capabilities 折叠）。

## 4. Professional 端 IA（新独立客户端 apps/pro，分角色）

```
Vet：      Assigned Pets · Pet Brief · Vet Brief · Evidence · Timeline · Outcome
Trainer：  Assigned Pets · Behavior · Training · Plan · Progress
Service：  Assigned Pets · Care Card · Tasks · Medication · Updates · Incident
```

- 角色由账号 grant 决定；Behavior/Training 在 Pro 端显示专业术语 ABC（Antecedent/Behavior/Consequence）。
- Vet Brief 是信息整理，不是兽医诊断。

## 5. Mini 端 IA（微信小程序，Bottom Tab ≤5）

```
Tab: 今日(index) · 时间线(timeline) · 健康(health) · 助手(agent) · 我的(mine)
页内: Quick Log Sheet（今日页）/ Companion 入口卡（今日页）/ 任务 / 用药 / 行为 / 照护 / 训练 / 通知 / 宠物
```

- 信息密度比 Desktop 更低；避免大表格 / 复杂侧栏 / 多层 Modal；使用 Bottom Tab + Sheet + Fast Input。
- 历史页面（pets/tasks/training/behavior/medication/notifications）保留，从对应 tab 二级进入。

## 6. Mobile 端 IA（Expo，Bottom Tab 5）

```
Tab: 今日(Today) · 时间线(Timeline) · 在家(Monitoring) · 陪伴(Companion) · 我的(Me)
屏内: Quick Log（modal）/ 通知（Today+Me 入口）/ 相机（Quick Log/Health 证据）/ 健康
```

- Mobile 优先屏：Today / Quick Log / Monitoring / Companion / Notifications / Camera / Health / Timeline。

## 7. H5 Share（无 app 要求）

```
/share/vet-brief/[token] · /share/care-card/[token] · Professional Share
```

- Mobile-first、Revocable、Expiry visible、No app required。

## 8. 路由冻结（Web，Stage E2E 契约保护）

必须保持可用（现有 12/12 E2E 依赖）：`/`（Today）、`/timeline`、`/tasks`、`/settings`、`/health`、`/health/[id]`、`/medication`、`/care`、`/behavior`、`/share/vet-brief/[token]`、`/register`、`/login`、`/forgot-password`、`/reset-password`、`/offline`、404（"页面不存在"）。

新增：`/welfare`、`/social`、`/monitoring`、`/companion`、`/agent`、`/pets/[id]`（Pet Profile）。

- `/search` 保留路由（Find 能力入口之一），Agent 页内提供 Find tab；不删除路由避免破坏书签。
- 顶层导航标签保持：今日 / 时间线 / 宠物 / 助手 / 我的（E2E `.topnav` 契约）。
