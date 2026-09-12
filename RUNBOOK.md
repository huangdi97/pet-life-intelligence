# RUNBOOK — 日常运行手册

## 启动完整栈

```powershell
cd "E:\AI\Pet Life Intelligence"
.\scripts\dev.ps1
```

窗口 1：API (uvicorn :8800) · 窗口 2：Web (next :3100) · 窗口 3：Worker (60s 轮询)

## 健康检查

```powershell
curl http://localhost:8800/api/v1/health          # {"status":"ok"}
curl http://localhost:8800/api/v1/ready           # postgres+redis ok
curl http://localhost:8800/api/v1/ready/engine-info
```

## 数据库

- 开发库 `pli`，测试库 `pli_test`（pytest 自动创建/迁移/清理）。
- 迁移：`cd services\api; ..\..\.venv\Scripts\python.exe -m alembic upgrade head`
- 重置演示数据：`.\scripts\reset-demo.ps1`（清空开发库并重新 seed —— 仅开发环境）

## Worker 作业

- Grant 到期 → `grant.expired` 事件 + 通知
- Handoff 到期 → 结束 + `care.handoff_ended`
- 用药剂量超时 30 分钟未记录 → `medication.missed` + 通知
- 所有作业幂等（idempotency/dedupe key），状态只存 PostgreSQL。

手动跑一次：`.\.venv\Scripts\python.exe services\worker\main.py --loop 0`

## 备份 / 恢复

见 `BACKUP_RESTORE.md`。

## 故障排查

| 症状 | 处理 |
|---|---|
| API 启动报连接失败 | `docker compose ps` 检查 postgres healthy；确认端口 55432 |
| Web 401 | 去 /login 重新登录（dev 会话存 cookie/localStorage） |
| 上传失败 422 | 检查 MIME 白名单（png/jpeg/gif/webp/mp4/webm/mp3/pdf）与 25MB 限制 |
| MinIO 不可用 | API 自动降级为本地磁盘存储（artifacts/uploads/），日志可见 |
