# PLI R8Q · Owner-intent SecureStore read/write linearizability

## Source audit

R8P scoped remote recovery by pet+Case+source and by async generation, and R8K ensured CAS deletion of an exact local instruction. At HEAD `03b575e2a8d7`, the durable store itself serialized writes/CAS but its two read APIs did `await queue` and **then** called asynchronous `getItemAsync` outside that queue. While the read was pending, a new save or exact CAS-clear could proceed in parallel. The recovery decision could therefore use a snapshot unrelated to the queue's most recent mutation.

## Executed candidate

- `serialized<T>` now queues typed reads and all writes in **one** Promise chain. A rejected read/write still rejects its caller; the queue recovers for subsequent operations.
- `listOwnerIntentsForPet` and `restoreOwnerIntent` execute their entire SecureStore read and pet/case/evidence selection while holding the shared queue.
- `apps/mobile/scripts/test-owner-intent-store.cjs` transpiles the exact TypeScript source using the installed TypeScript compiler and runs it in an isolated Node VM with controllable asynchronous SecureStore. It holds an in-progress `getItemAsync`, submits an exact CAS-clear, and fails if the CAS overtakes the original read. It also tests conflict preservation, same-intent retry, cross-pet isolation, and account-wide explicit cleanup.
- CI frontend now runs `pnpm --dir apps/mobile test:owner-intent-store` after Mobile typecheck; no new runtime dependency, network, emulator, image or vision model is required.
- The frontend contract and actual CI run must pass at the **new exact HEAD**; a source string test alone is insufficient.

## Scope boundaries

Linearized storage prevents overlapping local SecureStore operations from violating queue order; **it is not an atomic transaction with an HTTP POST**. A server-side accepted Review can still lose its HTTP acknowledgement. The UI must keep the exact unconfirmed intent and demand user-initiated idempotent recovery. R8P live pet scope, R8O write scope, explicit two-step local discard, and append-only server Review guarantees remain unchanged.

Separate follow-up gates: fault-inject real Android pet A→B delayed network calls, verify unique Review cardinality and case source status; actual owner visual signoff. `NO_VISION_MODEL_USED = TRUE`; `HUMAN_VISUAL_ACCEPTANCE = PENDING`. No merge, Release, tag or baseline promotion.
