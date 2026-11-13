# PLI R8BR · Administrative LifeEvent visibility gate

## Finding

R8BP closed clinical/medication leakage through generic LifeEvent surfaces, but
the event fabric also contains management facts whose dedicated APIs require
`manage:pet`: household relationships/grants, consent/platform/security/model
operations and finance. Treating every nonmedical event as ordinary
`daily:read` data downgraded those dedicated authorization boundaries.

Concrete example: `POST /pets/{id}/grants` is management-only and mirrors a
`grant.created` LifeEvent containing target user ID, scopes and expiration.
A daily-only sitter could previously discover that mirror through Timeline,
Today, Life Replay, Search, Ask/Why or Memories.

## Rule

`event_visibility.py` is the single read-side policy for generic LifeEvent
surfaces:

- health / medication → requires `medical:read`;
- identity / platform / finance → requires `manage:pet`;
- daily / care / training / social / timeline / behavior remain readable under
  their existing daily-life collaboration contract.

Filtering happens in SQL before serialization/search/counting/AI evidence.
Direct event-ID and Why-anchor reads use the same `event_visible` rule.
Dedicated grant/consent/security/finance APIs keep their own stronger
authorization and remain the proper place to manage those objects.

This intentionally does **not** classify all care/social/training payloads as
public. Finer domain-level consent can be added later from concrete product
requirements; R8BR only closes the unambiguous privilege downgrade.

## Regression

A real owner creates a real grant for a daily-only sitter. The owner can see its
`grant.created` mirror. The sitter cannot recover event ID, grant ID or event
type through generic list/filter, Today, Life Replay, Search, Ask citations,
Why/prior events, direct Why anchor, Memories or direct LifeEvent ID. The sitter
can still create/read an ordinary daily walk.

Exact-HEAD Ruff/pytest/CI/Android/OpenAPI remain required. No merge, release,
tag or visual-baseline promotion. `NO_VISION_MODEL_USED=TRUE`;
`HUMAN_VISUAL_ACCEPTANCE=PENDING`.
