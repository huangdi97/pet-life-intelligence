# Contributing — Pet Life Intelligence (PLI)

感谢你考虑为 PLI 做贡献。本文件是你开始前必须了解的协作约定。

## 1. 项目状态

- 产品设计 / UI/UX / 多端体验已冻结（`PRODUCT_DESIGN_FREEZE` + `FEATURE_FREEZE`）。
- 当前阶段只接受：bug fix、质量/可维护性改进、安全/权限加固、测试、无障碍/响应式修复、
  文档对齐、死代码清理、性能工作、Provider Adapter、Pilot 准备。
- 不接受：新领域功能、自创 Feature ID（`PLI-229+`）、绕开冻结的新 Roadmap 阶段。

## 2. 开发前必读

1. `AGENTS.md`（全局工程规范 + PLI 规则，权威顺序 L0..L4）。
2. `WORK_STATUS.md`（当前终态与证据）。
3. 相关 canonical 文档（`docs/product/*`、`docs/ui/*`、`docs/architecture/*`）。

## 3. 本地环境

见 `docs/LOCAL_DEVELOPMENT.md` 与 `README.md`：

```powershell
docker compose up -d                     # PG 55432 / Redis 56379 / MinIO 59000
.\scripts\dev.ps1                        # 启动 API(8800) + Web(3100) + worker
```

本地 pytest 使用隔离的 `pli_test` 库；前端用 pnpm workspace。

## 4. 提交前的门禁（全部通过才算 Done）

```powershell
.\\.venv\\Scripts\\python.exe -m pytest -q        # 后端（≥427 passed）
.\\.venv\\Scripts\\python.exe -m ruff check services packages tests
pnpm --dir apps/web typecheck && pnpm --dir apps/web build
pnpm --dir apps/admin typecheck && pnpm --dir apps/admin build
pnpm --dir apps/pro typecheck && pnpm --dir apps/pro build
pnpm --dir apps/mini typecheck && pnpm --dir apps/mini build:weapp
pnpm --dir apps/mobile typecheck
pnpm --dir apps/web test                          # vitest
cd tests/e2e-browser; pnpm exec playwright test    # 需 API + Web 已启动
```

规则：

- 禁止为了通过 CI 删除/弱化测试、加 ignore（`type: ignore`/`noqa`）或关闭 lint。
- 生产源码 ≤300 行 / React 组件 ≤200 行；无裸 `TODO`。
- 新功能必须可追溯：Feature/Requirement → 代码 → 测试 → 客户端责任 → 证据/明确 blocked 状态。

## 5. 提交与分支

- 一个 commit 围绕一个明确问题（feature / bug / refactor / test / docs / chore）。
- 行为变更与结构重构尽量分离；遵循 Minimum Safe Refactor。
- 禁止 force push 到共享分支、禁止重写已公开历史。
- commit message 建议带阶段前缀，例如 `[PLI-STAGER]`；中文或英文均可，须描述 WHY。

## 6. 诚实原则

- 不伪造证据：REAL 指标、用户验证、部署状态必须是「真实测量」或「NOT_YET_OBSERVED / EXTERNAL_BLOCKED」。
- 不提交 secret：`.env`（含值）、keystore、token 一律不入库；只用 `*.example` 模板。
- 医疗安全边界不可降级：确定性红旗、用药/剂量、权限隔离的测试必须保持绿色。

## 7. 从这里开始

1. 先读 `AGENTS.md`（仓库根）。
2. 在 GitHub Issues 认领或开出问题，说明动机与影响。
3. 切分支 → 实现 → 本地全部门禁 → 提交 → 开 PR → CI 全绿后按贡献者约定处理。