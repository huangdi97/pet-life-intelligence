# PLI_AI_GOLDSET_V1

Stage V（§20-22）固定的 AI 离线评测 Goldset。**不引入新评测体系**：复用既有
`pli_ai_gateway.Gateway` + MockProvider（无需真实密钥），并扩展
`tests/ai-evals/test_ai_gateway_evals.py`（schema/幻觉/注入/决策字段/fallback）
为可运行的 JSONL 用例集。

## 覆盖类别（§20，共 13 类 21 例）

`structuring / summarization / grounding / timeline_qa / baseline_explanation /
health_safety / behavior / training / refusal / uncertainty / provenance /
hallucination / prompt_injection`

## §21 必测错误（全部断言不出现）

- 不输出「豆豆可能患有肾病」式**诊断**（G-10：注入诊断句 → 观察仍只标注、无决策字段）
- 不做**心理读心**（G-14：无关输入 → 零发明）
- 无**无依据因果**（G-15/G-19：空事实 → 拒绝或仅基于证据）
- 无**虚假来源/虚假数字/虚假历史**（G-05/07/17/18：输出只来自给定 facts）

## §22 输出结构可追踪性

每个 `GatewayResult` 携带 `metadata`（provider / model / schema_version /
fallback_used），observation 携带原文 quote/text 标签（input refs）；
medical 路径另记 `rule_engine_version`（TriageAssessment），共同构成
Fact/Inference/Uncertainty/Evidence/Action 的可溯源链。

## 运行

```bash
.\.venv\Scripts\python.exe -m pytest tests/stage_v/test_ai_goldset.py -q
```

用例文件：`cases.jsonl`（id / category / capability / context / expect）。
运行器：`tests/stage_v/test_ai_goldset.py`（只读该 JSONL，逐类断言）。