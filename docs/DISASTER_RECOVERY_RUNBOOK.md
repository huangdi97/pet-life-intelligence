# DISASTER_RECOVERY_RUNBOOK — 备份与灾难恢复

## 目标

- RPO：≤24h（生产建议缩短，配合定时 pg_dump）。
- 目标恢复时间：冷备恢复 ≤1h（数据规模为个人/家庭级）。

## 备份

```powershell
# 全库 dump（不包含媒体，媒体在 S3）
docker exec petlifeintelligence-postgres-1 pg_dump -U pli -d pli -Fc -f /tmp/pli.dump
docker cp petlifeintelligence-postgres-1:/tmp/pli.dump .\artifacts\backups\pli-<date>.dump

# 验证 dump 可读
docker cp .\artifacts\backups\pli-<date>.dump petlifeintelligence-postgres-1:/tmp/restore-test.dump
docker exec petlifeintelligence-postgres-1 pg_restore -U pli -d pli_test_restore --clean --if-exists /tmp/restore-test.dump
```

参考：`BACKUP_RESTORE.md` 与 `reports/G07_BACKUP_RESTORE.md`（64 表 dump→restore 0 错误→计数一致→恢复库 API smoke PASS）。

## 恢复演练（真实执行过）

1. dump 全库（64 表）。
2. 创建空库 restore 目标。
3. pg_restore 到 scratch → 0 错误。
4. pets / life_events 计数与源库一致。
5. 将 API 指向恢复库跑 smoke（登录/quick log/时间线）→ PASS。
6. 清理演练库。

## 完整恢复步骤（生产故障）

1. 停服：docker compose stop（保留数据卷）。
2. 起新的 postgres 空容器（或清空数据卷）。
3. `pg_restore -Fc` 导入最近 dump。
4. `alembic upgrade head`（若 dump 早于最新迁移则先升级）。
5. 起 api/worker → `/health` `/ready` 通过。
6. 抽查：宠物数、最近事件、最近 Vet Brief 可读。
7. 观察：API p95、worker 无重放重复（幂等 key 保护）。

## 注意事项

- 迁移与备份配合：dump 只保证时间点；跨版本恢复必须先 `alembic upgrade head` 验证。
- 媒体对象在 S3（bucket 级备份 + 版本化），DB 恢复不覆盖媒体。
- 不做"生产删除数据后恢复"的自动流程（需人工确认，AGENTS §5）。