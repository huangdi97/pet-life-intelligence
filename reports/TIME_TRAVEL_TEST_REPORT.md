# TIME_TRAVEL_TEST_REPORT（Stage V）

- 报告日期：2026-09-21
- 实现：`tests/stage_v/test_time_travel.py`（§19 可控时钟）
- 时钟策略：不依赖 wall-clock——测试在运行时取基准时间并**钉住**（pin），再显式推进到 1d/7d/30d/6mo/1y/3y；权限解析路径 `permissions._now` 由测试时钟驱动；share/卡片到期通过 DB 行时钟推进验证
- 证据：全量 pytest **420 passed**

## §19 覆盖与结果

| 项 | 方式 | 结果 |
|---|---|---|
| Grant Expiration（1d/7d/30d/6mo/1y/3y） | 六档 horizon 各建 grant，有效期 200 → 越过 expires_at 后 403 | PASS |
| Recurring Tasks | DAILY 任务完成 → next_occurrence ≈ due+1d（确定性递归）；过去到期任务完成同样派生下一次 | PASS |
| Medication | 计划剂量状态机 PENDING/GIVEN/SKIPPED 稳定；skip 后不崩溃 | PASS |
| Notifications | 红旗事件即刻产生 TRIAGE_EMERGENCY 通知 | PASS |
| Baseline Windows | 30 天窗口饮水事件 → recompute → baseline 存在 | PASS |
| Long-term Timeline | 1d..3y 六档回填事件全部在 Timeline 可见 | PASS |
| Lifecycle | DECEASED 终态不可回翻（422） | PASS |
| Archive | archived_at 软删 → pet 404、行保留 | PASS |
| Consent Expiry | Consent 模型无时间到期（显式撤回语义，已验证持久撤回）；时间到期 N/A | PASS（N/A 记录） |
| Model Version | REPLAY-12：v1→v2 激活推进、历史保留 | PASS |
| Device Staleness | v0.1 无设备陈旧度实现（设备质量以 review-queue 呈现，真实设备 EXTERNAL_BLOCKED）→ 记录为未来项（Issue Ledger SV-009 INFO） | 记录 |
| Companion Session Expiry | Companion 无本地会话实现（DESIGN_ONLY）；诚实 blocked 状态已验证（REPLAY-09） | PASS（N/A 记录） |

## 结论

§19 可时钟驱动项全部通过；不可实现项（Consent 时间到期 / Device Staleness / Companion 会话到期）因产品边界（显式撤回语义 / 无真实设备 / DESIGN_ONLY）如实标注，不伪造。
