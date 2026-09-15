# STAGING — 预生产环境

## 目的

- 验证迁移链、seed 分离、真实用户路径、构建产物、浏览器 E2E。
- 与 production 严格分离（独立 DB / S3 bucket / 环境变量）。

## 配置

- `.env.staging.example` → 服务器 `.env.staging`。
- 可使用沙箱数据 + dev-auth（staging 允许），但生产绝对禁止自动导入 demo 数据。

## 验证清单（每次 staging 发布）

1. `alembic upgrade head` 从空库到 head。
2. `pytest`（若环境可跑）或 staging_smoke：
   ```powershell
   .\.venv\Scripts\python.exe scripts\staging_smoke.py
   ```
   → 12/12 PASS（health/login/quicklog/red-flag/vetbrief/export/devices/agent）。
3. 浏览器 E2E 10 条主路径（Playwright）对 staging Web 运行。
4. 远程冒烟：health、login、create pet、quick log、timeline、health（GOAL §58）。

## 与 Pilot 的差异

| | Staging | Pilot |
|---|---|---|
| 用户 | 测试/沙箱账号 | 少量真实账号 |
| 数据 | 沙箱 | 真实 |
| Audit | 全开 | 全开 + 事故响应 |
| Feature Flags | 可全开测试 | 默认 safe |