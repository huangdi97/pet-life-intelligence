# Pet Life Intelligence — 宠物生活智能

宠物全生命周期记录与健康照护平台：**同一 Pet ID / Timeline，多端一致（Web / PWA / H5 / 微信小程序 / iOS / Android / Admin）**。

## 当前状态

```text
PLI_V0_1_1_INTERNAL_READY（2026-09-24，Stage R.1）
GitHub：https://github.com/huangdi97/pet-life-intelligence（公开仓库）
pytest 427 passed / ruff 0 / 五端 typecheck 0 / vitest 22/22
Playwright 30（27 功能 + 视觉链 3）production 模式全 PASS
```

- **v0.1.1（内部 / Pre-Pilot）**：Android 真机链路就绪（LAN internal APK）、
  API URL 环境注入（不再写死 localhost）、品牌基线（图标/Splash）、
  v3.3-R1 canonical 对齐、Visual Regression V2（真实 baseline diff）。
- **发布形态**：v0.1.0 GitHub Release 含 Web standalone 产物与 Android APK
  （DEBUG_SIGNED_INSTALLABLE_APK / NOT_PLAY_STORE_SIGNED / PLAY_STORE_SIGNING=EXTERNAL_BLOCKED）；
  v0.1.1 为内部收口续版（`artifacts/release/v0.1.1/`）。
- **v1.x tags = 历史内部工程里程碑**（v1.0.0/v1.1.0/v1.1.1/v1.2.0 是早期内部命名线）；
  **v0.1.x = 公开产品发布线**，避免 SemVer 误解（详见 CHANGELOG）。
- **真实 Auth**：注册/登录/刷新/密码重置/邮箱验证/会话管理（Argon2id + rotating tokens）。
- **真实 AI**：OpenAI-compatible provider（经 AI Gateway，mock fallback 保可用）。
- **Pilot**：invite-only 模式 + 反馈 + 指标 + 业务包（医院/门店/训练师/寄养）；PILOT_MODE=false、真实参与者 0（诚实保留）。
- 详细证据：`reports/STAGE_R1_FINAL_REPORT.md`、`reports/STAGE_R1_V3_3_UIUX_REACCEPTANCE.md`、
  `reports/VISUAL_REGRESSION_V2_REPORT.md`、`reports/ANDROID_REAL_DEVICE_QA.md`、`reports/WEB_REAL_ACCESS_REPORT.md`。

## Screenshots

```text
artifacts/release/v0.1.1/screenshots/web/      — 核心 6 页 × mobile/desktop（production 模式实拍 12 张）
artifacts/release/v0.1.1/screenshots/android/  — 真机截图待回填（NOT_YET_OBSERVED）
```

## Web

- 本地/LAN：`scripts/dev.ps1` 一键起全栈（API :8800 绑定 0.0.0.0，Web :3100）。
- 部署就绪：`NEXT_PUBLIC_API_URL` 环境注入 + standalone tgz（`infra/docker/` 部署路径）。
- 公网状态：`PUBLIC_DEPLOYMENT = EXTERNAL_BLOCKED`（无 VPS/域名/HTTPS 资源，详见
  `reports/WEB_REAL_ACCESS_REPORT.md`）。

## Android

- v0.1.1 internal-LAN APK：`artifacts/release/v0.1.1/Pet-Life-Intelligence-v0.1.1-internal-lan.apk`
  （package `com.pli.mobile` · versionName 0.1.1 · versionCode 2 · App 名「宠物生活智能」）。
- 真机 QA：`ANDROID_REAL_DEVICE_QA = NOT_YET_OBSERVED`；安装/登录/核心流程/双宠切换 checklist
  见 `reports/ANDROID_REAL_DEVICE_QA.md`（预计 ≤15 分钟）。

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
.\\.venv\\Scripts\\python.exe -m pytest -q        # 427 项全量（约 5-6 分钟）
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
- Pilot：`docs/pilot/`（DEMO_SCRIPT / VET_PILOT / PET_STORE_PILOT / TRAINER_PILOT / CARE_SERVICE_PILOT / PILOT_CONSENT / SUPPORT_OPS）
- Git 远端交接：`docs/release/GIT_REMOTE_HANDOFF.md`

## 安全边界（务必阅读）

- AI ≠ 兽医诊断；红旗由独立规则引擎裁决；AI 不自动开药/改剂量/确诊/降级 Emergency。
- 分享/授权均为短生命周期 + 可撤销 + 审计。
- 生产必须 `DEV_AUTH_ENABLED=false`；本仓库未包含任何真实密钥。