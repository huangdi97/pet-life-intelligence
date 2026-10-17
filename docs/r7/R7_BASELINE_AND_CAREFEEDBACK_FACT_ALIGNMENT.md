# PLI R7 · Stored Baseline / Seven-Day Care Feedback Truth

## Why

R7 already projected corrected and withdrawn LifeEvents correctly in `/today`, `/life-replay` and `/abnormal-day-hint`. However, the **persisted** `baseline/recompute` still counted any `retracted_at IS NULL` row, including a superseded 90-minute walk whose correct successor was 20 minutes. `care-feedback` similarly counted raw rows. When all observations were removed, baseline recomputation returned `null` but silently kept the stale Baseline table record.

## Implemented

- Persisted per-pet baseline recomputation and seven-day recorded-care feedback both use `project_life_replay` at the **current knowledge cutoff** to exclude superseded and retracted fact versions.
- Direct successor records are fetched from the same pet, including replacements outside the selected occurrence window; duplicates from the original and successor queries are deduplicated by immutable event ID.
- Only eligible `RECORD_FACT_SOURCES` enter quantitative summaries; no AI-derived narrative is treated as an observed meal or walk.
- A baseline metric with no surviving observed records is now deleted from Baseline storage on explicit recompute; old values cannot masquerade as current trusted baseline.
- `care-feedback` preserves its existing `feedback` list / `count_7d` / `status` fields and adds `source_event_ids` per returned group. It explicitly says *unrecorded is not zero activity*. The label `active` is the preexisting client contract and means recorded activity, not verified physical behaviour.
- Same legacy UTC+08 and rolling seven-day windows; no individual timezone guarantee yet, no clinical inferences, no medical diagnosis.

## Evidence gate

HTTP regression: create a 90-minute owner walk, recompute persisted baseline (90), correct it with a 20-minute append-only event, recompute baseline (20), check seven-day feedback references **only the corrected event ID**, retract it, recompute, then assert the stale Baseline row and feedback observation disappear. Backend, full CI, Android and Web gates must pass at the latest exact HEAD before any PASS claim.

Human visual acceptance, real individual 3D asset, and physical Android install remain separately PENDING. `NO_VISION_MODEL_USED = TRUE`. No merge, release, tag or visual-baseline promotion.
