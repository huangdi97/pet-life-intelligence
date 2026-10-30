# PLI R8K · Owner Review recovery CAS closure

**Repo:** huangdi97/pet-life-intelligence · PR #2, working branch only.

## Failure observed

On `3adc7d13`, CI's `test_r8k_orphaned_owner_review_intent_has_only_explicit_twostep_local_exit` compared the first occurrence of `await clearOwnerIntent(...)` anywhere in the recovery component with the discard confirmation check. The first match belonged to the **separate server-verified recovery success path**, not the user's two-step local dismissal. The source test failed despite the latter already calling `clearOwnerIntentIfUnchanged(intent)` after `if (discardCandidate !== intentKey)`.

## Engineering improvement

- For verified recovery: GET exact Case + source evidence identity → intentional POST original immutable payload with its old idempotency token → GET verifies identical review id and decision → CAS-clear only the exact saved owner intent.
- On CAS mismatch (another screen may have updated/replaced the local reminder), **never remove the new intent**; reload the SecureStore-backed pet-scoped list and explicitly warn. A successful server Review is not permission to destroy a newer local choice.
- For opt-out: unchanged two-step explicit owner confirmation; only `clearOwnerIntentIfUnchanged(intent)` can drop the exact on-device reminder. This is not a server DELETE and cannot revoke a persisted Review.
- Scope blind contracts to the intended `discardLocalReminder` function body instead of the first matching substring in the whole component; add a separate contract for verified success and non-destructive CAS failure.
- Do **not** mark native on-device review concurrency proved by static tests alone. Separate run-time race harness and human review remain required.

## Acceptance

Backend/Frontend/Blind/Playwright/Android CI on **new exact HEAD**. Persisted owner-intent behavior and R8 idempotent review HTTP tests remain mandatory. `NO_VISION_MODEL_USED = TRUE`, `HUMAN_VISUAL_ACCEPTANCE = PENDING`. No main merge, tag, Release or visual baseline changes.
