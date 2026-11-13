# PLI R8A · LifeChangeCase / Owner Review — actual first implementation

**Status:** source commit only until exact-HEAD CI and migration checks finish.
Canonical basis: `PLI_R8_Individual_Life_Intelligence_Loop_Design_GOAL_2026-10-12.md`.

## Slice implemented

- New `life_change_cases` + `life_change_reviews` tables; Alembic upgrade/downgrade from the single existing head `b2c3d4e5f6a7`.
- POST/GET Case: only `daily.walk`, `daily.meal`, `daily.sleep` metrics; explicit owner-initiated POST, derived from existing R7 `abnormal-day-hint` at a minimum three documented same-clock historical days. No autonomously pushed health risk or medical diagnosis. The original event IDs are frozen in each Case as evidence, including historical sample IDs.
- A case cannot be created with client-submitted current value, baseline, confidence, source role, metric threshold or invented event IDs. Its SHA-256 fingerprint and per-pet lock make duplicate case creation idempotent.
- GET returns `recorded_state` plus independently recomputed effective `state`. After a cited event is retracted or superseded, **effective state becomes INVALIDATED** without overwriting any previous owner reviews or pretending that the old interpretation is current.
- POST Owner Review is a distinct append-only row requiring both `DAILY_WRITE` and owner/co-owner role: explicit `RECORD_OBSERVATION`, `FOLLOW_UP_LATER`, `NOT_RELEVANT`, `CORRECT_SOURCE`. A follow-up observation must be an actually recorded current event from the same pet and metric with `recorded_at` after Case creation. Tasks may be linked only if they belong to the same pet. Review uses a latest-review optimistic concurrency token and optional idempotency key.
- All read endpoints require `DAILY_READ`; no clinical fact is copied to this daily-only Case model. Audit captures IDs, metric, decision, never note/health text.
- Human review history is **not** an AI assertion, veterinary diagnosis, emotion classification or pet recovery state.

## Deliberate R8A limits

- Stored Case state is not silently rewritten by GET invalidation. Reads compute `effective state`; an offline invalidation worker/materializer is a later gate.
- All cases in this first slice are descriptive `RECORDED_CHANGE`. The earlier 15% heuristic is not promoted to clinical risk. At least three comparable historical days are needed; seven-day persistent alert evaluation and source coverage calibration remain R8B.
- Existing UTC+08 same-clock policy remains a documented fallback, not owner/pet IANA timezone support.
- Android owner workflow, Web/Mini parity, real media/3D fidelity and Human Visual Acceptance remain outstanding. Do not claim R8 complete from API success.
- `NO_VISION_MODEL_USED = TRUE`, `HUMAN_VISUAL_ACCEPTANCE = PENDING`, no merge, tag, Release or screenshot baseline update.
