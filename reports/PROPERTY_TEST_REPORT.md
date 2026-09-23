# PROPERTY_TEST_REPORT（Stage V）

- 报告日期：2026-09-21
- 实现：`tests/stage_v/test_properties.py`（§18 关键 invariants，property 式穷举/生成）
- 工具策略：**不引入 Hypothesis**——项目生态为 pytest；采用"确定性生成 + 穷举 + 不变量断言"等价实现（契约允许，避免重依赖）
- 证据：全量 pytest **420 passed**

## §18 Invariant 覆盖与结果

| Invariant | 实现方式 | 结果 |
|---|---|---|
| Event 属于合法 Pet | API 建事件 → Timeline 每条 event_id 的 pet_id ∈ 用户可见宠物集 | PASS |
| 合法 occurred_at | 每条事件 occurred_at timezone-aware 可解析 | PASS |
| 前端不得发明 payload（schema 严格） | 68 个 canonical 类型逐一断言 `extra=forbid`：注入 `__invented` 键全部 422/拒绝（strict_ok=68/68）；≥10 类型默认模板可校验 | PASS |
| Inference 不覆盖 Fact | 主人陈述与 AI 观察并存，原事实保留 | PASS |
| Outcome 关联目标事件 | 新健康事件 outcome → CLOSED，无孤儿 | PASS |
| 撤销 Grant 后访问失败 | 撤销 → 403 | PASS |
| 跨 Household 不得访问 | 独立家庭 pet → 403 | PASS |
| 同 idempotency key 不重复写 | 同 key 两次 → 同 event_id；DB 计数 = 1 | PASS |
| Medication 不允许重复确认 | 第二次给药 409 | PASS |
| Synthetic 不进 real metrics | 见 SYNTHETIC_COHORT_SPEC（查询级排除） | PASS |
| Red Flag 不被 AI 降级 | 4 组物种感知红旗文本 → EMERGENCY/URGENT，非 MONITOR | PASS |
| 删除 Pet 后 artifact 不可访问 | archived pet → 404 | PASS |
| Pet Switch 后用新 pet_id | 新宠写入/读取隔离，旧宠零污染 | PASS |
| Timeline 与 Event Source 一致 | 3 条新事件全部出现在 Timeline | PASS |
| Baseline 只来自允许数据源 | 见 time-travel 窗口测试 | PASS |
| Generated 3D 永不成为 ClinicalFact | health 端点响应不含 render_manifest/visual_model 字段 | PASS |
| 金额/剂量显式字符串 | amount 传 float → 存储为 str（非裸 float） | PASS |
| Provenance 等级集合 | 7 级 canonical 集合断言 | PASS |
| schema_version 常量 | = 1.0.0 | PASS |

## 结论

§18 全部 invariants 以 property/等价穷举覆盖并通过；未引入额外依赖（Hypothesis 不必要）。
