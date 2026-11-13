# R8Y · Primary Owner Review Source Validity Gate

**Implementation:** PR #2 feature branch only. No merge, no release, no screenshot baseline promotion.

## Verified gap from R8X

R8X rechecked `source_valid` and frozen event IDs on the **pending-intent recovery path** before retrying POST and again before exact local CAS clearance. The *primary* `LifeChangeReviewPanel.review()` path, used when an owner taps a new decision, checked initial Case identity but not immutable `evidence_event_ids`, and after POST verified case/pet ID and Review acknowledgement but not source validity. A Case whose sources were retracted or swapped in between could still be used as a stale decision basis.

## R8Y implemented source invariant

- Shared `caseMatchesFrozenSources` matches **pet ID + case ID + source_valid===true + nonempty exact set of event IDs**. Duplicates do not qualify.
- **Before persisting and posting a new owner decision:** confirm fresh GET CaseDetail matches the frozen evidence. On mismatch, stop with a human-facing refresh warning; do not save or send a new instruction.
- **After any POST:** GET CaseDetail again and validate the same source identity before trusting acknowledgement or clearing SecureStore. If invalid, treat response as ambiguous: retain the encrypted pending instruction. Do not claim success or auto-repeat.
- Existing retry, pet-change generation, review-ID acknowledgement and exact CAS protections remain unchanged.
- Static contract test checks the two security predicates are before the corresponding side effects. An actual API/emulator fault-injection path is still necessary for end-to-end owner acceptance.

## Verification still required

Run exact-HEAD CI including mobile TypeScript, blind source contracts, executable owner-intent fault tests and Android runtime evidence. Real owner decision replay on a changing source requires a separate native integration test, as described above. `NO_VISION_MODEL_USED = TRUE`, `HUMAN_VISUAL_ACCEPTANCE = PENDING`, `REAL_DEVICE_HUMAN_REVIEW = PENDING`.
