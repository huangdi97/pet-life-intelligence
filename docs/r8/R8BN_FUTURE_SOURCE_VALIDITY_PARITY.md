# PLI R8BN — Case source future-time eligibility parity

**Scope:** Current owner Case evidence validity for persisted, potentially malformed/legacy event clocks. Existing Case, Review and source rows remain immutable under this change. No schema migration, release or visual-baseline promotion.

## Finding

The R8BM read-side contract checks Case sources for pet, type, provenance, retraction and supersession. But an imported or historically mutated `LifeEvent` with `occurred_at > now` or `recorded_at > now` would previously still satisfy original-Case validity checks, as well as the SQL VALID/INVALID history filter and its source card. Future timestamp observations do not establish a present or historical animal fact. This differs from the stricter follow-up review temporal eligibility.

## R8BN rule

- An original Case evidence source is current only if **occurred_at <= now** and **recorded_at <= now**, in addition to the previously enforced pet/type/provenance/withdrawal/supersession checks. Existing authoring flows remain unchanged.
- Apply the same clock requirement to server Case detail (`_evidence_current`), SQL-filtered Case history (`_INVALID_EVIDENCE_SQL`) and per-source owner display (`validity_reason = FUTURE_OBSERVATION`). Keep the existing `FUTURE_OBSERVATION` reason vocabulary; no new fabricated severity or medical classification.
- With zero/unknown evidence there is **no proof of physical inactivity, recovery, illness or historical 3D appearance**.
- Integration regression seeds a real Case with real source rows; modifies one original source's occurrence and record times **in a test transaction only** to a future timestamp; checks Case detail status, list VALID/INVALID filter and source card all agree, and restores original clocks to prove recovery.

## Verification and boundaries

Require exact-head Ruff, pytest, UI blind contracts, Playwright and Android evidence; green CI at an earlier SHA is not sufficient. Keep PR #2 OPEN, no merge, release, tag or baseline promotion. `NO_VISION_MODEL_USED = TRUE`; `HUMAN_VISUAL_ACCEPTANCE = PENDING`. Individual 3D identity still needs actual source assets and owner visual approval.
