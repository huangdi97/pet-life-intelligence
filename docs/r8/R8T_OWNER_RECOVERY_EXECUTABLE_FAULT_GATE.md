# PLI R8T · Owner Review Recovery Executable Fault Gate

## Why a new gate was required

At verified R8S HEAD `4ac0edbfbf11d15b2e5645277b8fbf578274b9e1`, CI and Android R5.6 evidence were green, but the new synchronous `activeOwnerAction` recovery lock was guarded primarily by textual source assertions. Those checks could not prove behavior when React state had not committed and network/SecureStore operations were intentionally delayed.

## Implemented R8T test

`apps/mobile/scripts/test-owner-review-recovery.cjs` extracts the actual production TypeScript handlers `recover` and `discardLocalReminder` from `apps/mobile/src/components/life/PendingOwnerReviewRecovery.tsx`, transpiles them, then executes them with deterministically controlled API/persistence promise boundaries.

Test cases:

1. Rapid two-tap recovery while first Case GET is suspended: only one GET and one Review POST.
2. Pet A→B during initial GET: zero post to old-pet Case; unresolved instruction retained.
3. Pet A→B during Review POST: no stale confirmation GET or local CAS deletion.
4. Lost Review acknowledgment: owner intent remains saved; only a second explicit owner invocation may retry using **the exact original idempotency key**.
5. Wrong-pet Case detail: no Review POST and no intent deletion.
6. First local opt-out tap: shows two-step warning, never writes.
7. Second local opt-out tap held at CAS: duplicate taps and overlapping recovery are excluded, and server receives no Review.
8. A newer local owner choice arrives before CAS: stale acknowledgment cannot remove the newer instruction.
9. A→B→A between render and passive-effect cleanup while initial GET is held: execute the actual render-time identity-generation guard, verify two synchronous generation increments, and prohibit the now-stale A callback from sending a Review. A harmless re-render of A cannot increment generation.

The mobile Frontend CI job executes `pnpm --dir apps/mobile test:owner-review-recovery`. The blind source contract requires the runner, production-source extraction and CI integration. This **is a deterministic production-handler test**, not a native Android accessibility/screenshot test. Existing backend HTTP idempotency tests remain separate.

## Truth boundaries / next gates

- Android device fault-injection with a network proxy and rapid A→B→A remains **NOT_ATTEMPTED**; successful Node tests must not be presented as evidence of device-level double-tap behavior.
- Do not turn uncertain network errors or 409 responses into silent success; owner review remains explicitly initiated, strictly pet/case/evidence scoped and recoverable.
- Real user 3D media, source-derived historic replay quality and Human Visual Acceptance remain separately pending.
- This checkpoint must be evaluated against the actual latest HEAD's CI and Android workflow conclusions. Never borrow PASS from `4ac0edbf` after new commits.
- `NO_VISION_MODEL_USED = TRUE` · `HUMAN_VISUAL_ACCEPTANCE = PENDING` · PR #2 OPEN, no merge/tag/Release/baseline promotion.
