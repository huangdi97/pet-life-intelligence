# PLI R8BY · Effective Owner Workflow Projection

## Why this slice exists

R8BV made Owner Outcomes append-only records anchored to a real follow-up
observation. R8BW made source invalidation visible without rewriting that
Outcome. R8BX then bound each Outcome to the exact Case Review head the owner
had seen.

Those three invariants still leave a product-level ambiguity:

- `LifeChangeCase.state` is a denormalized historical Review projection;
- `LifeChangeOutcome` is a later owner judgement;
- an Outcome source can later be retracted;
- the owner can append another Review after that Outcome.

Today and Case-history summaries therefore cannot safely treat any one stored
field as "the current state".

R8BY introduces a **derived current owner workflow projection**. It changes no
historical row and makes no physiological or medical claim.

## Core invariant

`historical journal != current owner workflow != pet health state`

The journal remains append-only:

`Case -> Review(s) -> Outcome(s)`

The current owner workflow is derived from the latest valid journal head and
its source truth.

It must never be interpreted as:

- healthy / normal / recovered;
- diagnosed / sick;
- causal improvement or deterioration;
- proof of an unrecorded real-world condition.

## Projection fields

Case list, Case detail, and idempotent Case replay expose the same fields:

- `recorded_state` — stored Case state produced by historical Review writes;
- `state` — compatibility effective Case state;
- `owner_workflow_state` — canonical current owner workflow projection;
- `owner_workflow_source` — `CASE | REVIEW | OUTCOME`;
- `latest_effective_outcome_id` — current Outcome identity, or null;
- `latest_effective_outcome_assessment` — current Outcome assessment, or null;
- `requires_new_follow_up_observation` — whether a fresh real observation is
  required before another Outcome.

## Precedence

### 1. Original Case evidence invalid

If the source-backed Case itself is no longer current:

- `owner_workflow_state = INVALIDATED`;
- `owner_workflow_source = CASE`;
- no Outcome is treated as currently effective;
- `requires_new_follow_up_observation = false`.

This cannot be repaired by merely adding a new follow-up observation. The
original source-backed comparison itself must be re-evaluated.

### 2. Current Outcome

An Outcome is current only when:

`latest_outcome.case_review_head_id == latest_review.id`

This means the Outcome was recorded against the same Review head that is still
current.

A valid current Outcome projects one of:

- `OUTCOME_CONTINUE_OBSERVING`;
- `OUTCOME_NO_LONGER_CONCERNED`;
- `OUTCOME_NEEDS_FURTHER_FOLLOW_UP`.

These are owner intentions only.

In particular:

`OUTCOME_NO_LONGER_CONCERNED != recovered != healthy != normal`

### 3. Current Outcome source invalidated

If the current Outcome's observation source is later retracted, corrected, or
otherwise no longer current:

- the Outcome row and Outcome ID remain unchanged;
- `observation_sources_valid = false`;
- `owner_workflow_state = FOLLOW_UP_EVIDENCE_INVALIDATED`;
- `owner_workflow_source = OUTCOME`;
- `requires_new_follow_up_observation = true`.

The owner must create a new real follow-up observation before another Outcome.

### 4. Newer Review after Outcome

A Review appended **after** an Outcome becomes the new workflow head because
the Outcome's `case_review_head_id` no longer matches the latest Review.

The older Outcome:

- remains in append-only history;
- retains its original assessment and identity;
- continues to report its own current source validity;
- no longer controls the current owner workflow.

Therefore a later explicit `NOT_RELEVANT` Review may make the current workflow
`CLOSED`, even while an older Outcome remains visible with
`observation_sources_valid=false`.

That does not resurrect or validate the old source. It only separates current
owner intent from historical evidence truth.

## Mobile summary language

Today and complete Case history consume `owner_workflow_state` rather than
guessing from `state + follow_up_source_valid`.

Current mappings include:

- `OUTCOME_CONTINUE_OBSERVING` -> “主人选择继续观察”
- `OUTCOME_NO_LONGER_CONCERNED` -> “主人目前不再担心 · 非恢复结论”
- `OUTCOME_NEEDS_FURTHER_FOLLOW_UP` -> “主人选择进一步跟进”
- `FOLLOW_UP_EVIDENCE_INVALIDATED` -> “后续记录已失效 · 需新的真实观察”

Danger styling is reserved for current workflow attention states. A historical
invalid follow-up does not keep a later `CLOSED` Review visually red.

## Runtime proof

Hosted Android evidence must prove both halves of the projection through real
owner interaction.

After a real Android tap records `CONTINUE_OBSERVING`:

- Outcome POST is persisted;
- `case_review_head_id` is non-empty;
- `owner_workflow_state = OUTCOME_CONTINUE_OBSERVING`;
- `owner_workflow_source = OUTCOME`;
- effective Outcome ID equals the persisted Outcome ID;
- `requires_new_follow_up_observation = false`.

After the same follow-up source is retracted through the real Android UI:

- the same Outcome ID remains;
- `observation_sources_valid = false`;
- `owner_workflow_state = FOLLOW_UP_EVIDENCE_INVALIDATED`;
- `owner_workflow_source = OUTCOME`;
- effective Outcome ID remains the same historical identity;
- `requires_new_follow_up_observation = true`;
- stale Outcome actions are absent.

## Acceptance boundary

R8BY can be considered implementation-closed only when current exact-head:

- Backend integration tests pass;
- mobile owner-history executable regression passes;
- full CI passes;
- hosted Android runtime evidence passes;
- current evidence artifact is inspected and confirms the projection fields.

This does not authorize visual-baseline promotion, merge, release, tag, or a
claim that the pet is healthy/recovered.

`NO_VISION_MODEL_USED = TRUE`

`HUMAN_VISUAL_ACCEPTANCE = PENDING`
