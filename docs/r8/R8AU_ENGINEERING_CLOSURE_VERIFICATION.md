# PLI R8AU · 工程收口验证（Alembic 升降级 + 筛选隔离/组合）

2026-10-19。分支 `feat/r2p3d-r3-render-truth-ui-closure`；PR #2 保持 OPEN，不合并、不改 main。

## 目的

R8 的非外部功能缺口已收口；本轮不新增产品行为，验证两件“工程收口必须为真”的事：

1. 迁移链在**全新空库**上可 `base → head → base → head`，且模型与迁移无漂移；
2. 历史有效性筛选在**跨家庭隔离**与**多条件组合**下仍然安全、语义一致。

## 1. Alembic 实证（scratch `pli_verify`）

```text
alembic downgrade base
alembic upgrade head
alembic current      → f1e2d3c4b5a6 (head)
alembic check        → No new upgrade operations detected.
```

- 空库 upgrade 后 `public` 表数：**81**；
- `alembic_version`：`f1e2d3c4b5a6`；
- 全程无手工改表；本轮无新迁移；
- scratch 库独立于开发库 `pli`，验证后可丢弃。

## 2. 筛选隔离与组合（集成测试）

`tests/integration/test_r8at_case_validity_filter.py` 新增第 3 项：

- **跨家庭**：陌生用户请求该宠物历史 → 403/404，响应体不含 Case ID；
- **同家庭但能力受限**：允许 200 或 403；403 时不泄漏 Case；
- **组合**：`validity=INVALID` 与 `q=散步` 同时命中；`q=睡眠` 不误命中散步 Case；
- **时间窗**：`since=未来` 返回 0，total 一致。

结合前两项：

- 多页 keyset：4 个失效 Case 分两页读取，无重复/遗漏、total 恒为 4；
- 撤回/修正两种失效来源均被识别；合法枚举外 422。

## 验证结果

- 后端全量 **796 passed / 0 failed / 0 error**；
- 本机 Alembic 升降级与 `check` 通过；
- 无新增数据库迁移、无权限语义变更、无客户端行为变更。

## exact-HEAD 验证

| 项 | 值 |
|---|---|
| 提交 | `0f9ae3b38c32659a204f8049c0861415faf3287f` |
| CI | run `39229537841` **success** |
| Android | run `39229537849` **success**（既有真实取证未回退） |
| OpenAPI | run `39229538036` **success** |
| 本地后端 | **796 passed / 0 failed / 0 error** |

## 诚实边界

- 该验证证明“迁移可重建、筛选语义与隔离正确”，不证明生产规模性能；
- 有效性 anti-join 为有界查询，但超大证据集仍需后续 EXPLAIN/索引评估；
- `NO_VISION_MODEL_USED = TRUE`；`HUMAN_VISUAL_ACCEPTANCE = PENDING`。
