# PLI R8F — Follow-up source invalidation and owner review integrity

**Status:** code-level candidate awaiting exact-HEAD CI and real Android verification. PR #2 stays OPEN; no merge, baseline promotion, tag or release. `NO_VISION_MODEL_USED=TRUE`; `HUMAN_VISUAL_ACCEPTANCE=PENDING`.

## Confirmed source-level gap

Case `source_valid` checked only frozen current + historical evidence from the original Case. If an owner later submitted a genuine new `RECORD_OBSERVATION` and subsequently withdrew or corrected that follow-up event, the Case continued displaying stored `FOLLOW_UP` with no notice that the follow-up evidence ceased to be current. This misrepresents the provenance-dependent feedback loop even though owner review history correctly remains append-only.

## Implemented narrow fix

- Maintain independent states: initial `source_valid` continues to validate the original Case's frozen evidence. New `follow_up_source_valid` validates the **latest accepted RECORD_OBSERVATION** and is `null` for a Case that never received a recorded observation.
- Each GET Case Review includes a derived `related_sources_valid` flag for `RECORD_OBSERVATION`, `null` for other decisions. It rechecks event pet, metric, allowed source, retraction and supersession and original recorded/occurred-after-Case time gate. It never rewrites existing Review rows.
- When the original Case is valid, the stored Case state is FOLLOW_UP, and the latest observation is no longer valid, the computed `state` is `FOLLOW_UP_EVIDENCE_INVALIDATED`; the `recorded_state` remains FOLLOW_UP and review history remains intact.
- The List and Detail endpoints share the same derived status; neither claims an invalid source is still active. A human FOLLOW_UP_LATER without an observation remains normal FOLLOW_UP and the new validity field is null.
- A valid newer observation on an append-only Review can later close this invalidation; an unverified retrospective entry cannot masquerade as a post-Case observation.
- No diagnosis, automatic health conclusion, automatic task or notification; new fields are evidence provenance facts, not animal-health claims.

## Regression

HTTP integration tests: one real changed pet Case, real post-Case owner observation and Review, retract only the follow-up event, verify source_valid remains true but effective state invalidates in both list and detail, and original Review ID, note and stored state remain unchanged. Verify FOLLOW_UP_LATER alone is not falsely marked invalidated.

## Deliberately open

Android must display the new effective state and avoid prompting a stale Case as normal FOLLOW_UP, then obtain same-HEAD emulator proof. Privacy and follow-up timestamps remain as enforced in R8D/R8E. Actor/date-policy and revised current evidence refresh remain separate gates.
