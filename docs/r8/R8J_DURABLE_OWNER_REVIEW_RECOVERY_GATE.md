# PLI R8J · Owner Review recovery when its old Today card disappears

**PR #2 candidate; no merge, release, baseline or automatic owner decision.** `NO_VISION_MODEL_USED=TRUE`, `HUMAN_VISUAL_ACCEPTANCE=PENDING`.

## Real gap inherited from R8I

R8I persisted up to four uncertain owner Review instructions under Keystore/Keychain and restored them only from `LifeChangeReviewPanel` after matching the current notable Today hint to a Case source fingerprint. If today's missingness/change no longer qualifies, or the evidence is withdrawn/updated, the panel is not rendered and the persisted uncertain Review becomes invisible. Users may have made a human choice whose server-side acknowledgement was lost.

## Implemented owner-controlled recovery

- Add `listOwnerIntentsForPet(petId)`: explicit per-pet enumeration of only minimal secure intent records, with existing serialized writes and account-switch clearing unchanged.
- The Today screen always mounts `PendingOwnerReviewRecovery` for the **selected pet** (even if the new Today hint is not notable). It hides entries already represented by the active case's matching source fingerprint to avoid two recovery surfaces.
- SecureStore read does **not** trigger a network write. A stored item shows the owner's original decision label and a short immutable Case identifier; no medical note/source payload/credential is stored or exposed.
- An explicit tap first GETs the exact permitted Case and verifies pet ID, Case ID and **exact original immutable evidence IDs** against the secure record. It retries only the preserved original decision, predecessor and idempotency key; the server's idempotent POST will return the same original Review if it was committed.
- The secure intent is deleted **only after** a follow-up exact-case GET contains that returned Review ID and decision. If the Case is unavailable, evidence differs, original request conflicts, GET is stale or network times out, the intent stays stored and the UI says the status is not confirmed.
- This feature does NOT choose a decision, schedule care, diagnose, infer missing activity or use visual inference.

## Evidence gates

1. On newest exact SHA: mobile typecheck, Blind Visual Contract, Backend full pytest, Playwright, Android R8 review and multi-pet runtime.
2. Device fault injection still required: save POST intent, kill/restore after server accepted but before original ack, advance evidence so current Today notable panel disappears, tap recovery in reopened Today, verify exactly one Review ID exists. The existing run does not automate this scenario.
3. Confirm with two pets and account switch: no cross-pet listing, no stale records after token/dev-user change, no unconditional POST on app restart.
4. Owner human visual acceptance remains PENDING. Do not promote the existing generic 3D template as an individual Twin.
