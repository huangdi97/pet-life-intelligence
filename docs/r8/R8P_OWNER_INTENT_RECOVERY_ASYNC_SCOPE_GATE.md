# PLI R8P · Owner Review recovery async identity scope

## Context

After R8O, the PRIMARY owner-review panel has live pet+Case+source-generation checks for in-flight GET, create POST, Review POST and CAS cleanup. The separate `PendingOwnerReviewRecovery` component on Today still had unguarded async GET→POST→GET→CAS callbacks that could show an old pet's recovery result after switching to another animal.

## Code change

- A render-refreshed active pet ID and generation guards invalidate pending async recovery and local-discard UI callbacks on pet switch, refresh, or unmount.
- After the initial Case GET, a fresh SecureStore read must still contain the *exact* original intent (pet+Case+source IDs, decision, idempotency key, optimistic predecessor) **before an explicit retry POST can be sent**. A stale local button cannot replay a decision that another panel has already verified or replaced.
- If navigation happens after the original Review POST has been sent, the callback does not mutate the next pet's UI, does not claim server success, and does not silently discard the original pending intent. Server-side append-only/idempotency remains authoritative.
- `clearOwnerIntentIfUnchanged` continues to use serialized exact compare-and-swap; no cross-pet deletion or server DELETE is authorized.
- The reminder list and warning are rendered only for the active pet during navigation, before React effect cleanup. Both recovery and two-step *local-only* opt-out respect the same pet generation scope.
- Tests strengthen preexisting blind contracts rather than removing the recovery/opt-out constraints.

## Evidence boundary

This is a source-level candidate until exact new HEAD CI, mobile typecheck, Android APK/runtime replay screenshots, and fault-injected device A→B late responses pass. Static tests do not establish network fault behavior; lost acknowledgements must still produce at most one immutable server Review ID, and no automatic background retries.

Keep PR #2 open. `NO_VISION_MODEL_USED = TRUE`; `HUMAN_VISUAL_ACCEPTANCE = PENDING`. No tag, merge, Release or approved visual baseline updates.
