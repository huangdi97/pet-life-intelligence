# PLI R8BT · Auxiliary current-event truth

## Finding

Search, Personal Ask, Why prior-events and Memories had authorization filtering,
but still selected rows with only `retracted_at IS NULL`. A superseded original
event could therefore remain searchable or be sent to the AI gateway after
Today/Life Replay already showed its replacement.

## Central rule

`scope_current_event_stmt` defines read-side current evidence at a cutoff:

- occurrence and recording clocks must be before the cutoff;
- a retraction effective before the cutoff hides that version;
- any successor recorded before the cutoff invalidates the original version;
- authorization visibility remains a separate preceding filter.

This mirrors current Life Replay semantics without first loading obsolete
payloads into AI evidence or owner-facing convenience surfaces. Persisted
correction topology remains append-only.

Applied to Search, Personal Ask evidence, Why prior-event evidence and
Memories-on-this-day. The explicitly requested historical Why anchor stays
inspectable when authorized; this change only prevents stale versions from
being offered as current prior evidence.

## Regression

Create a 91-minute walk with a unique obsolete note, append a 21-minute
replacement, then prove old-note Search returns no hit, replacement Search
returns only the new event ID, Ask citations exclude the old ID, and Why prior
events include the replacement but not the obsolete original.

No causal inference or medical judgment is introduced. Exact-HEAD Ruff,
pytest, Browser, Android and OpenAPI remain required. No merge, release, tag or
visual-baseline promotion. `NO_VISION_MODEL_USED=TRUE`;
`HUMAN_VISUAL_ACCEPTANCE=PENDING`.
