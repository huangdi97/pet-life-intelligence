# RESPONSIVE_GUIDELINES — Stage H 冻结版

> 状态：`FROZEN（Stage H）` · Breakpoints：xs 360 / sm 390 / md 768 / lg 1024 / xl 1440（tokens.breakpoint）

## 1. 必须验证的断点（§64/§90）

每个核心页面至少检查：**360 / 390 / 768 / 1440**（全量验证加 1024）。
检查项：overflow / alignment / spacing / font / navigation / modal / sheet / keyboard / safe area。

## 2. 断点行为规则

| 断点 | 布局 |
|---|---|
| <768（xs/sm） | 单列；TopNav 折叠为底部/精简；QuickLog/Sheet 底部化；表格转卡片 |
| ≥768（md） | 双列栅格；侧栏内容上提；表格可用 |
| ≥1024（lg） | 12 列栅格完整；Admin 侧栏常驻 |
| ≥1440（xl） | container_max 1200 居中，不无限拉伸 |

## 3. 各端规则

- **Web**：fluid 360→1440；核心页（Today/Timeline/Health/Vet Brief/Behavior/Monitoring/Companion/Admin/Pro）全部通过 UI QA 断点检查；截图回归 Desktop(1440) + Mobile(390)。
- **Mini**：以 390 为设计基准；信息密度低于 Desktop；无大表格/侧栏/多层 Modal。
- **Mobile**：以 390 为基准；safe area（刘海/手势条）适配。
- **Admin**：768 以下侧栏折叠；表格在 <768 转卡片或横向滚动容器。
- **Pro**：同 Web；打印样式（@media print）隐藏导航。

## 4. 实现规范

- 断点 tokens：`var(--pli-breakpoint-*)`（由 ui-tokens 生成）。
- 媒体查询统一写法：`@media (min-width: 768px)`（mobile-first）。
- 禁止 fixed px 布局宽度（除 icon/头像尺寸档）。
- 触控目标 ≥44px（tokens.touch）。

## 5. 验证记录

见 `reports/STAGE_H_RESPONSIVE_AUDIT.md`（360/390/768/1024/1440 逐页记录 + 已知问题）。
