# PLI R8AH · Case creation-time follow-up causality gate

**Status:** implementation on the existing R8 PR #2 work branch; exact HEAD CI/Android runtime must still verify. No merge/release/baseline promotion.

## Identified defect

`computed_at` is the frozen **comparison instant** from the deterministic same-clock personal baseline algorithm, recorded before a LifeChangeCase is inserted. The previous review writer and `_follow_up_current` mistakenly reused it as the beginning of the owner's **follow-up** window. An event that happened between computation and actual creation could qualify after being entered later, falsely giving the owner credit for a post-Case observation. Original Case source event IDs also lacked an explicit no-reuse rule in the review writer.

## Implemented protocol

- `computed_at` / `knowledge_cutoff`: remain unchanged, defining the original current-vs-historical source roles and baseline comparison.
- `created_at`: actual persisted Case creation time, defining the earliest valid new follow-up. A valid `RECORD_OBSERVATION` must have **both** `occurred_at > case.created_at` and `recorded_at > case.created_at`; `occurred_at` cannot be in the future.
- The follow-up's immutable source IDs must be unique and disjoint from original `evidence_event_ids`. Unchanged source validity, type/provenance eligibility, same pet permission, optimistic Review version and idempotent owner action remain mandatory.
- Read-side `_follow_up_current` enforces the same causality on historical accepted Reviews. It never erases an append-only Review but can show effective follow-up source validity false.

## Deterministic backend regression

Create a real reviewable pet Case, read its two persisted instants, enter an event whose occurrence is exactly between them, then prove the Review POST is rejected, no Review row is appended, and the Case stays PROPOSED. Also reject original source re-use and duplicate IDs. Add a real new after-Case record and verify the follow-up is accepted and remains valid in the GET projection. This tests the temporal semantics, not hardcoded elapsed seconds.

**Limit:** this does not establish causal effects of an intervention, prove pet behaviour, or provide medical diagnosis. No visual-model usage; owner review and individual 3D authenticity remain external/human gates.
