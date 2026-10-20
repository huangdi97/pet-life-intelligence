# PLI R8BG · Historical Case malformed-JSONB safety

**Scope:** PR #2 only. Source-code changes and regression checks; CI proof still requires latest HEAD.

## Previously reproducible failure path

R8BF fixed legacy UUID text casing and reason labels, but a historical `LifeChangeCase.evidence_event_ids` is stored as JSONB with no DB-enforced array shape. Legacy imports can hold a JSON string, object, number or `null`. The history filter ran PostgreSQL `jsonb_array_length`/`jsonb_array_elements_text` on the malformed value, generating SQL errors (500). Case source detail also blindly ran `list(case.evidence_event_ids)`, while `_evidence_current` assumed every source element was hashable. Invalid source-role maps could crash `.items()`.

## Implemented owner-history truth

1. **SQL**: only run JSON array functions on a `CASE`-guarded array expression. Non-arrays immediately evaluate as INVALID, not as a valid/no-event measurement. Both `VALID` and `INVALID` keyset and count use this same predicate.
2. **Case detail and list**: preserve the historical Case and any append-only owner decisions, but return an empty *safe* source-ID list for malformed containers and explicit `evidence_shape_valid=false`. A malformed frozen-role map is never processed as a dictionary and receives `evidence_role_shape_valid=false`.
3. **Source detail**: keep the API available rather than turning data corruption into a server error; explicit integrity metadata prevents mistaking an empty fallback for a clean legacy array. This does not fabricate identities, dates, facts or roles.
4. **Corrections/follow-up**: malformed historical source containers fail the evidence predicate, without letting a malformed JSONB item become a follow-up observation.
5. **Regression**: create a real Pet/Case, mutate JSONB in an isolated test transaction through string/object/number/null shapes, then check detail, source page, all/VALID/INVALID filters and restored happy path.

This is a **defensive legacy-read fix**, not a migration and not authorization to create malformed production records. Other source paths (medical attachment checks, independent provider identity, owner-approved individual Twin) retain their existing gates.

`NO_VISION_MODEL_USED = TRUE`; `HUMAN_VISUAL_ACCEPTANCE = PENDING`. Do not merge main, tag, issue Release or promote visual baselines.

## CI regression response

Initial implementation used a JSONB CASE expression separately inside each array function. The full backend integration suite caught valid Case rows being filtered out by this changed SQL path, despite their detail being `source_valid=true`. This is not an acceptable security fix. R8BG-R2 instead puts **one outer CASE** around the entire **previously proven array-only validity predicate**. Non-array -> TRUE (INVALID); real array -> original exact predicate. The existing valid, invalid, pagination, uppercase UUID and malformed-array regressions remain mandatory. No tests are deleted or loosened.
