# Pet Life Intelligence — 宠物生活智能

宠物全生命周期记录与健康照护平台：**同一 Pet ID / Timeline，多端一致（Web / PWA / H5 / 微信小程序 / iOS / Android / Admin）**。

## 当前状态

```
PLI_V1_0_PRODUCTION_READY_MULTI_CLIENT
RELEASE_READY_EXTERNAL_BLOCKED   # 平台账号/域名/服务器为外部条件
```

- 后端测试：**239 passed**；ruff 全绿；Web/Admin/Mini/Mobile 构建全绿；Playwright **10/10**。
- 多端一致性：`tests/multi-client` 4/4（同一事件/任务/风险/分享在所有客户端一致）。
- 详细证据：`PLI_V1_0_PRODUCTION_RELEASE_REPORT.md`、`reports/PRODUCTION_READINESS_REPORT.md`。

## 客户端矩阵

| 客户端 | 路径 | 构建 |
|---|---|---|
| Web (Owner) | `apps/web` | `pnpm --dir apps/web build` |
| PWA | `apps/web`（sw.js + manifest） | 同 Web |
| H5 Share | `apps/web/app/share` | 同 Web |
| 微信/支付宝/抖音小程序 | `apps/mini` | `pnpm --dir apps/mini build:weapp` / `:alipay` / `:tt` |
| iOS / Android | `apps/mobile` | `pnpm --dir apps/mobile exec expo export --platform android/ios` |
| Admin / Professional | `apps/admin` | `pnpm --dir apps/admin build` |
| 设计系统 | `packages/ui-tokens` | `pnpm --dir packages/ui-tokens build` |

## Windows PowerShell 从零启动

```powershell
cd "E:\AI\Pet Life Intelligence"
.\scripts\dev.ps1
```

或手工：

```powershell
docker compose up -d                                        # PG 55432 / Redis 56379 / MinIO 59000
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e "services/api[dev]" -e "packages/rules" -e "services/ai-gateway"
pnpm install
cd services\api; ..\..\.venv\Scripts\python.exe -m alembic upgrade head; ..\..\.venv\Scripts\python.exe -m app.seed; cd ..\..
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir services\api --port 8800   # API
pnpm --dir apps\web dev -p 3000                                                          # Web
.\.venv\Scripts\python.exe services\worker\main.py --loop 60                             # Worker
```

- API 文档：http://localhost:8800/docs
- Web：http://localhost:3100 （登录 owner@pli.demo / family@pli.demo / sitter@pli.demo，dev-auth）
- Admin：http://localhost:3200

详细见 `docs/LOCAL_DEVELOPMENT.md`。

## 测试

```powershell
.\.venv\Scripts\python.exe -m pytest -q        # 239 项全量
.\.venv\Scripts\python.exe -m ruff check services packages tests
pnpm --dir apps\web typecheck && pnpm --dir apps\web build
pnpm --dir apps\admin typecheck && pnpm --dir apps\admin build
pnpm --dir apps\mini typecheck && pnpm --dir apps\mini build:weapp
pnpm --dir apps\mobile typecheck
cd tests\e2e-browser; pnpm exec playwright test   # 需 API+Web 已起
```

## 部署

- 本地：见上。
- 生产：`infra/docker/docker-compose.production.yml` + `infra/docker/nginx/nginx.conf` + `.env.production.example`。
- 文档：`docs/DEPLOYMENT.md` / `STAGING.md` / `PRODUCTION.md` / `MINI_PROGRAM_RELEASE.md` / `MOBILE_RELEASE.md`。

## 关键文档

- 设计基线与索引：`docs/reference/*`（v3.0 母版、228 Feature Inventory）
- 安全：`SECURITY.md`、`docs/08_SECURITY_PRIVACY.md`、`docs/AI_SAFETY.md`
- 隐私：`PRIVACY_MODEL.md`、`docs/PRIVACY.md`
- 医疗安全：`docs/05_AI_AND_SAFETY.md`、`reports/SAFETY_AUDIT.md`
- 恢复：`BACKUP_RESTORE.md`、`docs/DISASTER_RECOVERY_RUNBOOK.md`
- 事故：`docs/INCIDENT_RUNBOOK.md`
- 多端矩阵：`docs/product/PLATFORM_DELIVERY_MATRIX.md`
- 功能审计：`FULL_PRODUCT_AUDIT.md`、`reports/PRODUCTIONIZATION_PREFLIGHT.md`

## 安全边界（务必阅读）

- AI ≠ 兽医诊断；红旗由独立规则引擎裁决；AI 不自动开药/改剂量/确诊/降级 Emergency。
- 分享/授权均为短生命周期 + 可撤销 + 审计。
- 生产必须 `DEV_AUTH_ENABLED=false`；本仓库未包含任何真实密钥。