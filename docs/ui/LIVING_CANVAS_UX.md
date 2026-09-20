# LIVING_CANVAS_UX — Living Canvas（Today）体验规范

> 阶段：Stage H.2（GOAL PHASE C）· 日期：2026-09-20 · 状态：WEB IMPLEMENTED（apps/web/app/page.tsx）

## 1. 视觉主轴（禁止 Banner+8 icons+Dashboard 范式）

```
Pet → Now → Change → Attention → Action
```

## 2. Today 首屏结构（3 秒五问）

1. **Pet Identity + 3D/Visual Pet**：宠物名、物种/品种、生命视图入口。
2. **Now**：现在怎么样（最后活动 + 今日事件计数，真实事实）。
3. **Change**：与它自己相比（Personal Baseline 对比，非诊断）。
4. **Attention**：今天最值得注意（One Attention，来自 abnormal-day-hint）。
5. **Action**：下一步能做什么（Quick Log 主 CTA + 更多类型）。
6. Recent Events / Tasks / AI 摘要（服务未开放诚实显示）。

## 3. 文案规范（GOAL M3）

- 用「豆豆来到互动设备附近」「系统观察到豆豆在设备附近停留约 28 秒」式事实陈述；
- 禁止「豆豆想你了」「豆豆很开心」「情绪 88 分」。

## 4. 验证

- web typecheck 0 · vitest 22/22 · Playwright 17/17（E2E 契约保留：快速记录按钮/.alert.info/状态区）。
