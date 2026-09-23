# ARCHITECTURE_AUDIT（Stage V）

- 报告日期：2026-09-22
- 方法：静态扫描（依赖方向 / 模块边界 / 事件 schema 集中）+ 真实命令验证
- 证据基准：HEAD `fa24cb3` + 本次 Stage V 全量回归（pytest 420 / Playwright 29 / vitest 22 / 五端 typecheck 0）

## 1. 依赖方向（UI → API → Domain）

| 检查 | 结果 | 证据 |
|---|---|---|
| 前端直接 import 后端 | **0 处** | 全仓扫描 `apps/**/packages/ui-kit/packages/api-client` 中 `from services. / import services. / from app. / from pli_` → `DIRECT_IMPORTS=0` |
| 前端统一走契约包 | PASS | `apps/web|admin|pro` 均依赖 `@pli/api-client`（API 调用）+ `@pli/domain-schema`（schema 评审）；Mini/Mobile 使用 api-client 等价路径（`apps/mini/src/platform/network.ts`、`apps/mobile/src`） |
| Domain 导入 app（反向依赖） | 0 处 | `packages/rules`（`pli_rules`）零依赖（`pyproject.toml dependencies=[]`），独立 red-flag 引擎，不 import app | 
| circular import | 未发现 | `services/api/app` 分层：routes → services → models/domain；事件类型注册在 `app/domain/event_types.py` 单点集中 |

## 2. Domain Boundary / God Module 检查

- **事件 schema 集中**：`packages/domain-schema/life_event.schema.json` 为唯一 canonical；前端 `apps/web` 不发明 payload 字段（Quick Log 的 event_type/payload 经 api-client 提交，前端类型镜像 `@pli/api-client` types.ts 声明"frontend may not invent event payload fields"）。
- **God Service 检查**：最大服务按职责拆分清晰（pets/permissions/health/eventlog/pilot 各自独立文件）；无单文件跨域"上帝服务"。`v10_platform.py` 为平台扩展聚合（47 endpoints）——按 §68 判定为平台模块而非域混合；其内 `require_ops_admin` 兼容 ops 门禁通过本轮对抗审计（SV-001 已修）。
- **God Component 检查**：`packages/ui-kit` 按组件单文件拆分（care-task/timeline-item/risk-banner 等 30 组件各自独立）；`apps/web/components/ui.tsx` 仅保留 State/ProvenanceBadge/TriageBadge/ErrorNote 等核心原语。
- **Hook 边界**：`apps/web/lib/hooks.ts` 单一用途（useAsync/useCurrentPet/fmt），无业务聚合。

## 3. Client-specific schema duplication

- Web/Mini/Mobile 三端均消费 api-client 契约类型；未发现各端自建 DTO（Grep `interface .*Event\b` 于 apps/ 仅 api-client 引用处通过）。

## 4. 结论

依赖方向合规（0 违规）、Domain Boundary 清晰、事件 schema 集中管理、无前端私自造 payload。`ARCHITECTURE_AUDIT_PASS`。