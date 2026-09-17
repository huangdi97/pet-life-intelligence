# STAGE_F_DISASTER_RECOVERY — 远程 Staging 备份/恢复演练（§25）

- 日期：2026-09-17
- 环境：远程 staging（zhishen-tokyo / staging.haoleilab.com），**不触碰真实数据**（演练在独立临时库 `pli_restore_drill` 执行，结束后删除）
- 脚本：`scripts/pli_backup_drill.sh`（可复现）

## 流程与结果（真实执行，exit code 0）

| # | 步骤 | 结果 |
|---|---|---|
| DRILL-01 | 记录 baseline：live staging DB 全部 73 张业务表计数 | PASS（73 tables） |
| DRILL-02 | `pg_dump -Fc`（custom format）写出备份 | PASS（/tmp/pli_backup_drill.dump，非空校验） |
| DRILL-03 | 创建空库 `pli_restore_drill` | PASS |
| DRILL-04 | `pg_restore --no-owner --no-privileges` 恢复 | PASS（exit 0） |
| DRILL-05 | 恢复后全部 73 表计数 == baseline | PASS（逐表比对，无差异） |
| DRILL-06 | 用恢复后的 DB 启动临时 API 容器（pli-api:staging 镜像 + 独立 DATABASE_URL）→ `/api/v1/health` | PASS（200） |
| DRILL-07 | 对恢复库真实执行 register → verify-email → login | PASS（access token 签发） |
| DRILL-08 | 对恢复库 create pet | PASS（201） |
| DRILL-09 | 恢复库 `/api/v1/metrics`（pets_total ≥ 1） | PASS（pets_total=10） |
| DRILL-10 | 清理：临时 API 容器移除 + 演练库 drop + dump 删除 | PASS |

```
BACKUP/RESTORE DRILL SUMMARY: ALL-PASS（REMOTE_EXIT_CODE=0）
```

## 覆盖范围

- **数据库**（唯一业务事实源）：events/health/medication/audit/auth/pilot 全部 73 表，含索引与约束（pg_dump custom format 保留）。
- **对象存储**（媒体文件）：`pli_uploads` volume + `LOCAL_UPLOAD_DIR`；artifact 表 storage_key 与文件一一对应（服务端随机 key）。媒体备份策略见 BACKUP_RESTORE.md（mc mirror 或目录复制）。
- **Redis**：可丢弃（无持久业务状态，appendonly 仅作缓存容灾）。

## 注意（合规）

- audit_entries 与 life_events 是合规追溯依据，备份必须包含（本演练已含）。
- 备份文件包含敏感医疗数据：加密存储、限制访问（生产执行时遵循 PRIVACY_MODEL.md）。
- deletion_requests 执行时需同步清理备份策略（见 PRIVACY_MODEL.md）。
- 生产环境禁止自动 seed；本演练仅针对 staging 临时库。
