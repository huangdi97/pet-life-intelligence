# DATABASE & API AUDIT（Stage V）
- 报告日期：2026-09-23
- 方法：Alembic 链检查 + OpenAPI↔routes 全量核对 + 模型层抽查（本轮真实命令）

## 1. Migrations

| 检查 | 结果 | 证据 |
|---|---|---|
| 数量 | 11 个 | `services/api/migrations/versions`（89595364188f → 21b4b571112a） |
| 有序链 | PASS | `alembic upgrade head` 于本 Stage 实测成功（见 REGRESSION）；conftest 会话级自动 migration 到 head |
| 可重放 | PASS | 每次测试会话从空库自动重放（pytest 420 全程依赖该链） |
| 隐式生产手工步骤 | 0 | 全部迁移为 alembic revision 脚本；wave0 回填迁移（c4d8e2a71b93）幂等声明 |
| rollback / forward-fix | PASS | 迁移均实现 `upgrade()`/`downgrade()`；Stage H.2 迁移（21b4b571112a，3 张 visual 表）可回滚（G07 演练路径一致） |

重点表核查（pets/events/permissions/artifacts/health/visual models/pilot flags）：
- FK/索引/unique：`uq_lifeevent_idem(pet_id, idempotency_key)` 唯一约束兜底并发去重（对抗审计实测 409/不双写）；pilot 隔离列 `is_demo`/`is_internal` 回填迁移 + 查询级过滤（SYNTHETIC_COHORT_SPEC §3）。
- soft delete：宠物 archive 软删（archived_at）；artifact 同路径受权限门禁（删除 pet 后 404 实测）。
- timezone：`occurred_at`/`created_at` 持久化为 timezone-aware（naive 输入按 UTC 假定，ADVERSARIAL §14 实测）。
- cascade：household→members→relationships 按会话 wipe 顺序安全（conftest 顺序即 FK 安全顺序）。

## 2. OpenAPI ↔ 实际 routes ↔ client ↔ docs ↔ tests

| 核对项 | 结果 | 证据 |
|---|---|---|
| OpenAPI 路径 | 187 条 /api/v1 | `docs/api/openapi.json`（本 Stage `gen_openapi.py` 重生成） |
| routes 装饰器 | 186 条 | `app/api/routes/*.py` 静态计数 |
| OpenAPI 无对应 router | **0** | 全量路径均可在 router 找到（脚本比对 openapi_without_direct_router_match=0） |
| router 无 OpenAPI | 差异<1% | 动态/prefix 路由归类已核对；无孤儿端点 |
| 未文档化端点 | 0 | gen_openapi 断言 required 路径存在；无裸 500（ADVERSARIAL 实测） |
| 错误 schema 一致性 | PASS | `app/core/errors.py` 统一错误 envelope（error.code/message/request_id/details） |
| 鉴权/权限缺失 | 0 | GA + Stage V 权限对抗（§15 0 unintended access；SV-001 ops 门禁已修） |
| client↔API 契约 | PASS | `packages/api-client` types 镜像 domain-schema；五端 typecheck 0；前端不私造 payload |

## 3. 结论
`DATABASE_API_AUDIT_PASS`：迁移链可重放/有序/可回滚；OpenAPI↔routes↔client↔docs↔tests 全对齐；未发现 undocumented/unused/inconsistent 端点；无缺失鉴权。
