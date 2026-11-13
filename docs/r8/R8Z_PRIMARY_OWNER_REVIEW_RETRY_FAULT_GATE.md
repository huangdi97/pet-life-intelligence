# R8Z · Primary Owner Review source-validity and fault gate

**Code HEAD required:** feature branch PR #2, no merge, tag, Release, baseline update. Automated checks do not imply physical-phone or human visual acceptance.

## Source bug

The initial human Review path checked `caseMatchesFrozenSources` before saving the SecureStore intent and before posting. However, an uncertain request with a saved `pendingReview` took the retry branch directly to POST with its original idempotency key, *without re-reading CaseDetail*. Correct idempotency does not authorize resubmitting against retracted or replaced original observations.

## Implemented R8Z

- A **pending original** owner instruction keeps its exact immutable decision, optimistic review predecessor and idempotency key.
- Before each explicit retry, a fresh GET must satisfy the same source-validity predicate: pet ID + Case ID + `source_valid===true` + exact nonempty immutable event-ID set.
- If invalid, do not POST, do not erase the encrypted intent, show owner-facing warning. This does not revoke a previously accepted server Review.
- Reuse `caseMatchesFrozenSources` for both initial and retry preflight and after any POST acknowledgement; only an exact acknowledged Review permits CAS removal of the matching intent.
- Added `test:owner-review-primary` executable Node test that transpiles **the actual production review() function and source predicate** from `LifeChangeReviewPanel.tsx`, with deterministic delayed GET/POST, invalidation, source replacement, lost acknowledgement, SecureStore write failure and pet-switch races. Registered it as a mandatory Frontend CI step. It is a fault simulation, **not** a real native device test.
- Blind source contract asserts that production logic is under this executable gate.

## Gate

Exact-HEAD Backend, Frontend, blind contract and emulator build must succeed. Keep `NO_VISION_MODEL_USED=TRUE`, `HUMAN_VISUAL_ACCEPTANCE=PENDING`. Separate physical-device integration with faulted backend still needs human or dedicated mobile runtime work.

## R8Z follow-up: primary synchronous lock / ABA generation

A second quick tap can arrive before React's `setLoading(true)` rerender. The primary Review path now uses an immediate per-scope in-flight token and releases only the identical token on completion. Changing pet/Case/source fingerprint during render invalidates request generation *before* effect cleanup and clears the old action lock, preventing A→B→A restoration of a stale request. The actual production handler fault test now covers rapid double taps (13 total deterministic scenarios), and a blind contract asserts lock ordering and render-time generation protection. This still is not physical-device Human Visual Acceptance.
