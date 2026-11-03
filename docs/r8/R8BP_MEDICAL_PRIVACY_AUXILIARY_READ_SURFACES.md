# PLI R8BP · Medical privacy across auxiliary read surfaces

## Finding

The canonical Timeline / Today / Life Replay endpoints already removed health and medication LifeEvents from users with only `daily:read`. Several v0.2 convenience endpoints still queried raw LifeEvents independently:

- Search could match clinical payload text.
- Personal Ask could send clinical event text to the AI gateway before authorization filtering.
- Why could reveal a medical anchor or prior medical event IDs/types.
- Memories-on-this-day could reveal medical event existence through counts/type samples.
- Structured Memory required only `daily:read` but returned active medication names and doses.

A temporary daily-only caregiver could therefore bypass the medical boundary without calling a medical endpoint.

## Rule

Medical visibility is a data-source rule, not a presentation rule. `event_visibility.py` derives sensitive event types from the canonical registry domains `health` and `medication`, checks `medical:read`, and applies SQL filtering **before event rows are serialized, searched, counted or sent to AI**.

Search, memories, Ask and Why use the same query-scope helper. A medical Why anchor requires `medical:read`. Structured Memory returns an empty `active_medications` list to daily-only users and does not query the medication rows; the response shape remains compatible. Owners/family members with medical read retain their existing view.

This change intentionally does not yet define visibility for every nonmedical platform/security/identity event. That broader life-feed classification needs a separate policy audit rather than treating "not medical" as synonymous with "appropriate for every caregiver".

## Regression

The integration test grants a sitter only daily read/write, creates a real private health complaint and medication plan as the owner, then proves the sitter cannot find the clinical phrase/event ID through Search, Ask citations, Why or Structured Memory while the owner can still read the medication. Generic Timeline privacy tests remain in place.

No AI model output is used as the security assertion: the protected row is removed before gateway invocation. `NO_VISION_MODEL_USED=TRUE`; `HUMAN_VISUAL_ACCEPTANCE=PENDING`.


## Generic mutation domain boundary

R8 Case source correction/retraction uses manually recorded `daily.*` facts. Domain events such as health, medication, behavior, milestone, identity, consent, grant and platform events are projections of separate guarded objects/workflows. The generic `/events/{id}/retract` and `/pets/{pet}/events/{id}/supersede` endpoints now reject non-`daily.*` types with `422 EVENT_MUTATION_DOMAIN_FORBIDDEN`. This prevents an owner from changing only the event-log mirror while leaving the authoritative clinical/consent/domain object unchanged. Existing daily Case correction and retraction remain supported.
