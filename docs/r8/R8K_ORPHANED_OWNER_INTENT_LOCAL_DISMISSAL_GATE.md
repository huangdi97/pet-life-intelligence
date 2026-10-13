# PLI R8K · Orphaned owner-review intent, explicit local opt-out

**Status:** Android source candidate on PR #2; not an owner visual acceptance. `NO_VISION_MODEL_USED = TRUE`, `HUMAN_VISUAL_ACCEPTANCE = PENDING`.

## Why this matters

R8J rightly keeps an ambiguous owner Review after network failure, app restart, stale API GET or an invalidated source Case. It does not auto-retry and must not assume that an HTTP 409 means a possibly accepted previous Review has disappeared. However, if the original Review was never committed and the Case was subsequently invalidated, the server cannot accept a new Review. An owner was left with an unrecoverable local notice forever.

## Product contract / implemented Android first slice

- Keep `主动核对原决定` as the **primary** action. It GETs exact Case, checks pet+Case+immutable source IDs, POSTs original idempotency key only on a user tap, then validates the precise committed Review ID.
- Add `不再在本机提醒` as a **secondary** deliberate opt-out. First tap only opens an explicit warning: original request MAY have been accepted, the action affects only this phone, it does **not** cancel or delete the server Review and cannot prove the instruction was absent. Second tap `确认仅清除本机提醒` invokes ONLY the existing scoped SecureStore `clearOwnerIntent(petId, caseId, sourceIdsKey)` — never any server POST or DELETE.
- An owner can choose `取消清理` without discarding anything. Failed secure storage deletion preserves the uncertain intent and reports a recoverable error. No automated background action; never drop the record merely because the old notable hint or Case disappeared.
- Preserve cross-pet isolation, Keystore/Keychain queue, max-4 unresolved bound and exact idempotency semantics. This UI remains non-diagnostic and source-anchored.

## Gates still required

1. New exact-HEAD Android mobile typecheck, Blind Visual Contract, CI/Playwright and emulator screenshot evidence.
2. Device fault injection: original POST reaches server but ack is lost; reboot, show orphan, verify idempotent original Review; second scenario server never accepted and Case is invalidated, then test two-tap local opt-out plus cancel route, no remote Review mutation.
3. Multi-pet and account switch: no other pet’s intents listed; token/dev user changes must clear records, no background writes.
4. Human visual approval of the real Android UI remains PENDING. No merge, tag, Release, approved screenshot baseline change or activation of a demo Twin as the individual pet.

## R8K second pass — scoped compare-before-delete

A per-intent inline, accessible warning is rendered beside the **exact** confirmation button, not only below a possibly long list where the warning can be out of view. Under the single serialized SecureStore write queue, `clearOwnerIntentIfUnchanged` atomically compares pet ID, Case ID, source-event signature, original human decision, idempotency key and original optimistic predecessor before removal. If another Review panel has replaced the instruction during the two taps, removal refuses and the directory reloads. No server Review POST/DELETE is issued by local opt-out. Device fault injection and human visual approval remain separate open gates.
