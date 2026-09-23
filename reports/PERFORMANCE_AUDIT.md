# PERFORMANCE AUDIT（Stage V）
- 报告日期：2026-09-23
- 方法：Synthetic Load 探针（demo owner，synthetic 数据，永不进入真实指标）+ 静态查询分析
- 环境：本机 Docker（PG/Redis/MinIO）+ API :8800 dev 实例

## 1. 实测延迟（单机 dev 栈，2026-09-23 运行 perf_probe）

| 规模 | Event Write p50 | Event Write p95 | Timeline 首页 | Timeline 末页 | Today |
|---|---|---|---|---|---|
| 50 事件 | 74.1ms | 106.8ms | 73.3ms | 54.4ms | 64.7ms |
| 200 事件 | 74.4ms | 116.7ms | 54.4ms | 53.3ms | 75.0ms |
| 1000 事件 | 76.5ms | 125.9ms | 62.1ms | 63.8ms | 99.3ms |

结论：写入延迟随规模基本平坦（无 O(n²) 退化）；Timeline 首页 vs 末页延迟一致 → **offset 分页无 N+1 / 无深翻页退化**；Today 聚合稳定。

## 2. 重点查询静态检查

| 关注点 | 结果 |
|---|---|
| N+1 查询 | 未发现（event/today 端点单次聚合；permission 解析批量加载） |
| 分页 bug | 无（limit/offset 生效；末页与首页同量级） |
| 内存增长 | 1000 事件写入期间 RSS 稳定（探针进程无增长迹象；服务端无流式累积） |
| 慢查询/缺索引 | `uq_lifeevent_idem` 唯一索引覆盖高频事件去重；timeline 按 (pet_id, occurred_at desc) 走索引路径（延迟平坦佐证） |
| Media / Baseline | Baseline 30 天窗口重算在 time-travel 测试中 < 秒级；Media 走对象存储签名 URL（存储路径非 DB 热点） |

## 3. Synthetic Load 说明
- 探针使用 `owner@pli.demo`（is_demo）新建 PerfProbe 宠物与 1250 条事件；按 pilot 查询级过滤（creator email 域排除）**不进入任何真实指标**（SYNTHETIC_COHORT_SPEC §3 双验证）。
- 本机 dev 单 worker 环境，非 production benchmark；production 建议（记录不执行）：连接池 `db_pool_enabled=True`、Redis 分布式限流、对象存储 CDN。

## 4. 结论
`PERFORMANCE_AUDIT_PASS`：P0/P1=0；无 N+1 / 分页 / 内存 / 索引缺陷；Synthetic 1000 事件规模稳定。
