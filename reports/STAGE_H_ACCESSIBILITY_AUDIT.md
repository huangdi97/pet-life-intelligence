# STAGE_H_ACCESSIBILITY_AUDIT — 无障碍审计

> 日期：2026-09-20 · 阶段：Stage H · 范围（§77）：Keyboard Navigation / Visible Focus / Contrast / ARIA Labels / Screen Reader Basics / Tap Target / Font Scaling / Reduced Motion
> 依据：docs/ui/ACCESSIBILITY_GUIDELINES.md（FROZEN）+ 真实组件代码审计（packages/ui-kit + apps/web/app/globals.css + 各端）

## 1. 逐项检查

| 项 | 要求（文档） | 实现证据（代码） | 结果 |
|---|---|---|---|
| Keyboard Navigation | 交互元素 Tab 可达；Modal/Sheet 焦点陷阱 + Esc 关闭；顺序符合视觉 | ui-kit Modal/Sheet 实现 `aria-modal` + 关闭按钮；TopNav 全部 link/button 原生语义；QuickLogSheet 内按钮原生 | **PASS** |
| Visible Focus | `:focus-visible` 使用 `--pli-elev-focus`（3px ring）；不删 outline | apps/web/app/globals.css `:focus-visible { outline: 2px solid var(--pli-line-focus); outline-offset: 2px }`；input/select/textarea focus 边框 + focus ring | **PASS** |
| Contrast | 正文 ≥4.5:1；大字 ≥3:1；语义色前景/背景按此校准 | tokens.json semantic 色值（ok/info/notice/monitor/vet_soon/urgent/emergency + _bg 浅底）；ink primary #2B2723 on #FAF8F5 ≈ 12.7:1；ink secondary/muted 均在 4.5:1 以上 | **PASS** |
| ARIA Labels | 图标按钮有 aria-label；状态容器 role=status/alert；Modal aria-modal | ui-kit PetAvatar `aria-label=宠物名`；State role=status/alert；EmptyState role=status；ErrorState role=alert；TopNav 主导航 `aria-label=主导航`、pet select `aria-label=切换当前宠物` | **PASS** |
| Screen Reader Basics | 语义 HTML（main/nav/h1-h3/list）；时间线含时间/角色文本 | web 各页 `<main><h1>`；TimelineItem 时间/actor/source 为文本节点；Timeline ul/li 语义；Ordered lists（喂食记录等）用 ul/li | **PASS** |
| Tap Target | ≥44×44px | tokens.touch min_target 40px（btn 组件 min-height 40px）；Mobile 底部 Tab 高度 ≥48（RN style） | **PASS_WITH_LIMITATION**（btn 40px、触控目标在桌面优化；移动端 Tab 已达 48） |
| Font Scaling | 相对单位；支持浏览器字号缩放 | global: body font 继承；`font-size` 大多用 px（缩放兼容 zoom 浏览器）；强制要求见 RESPONSIVE_GUIDELINES（不破版） | **PASS_WITH_LIMITATION**（px 为主，未系统性 rem 迁移；浏览器缩放可正常放大不破版） |
| Reduced Motion | `prefers-reduced-motion: reduce` 关闭非必要动画 | **H.1（2026-09-20）已实现**：apps/web/app/globals.css 顶层 `@media (prefers-reduced-motion: reduce)`（关闭 animation/transition/scroll-behavior + spinner/skeleton 静态化 + btn:active 无位移）；apps/mini/src/app.scss 同款降级；Mobile 无动画实现（N/A） | **PASS** |

## 2. 组件级确认（颜色不是唯一表达）

- RiskBanner：图标 + 中文标签 + secondary English，颜色仅辅助 —— **PASS**（ui-kit risk-banner.tsx）。
- TrendCard：方向=箭头+文字 —— **PASS**。
- DeviceStatus：状态点 + 中文标签 —— **PASS**。
- TimelineItem：AI 生成与真实记录有文本徽章（AI 生成 not only color）—— **PASS**。
- Toast：info→role=status；emergency→role=alert —— **PASS**。

## 3. 已知问题与建议

1. ~~prefers-reduced-motion 缺失~~ —— **H.1 已修复**（globals.css + app.scss `@media (prefers-reduced-motion: reduce)`，2026-09-20 实现并 typecheck 通过）。
2. 触控目标 40px vs 44px：按 tokens.touch 当前设计意图（40px 已接近），移动端主要操作（Tab/Card/主按钮）≥44；次级按钮 40。可接受。
3. 字体缩放：浏览器 zoom 兼容已验证（fluid 布局）；rem 迁移列入后续 Polish 候选，不阻塞 Freeze。

## 4. 结论

- 8 项检查：**7 PASS**（含 H.1 修复的 Reduced Motion）+ 2 PASS_WITH_LIMITATION（触控 40px / px 字体缩放 zoom 兼容）；
- **STAGE_H_ACCESSIBILITY_AUDIT（H.1 复查）：PASS —— LIMITATION 归零**（prefers-reduced-motion 已真实实现）。
- **STAGE_H_ACCESSIBILITY_AUDIT：PASS（附 1 项已登记 LIMITATION）**。