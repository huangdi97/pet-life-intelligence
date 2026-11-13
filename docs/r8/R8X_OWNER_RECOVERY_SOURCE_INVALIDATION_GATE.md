# PLI R8X — Owner Review Recovery Source Invalidation Gate

## Discovered behavior

The existing owner intent recovery path checked pet identity, Case identity and the **frozen evidence ID fingerprint** before replaying a pending human Review. However, it did not inspect the server's `CaseDetail.source_valid` flag. A previously sourced LifeChangeCase can become invalid after original LifeEvents are retracted, superseded or revoked; its unchanged event IDs are not proof that the evidence is still valid. The recovery could POST a stale owner instruction or clear it after an acknowledgement without rechecking that the underlying evidence remained valid.

## Implemented rule

- Before the **explicit owner-authorized POST**, GET the Case and require `source_valid === true` plus exact pet, case and frozen event identity.
- After POST returns, require a second GET with the **same source validity and immutable evidence IDs**, as well as the exact acknowledged review ID and decision, before exact CAS local intent clearance.
- If validity or event identity changes at either point, **fail closed**: leave the pending local instruction untouched, show the existing owner-visible mismatch warning; do not auto-decide, auto-retry, delete reviews or silently choose a replacement Case.
- A POST may have succeeded just before source invalidation: that is **ambiguous**, not an excuse to drop the durable owner reminder. Only a later explicit owner verification on a valid case, or a two-step local opt-out, can clear it.
- The existing executable production-TS recovery harness adds three adversarial cases: evidence invalid **before POST** (POST=0), invalidated **after POST** (CAS=0), and changed evidence fingerprint after POST (CAS=0). Old 9 cases remain intact.

## Unclosed

These tests are deterministic Node fault injection of production handler source, not physical device interaction or a claim that a disputed medical observation is clinically sound. Full exact-HEAD CI and Android runtime evidence must pass. The real user must still approve final visual design. Preserve `NO_VISION_MODEL_USED = TRUE`, `HUMAN_VISUAL_ACCEPTANCE = PENDING`; no merge, release or visual-baseline promotion.
