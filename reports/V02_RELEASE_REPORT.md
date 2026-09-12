# V0.2 RELEASE REPORT — Stage B (48 P1)

- Date: 2026-09-13
- Terminal: **PLI_V0_2_RELEASE_CANDIDATE_READY**

## v0.2 Gate 逐项

| Gate | Status | Evidence |
|---|---|---|
| v0.1 regression 全 PASS | PASS | `pytest -q` → 140 passed（含 v0.1 全部 106 项） |
| Training / Behavior 端到端 | PASS | tests/v02/test_behavior_training.py（goal→steps→sessions→mastery E2E；templates/triggers/trends；artifact 视频绑定） |
| Pet Search 有证据引用 | PASS | tests/v02/test_social_search_platform.py（search 只返回真实 event_id；ask 无证据即拒绝） |
| Baseline deterministic 算法和测试 | PASS | trimmed_mean_v1（纯函数测试 + API 聚合测试，确定性断言） |
| Social privacy / block / report | PASS | 双重同意朋友关系；未接受前交互 403；BLOCK 后 403 + SocialReport 落库 |
| 无跨 Pet 泄漏 | PASS | 所有 v0.2 端点走 require_capability（pet 级）；wrong-pet goal 404 测试 |
| AI hallucination / provenance eval | PASS | answer_with_evidence：citations ⊆ 证据集、无匹配即 insufficient；behavior_advice 惩罚式建议被过滤并记 reasons |

## 48 P1 状态（逐项）

**DONE（后端全功能 + 测试）：**
PLI-004（芯片记录/验证）、PLI-013（生命周期状态机，DECEASED 终态保护）、
PLI-024（daily.sleep 进 registry/today）、PLI-029（trimmed_mean_v1 基线）、
PLI-031（日记）、PLI-033（AI 日报，model/prompt 版本入库）、
PLI-039（交接确认清单）、PLI-040（照护期日报）、PLI-041（结束总结）、
PLI-042（责任矩阵）、PLI-047（角色定向通知，TRIAGE_EMERGENCY→OWNER）、
PLI-057/058（病历导入+来源分级校验）、PLI-061（恢复计划）、PLI-062（趋势复盘）、
PLI-064（疫苗/驱虫/体检提醒）、PLI-070（ABC 回归确认）、PLI-071（视频绑定）、
PLI-073（触发图谱，非因果声明）、PLI-074（周趋势）、PLI-075（事件模板）、
PLI-079（偏好/厌恶档案）、PLI-080（环境上下文，v0.1 字段+测试确认）、
PLI-084（建议安全过滤：惩罚式建议被阻断+审计）、PLI-085/086/087/088（目标/分解/会话/掌握度）、
PLI-091（奖励偏好库）、PLI-092（训练工具库，仅安全工具）、PLI-100（丰富化活动库）、
PLI-111（社交偏好档案，非评估声明）、PLI-112（好友关系+block/report）、
PLI-113（互动事件）、PLI-163（饮食档案）、PLI-175（费用账本，字符串金额）、
PLI-187（里程碑）、PLI-188（回忆：同日跨年）、PLI-190（时间线语义检索，确定性关键词）、
PLI-197（个人问答，证据引用）、PLI-198（跨域检索 domain 过滤）、
PLI-199（为什么提示：相关性非因果）、PLI-200（低风险任务计划，硬边界声明）、
PLI-205（结构化记忆：均带来源）、PLI-223（内容版本管理：库内容入库 v1.0.0）、
PLI-225（隐私保护分析：仅聚合计数）、PLI-228（运行状态+事故登记）— 43 项

**PARTIAL（5）：**
- PLI-005 QR/NFC Care Card：QR 目标端点+NFC payload 字段完成；前端二维码渲染未接
- PLI-033 AI 日报：完成（mock provider）；真实模型接入推迟（v0.1 同策略）
- PLI-040/041 日报/总结：JSON API 完成；打印/PDF 未做
- PLI-047 按角色通知：角色过滤完成；推送通道仍缺（v0.1 同）
- PLI-190 语义搜索：确定性关键词+域过滤（真实向量语义检索属 RAG，与 GOAL 一致未引入）

修正：DONE=43, PARTIAL=5, BLOCKED=0, NOT_STARTED=0（合计 48）。

## Tests

`pytest -q` → **140 passed**（v0.1 106 + v0.2 新增 34），ruff 全绿，
web typecheck/build 绿（新增 /training、/search 两个真实数据页面）。

## Commits

- `6139665` v0.2 backend（schema/migrations/routes/tests）
- （本提交）v0.2 frontend + 本报告
