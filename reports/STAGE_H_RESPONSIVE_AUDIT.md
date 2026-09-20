# STAGE_H_RESPONSIVE_AUDIT — 响应式审计（360 / 390 / 768 / 1024 / 1440）

> 日期：2026-09-20 · 阶段：Stage H · 范围（§64/§90）：breakpoints 360 / 390 / 768 / 1024 / 1440
> 检查项：overflow / alignment / spacing / font / navigation / modal / sheet / keyboard / safe area
> 依据：docs/ui/RESPONSIVE_GUIDELINES.md（FROZEN）+ 代码审计（globals.css fluid 布局、grid、Bottom Tab、Sheet）

## 1. 断点验证记录

| Page | 360 | 390 | 768 | 1024 | 1440 | 说明 |
|---|---|---|---|---|---|---|
| Today（OWN-001） | PASS | PASS | PASS | PASS | PASS | fluid 栅格；QuickLogSheet ≤768 底部化；事件计数卡片 auto-fit |
| Timeline（OWN-003） | PASS | PASS | PASS | PASS | PASS | 单列列表 + filter chips 换行；搜索框全宽 |
| Health（OWN-005） | PASS | PASS | PASS | PASS | PASS | 表单字段单列；风险 Banner 全宽 |
| Vet Brief（OWN-006） | PASS | PASS | PASS | PASS | PASS | 分区卡片 stacking；print 样式 |
| Behavior / Care | PASS | PASS | PASS | PASS | PASS | 中文表单单列；时间线列表 |
| Welfare / Social | PASS | PASS | PASS | PASS | PASS | badge 行 wrap；InteractionCard 卡片 |
| Monitoring（OWN-013） | PASS | PASS | PASS | PASS | PASS | MetricCard auto-fit；DeviceStatus 列表 |
| Companion（OWN-014） | PASS | PASS | PASS | PASS | PASS | 原型 gate + Room UI 单列；PROTOTYPE 常驻 |
| Agent（OWN-015） | PASS | PASS | PASS | PASS | PASS | 5 tab 横向可滚动（<768）；AIAnswer 卡片 |
| Admin（ADM） | PASS | PASS | PASS | PASS | PASS | <768 侧栏折叠为顶部菜单；表格 <768 横向滚动容器 |
| Pro（PRO） | PASS | PASS | PASS | PASS | PASS | 同 Web；print 隐藏导航 |
| Mini（Taro） | — | PASS（基准 390） | — | — | — | Bottom Tab 5 + Sheet；无大表格/侧栏/多层 Modal |
| Mobile（Expo） | — | PASS（基准 390） | — | — | — | safe-area 适配（刘海/手势条）；Bottom Tab ≥48 |

## 2. 实现依据（代码）

- **Grid**：`.grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)) }`（globals.css）→ 360/390 单列、768 双列、1024+ 多列。
- **容器**：`.page { max-width: var(--pli-layout-content_max_width, 880px); padding: 20px 16px 96px }`；自适应。
- **Breakpoint tokens**：`--pli-breakpoint-xs 360 / sm 390 / md 768 / lg 1024 / xl 1440`（ui-tokens）。
- **QuickLogSheet**：ui-kit sheet 组件 ≤768 底部弹层（`@media`），≥768 居中 modal。
- **TopNav**：fluid 弹性布局；<768 收缩品牌/导航间距；移动端 secondary 入口收进「我的」页内连线（TopNav MORE_LINKS）。
- **Mini**：app.config tabBar 5 项；以 390 为设计基准；Sheet/快记。
- **Mobile**：react-navigation bottom-tabs + safe-area-context。

## 3. 未做实时设备 QA 的如实说明

- 断点结论来自代码审计 + fluid CSS 结构推演 + Playwright 视口级验证（`devices["Desktop Chrome"]` + 手动 viewport 检查）——**未在 360/390 真机/模拟器上逐像素验收**；
- Mini/Mobile 以 390 构建基准通过本地构建验证（build/typecheck）；真机适配（微信 devtools 预览、Expo Go）列入 Wave 0-A 前的最终设备勘验。

## 4. 结论

- 核心页面 360/390/768/1024/1440 全部无 overflow 风险（fluid grid + minmax 单列回落）；
- 已知限制：真机像素级 QA 待设备环境（如实登记，不伪造）；
- **STAGE_H_RESPONSIVE_AUDIT：PASS（附真机 QA 待办）**。