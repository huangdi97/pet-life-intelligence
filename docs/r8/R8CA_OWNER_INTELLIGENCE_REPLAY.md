# PLI R8CA · Owner Intelligence Replay

## Why this slice exists

R7 Life Replay already distinguishes:

- `verified_now` — what the record says now, including later backfill and later corrections;
- `as_known_then` — only what was knowable by the selected historical cutoff.

R8 then added a separate append-only owner-intelligence journal:

`Case -> Review(s) -> Outcome(s)`

R8BY derived the current owner workflow and R8BZ routed that workflow to an
appropriate current action. Before R8CA, however, Life Replay still replayed
only `LifeEvent` facts. A historical date could answer “what was recorded?”
but not “what had the owner already concluded or chosen by then?”

R8CA closes that gap without treating owner judgement as pet health truth.

## Core invariant

```
real-life event history
!= owner-intelligence journal
!= effective owner workflow at cutoff
!= pet physiological / medical state
```

All four may be shown together, but none may silently substitute for another.

## Shared projector

`services/api/app/services/life_change_workflow.py` is the common projection
boundary for current and historical owner workflow semantics.

The current R8BY Case API and historical R8CA replay both use the same pure
owner-workflow precedence rules. Historical replay additionally reconstructs
which journal rows and which evidence validity were knowable at a requested
cutoff.

This prevents Today/Case surfaces and Life Replay from becoming two competing
truth models.

## Historical recorded state

`LifeChangeCase.state` is a denormalized current-state convenience field. It
must **not** be used as historical truth.

At a cutoff, R8CA derives `recorded_state` from the latest Review known before
that cutoff:

- no Review -> `PROPOSED`
- `RECORD_OBSERVATION` -> `FOLLOW_UP`
- `FOLLOW_UP_LATER` -> `FOLLOW_UP`
- `NOT_RELEVANT` -> `CLOSED`
- `CORRECT_SOURCE` -> `OWNER_ACKNOWLEDGED`

A Review written later cannot rewrite an earlier replay.

## Evidence validity at cutoff

Original Case evidence and follow-up evidence are evaluated at the same
`knowledge_cutoff`.

A source is eligible only if, at that cutoff:

- it belongs to the same pet;
- its event type matches the frozen metric;
- its source class is an allowed recorded-fact source;
- `recorded_at < cutoff`;
- `occurred_at < cutoff`;
- it had not yet been retracted before the cutoff;
- no superseding correction had been recorded before the cutoff.

Therefore a source retracted tomorrow remains valid in yesterday's
`as_known_then` replay if yesterday's owner could not yet know about the
withdrawal.

For follow-up evidence, the event must additionally have been both occurred
and recorded after the Case was actually created. A backfilled pre-Case event
cannot become a historical follow-up merely because it is queried later.

## Outcome head at cutoff

Only Reviews with `reviewed_at < cutoff` and Outcomes with
`recorded_at < cutoff` participate.

A historical Outcome is the effective owner workflow head only when:

```
outcome.case_review_head_id == latest_review_at_cutoff.id
```

This is the same R8BX/R8BY concurrency invariant used by the current API.

If the Outcome's observation source is invalid at that cutoff:

- the same Outcome ID remains historical;
- `owner_workflow_state = FOLLOW_UP_EVIDENCE_INVALIDATED`;
- `owner_workflow_source = OUTCOME`;
- `requires_new_follow_up_observation = true`.

If a newer Review was written after the Outcome but before the cutoff, that
Review becomes the workflow head and the older Outcome remains append-only
history.

## Granular replay endpoint

`GET /api/v1/pets/{pet_id}/life-change-cases/{case_id}/workflow-replay?knowledge_cutoff=<timestamp>`

Properties:

- requires `DAILY_READ`;
- cutoff must be timezone-aware;
- future cutoffs are rejected;
- a cutoff before real Case creation returns
  `case_known_at_cutoff=false` rather than inventing a pre-existing Case;
- owner free-text notes are not copied into this projection;
- output contains historical Review/Outcome identities and effective workflow
  state, but no diagnosis or health claim.

The endpoint is mainly a correctness/debuggable boundary for bitemporal owner
intelligence and an integration substrate for Life Replay.

## Life Replay integration

Existing:

`GET /api/v1/pets/{pet_id}/life-replay`

now returns:

- the existing `events`;
- `owner_workflows`;
- `owner_workflow_count`;
- `owner_workflow_truth_note`.

Cases are selected by their frozen comparison instant within the selected local
calendar day, but are excluded from a perspective before their actual
`created_at`.

The owner workflow uses the **same knowledge cutoff** as the LifeEvent replay.

This means one perspective selector controls one coherent knowledge model:

- `verified_now`: what is currently known about the selected day;
- `as_known_then`: what had actually been recorded/decided by that historical
  cutoff.

## Android Life View

Historical Life View consumes `owner_workflows` only in date mode.

The section is deliberately read-only:

- it shows the metric and frozen comparison facts;
- it renders the same owner-workflow language used by current Case surfaces;
- attention coloring follows evidence/workflow invalidation, not medical
  severity;
- it exposes no “today” action button from a historical replay.

Copy distinguishes:

- “当天结束时，主人当时已经怎么判断？”
- “现在回看，这一天形成了哪些主人判断？”

An empty historical workflow means only that no owner-reviewed Case was known
at that cutoff. It does not mean the pet had no change, no problem, or normal
health.

## Bitemporal acceptance scenario

Integration coverage exercises this real order:

```
Case created
-> real follow-up LifeEvent
-> RECORD_OBSERVATION Review
-> CONTINUE_OBSERVING Outcome
-> follow-up source retracted later
-> NOT_RELEVANT Review appended later
```

Replaying cutoffs between those writes must show:

1. before Case creation -> Case unknown;
2. after Case creation -> `PROPOSED`;
3. after follow-up Review -> `FOLLOW_UP`, follow-up source valid;
4. after Outcome -> `OUTCOME_CONTINUE_OBSERVING`;
5. replaying that same earlier cutoff after a later source withdrawal still
   shows the Outcome/source as valid;
6. after withdrawal -> `FOLLOW_UP_EVIDENCE_INVALIDATED`, same Outcome ID,
   fresh observation required;
7. after later `NOT_RELEVANT` Review -> `CLOSED / REVIEW`, while the older
   Outcome remains historical but no longer controls the workflow.

## Safety boundary

R8CA does not infer:

- health / normality / recovery;
- disease or diagnosis;
- causality;
- mood;
- unrecorded activity;
- historical 3D that was not independently recorded.

It also does not turn historical replay into an action surface.

`NO_VISION_MODEL_USED = TRUE`

`HUMAN_VISUAL_ACCEPTANCE = PENDING`

No merge, tag, release or visual-baseline promotion is authorized by this
slice.
