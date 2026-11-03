# PLI R8BZ · Owner Next Action Routing

## Why this slice exists

R8BY made the current owner workflow explicit and separated it from both the
append-only journal and pet health state. The remaining product gap was action:
Today, full Case history, and Case detail could correctly say what the owner
workflow meant, but they still mostly routed to generic history/detail screens.

That is not enough for the Pet Life Intelligence loop:

```
real observation
→ individual memory
→ source-backed change
→ owner review
→ real follow-up observation
→ owner outcome
→ next real observation when appropriate
```

R8BZ turns the canonical R8BY workflow projection into a deterministic owner
next action. It adds **no database state** and does **not** create a second truth
model.

## Core invariant

```
journal truth != current owner workflow != next-action navigation != pet health state
```

The server remains authoritative for Case / Review / Outcome and current
workflow truth. Mobile only derives a navigation action from those fields.

A next action must never mean:

- diagnosed;
- healthy / normal / recovered;
- higher medical severity;
- causal improvement or deterioration;
- proof that an unrecorded event occurred.

## Pure action projection

`caseHistoryNextAction(case)` returns exactly one of:

- `OPEN_CASE`
- `RECORD_OBSERVATION`
- `NONE`

The projection consumes existing R8BY fields such as
`owner_workflow_state`, `source_valid`, and
`follow_up_source_valid`.

### Original Case evidence invalid

`INVALIDATED -> OPEN_CASE`

Copy: **重新核对原始记录**

A new follow-up record cannot repair an invalid original comparison. The owner
must inspect/re-evaluate the source-backed Case first.

### Current Outcome evidence invalid

`FOLLOW_UP_EVIDENCE_INVALIDATED -> RECORD_OBSERVATION`

Copy: **补一条新的真实{指标}记录**

This is a hard evidence requirement before another Outcome can be appended.
The old Outcome remains immutable history.

### Owner chose to continue observing

`OUTCOME_CONTINUE_OBSERVING -> RECORD_OBSERVATION`

Copy: **有新情况时继续记录{指标}**

This is a recommendation, not a mandatory daily task and not a health alert.

### Owner chose further follow-up

`OUTCOME_NEEDS_FURTHER_FOLLOW_UP -> RECORD_OBSERVATION`

Copy: **记录下一次真实{指标}作为跟进**

This remains owner intent. It does not raise medical severity.

### Owner is no longer concerned / closed

`OUTCOME_NO_LONGER_CONCERNED | CLOSED -> NONE`

Copy: **当前没有待办**

The accompanying truth copy explicitly states that this does not prove
recovery, normality, or absence of health problems.

### Source review requested

`OWNER_ACKNOWLEDGED -> OPEN_CASE`

Copy: **继续核对来源**

### A valid real follow-up is already present

`follow_up_source_valid=true -> OPEN_CASE`

Copy: **回看后续观察并记录结果**

The next useful step is reviewing the existing real observation rather than
creating another synthetic task.

### Follow-up chosen but no real observation yet

`FOLLOW_UP -> RECORD_OBSERVATION`

Copy: **有新情况时记录真实{指标}**

### Proposed Case

`PROPOSED -> OPEN_CASE`

Copy: **完成这次主人核对**

## Android routing

R8BZ reuses the existing governed QuickLog route:

- pet ID is explicit;
- Case ID is explicit;
- metric is explicit;
- the matching QuickLog form is preselected;
- the real LifeEvent is persisted first;
- only after the event succeeds does QuickLog append a
  `RECORD_OBSERVATION` Review;
- pet switches invalidate stale async completion;
- a Review failure never rewrites or pretends the real LifeEvent failed.

No API endpoint was added solely for navigation.

## Surfaces

### Today

Persistent owner-memory cards now expose a contextual next action beneath the
immutable summary. A `RECORD_OBSERVATION` action opens linked QuickLog
directly; source-review actions open the Case; `NONE` stays visibly inert.

### Complete Case history

The same pure projection is used in the paged/searchable history screen. It
does not reimplement workflow semantics locally.

### Case detail

The hero shows the current next action and its safety note. When the action is
`RECORD_OBSERVATION`, the hero itself is actionable and opens linked
QuickLog. Other states remain explanatory, while the existing append-only
review/outcome controls remain available below.

## Runtime proof

Hosted Android must prove the strict path after a real source invalidation:

1. R8BY projects `FOLLOW_UP_EVIDENCE_INVALIDATED`.
2. The native Case detail exposes an enabled
   `pli.r8.case-detail.next-record` control.
3. The control says a **new real walk record** is required.
4. A real Android tap opens QuickLog.
5. QuickLog exposes the linked Case follow-up context.
6. The walk-duration form is already selected.
7. No health state is inferred.
8. Back navigation returns to the same Case detail.

Evidence file:

`case-next-action-routing-truth.json`

## Acceptance boundary

R8BZ is implementation-closed only when current exact-head:

- the real `caseHistoryNextAction` mapping regression passes;
- mobile typecheck passes;
- Today/history/detail wiring guards pass;
- full CI passes;
- hosted Android runtime passes;
- current runtime artifact is inspected and confirms linked QuickLog routing.

This does not authorize visual-baseline promotion, merge, tag, release, or a
claim about the pet's physiological state.

`NO_VISION_MODEL_USED = TRUE`

`HUMAN_VISUAL_ACCEPTANCE = PENDING`
