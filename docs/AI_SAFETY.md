# AI_SAFETY — AI 使用与安全边界

## 权威结构

```
Input → Observation → Structured facts → Red Flag Rule → Triage → Next Action
```

## 硬边界（不可违反）

1. **AI ≠ 兽医诊断**：AI 输出均为信息整理/草稿，带 model/prompt/schema version 与 disclaimer。
2. **AI 不单独决定 emergency**：红旗由独立确定性规则引擎（packages/rules）决定。
3. **AI 不自动开药 / 不改剂量 / 不自动停药**：剂量变更只能由有权限的人类经流程修改。
4. **AI 不确诊**：图片/叙述不写成确定诊断；输出结构禁止 decision 字段。
5. **不把"未发现红旗"写成"没有疾病"**：基线为 MONITOR（观察）。
6. **Vet Brief 是信息整理，不是兽医诊断**。

## AI Gateway

- 所有模型调用统一走 `pli_ai_gateway.Gateway`（services/ai-gateway）。
- 记录：model / provider / prompt version / schema version / latency / fallback / result status（ai_inference_logs）。
- 输出 schema 校验（extra=forbid），含决策字段即拒绝。
- provider 故障自动 fallback（默认 MockProvider），产品核心功能不因 AI 宕机不可用。

## 提示注入与幻觉防护

- tests/ai-evals：schema 有效性、无幻觉事实、无相关输入不编造、提示注入抵抗、决策字段拒绝、provider 失败 fallback。
- tests/ga/test_medical_safety_attacks.py：owner 最小化攻击、注入、schema 安全、单调不降级。

## 事实与推断分离

- 搜索/问答必须引用真实事件（evidence + citations + 时间）。
- "最近 30 天体重变化"类回答显示引用事件与来源。
- 助手显式说明：不做医疗诊断。

## 模型版本治理

- AIInferenceLog / engine_versions 记录每次分级/摘要所用规则与模型版本。
- Admin 可查看模型版本信息（能力注册表/审计），不可在运行时改规则（规则变更走版本化发布）。