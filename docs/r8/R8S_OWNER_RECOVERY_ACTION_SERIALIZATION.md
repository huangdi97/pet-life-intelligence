# PLI R8S · Recovery owner-action double-tap exclusion

## Confirmed edge condition

R8R made QuickLog saves synchronous-lock protected, but the separate `PendingOwnerReviewRecovery` component used only asynchronous React `loadingCaseId` state to block rapid taps. Before a state commit, two owner taps could run independent `GET → POST Review → GET` recoveries; recovery and two-step local opt-out might also race. Backend idempotency helps but does not justify redundant network POSTs or ambiguous UI cleanup.

## New implementation

- `activeOwnerAction.current` synchronously locks recovery **and** the final local-dismiss action before any awaited network/storage call. Second taps during an active owner action are ignored, including another Case's button.
- The lock is released in a finally clause by the exact action key. Pet ID and generation checks remain in force and no cross-pet state is rendered. While the old-pet action is pending, a newly selected pet must wait before a new recovery; safety is preferred over parallel actions.
- This does **not** auto-retry, alter the server review, or treat a timeout as success. Existing compare-and-swap local intent clearing, immutable idempotency key, exact review acknowledgement and two-step local discard remain unchanged.
- Added Blind Visual Contract source checks. These are source-level tests, **not** a claim of real concurrent tap fault injection on Android.

## Follow-up gate

Native automated double-tap with a network-held Review response, A→B→A switch and two-step local opt-out; no duplicate Review; explicit owner action only; no disappearance of uncertain intent. Exact HEAD CI and Android runtime evidence required. `NO_VISION_MODEL_USED = TRUE` and `HUMAN_VISUAL_ACCEPTANCE = PENDING`.
