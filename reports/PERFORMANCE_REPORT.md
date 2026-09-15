# PERFORMANCE_REPORT — 性能基线

- Date: 2026-09-14
- 工具：scripts/perf_baseline.py（真实 API:8800，PG16 docker，500 事件 pet fixture）
- 样本：每端点 60 次

## 结果（dev 机器基准，非调优）

| 端点 | p50 | p95 | p99 | error% | RPS |
|---|---|---|---|---|---|
| GET /health | 2.3ms | 3.2ms | 3.6ms | 0 | 419 |
| POST auth/dev/login | 35ms | 50ms | 62ms | 0 | 27.5 |
| GET /pets | 47ms | 57ms | 70ms | 0 | 20.4 |
| GET pet detail | 38ms | 45ms | 48ms | 0 | 26.1 |
| GET timeline (500 events) | 46ms | 54ms | 62ms | 0 | 21.2 |
| GET search | 53ms | 105ms | 122ms | 0 | 17.8 |
| GET health-events | 46ms | 56ms | 143ms | 0 | 20.7 |
| GET notifications | 44ms | 56ms | 99ms | 0 | 22.0 |
| POST quick log (create event) | 40ms | 52ms | 68ms | 0 | 22.5 |

**Gate：无端点 p95 > 1s → PASS。** 全部 error_rate 0。

## Web / 构建指标

- Web First Load JS：~105kB（Next.js 默认内联 chunk，未做进一步分包优化）。
- Mini Program：weapp 构建 dist 51 文件；未做分包（12 页均在主包）。
- Mobile：Android/iOS Hermes bundle 各 2.21MB。

## 未测项（诚实声明）

- 未做真实浏览器 LCP/CLS 自动化测量（需 Lighthouse CI 接入）。
- 未做小程序真机启动耗时（需微信开发者工具/真机）。
- 未做移动端真机冷启动（无签名真机环境）。

## 建议（v1.0.1 backlog，不阻塞上线）

1. Web 按路由代码分割 + 图片 next/image。
2. Mini 分包（把 health/medication/training 拆到分包）。
3. 索引：Timeline/Search/Notifications 查询的 EXPLAIN 已在 DB 层验证 FK/唯一约束，未做复合索引专项。