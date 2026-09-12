# BACKUP_RESTORE

## v0.1 数据资产

- PostgreSQL（pli 库）：所有业务事实（events/health/medication/audit…）— 唯一事实源
- 对象存储（MinIO `pli-dev` bucket，或本地磁盘 `artifacts/uploads/`）：媒体文件
- Redis：可丢弃（无持久业务状态）

## 备份

```powershell
# 数据库（建议每日）
docker exec petlifeintelligence-postgres-1 pg_dump -U pli pli > backup_pli_%DATE%.sql

# MinIO（mc mirror）或本地磁盘目录直接复制
docker run --rm --network petlifeintelligence_default -v ${PWD}:/backup \
  minio/mc sh -c "mc alias set s http://minio:9000 pli_minio pli_minio_dev_secret && mc mirror s/pli-dev /backup/pli-dev"
```

## 恢复

```powershell
docker compose up -d postgres
Get-Content backup_pli_20260913.sql | docker exec -i petlifeintelligence-postgres-1 psql -U pli -d pli
# 再恢复对象存储；artifact 表中的 storage_key 与文件一一对应（服务端生成的随机 key）
```

## 注意

- audit_entries 与 life_events 是合规追溯依据，备份必须包含。
- 备份文件包含敏感医疗数据：加密存储、限制访问。
- 删除请求（deletion_requests）执行时需同步清理备份策略（见 PRIVACY_MODEL.md）。
