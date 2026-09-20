# COMPONENT_INVENTORY — Stage H 冻结版

> 状态：`FROZEN（Stage H）` · 实现：`packages/ui-kit`（Web/Pro 共用，React DOM）· Mini/Mobile 以 tokens 值镜像自实现
> 每个组件定义：Props / Variants / States / Responsive / Accessibility / Loading / Error

## 组件清单（packages/ui-kit/src）

| # | Component | Props（核心） | Variants | States | Responsive | Accessibility | Loading/Error |
|---|---|---|---|---|---|---|---|
| 1 | PetAvatar | src?, name, size | sm/md/lg | loaded/fallback 首字母 | 固定尺寸档 | aria-label=宠物名 | fallback 自动 |
| 2 | PetSwitcher | pets, value, onChange | topnav/page | ready/empty | 原生 select（E2E 契约） | label 可见 | empty（无宠物） |
| 3 | QuickLogSheet | open, onClose, types, onQuickLog, saving | full/fast | open/closed/saving | ≤768 底部 sheet 优先 | aria-modal、焦点管理 | saving 防重复提交 |
| 4 | EventCard | event, variant | compact/expanded | populated/partial | fluid | 语义结构 | payload 缺字段容错 |
| 5 | TimelineItem | icon/title/timestamp/actor/source/summary/evidence/outcome/version | real/ai（AI provenance → `tl-item tl-ai` 视觉区分） | populated | fluid | 时间/角色语义标注 | — |
| 6 | MetricCard | label/value/unit/trend? | default/inline | populated | 栅格自适应 | — | — |
| 7 | TrendCard | label/direction/summary/evidence | up/down/flat | populated | 栅格自适应 | 方向不只靠颜色（箭头+文字） | — |
| 8 | RiskBanner | level, reasons?, next_action? | NORMAL/NOTICE/MONITOR/VET_SOON/URGENT/EMERGENCY | populated | fluid | 中文标签+secondary English+图标（颜色不是唯一表达） | — |
| 9 | RedFlagReason | items[] | list | populated/empty | fluid | 规则 ID 可见（可追踪） | empty |
| 10 | NextActionCard | action, cta, onCta | default | populated | fluid | 按钮语义 | — |
| 11 | EmergencyAction | instructions, contact? | emergency | populated | fluid | 紧急语义（role=alert） | — |
| 12 | EvidenceList | items[] | media/observation | populated/empty | fluid | 列表语义 | empty |
| 13 | EvidenceCard | artifact/observation | image/video/audio/note | populated | fluid | alt 文本 | 加载失败占位 |
| 14 | VetBriefSection | title, children | 各分区 | populated | fluid + print | 打印友好（@media print） | — |
| 15 | CareTask | task, onComplete? | default | open/completed/conflict | fluid | 状态语义 | — |
| 16 | PersonChip | name, role | owner/family/caregiver/vet/trainer/service | populated | fluid | 角色语义 | — |
| 17 | DeviceStatus | name, state, last_sync?, demo? | connected/offline/degraded/needs_review/unknown | populated | fluid | 中文标签+状态点（颜色不是唯一表达）；demo 设备显 DEMO 标签 | unknown 兜底 |
| 18 | InteractionCard | title, time, notes, feedback | social 互动 | populated | fluid | — | — |
| 19 | CompanionControl | label, icon, prototype, disabled | voice/treat/play/cue | ready/prototype/disabled | fluid | 按钮语义；prototype 显 PROTOTYPE 且不伪装成功 | — |
| 20 | AIAnswer | facts[], inference?, sources[], uncertainty?, action? | default | populated/empty | fluid | “AI 生成”徽章 + Citation 可点击 | empty |
| 21 | CitationChip | label, eventId?, onClick | default | populated | inline | 链接语义 | — |
| 22 | ConsentPanel | purposes[], onChange | default | granted/denied/partial | fluid | 开关语义 | — |
| 23 | EmptyState | title, desc, action? | default | empty | fluid | role=status | — |
| 24 | ErrorState | title, desc, onRetry | default | error | fluid | role=alert；人类语言（禁 raw codes） | — |
| 25 | Skeleton | variant | line/card | loading | fluid | aria-hidden + role=status 容器 | — |
| 26 | Toast | message, visible, kind | info/emergency | visible/hidden | 顶部/底部 | role=status、role=alert | — |
| 27 | Modal | open, onClose, title, children | default | open/closed | fluid | aria-modal + 焦点陷阱 | — |
| 28 | Sheet | open, onClose, title, children | bottom | open/closed | ≤768 底部 | aria-modal | — |
| 29 | State | state, error?, empty?, onRetry?, children | 页面级状态容器 | loading/denied/error/empty/ready | fluid | role=status/alert | 统一入口 |

## Health 专用独立组件（§21 医疗安全）

RiskBanner / RedFlagReason / NextActionCard / EmergencyAction / EvidenceList —— 医疗安全信息必须使用这些独立组件呈现，**不得**埋在普通 AI 对话文本里；Emergency 不得仅以文本形式出现在 AI 回答中。

## 接入范围

- **Web / Pro**：直接 import `@pli/ui-kit`（transpilePackages）+ `@pli/ui-kit/styles.css` + `@pli/ui-tokens/css`。
- **Mini**：`apps/mini/src/styles/tokens.scss` 镜像 token 值；组件以 Taro 原语自实现（同名语义类）。
- **Mobile**：`apps/mobile/src/tokens.ts` 镜像 token 值；组件以 RN 原语自实现。
- **Admin**：`@pli/ui-tokens/css` + 自有 globals（不混 Owner 组件）。
