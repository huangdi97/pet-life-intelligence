# MASTER_PAGE_INVENTORY — Stage H 冻结版

> 状态：`FROZEN（Stage H）` · Page ID 规范：OWN-xxx / ADM-xxx / PRO-xxx / MIN-xxx / MOB-xxx / SHR-xxx
> States 列缩写：L=Loading S=Skeleton E=Empty P=Partial F=Populated X=Error O=Offline D=Permission Denied N=Not Found FD=Feature Disabled EB=External Blocked SB=Safety Blocked

## Owner Web（apps/web）

| Page ID | Name | Route | Role | Feature IDs | Primary JTBD | Entry | Primary CTA | Secondary CTA | API | Event | Risk | Perm | States | Responsive |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| OWN-001 | Today | `/` | owner | PLI-017/018/026/030/033/034 | 回答五问：现在怎么样/做什么/刚发生/注意什么/能做什么 | TopNav 默认页 | + 快速记录 | 看看它 · 查看时间线 | /pets /pets/{id}/today /pets/{id}/tasks | timeline read | low | household | L E P F X O N | fluid 360-1440 |
| OWN-002 | Quick Log | Sheet( OWN-001 ) | owner | PLI-018~025/031 | 常见记录 ≤10 秒 | Today 主 CTA | tap→minimum→save | 高级字段展开 | /pets/{id}/events | event create | low | owner+grants | L X O(草稿) | sheet ≤768 优先 |
| OWN-003 | Timeline | `/timeline` | owner | PLI-046/时间线域 | 完整记录 What/When/Who/Source/Evidence/Outcome | TopNav | 搜索 | 筛选 chips | /pets/{id}/events /events/search | timeline read | low | household+grants | L S E F X O | fluid 360-1440 |
| OWN-004 | Pet Profile | `/pets` `/pets/new` `/pets/[id]` | owner | PLI-001/002/003/013/015/016 | 档案管理（Identity/Health/Behavior/Care/Baseline/Devices/Consent/Data） | TopNav 宠物 | 创建宠物 | 切换宠物 | /pets /pets/{id}/consents | pet create/update | low-med | owner | L E F X N | fluid |
| OWN-005 | Health | `/health` `/health/[id]` | owner | PLI-049~058 | 发现异常→追踪→分级→下一步 | Pet 二级 | 打开健康事件 | 发现异常 | /pets/{id}/health-events /triage | health create | high | owner+grants | L E F X SB D N | fluid |
| OWN-006 | Vet Brief | health/[id] 区 + `/share/vet-brief/[token]` | owner+vet | PLI-055/056 | 面向专业人员的就诊摘要 | Health 内 CTA | 生成 Vet Brief | 获取分享链接 | /vet-briefs /share | vet_brief issued | med | owner+vet | L F X D | fluid + print |
| OWN-007 | Medication | `/medication` | owner | PLI-059/060/ Health 用药 | Plan/Scheduled/Given/Skipped/Missed/Duplicate 区分 | Pet 二级 | 创建计划 | 记录给药 | /pets/{id}/medication-plans | med admin | high | owner（剂量不可 Agent 改） | L E F X D | fluid |
| OWN-008 | Care | `/care` | owner+family+sitter | PLI-035~048 | Care Network/交接/临时权限(expires_at) | Pet 二级 | 创建交接 | 生成 Care Card | /pets/{id}/grants /handoffs | grant/handoff | med | household | L E F X D | fluid |
| OWN-009 | Behavior | `/behavior` | owner | PLI 行为域 | 发生前→做了什么→之后（中文引导，不强迫 ABC） | Pet 二级 | 保存行为事件 | 筛选 | /pets/{id}/behavior-events | behavior create | low | owner+grants | L E F X D | fluid |
| OWN-010 | Training | `/training` | owner | PLI 训练域 | Goal/Plan/Session/Progress/Outcome | Pet 二级 | 创建目标 | 记录训练 | /pets/{id}/training-goals | training create | low | owner+grants | L E F X D | fluid |
| OWN-011 | Welfare | `/welfare`（新） | owner | PLI 福祉域 | 生活质量/舒适/压力/活动/丰富化（Evidence/Trend/Uncertainty） | Pet 二级 | 记录观察 | — | /pets/{id}/events welfare.* | welfare read | low | owner+grants | L E F X D | fluid |
| OWN-012 | Social | `/social`（新） | owner | PLI 社交域 | 关系图谱/互动历史/安全/反馈（非 Feed） | Pet 二级 | 记录互动 | — | /pets/{id}/events social.* | social read | low | owner | L E F X D | fluid |
| OWN-013 | Monitoring | `/monitoring`（新） | owner | PLI 设备域/PLI-030 | 在哪/最近发生/今天状态/设备正常/历史对比 | Today 入口 + Pet 二级 | 看看它 | 设备管理 | /pets/{id}/today /devices | device read | low-med | owner | L E P F X EB O | fluid |
| OWN-014 | Companion | `/companion`（新，原型） | owner | PLI Companion | Observe/Presence/Enrichment/Learned（feature-flagged） | Today 入口 | 讲话 | 零食 · 玩耍 | /companion/* (prototype) | companion.* | med | owner + welfare guard | L E F X FD EB | fluid |
| OWN-015 | Agent | `/agent`（新） | owner | PLI Agent 域/PLI-033 | Ask/Brief/Find/Plan/Explain；AI Answer: Facts/Inference/Sources/Uncertainty/Action | TopNav | 提问 | 建议 chips | /agent/* /events/search | ai query | med | owner | L E F X EB D | fluid |
| OWN-016 | Notifications | `/notifications` | all roles | PLI-047/通知 | 统一 Tasks/Care/Health/Medication/Monitoring/System | Me + Today 铃铛 | 标记已读 | 分类筛选 | /households/{hh}/notifications | notification read | low | household | L E F X O | fluid |
| OWN-017 | Settings | `/settings` | owner | PLI-015/016/Me 域 | Household/Notifications/Privacy/Data/设置 + 试点反馈 | TopNav 我的 | 保存 | 管理 | /consents /me/* | consent change | med | owner | L F X D | fluid |
| OWN-018 | Search | `/search` | owner | PLI Agent Find | 全局查找事件/内容 | Agent Find | 搜索 | — | /events/search | search query | low | household | L E F X | fluid |
| OWN-019 | Login/Register | `/login` `/register` `/forgot-password` `/reset-password` | anonymous | PLI-010 | 登录/注册(邀请码)/找回/重置 | direct | 登录 · 注册 | 忘记密码 | /auth/* | auth events | med | public | L F X | fluid |
| OWN-020 | Offline | `/offline` | any | PWA | 离线 shell + 草稿说明 | SW fallback | 重试 | — | — | — | low | public | E O | fluid |
| OWN-021 | 404 | not-found | any | — | 页面不存在 | direct | 回到今日 | — | — | — | low | public | N | fluid |

## Admin（apps/admin）

| Page ID | Name | Route | Feature IDs | JTBD | Primary CTA | API | States |
|---|---|---|---|---|---|---|---|
| ADM-001 | Overview | `/` | PLI-016 域 | 平台总览（users/pets/events/safety/ai/pilot 实时卡） | 刷新 | /admin/* /pilot/status | L F X |
| ADM-002 | Pilot | `/pilot` | Wave0 | Pilot 状态/invited/registered/activated + orgs | 刷新 | /pilot/status /pilot/orgs | L E F X |
| ADM-003 | Users | `/users` | PLI-010 | 用户列表/grants/is_demo 标记 | 查询 | /admin/users | L E F X |
| ADM-004 | Pets | `/pets` | PLI-001 | 宠物列表/creator/标记 | 查询 | /admin/pets | L E F X |
| ADM-005 | Safety | `/safety` | PLI-053/054 | 红旗规则/triage 审计/医疗安全事件 | 查询 | /admin/safety | L E F X |
| ADM-006 | AI | `/ai` | PLI-9 AI 域 | ai-gateway 状态/AI 输出审计(model/prompt/version) | 查询 | /admin/ai | L E F X EB |
| ADM-007 | Devices | `/devices` | 设备域 | 设备 registry/数据质量/source | 查询 | /admin/devices | L E F X EB |
| ADM-008 | Audit | `/audit` | PLI-046 | 谁改了什么（审计流） | 查询 | /admin/audit | L E F X |
| ADM-009 | Incidents | `/incidents` | 安全域 | 事件/事故跟踪 | 查询 | /admin/incidents | L E F X |
| ADM-010 | Feature Flags | `/flags` | Platform | flags + capabilities（折叠 /capabilities） | 切换 | /admin/flags /capabilities | L F X |

## Professional（apps/pro 新建）

| Page ID | Name | Route | 角色 | JTBD | Primary CTA | API |
|---|---|---|---|---|---|---|
| PRO-001 | Assigned Pets | `/` | vet/trainer/service | 授权宠物列表（按 grant） | 查看 | /me/pets /grants |
| PRO-002 | Pet Brief | `/pets/[id]` | vet/trainer/service | 宠物简况（Identity/Health/Behavior/Care 分区） | 查看时间线 | /pets/{id} /today |
| PRO-003 | Vet Brief | `/vet-briefs` `/vet-briefs/[id]` | vet | 就诊摘要审阅（Provenance/Risk） | 审阅 | /vet-briefs |
| PRO-004 | Evidence | pets/[id] 分区 | vet | 媒体/观察证据列表 | 查看 | /pets/{id}/health-events /artifacts |
| PRO-005 | Timeline | `/pets/[id]/timeline` | vet/trainer | 专业时间线（ABC 显式） | 筛选 | /pets/{id}/events |
| PRO-006 | Outcome | `/pets/[id]/outcome` | vet | 结局记录（IMPROVED/等） | 记录结局 | /pets/{id}/health-events outcome |
| PRO-007 | Behavior(Trainer) | `/behavior` | trainer | ABC 结构行为审阅 | 记录 | /pets/{id}/behavior-events |
| PRO-008 | Training(Trainer) | `/training` | trainer | Plan/Progress | 记录 | /pets/{id}/training-goals |
| PRO-009 | Care Card(Service) | `/care-cards` | service | 照护卡执行 | 更新 | /pets/{id}/handoffs |
| PRO-010 | Tasks(Service) | `/tasks` | service | 任务执行/用药/更新/事故 | 完成 | /pets/{id}/tasks |

## Mini（apps/mini）

| Page ID | Name | Route | JTBD |
|---|---|---|---|
| MIN-001 | Today(今日) | pages/index | 五问 + Quick Log Sheet + Companion 入口 |
| MIN-002 | Timeline | pages/timeline | 时间线（低密度） |
| MIN-003 | Health | pages/health | 健康流程 + 用药入口 |
| MIN-004 | Agent | pages/agent | Ask/Brief/Find/Plan/Explain |
| MIN-005 | Mine(我的) | pages/mine | 通知/宠物/设置 |
| MIN-006 | Medication | pages/medication | 用药状态 |
| MIN-007 | Behavior | pages/behavior | 行为记录（中文引导） |
| MIN-008 | Care | pages/care | 照护/交接 |
| MIN-009 | Tasks | pages/tasks | 今日任务 |
| MIN-010 | Training | pages/training | 训练目标/进度 |
| MIN-011 | Pets | pages/pets | 宠物切换/创建 |
| MIN-012 | Notifications | pages/notifications | 通知列表 |
| MIN-013 | Companion | pages/companion | Observe / Presence / Enrichment / Learned；真实设备状态，空态不伪装在线 |
| MIN-014 | Welfare | pages/welfare | 观察与证据优先的生活质量/舒适/压力恢复/环境/丰富化 |
| MIN-015 | Social | pages/social | 关系与真实互动历史；不做伪精确兼容度 |
| MIN-016 | Monitoring | pages/monitoring | 真实设备连接/离线/无设备状态；不伪装 LIVE |

## Mobile（apps/mobile）

| Page ID | Name | Screen | JTBD |
|---|---|---|---|
| MOB-001 | Today | TodayScreen | Pet-first 五问 + Quick Log + 当前状态/关注/最近记忆 |
| MOB-002 | Quick Log | QuickLogScreen(modal) | ≤10 秒高频生活记录 |
| MOB-003 | Timeline | TimelineScreen | 生命时间线 + 筛选 + 来源 |
| MOB-004 | Monitoring | MonitoringScreen | 真实设备连接/无设备/离线/错误状态 |
| MOB-005 | Companion | CompanionScreen | Observe/Presence/Enrichment/Learned；不伪装 LIVE |
| MOB-006 | Notifications | NotificationsScreen | 统一通知与注意力入口 |
| MOB-007 | Health | HealthScreen | 读先于写：近期状态/变化/记录/风险分级 |
| MOB-008 | Me | MeScreen | 家庭/宠物/常用/隐私/数据/应用 |
| MOB-009 | Pet World | PetScreen | 个体宠物主页 + 六生活域 + 朋友/照护/生命入口 |
| MOB-010 | Assistant | AssistantScreen | Pet-aware Ask/Brief/Find/Plan/Explain |
| MOB-011 | Life View | LifeViewScreen | Warm Reality Field + Individual Twin + 此刻/趋势/外观 |
| MOB-012 | Behavior | BehaviorScreen | 真实行为观察；Owner 语言优先 |
| MOB-013 | Training | TrainingScreen | 目标/训练记录/进展 |
| MOB-014 | Welfare | WelfareScreen | Evidence/Trend/Uncertainty；不做情绪分数 |
| MOB-015 | Social | SocialScreen | 关系/朋友/真实互动，不做伪精确兼容度 |
| MOB-016 | Medication | MedicationScreen | 处方来源约束的计划/待给药/给药历史 |
| MOB-017 | Care | CareScreen | 临时交接/限定权限/到期/最小照护卡 |
| MOB-018 | Twin Capture | PetTwinCaptureScreen | 个体形象素材采集/状态 |
| MOB-019 | Twin Review | PetTwinReviewScreen | Front/Side/Rear Identity Review + 不像阻断激活 |
| MOB-020 | Twin Versions | PetTwinVersionScreen | 3D 形象版本/激活/回看 |
| MOB-021 | Health Detail | HealthDetailScreen | 单条健康事件详情：症状/时间/分级/处置/证据/来源/结果 |
| MOB-022 | Vet Brief | HealthDetailScreen 内 Vet Brief 流 | 从真实健康事件生成可分享就诊摘要；明确来源、撤销与时效 |

## H5 Share（apps/web/share）

| Page ID | Name | Route | JTBD |
|---|---|---|---|
| SHR-001 | Vet Brief Share | /share/vet-brief/[token] | 专业阅读（mobile-first/revocable/expiry/无 app） |
| SHR-002 | Care Card Share | /share/care-card/[token] | 照护卡阅读（同上） |


## R5.3 cross-client addendum（2026-10-04）

Stage H 的 Page ID 与功能责任继续有效；R5.3 不重新编号既有页面，而是完成 Owner 体验跨端收口：

- Web / Mobile / Mini 的一级 IA 均保持 **Today / Timeline / Pet / Assistant / Me**。
- Welfare / Social / Monitoring / Companion 均为 Pet / Today 情境二级能力，不挤占一级导航。
- Mini 的 Pet World 现在与 Web/Mobile 对齐六个生活域：Life / Health / Behavior / Training / Welfare / Social；Medication 归健康照护语境，Monitoring / Companion 归陪伴与在家语境。
- Mini Life View 保持轻量模式：照片/物种视觉 + 此刻/生命轨迹；高保真交互 3D 在支持的 Web/Android 客户端呈现。本端不得声称已加载本地 3D。
- Companion Owner UI 不再出现 feature flag、PROTOTYPE 或内部实现术语；没有硬件时显示诚实空态。
- 以上为产品语义/页面覆盖补充，不改变 v3.4-R1 母版优先级，也不意味着 Human Visual Acceptance。


## R5.4 final design closure addendum（2026-10-04）

R5.4 does not renumber the Stage H catalog; it closes the final design semantics through `docs/product/R5_4_FINAL_DESIGN_CLOSURE.md`.

- Owner primary IA is frozen at **Today / Timeline / Pet / Assistant / Me**.
- Mobile now explicitly includes **Health Detail** and the **Vet Brief** flow as first-class implemented surfaces.
- All owner pages inherit the same truthful state contract: Loading / Empty / Partial / Populated / Error / Offline / Permission / Not Found / External Unavailable / Safety Blocked as applicable.
- Required final visual evidence is a release gate. A missing required screenshot/contact-sheet source is a failure, not a placeholder.
- Product Twin capability remains full on capable Web/Android and lightweight/honest on Mini.
- No page-inventory completion claim changes `HUMAN_VISUAL_ACCEPTANCE = PENDING`.


## R5.5 implementation-master addendum（2026-10-04）

The page catalog is now bound to `docs/product/R5_5_FINAL_PRODUCT_UI_IMPLEMENTATION_MASTER.md`. Every listed owner surface must satisfy the shared page-completion contract, truthful state model, one-primary-action hierarchy, accessibility requirements and fresh-evidence rule defined there. This addendum changes no Page IDs and does not imply Human Visual Acceptance.
