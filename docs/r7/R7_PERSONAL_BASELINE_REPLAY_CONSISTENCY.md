# PLI R7 · Personal baseline = current Life Replay truth

**Scope:** read-only event interpretation. No clinical prediction, no vision inference, no new app permissions, no human-visual approval.

## Defect

The prior `abnormal-day-hint` compared `daily.walk`, `daily.meal` and `daily.sleep` rows after excluding `retracted_at != null`, but did not examine `supersedes_event_id`. Today and Life Replay already excluded the earlier event after a later correction. A single user's corrected 90-minute walk could therefore still appear as 90 minutes in Today change explanations while the Life Replay history correctly showed 20 minutes.

## R7 consistency rule

- Query candidate metric LifeEvents for this pet/time window, **including** withdrawn rows so the projection can account for them.
- Query replacement rows referencing candidate IDs, even if their new occurred time or metric is different.
- Use the canonical `project_life_replay` at current knowledge cutoff. Never infer a missing current-day entry means zero activity. Include only sourced human/device/professional/lab observations in quantitative personal-baseline samples; derived AI narrative is not an observed measurement.
- Current-year comparison still uses same-clock local `UTC+08` legacy policy, minimum three actually recorded historical days, and explicit `sample_count`, `current_event_ids`, `current_recorded`, uncertainty and the nonclinical 15% heuristic. This change **does not** implement a user-specific time zone or causal medical inference.
- A corrected or subsequently retracted row cannot remain as a current metric source. Test includes real HTTP records, an internally generated append-only correction with persisted `supersedes_event_id`, then HTTP Today, baseline hint and retraction checks.
- Historic stored Baseline values are still historical snapshots with their own computation/version policy; the response's same-time baseline is recomputed from replayed LifeEvents. Further storage/backfill policy remains R8 work.

## Owner-facing effect

PLI can now say: "当前有 N 条有来源的活动记录" and "与自己在同期有记录的日子相比变化 X"，without counting an obsolete event. It still must **not** say the pet actually walked zero minutes, is sick, or had a specific emotion when recordings are absent.

## Gates

Latest feature-branch backend pytest + Ruff, Android Today smoke and replay R7 evidence, browser E2E, source-aware event scoping. `NO_VISION_MODEL_USED = TRUE`; `HUMAN_VISUAL_ACCEPTANCE = PENDING`. Do not merge PR #2, alter an accepted image baseline or issue a release.
