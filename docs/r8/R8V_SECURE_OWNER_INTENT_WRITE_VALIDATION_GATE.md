# PLI R8V · Validate Durable Owner Intents Before SecureStore Writes

**Status:** candidate commit prepared against `dc4d70587ae324a4c69a330d6e179bf7a79c2736`; not an Android device signoff. Preserve PR #2 and every human acceptance gate.

## Evidence-backed defect

`pendingOwnerReview.ts` previously validated retrieved encrypted rows but accepted `SavedOwnerIntent` input at runtime based only on TypeScript's static annotation. JavaScript can still supply unexpected top-level `note`, extra private payload keys, empty IDs, or mutate a shared object after `saveOwnerIntent()` enters the asynchronous SecureStore queue. Such a value could persist and then block every subsequent recovery read with `R8_SECURE_INTENT_CORRUPTED`.

## Implementation

- Apply the **same strict shape/duplicate/capacity validation** to both retrieval and new writes.
- Validate the new intent before any SecureStore mutation; reject extra private or clinical fields, malformed/blank scope identifiers, or conflicting decision/payload metadata.
- Make a **synchronous value snapshot of the validated known fields** before waiting for the serialized async I/O queue. In-flight changes to a caller-owned object cannot rewrite the owner's original instruction.
- Existing persisted corrupt records still fail closed and remain intact for explicit recovery. There is no automatic clearing, POST, medical inference, Case revision, or Review decision.
- Execute deterministic production-TS-source fault tests via `apps/mobile/scripts/test-owner-intent-store.cjs`, including unsafe writes, unchanged raw storage, and mutation of a shared object while an async SecureStore read is deliberately delayed.

## Non-goals / gates

No native device Keystore fault-injection proof; no cross-account credential change; no UI redesign. Frontend typecheck/test lane, complete CI and same-HEAD Android emulator evidence remain required. Do not promote visuals or claim personalization. `NO_VISION_MODEL_USED = TRUE`, `HUMAN_VISUAL_ACCEPTANCE = PENDING`.

### CAS snapshot amendment

The exact-intent CAS delete now also snapshots the caller's validated instruction synchronously before async SecureStore I/O; a later object mutation cannot change which owner decision will be deleted. A deterministic blocked-read test mutates the caller's case and idempotency token while a CAS operation waits and confirms that only the originally selected instruction is cleared. No bypass of prior conflicts or automatic acknowledgment is introduced.
