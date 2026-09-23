# SCENARIO_REPLAY_REPORT（Stage V）

- 报告日期：2026-09-21
- 实现：`tests/scenarios/test_replays.py`（REPLAY-01..12 全 API 级回放）
- 证据：`pytest tests/scenarios -q` → **12/12 PASS**（全量 420 passed 的一部分）

## 回放清单与结果

| ID | 场景 | 关键旅程（事件→时间线→基线→权限→Outcome→数据） | 结果 |
|---|---|---|---|
| REPLAY-01 | Daily Life 30d | 30 天吃喝+散步事件 → Timeline(≥45 条) → Today 计数 → Baseline recompute | **PASS** |
| REPLAY-02 | Care Collaboration | owner+family 各写事件 → 双方可见（actor 署名）→ family 不可 manage | **PASS** |
| REPLAY-03 | Duplicate Feeding | 同 actor 重复喂食 409（DUPLICATE_EVENT）→ 异 actor 同餐允许（actor 级去重）→ allow_duplicate 记录双份 | **PASS** |
| REPLAY-04 | Medication Safety | 建计划（PROFESSIONAL_CONFIRMED）→ 给药 201 → 重复给药 409（MEDICATION_CONFLICT） | **PASS** |
| REPLAY-05 | Health Closure | 异常入口→动态追问→答案→AI 观察→Vet Brief→Outcome→CLOSED | **PASS** |
| REPLAY-06 | Behavior→Training | 行为事件(ABC) → 训练目标 → 训练会话 | **PASS** |
| REPLAY-07 | Handoff | 交接→sitter 临时权限→照护记录→日报→结束交接→403 | **PASS** |
| REPLAY-08 | Device 断连/重连 | 绑定 fake 设备 → sync → 设备列表回显 | **PASS** |
| REPLAY-09 | Companion Session | `/visual/status` 诚实 `REAL_3D_PROVIDER_EXTERNAL_BLOCKED`；state-overlay `GENERATED_3D` 永不冒充 LIVE | **PASS** |
| REPLAY-10 | Consent Withdrawal | 新宠默认同意 → SERVICE_ESSENTIAL=True → 撤回 RESEARCH_SECONDARY_USE → 持久生效 | **PASS** |
| REPLAY-11 | Pet Switch | 新建宠物 → 新上下文写事件 → 新宠 Timeline 只含新宠 → 旧宠不受污染 | **PASS** |
| REPLAY-12 | 3D Model Version Evolution | capture1→model v1→verify→activate→capture2→model v2→activate→manifest=v2→版本历史保留 | **PASS** |

## 覆盖说明

- 每个 replay 都是多步 API 旅程（非单端点单测），串联 Event→Timeline→Baseline→Health→Permission→Outcome→数据一致性。
- 覆盖 §12 建议的 30 天正常状态→饮水/食欲变化→健康事件→Red Flag→Vet Brief→用药→随访→Outcome 全链路（REPLAY-01/04/05）。
- 数据全部 synthetic/demo，受 pilot 隔离保护。

## 结论

`SCENARIO_REPLAY_PASS`：REPLAY-01..12 全部落地 `tests/scenarios/` 并可从干净环境重放（pytest 实测 12/12 PASS）。
