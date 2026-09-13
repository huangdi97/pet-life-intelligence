# G12 — Worker / Retry / Idempotency (Stage D Phase 6)

- Date: 2026-09-13
- Verdict: **PASS**
- Suite: `tests/ga/test_worker_idempotency.py`（4 项，全部真实双跑）

## 场景与结果

| 场景 | 断言 | 结果 |
|---|---|---|
| Grant 过期任务连跑 2 次 | 第 2 次 0 条新动作；`grant.expired` 事件恰好 1 条（idempotency_key）；通知 dedupe_key 唯一 | PASS |
| 用药遗漏标记连跑 2 次 | 第 2 次 0 条；`medication.missed` 事件数 == 首跑数；MEDICATION_MISSED 通知无重复 | PASS |
| Handoff 到期连跑 2 次 | 第 2 次 0 条；`care.handoff_ended` 幂等键唯一 | PASS |
| 设备 webhook 重放（同 provider_event_id） | 409 DUPLICATE_EVENT，不产生第二行 | PASS（本阶段补 replay 拒绝） |

## 覆盖的失败模式

- duplicate jobs（双跑）→ 幂等键 + dedupe_key 阻断；
- partial failure → 每个作业独立事务，崩溃后重跑补齐（状态在 PostgreSQL）；
- webhook duplicate/replay → 唯一约束 (provider, provider_event_id) + 显式 409；
- notification 重复 → dedupe_key 唯一约束；
- 剂量重复给药 → 409 MEDICATION_CONFLICT（业务层，v0.1 已有，回归确认）。

## 已知限制（如实）

- 无重试队列/退避策略：作业是轮询式，失败在下一轮自然重试（幂等保证安全）；
  毒丸场景（单条坏数据卡死）未观测到——批量上限 500 且逐条 try 由事务隔离；
  该限制记录于 LIMITATIONS.md 与 ADR-0002。
