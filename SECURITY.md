# SECURITY.md

## 认证（v0.1 现状）

- **Dev 认证模式**：签名 HMAC 会话 cookie（`pli_session`）或 `X-Dev-User-Id` 头。
  仅适用于本地开发；`DEV_AUTH_ENABLED=false` 时全部拒绝。
- 真实密码/OIDC 认证属 v0.2（PLI-217 部分：登录与设备安全已记录 SecurityEvent/审计）。

## 授权模型

- RBAC 角色默认能力矩阵 + ABAC（pet/household/grant scope/时间窗）。
- 所有检查集中在 `app/services/permissions.py`；`manage:pet` 不可委托。
- 临时授权（Grant）与分享令牌（ShareToken）到期即失效、可撤销、访问留审计。

## 令牌

- ShareToken：24 字节随机 `token_urlsafe`，仅存 SHA-256 哈希，响应只返回原始值一次。
- 邀请令牌同机制，7 天有效。

## 上传安全

- MIME 白名单 + 魔数签名校验（PNG/JPEG/GIF/WEBP/MP4/WEBM/MP3/PDF）
- 25MB 大小上限；空文件拒绝
- 存储 key 为服务端生成 UUID；原始文件名不进入路径（防路径穿越）
- 病毒扫描为已记录边界（未实现，见 LIMITATIONS.md）

## 速率限制

- 进程内滑动窗口：写方法默认 120 req/min/IP（可配置），超出 429 RATE_LIMITED。
- 已知限制：多实例部署需改为 Redis 计数（v0.2）。

## CORS / CSRF

- CORS 仅允许 `http://localhost:3000/3100`（配置项）。
- 会话 cookie `SameSite=Lax` + HttpOnly；跨端口 localhost 同站。
- 写操作要求 JSON Content-Type（表单 CSRF 面缩小）；dev 头仅 dev 模式接受。

## 密钥

- `.env` 不入库；仓库内只有 dev 默认值（`.env.example`）。
- 生产部署必须替换 `CARE_CARD_SIGNING_SECRET` / `session_secret` 并启用真实认证。

## 审计

- 读取敏感资源（sensitive artifact、Care Card、Vet Brief 分享视图）与全部写操作
  写入 `audit_entries`（actor/action/resource/request_id）。
