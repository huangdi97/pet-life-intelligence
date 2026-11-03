# PLI R8BE · Source detail per-row fact-trust parity

**2026-10-20**, working branch PR #2. R8BD fixes Case source-ID textual parsing and duplicate identity. R8BE closes an adjacent mislabeling of actual source truth in owner evidence detail.

## Failure

`GET /pets/{pet}/life-change-cases/{case}/sources` annotated every original LifeEvent with `valid=true` if it was neither retracted nor superseded. But the Case detail and VALID history filters also require **matching metric event type** and an **eligible observed/reported provenance class**. Corrupted, legacy or manually imported Case evidence could therefore show per-row "有效" badges while the Case correctly said "来源失效".

## Code contract

- `payload.valid` is per-row **evidence eligibility for this Case**, not merely the existence of an unretracted event: expected metric type from the canonical R8 METRICS map, trusted fact source in `RECORD_FACT_SOURCES`, not retracted and not superseded.
- A whole Case is valid only when its **complete frozen list** is eligible; a single row's validity cannot by itself certify a full multi-event Case.
- Keep frozen roles, observed/recorded timestamps, real source IDs, cross-pet permissions, and the medical-read boundary unchanged.
- Integration tests mutate a legacy Case's frozen metric and one original event's trust class in a controlled DB, then require consistent Case detail/list and per-row source validity, followed by restoration. Owner can still inspect an invalid row in history.

No automated medical verdict, no AI-as-recorded-fact, no fake individual Pet Twin or visual baseline promotion. Exact-head CI and Android runtime remain separate evidence gates. `NO_VISION_MODEL_USED = TRUE`, `HUMAN_VISUAL_ACCEPTANCE = PENDING`.
