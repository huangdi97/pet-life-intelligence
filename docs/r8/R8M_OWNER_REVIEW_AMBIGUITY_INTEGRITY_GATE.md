# PLI R8M · Primary owner Review acknowledgement and uncertain-error integrity

## Observed risk

The R8K recovered-owner panel was hardened to CAS-clear only the exact stored decision. But the PRIMARY `LifeChangeReviewPanel` still unconditionally deleted the pet+Case+source-key entry after acknowledgement, potentially erasing another local choice written during an in-flight GET/POST/GET sequence.

More importantly, its error branch cleared the original stored decision for HTTP 400/401/403/404/**409**/422. An HTTP 409 received during a retry is NOT evidence that an earlier POST never persisted. A lost acknowledgement or concurrent append can leave the accepted owner's decision invisible to the client; deleting the only durable intent makes correct idempotent recovery impossible.

## Changed source contract

- Persist owner intent before POST, preserving the original decision, predecessor token and idempotency key.
- On exact `accepted.review_id`+decision confirmation from the fresh Case, only `clearOwnerIntentIfUnchanged` may remove that exact saved intent.
- On CAS mismatch, leave any newer local choice intact and show a warning. No automatic retried POST.
- On error, including 409/422 and intermittent auth/reconnect problems, do NOT erase an uncertain saved intent or reset the retry token. Explain that HTTP failure does not establish whether an earlier request was saved.
- Local two-step opt-out is available separately through the owner recovery surface and never changes append-only server Review history.
- Static Blind Visual Contract now scopes the opt-out test to its function and explicitly asserts non-destructive primary success/error behavior.

## Required verification

Run exact new HEAD Blind contract, mobile typecheck, full Backend/Frontend/Playwright, Android APK and emulator runtime artifacts. Then fault-inject lost acknowledgement plus HTTP 409 to prove a unique Review is not duplicated and survives device restart. This last device race is a separate open gate. `HUMAN_VISUAL_ACCEPTANCE = PENDING`, `NO_VISION_MODEL_USED = TRUE`. No merge, tag, Release or baseline promotion.
