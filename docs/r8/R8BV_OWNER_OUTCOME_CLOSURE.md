# PLI R8BV · Owner Outcome Closure

## Product boundary

R8BV adds the missing final step in the owner intelligence loop:

`source-backed change → owner decision → real follow-up observation → owner outcome`.

An Outcome is **not** a diagnosis, recovery claim, causal inference, or rewrite of
the original Case. It is an append-only owner judgement anchored to one real
`RECORD_OBSERVATION` Review whose source events are still current.

Allowed owner assessments are deliberately non-clinical:

- `CONTINUE_OBSERVING`
- `NO_LONGER_CONCERNED`
- `NEEDS_FURTHER_FOLLOW_UP`

The UI renders these as owner language and explicitly states that “目前不再担心”
does not prove recovery.

## Truth and invalidation

- Outcome creation requires owner role + `DAILY_WRITE`.
- The referenced Review must belong to the same pet and Case, have decision
  `RECORD_OBSERVATION`, and still satisfy the existing follow-up source
  validity/causality gate.
- Original Case evidence must still be current when a new Outcome is appended.
- Outcomes are append-only and use an idempotency key plus
  `expected_latest_outcome_id` compare-and-swap.
- A later retraction/supersession of the follow-up event does **not** delete or
  rewrite the owner's historical Outcome. Read-side projection marks
  `observation_sources_valid=false` and changes the truth note so the old
  judgement cannot masquerade as a current fact.
- The Case state is not changed to RESOLVED/CURED/NORMAL by an Outcome.
- Another DAILY_READ household member may see the structured owner assessment,
  but owner free-text Outcome notes are hidden.

## Android-first UX

The persisted Case detail now contains a “跟进结果” section. Before a valid real
follow-up observation exists it only explains that an observation is required.
Afterwards the owner can append one of the three bounded judgements. Existing
Outcome rows show their timestamp and whether their underlying follow-up source
is still valid.

No new primary navigation is introduced. The section remains inside the
existing Today → durable Case history flow.

## Runtime evidence gate

Hosted Android evidence must create one Outcome by a **real Android tap**, then
prove through the API that exactly one append-only Outcome was created with the
same pet, Case, observation Review and assessment. UIAutomator must then expose
the persisted Outcome identity. Direct API insertion is not accepted as Android
runtime evidence.

`NO_VISION_MODEL_USED = TRUE`.
`HUMAN_VISUAL_ACCEPTANCE = PENDING`.
PR #2 remains open; no merge, tag, Release or visual-baseline promotion.
