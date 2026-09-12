# AGENTS.md — Pet Life Intelligence

## 1. 行为要求

- 先读设计与 scope，再改代码。
- 尽量连续执行，不因普通工程问题询问用户。
- 不做超出 v0.1 的范围膨胀。
- 不删除看不懂的数据/文档。
- 改架构需写 ADR。
- 任何“完成”必须有测试证据。
- 每个实现/PR/commit 尽量关联 `PLI-xxx`。

## 2. 权威顺序

真实代码/测试 > v3.0 母版 > Feature Inventory > GOAL > 辅助文档。

## 3. 数据规则

- canonical event schema 集中管理。
- 前端不得私自创造 event payload。
- 所有事件必须带 pet_id / actor / time / source。
- 修改事实不得静默覆盖。
- 所有 AI 输出带 model/prompt/schema version。
- 所有医疗风险判断必须能追踪 rule/AI/owner/vet 来源。

## 4. 医疗安全

- LLM 不得单独决定 emergency。
- Red Flag Rule Engine 独立。
- 不诊断、不改药、不自动停止药物。
- 不把未发现红旗写成“没有疾病”。
- 不把图片结果写成确定诊断。
- Vet Brief 是信息整理，不是兽医诊断。

## 5. Agent 权限

Allowed without confirmation:
- 读代码
- 写代码
- 本地测试
- 生成 migration
- 生成文档
- seed dev 数据

Require confirmation / do not perform automatically:
- 生产支付
- 删除生产数据
- Pet 所有权转移
- 高风险医疗动作
- 外部真实服务下单

## 6. 工程规范

- Python：ruff + pytest；类型尽量清楚。
- TS：strict，禁止无解释 `any`。
- timezone-aware datetime。
- 金额/剂量/单位使用显式类型。
- 外部调用有 timeout/retry/idempotency。
- 日志不写完整敏感病历或媒体内容。
- feature flag 控制未成熟能力。

## 7. 状态记录

每一阶段更新：
- `WORK_STATUS.md`
- `reports/`
- 如有架构决策，更新 `docs/decisions/`
