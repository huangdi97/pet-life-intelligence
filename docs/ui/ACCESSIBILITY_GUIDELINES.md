# ACCESSIBILITY_GUIDELINES — Stage H 冻结版

> 状态：`FROZEN（Stage H）` · 至少覆盖（§77）：Keyboard Navigation / Visible Focus / Contrast / ARIA Labels / Screen Reader Basics / Tap Target / Font Scaling / Reduced Motion

## 1. 要求

| 项 | 规范 |
|---|---|
| Keyboard Navigation | 所有交互元素 Tab 可达；Modal/Sheet 焦点陷阱 + Esc 关闭；顺序符合视觉 |
| Visible Focus | `:focus-visible` 使用 `--pli-elev-focus`（3px ring）；不删除 outline |
| Contrast | 正文 ≥4.5:1；大字 ≥3:1；语义色前景/背景对已按此校准 |
| ARIA Labels | 图标按钮必须有 aria-label；状态容器 role=status/alert；Modal aria-modal |
| Screen Reader Basics | 语义 HTML（nav/main/main/h1-h3/list）；时间线项目含时间/角色文本标注 |
| Tap Target | ≥44×44px（tokens.touch） |
| Font Scaling | 相对单位（rem/em 或 px+zoom 兼容）；支持浏览器字号缩放不破版 |
| Reduced Motion | `@media (prefers-reduced-motion: reduce)` 关闭非必要动画/过渡 |

## 2. 组件级落实

- RiskBanner：颜色不是唯一表达（图标+中文标签+English secondary）。
- TrendCard：方向=箭头+文字，不只颜色。
- DeviceStatus：状态点+文字标签。
- TimelineItem：AI 生成与真实记录的区分有文本徽章（不只颜色）。
- QuickLogSheet/Sheet/Modal：aria-modal、焦点管理、Esc 关闭。
- Toast：info→role=status；emergency→role=alert。

## 3. 验证记录

见 `reports/STAGE_H_ACCESSIBILITY_AUDIT.md`（逐项检查 + 已知问题）。

## 4. H.1 更新（2026-09-20）

- **Reduced Motion 已全局实现**：`apps/web/app/globals.css` 与 `apps/mini/src/app.scss` 顶层增加
  `@media (prefers-reduced-motion: reduce)` —— 关闭 animation / transition / scroll-behavior，
  spinner 与 skeleton 静态化，btn:active 无位移；Mobile（Expo）无动画实现（N/A）。
- 验证：web/mini typecheck 0 · mini build（Taro weapp）Compiled successfully · 审计见
  `reports/STAGE_H_ACCESSIBILITY_AUDIT.md`（H.1 复查：LIMITATION 归零）。
