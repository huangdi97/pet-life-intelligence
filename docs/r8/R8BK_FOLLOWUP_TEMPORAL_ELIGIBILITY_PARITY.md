# PLI R8BK · Follow-up source temporal eligibility parity

## Confirmed mismatch

A Case Review's `related_sources_valid` already required every new observation to be (a) a real current sourced event of the correct metric, (b) distinct from original Case comparison sources, and (c) both recorded and occurred after the Case was created, never future-dated. The Review source-detail endpoint previously displayed `valid=true / VALID` merely because an event had not been retracted/superseded and had the correct metric. Consequently, an old imported/corrupt Review could show "Review invalid" in Case detail while a recycled original Case observation was marked `VALID` as a follow-up.

## Fix

- Under the `FOLLOW_UP_REVIEW` scope, add independent source-detail reasons:
  - `REUSED_CASE_EVIDENCE`: the event ID is one of the original Case's frozen evidence IDs.
  - `NOT_AFTER_CASE`: `recorded_at` or `occurred_at` is no later than `case.created_at`.
  - `FUTURE_OBSERVATION`: `occurred_at` is after the query's actual server time.
- Original `CASE_EVIDENCE` sources retain the existing validity/role rules. Event data, occurred and recorded clocks, raw numeric values, provenance, Review history and source identifiers are never erased merely because a follow-up is ineligible.
- Retraction, supersession, wrong metric and non-fact source continue to take priority as the primary validity reason; a newer correction does not somehow retroactively make an old observation a new follow-up.
- Android Review source cards display a distinct readable reason instead of describing these records as `VALID`. No automatic medical conclusion, no 3D event reenactment.

## Real data tests

An owner creates a genuine Case, saves a new 17-minute walk and a `RECORD_OBSERVATION` Review. The test validates the real Review source page and detail. It then simulates an old imported Review JSONB whose follow-up array references (1) an original Case event, (2) a walk backfilled after Case creation but occurred six hours earlier; both must be marked invalid with source-specific reasons **and agree with the detail-level `related_sources_valid=false`**. Restoring the genuine Review event returns the source to VALID. This is a read-side integrity repair, not a modification of owner history.

## Verification and release gates

Exact-HEAD GitHub Backend lint+integration, Frontend TypeScript, blind UI, Playwright, Android APK and emulator evidence. `HUMAN_VISUAL_ACCEPTANCE=PENDING`; `NO_VISION_MODEL_USED=TRUE`. No merge, Release/tag or visual baseline promotion.
