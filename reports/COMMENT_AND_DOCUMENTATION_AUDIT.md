# COMMENT_AND_DOCUMENTATION_AUDIT（Stage V）

- 报告日期：2026-09-22
- 方法：抽查 High-value comment（医疗安全不变量 / 权限决策 / idempotency / 隐私边界 / synthetic 排除 / baseline 计算 / 3D provenance）+ API docstring 覆盖

## 1. High-value comments 抽查（§40）

| 类别 | 位置 | 内容（What / Why / 不变量） |
|---|---|---|
| 医疗安全不变量 | `packages/rules/pli_rules/engine.py`（规则引擎） | 独立于 LLM；`max_level` 单调性（Adversarial §16 穷举验证） |
| 权限决策 | `services/api/app/core/security.py`（require_ops_admin） | Why：feature flags 可启停基础设施闸门，普通 owner 禁止；不变量：is_internal 平台运营、is_demo 永非运营 |
| idempotency | `conftest.py` / `tests/stage_v`（重复事件 409） | DB 唯一约束 `uq_lifeevent_idem(pet_id,idempotency_key)` 兜底并发 |
| 隐私边界 | `docs/ui/COPY_GUIDELINES.md` + 前端 `mapErrorMessage` | 错误 UX 不暴露内部错误码 |
| synthetic 排除 | `app/services/pilot.py` + `tests/stage_v/test_synthetic_isolation.py` | synthetic_domain 过滤 OR→AND 修复（8bcc0bf）+ `SYNTHETIC_NEVER_COUNTS_AS_REAL` 回归 |
| baseline 计算 | `app/services/`（baseline 窗口服务） | 可控时钟下按事件窗口重算（TIME_TRAVEL 验证） |
| 3D provenance | `apps/web/app/pets/[id]/life-view/page.tsx` | GENERATED_3D ≠ LIVE 显式声明；真实照片 fallback |

## 2. Public API 文档（docstring）

- `services/api/app/api/routes/*`：FastAPI 路由具备类型化签名 + Pydantic 模型；核心路由（auth/pets/health/medication/care）docstring 说明目的与主要错误；模块级契约文档见 `docs/api/`。
- 抽查 `app/core/errors.py`：错误码枚举集中，错误 schema 统一（Adversarial/Database-API 报告验证无裸 500）。

## 3. 垃圾 / 过期注释

- 扫描 `services/api/app` 与 `apps/web`：未发现明显过期或误导注释；历史 `_backup/` 目录（`apps/web/_backup/page_bootstrap.tsx.bak`）为 Stage F 备份残留，见 DEAD_CODE 报告处置。
- `.env.example` 注释与 `.env.*.example` 系列覆盖 dev/staging/production/pilot 环境（见 DEPENDENCY/DRIFT 报告一致性）。

## 结论

High-value comments 覆盖全部关键不变量（医疗安全/权限/idempotency/synthetic/3D provenance）；API 文档无明显缺口。`COMMENT_AND_DOCUMENTATION_AUDIT_PASS`。