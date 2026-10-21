# PLI R8BH · Frozen evidence role-map integrity (legacy JSONB)

## Root finding

R8BG correctly handles malformed `evidence_event_ids` containers. It previously treated every JSON object in `evidence_role_by_event_id` as valid, even if the map omitted a Case source, added a foreign source, reused one event UUID with different letter case, or invented a role such as `VERIFIED`. Owner-facing source rows could then look certain despite a corrupted historical role partition.

## Implemented contract

- `validated_frozen_roles` examines the entire stored immutable source array and role map: strict UUID syntax, canonical UUID uniqueness (case-insensitive), exact one-to-one partition of all original Case sources and only `CURRENT`/`HISTORICAL` values. Both groups must occur, matching the original R8AG algorithm freeze.
- A true SQL NULL map means legacy/no frozen roles: return `None`, `evidence_role_shape_valid=true`, `LEGACY_DATE_DERIVED`. It does not imply those old roles were stored.
- Any non-NULL invalid map means **frozen but unverifiable**: return `{}` and `evidence_role_shape_valid=false`. An empty object deliberately prevents Android's local date fallback. Source rows retain their true IDs, factual values and timestamps, but their comparison role becomes null/日期待核实.
- Case and Review identities and history remain intact. This integrity warning is separate from the source events' current validity, so the fix does not erase an owner decision or misrepresent a historical event as unrecorded.
- An uppercase-only but uniquely mapped UUID is acceptable: normalize it to canonical lowercase, never count duplicate casefold spellings as distinct observations.

## Regression and gates

Real Case created through public API, followed by direct isolated mutation of historical JSONB under test; test missing/extra source, forged role, duplicate casefold identity, non-map types, preserved API access, restored uppercase-only happy path and honest legacy SQL NULL behaviour. CI Backend, Browser, Android and OpenAPI must be confirmed for the *new exact HEAD*.

`NO_VISION_MODEL_USED = TRUE`, `HUMAN_VISUAL_ACCEPTANCE = PENDING`. No Release, merge, tag, synthetic provenance, or screenshot baseline promotion.

## R8BH-R2 · Owner UI first-fold disclosure

Android, Web and Mini Case detail pages now show the exact same source-integrity warning on the *first fold* when the server reports either `evidence_shape_valid=false` or `evidence_role_shape_valid=false`. Android and Web also suppress misleading 'frozen roles certainly known' introductory copy when membership is corrupt. Expanding the source list still supplies the full event identifiers, raw recorded values and independent per-item validation reasons. An absent optional flag on an older server is not automatically called corrupt. Blind UI parity regression added; real native screenshots and human approval remain separately gated.
