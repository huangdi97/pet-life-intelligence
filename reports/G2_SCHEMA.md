# G2 — Canonical Domain Schema Report

- Verdict: **PASS**

## Implemented

- 28 tables via SQLAlchemy 2.0 models (`services/api/app/models/`): users,
  households, household_members, invitations, pets, relationships, grants,
  life_events, artifacts, consents, emergency_profiles, care_tasks,
  care_handoffs, care_cards, share_tokens, deletion_requests, health_events,
  clinical_intake_steps, observations, triage_assessments, vet_briefs,
  medication_plans, medication_doses, outcomes, behavior_events,
  ai_inference_logs, audit_entries, notifications.
- Canonical `LifeEvent` carries every required field (event_id, pet_id,
  event_type, occurred_at, recorded_at, actor_id, source_type, source_ref,
  provenance_level, schema_version, payload, artifact_ids,
  supersedes_event_id, retracted_at, created_at) — validated in contract
  tests against `packages/domain-schema/life_event.schema.json`.
- 46 canonical event types registered server-side with strict payload
  schemas (`app/domain/event_types.py`); frontend cannot invent payloads.
- Provenance levels: all 7 required values enforced.
- Timezone-aware datetimes everywhere (`DateTime(timezone=True)`); amounts
  normalized to strings (no bare floats).
- Idempotency-Key replay + content-hash duplicate detection (PLI-221).
- Append-only: corrections supersede (`supersedes_event_id`), retraction
  sets `retracted_at`; no silent overwrite (PLI-213).

## Migration

- Alembic revision `89595364188f` creates the full schema from an empty
  database; `downgrade()` drops all 28 tables (verified present).
- Test suite migrates a fresh `pli_test` database every session run.

## Seed

- `python -m app.seed` creates Demo Family household, Coco (dog) + Mimi
  (cat), 3 users (owner/family/sitter), daily events, task, behavior event,
  non-emergency + emergency health events, medication plan, outcome.
- Idempotent: wipes all tables then reseeds.

## Evidence

```text
$ python -m alembic upgrade head      → exit 0, head=89595364188f
$ python -m app.seed                  → SEED_OK (triage MONITOR / EMERGENCY as expected)
$ pytest tests/unit tests/safety tests/ai-evals tests/contract tests/integration -q
 60+29 passed (idempotency, duplicate detection, provenance, strict payloads,
 seed, migration-on-fresh-DB all covered)
```

## Gate checklist

- [x] JSON/Pydantic Schema 可验证（contract tests validate API output vs JSON Schema）
- [x] migration 可从空库升级（pli_test created + migrated in CI run）
- [x] downgrade 策略存在（28 drop_table in revision）
- [x] seed 可生成 demo household + 2 pets
- [x] idempotency 测试通过（3 tests）
- [x] provenance 测试通过（level + actor + registry tests）
