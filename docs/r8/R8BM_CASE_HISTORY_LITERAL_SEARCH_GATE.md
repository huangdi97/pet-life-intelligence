# PLI R8BM · Case History Literal Search Gate

**Status:** targeted source patch + API regression; exact-HEAD cloud CI and Android runtime remain separate gates. PR #2 remains open; no release, merge, tag or visual baseline promotion.

## Finding

Case history `q` is an owner-authored, bounded (60-character) literal text search across the frozen `human_question` and canonical metric aliases. Previous query construction interpolated `q` into SQL `ILIKE('%...%')` without escaping SQL LIKE meta-characters. Searching for `%`, `_`, or a backslash therefore did not mean “find this text”; it could match unrelated Case questions or behave as an escape sequence.

This is **not** a SQL injection or cross-pet authorization vulnerability: statements are parameterized and `pet_id` filtering remains enforced. It is a correctness and predictable-search defect.

## Implementation

- Escape `\\`, `%` and `_` in the *literal* owner term before issuing `ILIKE`, with an explicit backslash escape character. The `%...%` substring wrapper and case-insensitivity are unchanged.
- Keep canonical Chinese aliases (散步 / 进食 / 睡眠), filter scope, immutable Case ID, stable keyset pagination, and authorized DAILY_READ.
- Integration test seeds four real persisted Cases, updates only their owner question strings to contain percent/underscore/backslash and a plain title, and checks that each literal query returns exactly one Case. This is a test of owner query semantics, not a change to source event or clinical evidence validity.

## Remaining gates

Exact HEAD: Backend Ruff/pytest, Blind Visual Contract, Frontend, Playwright, Android APK and real emulator evidence; no automatic visual model acceptance. Real individual 3D and owner signoff remain external blockers.
`NO_VISION_MODEL_USED = TRUE`; `HUMAN_VISUAL_ACCEPTANCE = PENDING`.
