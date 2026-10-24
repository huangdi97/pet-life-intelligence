# PLI R8BO · Single-successor LifeEvent integrity

## Finding

The owner correction API checked for an existing successor before appending a replacement, but the check was an application-level read followed by a write. Two concurrent correction requests could both observe "no successor" and create a fork. Case validity still marked the original invalid, but source-detail `superseded_by_event_id` would depend on row ordering and the Pet Life Model would no longer have one deterministic current correction path.

## Invariant

- A→B→C is valid: the owner may correct the current corrected record again.
- A→B and A→C is forbidden: one original LifeEvent has **at most one direct successor**.
- Retraction does not resurrect an older superseded fact.
- Existing Case/Review rows stay append-only and remain inspectable.

## Implementation

1. `supersede_event` locks the original LifeEvent row with `SELECT ... FOR UPDATE` before its successor check. Competing owner corrections serialize; the second request observes the committed first successor and returns the existing 409 contract.
2. PostgreSQL partial unique index `uq_life_events_one_successor(pet_id, supersedes_event_id) WHERE supersedes_event_id IS NOT NULL` is the final integrity boundary for internal writers and future code paths.
3. Migration preflights existing data. If any historical fork already exists, upgrade aborts with the pet, original event ID and successor count instead of silently choosing or deleting a fact.
4. SQLAlchemy metadata declares the same partial unique index, keeping `alembic check` truthful.
5. Integration regression bypasses the HTTP successor precheck and proves a second direct successor fails at the DB. A separate test proves a correction can still continue as A→B→C.

## Gates / boundaries

Require exact-HEAD Alembic base→head→base→head, `alembic check`, Ruff, full pytest, OpenAPI, browser and Android workflows. No merge, release, tag or visual-baseline promotion. This improves event graph integrity only; it does not claim causal medical inference, real AI, real individual 3D identity, or human visual acceptance. `HUMAN_VISUAL_ACCEPTANCE=PENDING`.


## R8BO-2 · Correction vs retraction terminal-state serialization

The same source version must not become both **retracted** and **superseded**. The retraction endpoint now locks the LifeEvent row with `FOR UPDATE`, exactly like correction, then checks for a committed successor. If a successor exists, retracting the obsolete original returns `409 EVENT_ALREADY_SUPERSEDED` with the current successor ID; the owner can retract that current leaf instead. This makes concurrent retract-vs-correct requests serialize to one deterministic outcome and keeps owner source-card validity reasons stable.

Database uniqueness still prevents correction forks. This endpoint rule governs the cross-row terminal-state conflict that a simple partial unique index cannot express.


## R8BO-3 · Persisted topology is independent of source-clock validity

R8BN correctly treats a source whose occurrence/record clock is in the future as invalid **evidence for now**. That must not mean the persisted correction edge disappears from the append-only graph. Mutation preconditions therefore detect any direct successor row regardless of `recorded_at`; otherwise a malformed/legacy future successor could let the API attempt a second branch and collide with the database unique index. Owner mutation now returns a deterministic 409 instead of a DB 500, while read-side evidence validity continues to use its own temporal rules.
