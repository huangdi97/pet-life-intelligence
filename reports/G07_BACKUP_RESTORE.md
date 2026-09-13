# G07 — Backup / Restore Round 2 (Stage D)

- Date: 2026-09-13
- Verdict: **PASS**（不只证明命令 exit 0——恢复后的系统真实可读可写）

## Round 2 evidence (real commands)

```text
1. pre-backup counts (dev DB pli):
   pets=2, life_events=28, users=3

2. dump:
   docker exec petlifeintelligence-postgres-1 pg_dump -U pli pli
     > artifacts/backups/ga_round2_pli.sql
   sha256 prefix: 44a777413ab82b7f

3. restore into brand-new DB:
   CREATE DATABASE pli_restore OWNER pli
   psql -d pli_restore < ga_round2_pli.sql
   → 0 errors (grep -ci error = 0)

4. schema + counts verification (restored DB):
   pets=2, life_events=28, users=3   ← 与备份前完全一致

5. API smoke against the RESTORED database
   (second uvicorn instance, port 8801, DATABASE_URL=…/pli_restore):
   PASS health
   PASS ready.postgres(restored)
   PASS login(restored)                       — owner@pli.demo 会话有效
   PASS restored pets=2
   PASS restored timeline readable            — 真实读取事件
   PASS write-on-restored-db                  — 恢复库可正常写入
   PASS utf8                                  — 中文数据完好
   RESTORED-DB SMOKE PASS

6. cleanup: restore DB dropped; dump retained in artifacts/backups/ (gitignored
   via artifacts/uploads only — dump 文件本身不入库，路径与 hash 记录于此)。
```

## Gate checklist

- [x] 非空数据库备份
- [x] 关键表计数记录（备份前后一致）
- [x] 全新 restore database + 0 错误
- [x] schema 一致（64 表经 pg_dump 全量恢复）
- [x] 恢复后的 API 真实读 + 写验证
- [x] 文件 hash / timestamp 记录（sha256 前缀 44a777413ab82b7f，2026-09-13）
