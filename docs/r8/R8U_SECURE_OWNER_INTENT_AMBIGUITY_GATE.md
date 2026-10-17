# PLI R8U · Fail-closed owner-intent SecureStore ambiguity gate

**Scope:** Client-side owner Review persistence only. This is a deterministic real-TypeScript harness check, **not** a native device signoff.

## Risk

The queue correctly serialized SecureStore reads/writes, but persisted data were only validated row by row. A damaged store could include duplicate `petId + caseId + sourceIdsKey` entries with conflicting decisions, more than the declared 4-slot capacity, or unexpected private `note`/payload fields. Treating this as a normal list could let the recovery UI propose multiple contradictory original owner instructions or retain unexpected private data.

## Implemented

- `read()` rejects duplicate owner instruction identities, capacity overflow and any unexpected top-level or payload fields, with `R8_SECURE_INTENT_CORRUPTED`.
- **Fail closed, never auto-delete:** validation throws while keeping the encrypted raw snapshot intact for explicit recovery. No automatic retries, POSTs, server Review decisions or local CAS deletion happen as a result of validation.
- The existing executable `apps/mobile/scripts/test-owner-intent-store.cjs` now injects each corrupted raw SecureStore shape into the real TS module, asserts reads reject, asserts original bytes stay unchanged, then verifies normal valid persistence still works. Runs inside the current frontend CI lane through the existing `test:owner-intent-store` script.
- Original same-pet/same-Case recovery, idempotency, role, and A→B→A generation guards are unchanged.

**Limits:** A full device keystore fault injection and account-switch tests remain separate. The UI warns on storage failure but cannot automatically repair ambiguously persisted decisions; explicit owner support/recovery workflow is future work. `NO_VISION_MODEL_USED = TRUE` · `HUMAN_VISUAL_ACCEPTANCE = PENDING`. No merge/tag/Release or baseline promotion.
