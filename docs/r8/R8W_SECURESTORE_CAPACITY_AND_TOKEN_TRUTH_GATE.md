# PLI R8W — Small, Durable Owner Intent Gate

## Grounded reason

Expo's SecureStore is a secure **small-value** store, not an unbounded event database. Expo's documented platform behavior notes that large values can be rejected by the OS, with some historical iOS builds rejecting roughly 2048-byte values: https://docs.expo.dev/versions/v55.0.0/sdk/securestore/. Expo does not impose a single cross-platform size limit.

The R8V queue validated the intent **shape** and count (up to four), but not printable idempotency keys or the aggregate encoded size. Four separate long evidence fingerprints could pass validation and then fail during native SecureStore write. The system must fail without dropping earlier unresolved human choices.

## Implemented

- Identity keys and request tokens must be printable single-line ASCII, bounded: pet/case/review/token ≤128 characters, evidence fingerprint ≤1200.
- The **new encoded pending-record aggregate** is bounded to 1900 bytes before `SecureStore.setItemAsync`; the number is a conservative product budget, **not** a claimed universal iOS/Android platform limit.
- Pure whitespace or control-character idempotency keys cannot qualify as a meaningful server retry identity.
- The serialized queue, exact-intent CAS, account-change clearing, and no-background-POST human gate are unchanged. A rejected write preserves all earlier pending choices as raw encrypted storage and signals a capacity error.
- Previously persisted rows are not purged by the size rule; it is applied when adding a new record. Any previously persisted invalid identity remains fail-closed for explicit recovery. We do not silently migrate uncertain old instructions.
- Real TypeScript source is loaded in the CI Node asynchronous SecureStore harness. Test: save two long but valid unresolved choices, reject a third before calling native SecureStore, prove bytes unchanged, and verify both earlier entries remain recoverable.

## Remaining gates

Native iOS Keychain and Android Keystore faults on physical devices still require separate evidence. A stored local reminder is not an authoritative server record; owner decision acceptance must still be verified by server Case review ID and source snapshot. Do not infer medical effects, erase unresolved owner instructions, merge PR #2, change visual baselines, or declare `HUMAN_VISUAL_ACCEPTANCE` without user review.

`NO_VISION_MODEL_USED = TRUE`. `HUMAN_VISUAL_ACCEPTANCE = PENDING`.
