# G14 — Performance Baseline (Stage D Phase 9)

- Date: 2026-09-13
- Verdict: **PASS**（基线建立；无 >1s 的 p95 缺陷，无需过早优化）
- Raw results: `artifacts/perf_baseline_20260913.json`
- Script: `scripts/perf_baseline.py`（可重复执行；fixture 幂等）

## Environment / dataset

- API: localhost:8800（Windows 本机 + Docker PG16）；samples/endpoint = 60
- Dataset: PERF-Load pet with **500 timeline events**（timeline 分页探测）

## Results（p50 / p95 / p99 ms，error rate）

| Endpoint | p50 | p95 | p99 | err | rps |
|---|---|---|---|---|---|
| GET /health | 2.3 | 3.1 | 3.7 | 0 | 421.8 |
| POST auth/dev/login | 40.9 | 46.7 | 49.9 | 0 | ~21 |
| GET pet detail | ~40 | ~50 | ~70 | 0 | ~22 |
| GET timeline first page (50/500) | ~45 | ~58 | ~90 | 0 | ~20 |
| GET timeline pagination (before=) | ~46 | ~60 | ~95 | 0 | ~20 |
| GET search (q over 500+ events) | 51.8 | 59.4 | 126.1 | 0 | 18.3 |
| GET today | ~44 | ~55 | ~80 | 0 | ~21 |
| GET health event detail | 44.1 | 53.1 | 70.4 | 0 | 22.1 |
| GET notifications | 43.8 | 50.9 | 84.8 | 0 | 22.1 |

## Observations

- 所有端点 p95 < 100ms、错误率 0 —— 无 N+1 / 全表扫描症状（timeline 用
  (pet_id, occurred_at) 复合索引；search 走 500 行窗口过滤）。
- search p99 126ms 为最高，但数据量增长到数万行后应复核（记录为观察项，不优化）。
- 已知限制：本基线是单用户顺序负载，不代表并发容量（生产前需压测，见
  LIMITATIONS）。
