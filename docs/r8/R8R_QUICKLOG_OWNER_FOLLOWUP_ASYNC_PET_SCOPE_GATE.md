# PLI R8R — QuickLog pet-switch and follow-up acknowledgement truth gate (2026-10-13)

## Observed source-level defect

The Android QuickLog originally captured the pet at Save tap, uploaded multiple images, created a LifeEvent and optionally posted a `RECORD_OBSERVATION` LifeChangeReview. During those asynchronous steps the current pet could change. The operation continued for pet A but its completion state could render in pet B's form, the photo picker could append pet A's photos to B's draft, and the follow-up Review response was accepted without checking the returned pet/case identity. A double-tap before React state commit could also initiate two saves.

## Implemented R8R

- QuickLog tracks a generation-scoped active pet identity *during render* (not only React effect cleanup), with unmount invalidation. A known `petId` never falls back to another pet.
- Pet switch clears in-memory draft text, selected media, stale status and linked Case type. Permission/gallery results are ignored if they belong to the previous pet.
- Save captures original `savePetId` and a synchronous per-generation in-flight lock. A→B stops **future** image uploads, event writes and Case Review requests once the pet changes; it does not cancel/deny an HTTP write already sent for the original pet.
- The actual event uses its original pet's path and attached artifacts; if that event reached the server, the old result is **not shown on pet B**. Source facts remain queryable from the original pet's Timeline.
- Before Review POST, a Case GET must verify the exact original pet and Case ID, plus `source_valid`. The user-triggered follow-up Review uses an event-ID-derived idempotency key and checks the response's immutable Review ID, pet ID, Case ID and decision. A failed or ambiguous Review association never changes whether the actual event was saved.
- This is NOT a full durable follow-up intent journal: loss of network acknowledgement after Review POST still requires an explicit owner-driven recovery flow, not a hidden automatic retry. The existing `pendingOwnerReview` queue covers the three decision buttons, **not** `RECORD_OBSERVATION`; no false equivalence is claimed.

## Acceptance

1. Latest HEAD mobile TypeScript and blind regression source contract.
2. Existing two-pet Android runtime selection, QuickLog, Owner Review, 3D stage and full CI still pass.
3. New fault-injection gate (not yet implemented): throttle each photo upload, Case GET and Review POST and switch A→B→A, including unmount; verify no pet B photo/old Case UI leak and no duplicate LifeEvent or Review. This requires a controlled network proxy/device run, not a VLM.
4. No automatic medical conclusions or cross-pet identity impersonation; no baseline promotion, merge, tag or release; `NO_VISION_MODEL_USED = TRUE`, `HUMAN_VISUAL_ACCEPTANCE = PENDING`.
