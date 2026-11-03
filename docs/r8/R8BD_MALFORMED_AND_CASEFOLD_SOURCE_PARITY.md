# PLI R8BD · Malformed / case-folded source ID parity

**2026-10-20 · Target:** PR #2 feature branch only. No main merge, tag, release, visual-baseline update or visual-model approval.

## Proven defect in R8BC

R8BC hardened the SQL list VALID/INVALID predicate with a regex-guarded UUID cast. But Python Case detail (`_evidence_current`) and owner source detail (`list_case_sources`) still parsed raw legacy frozen source strings with `uuid.UUID()` without validation. A malformed source could make an INVALID Case return HTTP 500 when opened. Python also accepted compact non-hyphenated UUIDs that the SQL filter deliberately rejected.

Separately, two JSON source strings differing only by UUID letter case were counted as distinct by `count(DISTINCT ev.id_text)`, although both mapped to the same PostgreSQL UUID/LifeEvent. The list could claim VALID when detail would detect only one unique source.

## Changes

- A shared pure `parse_case_source_id(object)` enforces the same 8-4-4-4-12 textual UUID grammar as SQL. Unknown/malformed input returns `None`, without crashing or granting validity.
- `_evidence_current` treats malformed and normalized-UUID duplicates as INVALID before querying a pet-scoped event. It never interprets a duplicate ID with different casing as new evidence.
- SQL duplicate check uses `lower(ev.id_text)` for casefolded textual uniqueness. Regex-guarded UUID casts still prevent errors for non-UUID legacy payloads.
- Source detail remains readable: malformed/missing IDs appear in `missing_event_ids`, while real uppercase IDs are normalized for lookup and are not falsely reported missing. The returned real sources remain authorized and pet-scoped; there is no invented evidence.
- Integration test exercises duplicate casefold, uppercase valid, unhyphenated source, malformed string, null source and restoration. For each mutation it checks Case detail, list VALID, list INVALID and owner source-detail endpoint.

## Boundaries

This hardens **read behavior for legacy/corrupt Case sources**, not the owner write interface (which already rejects invalid creation). No clinical inference is added. The SQL list predicate still expects `evidence_event_ids` to be an array; a physically broken non-array JSONB value is not part of this change. It does not certify true individual 3D assets.

**Gates:** exact-HEAD Backend pytest, Ruff, full CI, Android screenshots, API sync. `NO_VISION_MODEL_USED=TRUE`, `HUMAN_VISUAL_ACCEPTANCE=PENDING`.
