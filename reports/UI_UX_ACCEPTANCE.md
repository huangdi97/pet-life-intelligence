# UI_UX_ACCEPTANCE — UI/UX 验收

- Date: 2026-09-14
- 验收方式：浏览器 E2E（真实 Chromium）+ 页面快照 + 人工式脚本走查记录。

## 设计系统（Phase C）

- `packages/ui-tokens`：Color / Typography / Spacing / Radius / Elevation / Motion / Icon / Risk Status / Semantic State。
- 视觉方向：温暖 / 专业 / 可信 / 平静 / 健康科技（深绿 sage + 暖中性底，非宠物商城/卡通/HIS/AI 蓝）。
- 风险状态六档：NORMAL / NOTICE / MONITOR / VET_SOON / URGENT / EMERGENCY — 颜色 + icon + label + text 多通道表达。
- Light mode 完成；Dark mode 非 v1.0 blocker。

## 核心页面状态覆盖

| 状态 | 覆盖 |
|---|---|
| Loading / Skeleton | app/loading.tsx + 各页 State + 卡片 skeleton |
| Empty | 各列表页 empty 文案（"还没有记录。"等） |
| Populated | 各页正常渲染 |
| Error + Retry | State.error + 重试按钮 + app/error.tsx 边界 |
| Offline | PwaShell banner + /offline 页 + SW 离线壳 |
| Permission Denied | State.denied（"没有查看此内容的权限"） |
| Not Found | app/not-found.tsx（"页面不存在"，无 stack） |
| External Blocked | 用户端文案"该服务暂未开放"（后端 EXTERNAL_BLOCKED 映射） |

## 中文化

- 顶部导航：今日 / 时间线 / 宠物 / 助手 / 我的；更多菜单：任务/照护协作/行为/健康/训练/用药/通知。
- 页面 H1/H2/表单/空态/错误态均为中文；专业术语保留英文小标签（Vet Brief、Quick Log、provenance）。
- i18n 基础 lib/i18n.ts（zh-CN，未来 en-US 可扩展）。

## 无障碍基础

- focus-visible 轮廓、aria-label（切换当前宠物）、aria-current（导航 active）、role=status/banner、landmark（nav/main/footer）。
- 触控目标 ≥44px（CSS --pli-touch-min-target）。
- 对比度：ink/muted 与背景满足一般文本对比。

## 浏览器真机式验证

- E2E-01..07（功能主路径）+ E2E-08（PWA）+ E2E-09（H5 分享）+ E2E-10（中文导航/404）全部通过。

## 已知限制

- 未做屏幕阅读器全量走查（VO/TalkBack 真实设备）。
- 未做 Safari 真机横向滚动专项（桌面浏览器验证通过）。
- 视觉 polish 细节以本轮 token 化 + 组件一致性为准，未做逐像素设计稿对拍。