# AI & Safety Baseline

## AI 不是事实源

区分：
- user_report
- device_observation
- ai_observation
- rule_decision
- professional_confirmation
- lab_confirmation

## AI Gateway metadata

每次推理记录：
- provider
- model
- prompt_version
- schema_version
- trace_id
- latency_ms
- token/cost（若可得）
- safety_flags
- fallback_used

## v0.1 AI 能力

1. intake question generation
2. observable finding extraction
3. timeline summarization
4. Vet Brief drafting

## Red Flag 独立 Rule Engine

LLM 的输出不能降低 rule engine 的 emergency 等级。

### 最低红旗
- respiratory distress
- collapse/unconsciousness
- prolonged/recurrent severe seizure pattern
- severe bleeding
- high-risk toxin ingestion
- distended abdomen + unproductive retching
- cat repeated urination attempts with no/little urine
- severe trauma

## 输出文案原则

允许：
- “观察到……”
- “主人报告……”
- “命中规则……”
- “建议尽快兽医评估……”

禁止：
- “确定是……”
- “可以停药……”
- “没有发现红旗，所以没有病”
- “照片证明是某疾病”

## AI Offline Eval

至少：
- schema validity
- hallucination
- unsupported diagnosis
- provenance loss
- red-flag conflict
- emergency downgrade attempt
- prompt injection in user note/media metadata
