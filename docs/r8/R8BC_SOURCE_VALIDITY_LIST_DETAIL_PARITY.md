# PLI R8BC · Case history filter / detail source-validity parity

## Repo-proven defect

Prior to R8BC, `list_cases(validity=VALID)` used a PostgreSQL anti-join looking only for **withdrawn or superseded** evidence. But the detail route's `_evidence_current` also requires nonempty, unique and existing source event IDs; the matching pet, metric event type and observed/reported provenance. A missing source or wrong-metric legacy Case could therefore be listed as `VALID` while its own detail returned `source_valid=false`.

Existing R8AK pagination tests intentionally seed immutable ledger Cases with nonexistent source IDs. Those may remain visible in the **unfiltered history** but must not appear under `来源有效`.

## Implementation

The bounded PostgreSQL predicate now treats the entire frozen evidence list as invalid when it is empty, has duplicates, or contains any item without an eligible real LifeEvent of the same pet and metric. `e.retracted_at`, supersession by a same-pet event at the current knowledge time and source trust allowlist are checked. A malformed source ID is guarded before UUID casting. Both `VALID` and `INVALID` and `total/has_more` still reuse one identical filter with stable Case keyset pagination.

This is a list/detail consistency and provenance hardening step, **not** a claim that the animal is healthy, ill, recovered or physically active.

## Exact-HEAD gate

New API integration test opens a real owner Case, verifies baseline `VALID`, then edits only the Case's frozen source IDs in a controlled test database to simulate a legacy/corrupt missing source, duplicate source and wrong-metric source. At each stage it compares the detail `source_valid` to both list filters. It finally restores the original immutable evidence to verify `VALID` again. Existing retraction/supersede, household isolation, keyset and multi-client test gates must remain green.

Do not merge PR #2, publish Release/tag, promote visual baselines or claim real Mini runtime validation from this DB/API test. `HUMAN_VISUAL_ACCEPTANCE=PENDING`, `NO_VISION_MODEL_USED=TRUE`.
