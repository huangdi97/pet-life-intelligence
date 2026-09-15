# SECURITY_AUDIT — 上线安全审计

- Date: 2026-09-14
- 基线：tests/ga/test_security.py（IDOR 矩阵 / mass assignment / auth / injection / high-risk agent actions）全绿；
  浏览器 E2E-07（IDOR / URL 篡改）PASS。

## 覆盖矩阵

| 项 | 覆盖 | 证据 |
|---|---|---|
| IDOR（跨宠物/跨用户） | PASS | tests/ga/test_security.py + E2E-07（403/404 且不泄露） |
| Mass Assignment | PASS | HealthEventCreate extra=forbid；decision 字段不可注入 |
| Broken Auth / expired token | PARTIAL | dev-auth 会话签名存在；无 TTL（真实认证 EXTERNAL_BLOCKED） |
| CSRF | N/A | API 为 Bearer/dev-header 认证，非 cookie-only；若启用 cookie 会话需校验 Origin |
| XSS | PASS | React 自动转义；无 dangerouslySetInnerHTML |
| SQL injection | PASS | SQLAlchemy 参数化 + tests/ga 注入用例 |
| File upload abuse | PASS | MIME allowlist + magic-byte sniff + 25MB 限制 + 随机 key |
| Path traversal | PASS | 对象存储使用服务端生成 key；本地存储路径校验 |
| Rate limit | PASS (需开启) | rate_limit_enabled 生产开启；in-process 实现（多 worker 需外置） |
| RAG data leakage | PASS | search/ask 仅返回当前 pet 的 events |
| Cross-pet access | PASS | ABAC 解析；sitter 对未授权 pet 403/404 |
| Care token expiry | PASS | 到期/撤销后 403 + 审计 denial |
| Share token revoke | PASS | DELETE /share-tokens/{id} + revoked 检查 |

## 生产注意项

1. **生产 CORS**：`.env.production.example` 提供真实 origin 白名单（不配 `*` + credentials）。
2. **Rate limit**：当前 in-process deque；多 uvicorn worker 时每 worker 独立限额，需迁移 Redis 分布式限流（v1.0.1 建议）。
3. **Secrets**：`.env.production` 不入库；session/care-card secret 需 openssl 生成。
4. **TLS**：nginx 配置要求证书；HSTS 建议按域名审查后开启。
5. **真实认证**：dev-auth 生产必须 DEV_AUTH_ENABLED=false；真实注册/密码重置/会话管理为 EXTERNAL_BLOCKED。

## 结论

GA blocker 级安全问题：无。已覆盖 critical 面；真实账号/推送/支付等外部依赖诚实标记 EXTERNAL_BLOCKED。