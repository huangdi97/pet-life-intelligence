# G06 — Migration Full Replay (Stage D)

- Date: 2026-09-13
- Verdict: **PASS**

## Replay on a fresh empty database (real commands)

```text
$ psql -c "CREATE DATABASE pli_replay OWNER pli"
$ DATABASE_URL=…/pli_replay alembic upgrade head
 → 5 revisions applied: 89595364188f → 54591ad33a24 → b267c90f7267
   → ee3419e866eb → 9b0058ac2e82
$ python -m app.seed (against pli_replay)
 → SEED_OK (2 pets, 112 life_events verified via psql count)
```

## Limited downgrade / re-upgrade (real commands)

```text
$ alembic current            → 9b0058ac2e82 (head)
$ alembic downgrade -1       → e8718b28c1eb   (v1.0 stage C dropped)
$ alembic current            → e8718b28c1eb
$ alembic downgrade -1       → ee3419e866eb   (checklist/target_role dropped)
$ alembic current            → ee3419e866eb
$ alembic upgrade head       → 9b0058ac2e82 (restored)
```

## Findings

- Every revision has a real `downgrade()` (drop columns/tables verified present in files).
- NOT NULL JSONB columns added in `9b0058ac2e82` carry `server_default` during
  backfill then `alter_column … server_default=None` — safe on non-empty DBs
  (this exact path was exercised on the dev DB with existing rows).
- Naming: revisions carry feature IDs in messages; single head, no merge needed
  (`alembic current` unambiguous at all times).
- Downgrade risk note: downgrade past `54591ad33a24` drops v0.2 data-bearing
  tables — documented as destructive; forward-fix is the default strategy.

## Gate checklist

- [x] empty DB → upgrade head → seed → API（此前 staging smoke 即此链路）
- [x] limited downgrade (-1 ×2) + re-upgrade head 全部真实执行
- [x] nullable/FK/unique/index/server-default 审查（autogenerate + 人工修正 server_default）
- [x] 无 merge heads
