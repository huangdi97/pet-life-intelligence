# STAGE D PREFLIGHT — Reality Check

- Date: 2026-09-13
- 依据仓库真实状态（非 GOAL 文字）：git / migrations / tests / services / reports 全部实测。

## Git

- branch: `main`
- working tree: **clean**（`git status --short` 无输出）
- head commit: `ac51a14`（v1.0 Stage C）
- commits total: 10
- remote: **none**（push 自上一阶段起持续 BLOCKED）

## Migrations

- head: `e8718b28c1eb`（v1.0 schema stage C）
- chain: 89595364188f → 54591ad33a24 → b267c90f7267 → ee3419e866eb → e8718b28c1eb（5 个版本，全部含 downgrade）

## Tests / Quality（实测）

- backend tests collected: **181**（上轮全绿）
- ruff: 0 error（上轮实测）
- web typecheck/build: 绿（16 routes：app/ 下 12 个 page 文件 + 动态路由 health/[id] + pets/new）
- staging smoke: 12/12 PASS（scripts/staging_smoke.py）

## 运行服务

- API `:8800` — 200 `{"status":"ok"}`（运行中，加载 head 代码）
- Web `:3100` — 200
- Docker: postgres / redis / minio 全部 healthy（11h+）

## 审计基线（FULL_PRODUCT_AUDIT.md 实测数字）

- 228 项：DONE 155 / PARTIAL 27 / BLOCKED_EXTERNAL 2 / Future backlog 42 / NOT_STARTED(A/B/C) 0

## 当前已知风险（Stage D 视角）

1. **浏览器级 E2E 未做**（GA blocker，Phase 2 第一优先）
2. **PLI-012 field privacy 是 audit-record 而非真实序列化掩码**（GOAL 明确"privacy 字段没有真正执行"= GA blocker → 必须真实实现）
3. PARTIAL 中可低成本升 DONE：PLI-045（签名缺失标记 UNSIGNED）、PLI-128（手动归因端点）、PLI-131（审核复核写回）、PLI-143（服务前清单复用 handoff checklist）、PLI-146（总结生成端点）
4. AIInferenceLog 存 ≤500 字符摘要（AI provenance 要求，PLI-214）；无任何 API 暴露该表 —— 需在 G10 明确口径
5. 观测性：request_id 已有；缺结构化访问日志与 EXTERNAL_BLOCKED 错误码
6. 无统一 capability registry（Phase 7 新建，轻量）

## Stage D 执行清单

1. Phase 1 PARTIAL 重分类 → reports/PARTIAL_TRIAGE.md
2. 代码修复批次：field privacy 真实掩码、capability registry、观测性（访问日志 + EXTERNAL_BLOCKED）、5 个低成本 PARTIAL 升级
3. Phase 3 安全加固测试（IDOR 矩阵 / mass assignment / 注入 / auth negatives）
4. Phase 4 医疗安全攻击测试（minimization / prompt injection / schema safety / monotonic）
5. Phase 5 隐私与数据生命周期（真实掩码测试、删除/撤回不泄露、export 检查）
6. Phase 6 worker 幂等双跑测试
7. Phase 11 migration 全重放 + 有限 downgrade
8. Phase 12 backup/restore round 2（恢复库 + API smoke）
9. Phase 2 Playwright 浏览器 E2E（7 条主路径）
10. Phase 9 性能基线
11. Phase 10 前端 UX 验收（Playwright 证据）
12. Phase 13/14 全量回归 + 最终 smoke
13. Phase 15/16 审计更新 + GA Gate 报告 + V10 Release Report + CHANGELOG + tag
