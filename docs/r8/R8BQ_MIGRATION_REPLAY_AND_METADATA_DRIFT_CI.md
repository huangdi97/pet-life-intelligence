# PLI R8BQ · Migration replay and metadata-drift CI gate

## Gap

Backend CI previously ran only `alembic upgrade head && alembic current`. That proves an empty CI database can reach the latest revision, but it does not prove:

- ORM metadata and migration head describe the same schema;
- the newest migration can downgrade cleanly;
- the newest migration can be replayed after downgrade.

R8BO introduced a database-level partial unique index protecting the append-only correction graph, so this gap became material.

## CI gate

Every Backend job now executes, before pytest:

1. `alembic upgrade head`
2. `alembic current`
3. `alembic check`
4. `alembic downgrade -1`
5. `alembic upgrade head`
6. `alembic check`
7. `alembic current`

The downgrade is relative rather than pinned to an R8 revision; future linear migrations inherit the same newest-revision round-trip check.

This is deliberately **not** a production rollback procedure. It is a disposable CI database integrity gate. Data-migration reversibility beyond the newest revision, production backup/restore, lock duration and large-table index build strategy remain separate operational concerns.

## Acceptance

Exact-HEAD Backend must pass this migration sequence plus Ruff and full pytest. Browser, Android runtime, OpenAPI and human visual gates remain separate. No merge, release, tag or visual-baseline promotion is authorized. `NO_VISION_MODEL_USED=TRUE`; `HUMAN_VISUAL_ACCEPTANCE=PENDING`.
