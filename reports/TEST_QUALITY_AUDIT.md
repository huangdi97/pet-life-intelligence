# TEST QUALITY AUDIT（Stage V）
- 报告日期：2026-09-23
- 方法：检查 happy-path 依赖 / 弱断言 / snapshot 滥用 / fixture 过理想 / mock 关键逻辑 / flaky / 互相污染 / 顺序依赖 + Mutation-thinking 人工 review

## 1. 检查结果

| 检查项 | 结果 | 证据 |
|---|---|---|
| 只测 happy path | 未发现 | tests/README 明确禁止；GA + Stage V 对抗/权限/医疗负路径大量覆盖（ADVERSARIAL §14-16） |
| assert 太弱 | 未发现 | 抽查断言均带具体值/状态码/错误码（如 409 DUPLICATE_EVENT、403、EMERGENCY 保持） |
| snapshot 滥用 | 无 | 无 jest snapshot 文件；视觉基线为 Playwright 截图（有明确用途） |
| fixture 太理想 | 无 | conftest seed 为真实 demo 数据；synthetic cohort 固定表驱动（SYNTHETIC_COHORT_SPEC §1） |
| mock 掉关键逻辑 | 无 | 关键路径（权限/红旗/去重/隔离）均为真实 DB + API 测试；仅 AI provider 用 MockProvider（Goldset 明确标注、离线确定性、可换真 provider） |
| flaky | 未复现 | Playwright 29/29 连续通过；pytest 420 两次全绿（419→420 修正后重跑） |
| 互相污染 | 无 | conftest 每会话 wipe 表（FK 安全顺序）；synthetic 隔离双向 403 验证 |
| 执行顺序依赖 | 无 | 单 worker 串行但无状态共享；每测试自建数据 |

## 2. Mutation-thinking review（人工反置）

| 关键条件反置 | 预期失败 | 实际 |
|---|---|---|
| permission 检查删除 | 跨 household 访问应 403 → 若不 403 测试失败 | PASS（对抗 §15 实测） |
| red flag 规则降级 | EMERGENCY 应保持 → 若降 MONITOR 测试失败 | PASS（对抗 §16 + property 单调性） |
| synthetic 过滤反转 | /pilot/status 应为 0 → 若不 0 测试失败 | PASS（SYNTHETIC_COHORT §3 实测） |
| idempotency 约束移除 | 同 key 双写应唯一 → 若重复测试失败 | PASS（PROPERTY §18 实测 DB 计数=1） |
| medication 重复确认放开 | 第二次应 409 → 若 201 测试失败 | PASS（REPLAY-04 实测） |
| pet switch 上下文错误 | 新宠数据应隔离 → 若读旧宠测试失败 | PASS（REPLAY-11 + PROPERTY） |

## 3. 结论
`TEST_QUALITY_AUDIT_PASS`：无系统性测试质量问题；关键不变量均有 mutation 级防护；新增 Stage V 测试（stage_v 121 + scenarios 12）已并入全量回归（420 绿）。
