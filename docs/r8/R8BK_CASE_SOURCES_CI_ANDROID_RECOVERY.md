# PLI R8BK · Case source CI and Android gate recovery

**Status:** code change committed to open PR #2; acceptance depends on exact-head CI and Android runtime. This document does not grant a product release or visual acceptance.

## Reproduced failures (2026-10-21)

CI on `02b543069d37c37292ac7cb534fe2792748761d5` failed 7 integration tests in `life_change_sources.py` with `TypeError: 'UUID' object is not iterable`. The endpoint computed a list of parsed IDs and then reused the name `parsed` in a comprehension assignment expression `(parsed := ...)`. That bound to the surrounding function scope and replaced the list with a single UUID before `zip(ids, parsed, strict=True)`.

The same head's Android runtime job failed at `R8AJ Case detail`: three native Review identity nodes were observed, zero of 13 source identities were observed. Its diagnostic backend log showed Case GET and Review POST succeeding but **no `/sources` request**, despite the harness considering the source pane "opened" merely because a testID existed and a blind coordinate tap was attempted. Not a backend-data-empty gate and not a 3D manifest regression.

## Exact fixes

1. Keep `parsed` as the original ordered list; compute original frozen Case IDs using a distinct `source_id` generator variable, with no assignment expression that leaks into the outer local scope. Do not remove the seven failing integration tests.
2. For Android source expansion, require an **enabled native control in a safe touch band** before tapping. Subsequently require the real `sources.progress` or source-row node in the UIAutomator tree. On an explicit native source-error state, fail with a cause rather than presenting fake Case IDs. Keep the 13/13 immutable source identity, numeric value, both clocks, frozen role and pagination gates.
3. Preserve `CASE_EVIDENCE != FOLLOW_UP_REVIEW`, pet and medical authorization, correction/retraction semantics, and append-only Reviews. Do not weaken the 3D gate, baseline, PR review or owner visual acceptance.

## Verification gates

- Backend: all affected R8AK/R8AT/R8AQ/R8BK integration tests and full pytest at the new HEAD; no HTTP 500 from `/sources`.
- Android: actual Case details, source expansion, pagination, 13/13 source identity with factual value/role, review drilldown and follow-up, retraction/correction A→B→A identity evidence, real RUNTIME 3D manifest.
- CI: GitHub Actions green on exact HEAD, not inherited from earlier SHA.
- External: `NO_VISION_MODEL_USED = TRUE`; `HUMAN_VISUAL_ACCEPTANCE = PENDING`; `3D` individual visual truth still requires owner-supplied assets; no merge, tag or release.
