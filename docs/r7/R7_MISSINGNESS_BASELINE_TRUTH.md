# R7 · Missingness-aware individual baseline gate

**Problem:** A time-matched individual baseline existed, but an unlogged current day was treated as a numeric zero, potentially producing a fictitious -100% change. **Unknown is not observed zero.**

**Fix:** The existing `abnormal-day-hint` contract now explicitly returns `current_recorded: boolean` and `current_event_ids: string[]` (real LifeEvent IDs only). An empty current-day event set is `INSUFFICIENT`, with `deviation_percent = null`, `notable = false` and non-diagnostic copy. Keep `current_value = 0` for backward API consumers, but interpret it **only** together with `current_recorded`. A later observation can create a comparator once an adequate historical sample exists.

This is a deterministic calculation on sourced events, not disease prediction, mood inference or a continuously sensed animal state. The 15% display threshold remains a product heuristic, not a clinical cutoff.

**Gates:** unit/integration CI, no prior regression, compatible Today rendering and actual Android screenshots. Historical missing days are already excluded from recorded-sample means; complete supersession chains and per-pet timezone policy remain additional work. `NO_VISION_MODEL_USED = TRUE`; `HUMAN_VISUAL_ACCEPTANCE = PENDING`.
