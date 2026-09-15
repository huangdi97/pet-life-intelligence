# SAFETY_AUDIT — 医疗安全审计

- Date: 2026-09-14
- 基线：tests/safety/test_red_flag_safety.py + tests/ga/test_medical_safety_attacks.py + tests/ai-evals 全绿。

## 医疗安全结构（未回归）

```
Input → Observation → Structured facts → Red Flag Rule → Triage → Next Action
```

- AI ≠ 兽医诊断权威：所有 AI 输出带 model/prompt/schema version + disclaimer。
- Red Flag Rule Engine 独立（packages/rules），AI 不参与 emergency 决定。
- 不诊断、不改药、不自动停药；Agent 对 BOOKING/PURCHASE/MEDICAL 一律 REFUSED。
- 无红旗时输出 MONITOR（"观察"），不写"没有疾病"。
- 图片证据不写成确定诊断。
- Vet Brief 明确"信息整理，不是兽医诊断"。

## BLOCKING GATE 检查

| 检查 | 结果 |
|---|---|
| Under-triage（owner 最小化不能压制红旗） | PASS（tests/safety） |
| Red flag 检测 | PASS（10 规则确定性 + species gate） |
| Medication duplicate | PASS（重复给药 409 MEDICATION_CONFLICT） |
| Diagnostic overclaim | PASS（E2E-03 无"确定是/诊断为"） |
| Agent medical action | PASS（REFUSED, executed=False） |

## 多端一致性

- 红旗/分级在所有客户端显示同一结果（tests/multi-client test_health_risk_identical）。
- 客户端不复制安全规则，只展示服务端结果。

## 结论

医疗安全 BLOCKING GATE：全 PASS。可上线。