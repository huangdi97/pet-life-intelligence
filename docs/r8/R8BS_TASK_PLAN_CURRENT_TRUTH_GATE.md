# PLI R8BS · Low-risk task-plan current-truth gate

## Finding

`/task-plan` was one of the last owner-action surfaces still counting raw
same-day LifeEvent rows. A retracted or superseded `daily.walk` therefore
continued to satisfy the checklist even though Today, Life Replay, personal
baseline and care-feedback no longer considered that version current.

## Rule

The low-risk task planner now projects today's recorded meal/walk/play/sleep
through the same `project_life_replay` current-knowledge semantics:

- superseded and retracted versions do not satisfy the checklist;
- candidate rows are deduplicated by immutable event ID;
- only `RECORD_FACT_SOURCES` count as observed/reported records;
- response adds `observed_event_ids` so every "record exists" claim can be
  traced to exact source events;
- the boundary explicitly says **unrecorded does not mean the activity did not
  happen**. Suggestions remain Quick Log prompts, never medical actions.

The existing UTC day boundary is preserved in this slice; per-pet timezone
remains separate work.

## Regression

HTTP create a walk → task-plan cites old event → append-only correction →
task-plan cites only replacement → retract replacement → task-plan once again
suggests recording a walk and cites no walk event.

Require exact-HEAD Ruff/pytest/OpenAPI/Browser/Android gates. No merge, release,
tag or visual-baseline change. `NO_VISION_MODEL_USED=TRUE`;
`HUMAN_VISUAL_ACCEPTANCE=PENDING`.
