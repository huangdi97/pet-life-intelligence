# SECURITY AUDIT（Stage V，2026-09-23 重写）
- 范围：Auth/JWT/session/refresh/rate limit/IDOR/CSRF（适用时）/CORS/upload/signed URL/injection/RAG leakage/logs/PII/secrets 全覆盖
- 方法：代码审计 + GA/Stage V 对抗测试实测（Playwright 29 + pytest 420 全绿）

## 1. 认证与会话

| 项 | 状态 | 证据 |
|---|---|---|
| 密码存储 | PASS | Argon2id（Stage E real auth；tests/v10/test_stage_e_auth.py + 远程 auth 矩阵 15/15 历史记录） |
| Access/Refresh token | PASS | TTL 30m/14d 配置（config.py）；真实认证 EXTERNAL_BLOCKED 时 dev-auth 仅 dev 环境允许，production 由 validate_production 强制关闭 |
| Session 签名 | PASS | session_secret 签名；生产校验（非默认值） |
| 密码错误不泄露细节 | PASS | auth.py `except Exception: return False`（CODE_QUALITY §3 判定正确做法） |
| 限流 | PASS（需开启） | rate_limit_enabled 生产开启；in-process deque（多 worker 需 Redis 分布式——记录为 SHOULD_FIX 下阶段） |

## 2. 授权（0 unintended access，对抗 §15 实测）

| 项 | 结果 | 证据 |
|---|---|---|
| IDOR（跨宠物/跨用户） | PASS | GA + E2E-07（403/404 不泄露）；Stage V 猜 pet_id/跨 household 实测 |
| Grant 过期/撤销 | PASS | 过期 403、撤销 403、删除 user/pet 后 403/404 |
| 角色边界 | PASS | sitter/family/professional 越权全部 403；**SV-001 已修**：ops feature-flag 端点增加 require_ops_admin（is_internal 平台运营），普通 owner 403 |
| admin boundary | PASS | 同上（ADVERSARIAL §15 实测 403/201） |

## 3. 传输/注入/存储

| 项 | 状态 | 证据 |
|---|---|---|
| CORS | PASS | cors_origins 显式白名单，生产无 *（validate_production） |
| CSRF | N/A | Bearer/dev-header 认证非 cookie-only；若启用 cookie 会话需 Origin 校验（记录） |
| XSS | PASS | React 自动转义；无 dangerouslySetInnerHTML |
| SQL injection | PASS | SQLAlchemy 参数化 + GA 注入用例 |
| File upload | PASS | MIME 白名单 + magic-byte sniff + 25MB 限制 + 服务端随机 key；伪 PNG 422 |
| Signed URL / path traversal | PASS | 对象存储服务端生成 key；本地存储路径校验 |
| RAG 泄漏 | PASS | search/ask 仅返回当前 pet 事件（数据域隔离） |
| Prompt injection | PASS | AI Goldset G-20/21（注入指令零诊断输出） |
| 日志 PII | PASS | 日志不写完整敏感病历/媒体/token；错误 envelope 不含内部堆栈 |

## 4. Secrets Audit（只报告位置/类型/严重级别，不输出内容）

| 位置 | 类型 | 严重度 | 处置 |
|---|---|---|---|
| `.env` / `.env.*` 本地文件 | 环境密钥占位/开发值 | HIGH（若误提交） | `.gitignore` 排除；**无 committed secret**（git 扫描确认无 key/password/token 入库；`.env*.example` 全为占位符） |
| config.py 默认值 | dev 占位（CHANGE_ME_DEV_ONLY / pli_dev_password） | MEDIUM | 生产 validate_production 强制替换；示例值为开发默认 |
| services/worker/ai-gateway | 无硬编码密钥 | — | 全部经 Settings/env 注入 |
| 历史提交扫描 | 无真实 secret 提交 | — | git 历史抽查无真实 key/password |

## 5. 结论
`SECURITY_AUDIT_PASS`：GA blocker=0；Stage V 权限对抗 0 unintended access；secrets 无提交、占位符生产有强制校验；真实外部能力（AI/SMTP/支付/推送）全部 EXTERNAL_BLOCKED 诚实保留。生产建议（记录不阻塞）：Redis 分布式限流、HSTS、真实认证全链路。
