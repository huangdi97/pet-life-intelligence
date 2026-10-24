# PLI R8BW · Follow-up Evidence Invalidation → Owner Outcome Truth

## Why this slice exists

R8BV introduced an append-only Owner Outcome anchored to one real
`RECORD_OBSERVATION` Review. R8BW closes the next truth gap: the source event
behind that observation may later be withdrawn or corrected.

The product must not erase history, but it also must not keep presenting the old
Outcome as if its evidence were still current.

## Invariant

`historical owner judgement != current source validity`

When a follow-up source becomes invalid:

- the original `LifeChangeReview` remains append-only history;
- the existing `LifeChangeOutcome` remains append-only history with the same ID;
- read projection changes `observation_sources_valid` to `false`;
- the effective Case state becomes `FOLLOW_UP_EVIDENCE_INVALIDATED` while the
  original Case evidence itself may remain valid;
- this effective invalidation is derived from the current owner-workflow head,
  not from the denormalized stored Case state alone. An Outcome is current only
  while its `case_review_head_id` still matches the latest Review head it was
  recorded against. If that Outcome's observation is withdrawn, the effective
  state becomes `FOLLOW_UP_EVIDENCE_INVALIDATED` even when the stored
  `recorded_state` is `OWNER_ACKNOWLEDGED`;
- a Review appended **after** that Outcome becomes the new owner-workflow head.
  It does not resurrect the withdrawn observation—the historical Outcome still
  reports `observation_sources_valid=false`—but it may legitimately make the
  current workflow `CLOSED`, `FOLLOW_UP`, or another Review-derived state;
- the owner must create a **new real follow-up observation** before another
  Outcome can be appended;
- the UI must not describe the previous Outcome as recovery, diagnosis, normality
  or causal effect.

## Android owner interaction

The expanded follow-up evidence row now offers an explicit two-step owner action:

`这条后续观察有误 → 确认撤回这条后续观察`

This action calls the canonical event retraction API. It does not mutate
`source_valid`, Review state or Outcome state locally.

After the server-derived refresh:

- the review says the follow-up record has been withdrawn/corrected;
- the existing Outcome is still visible;
- the Outcome says its underlying follow-up record has changed;
- the Outcome action panel switches to “先记录一条真实的后续观察，之后才能回看结果”;
- stale Outcome buttons are absent.

## Verification

Backend integration coverage proves that a new Outcome POST anchored to the
invalidated Review returns conflict and does not append a second Outcome.

Hosted Android runtime evidence must:

1. open the real follow-up source;
2. retract it through real Android taps;
3. observe `FOLLOW_UP_EVIDENCE_INVALIDATED` from the server;
4. verify the same persisted Outcome ID remains;
5. verify `observation_sources_valid=false`;
6. verify native UI exposes the invalid-source warning and requires a fresh
   observation before another Outcome.

No API-side mutation is accepted as Android interaction evidence.

`NO_VISION_MODEL_USED = TRUE`.
`HUMAN_VISUAL_ACCEPTANCE = PENDING`.
PR #2 stays open; no merge, tag, Release or visual-baseline promotion.
