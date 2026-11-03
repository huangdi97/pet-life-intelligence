# PLI R8BL · Case History Cursor Input Safety

**Scope:** API parser, integration regression, existing Case/Review history. No schema migration, product source changes, release or baseline promotion.

## Audit finding (latest R8BK HEAD)

Case history already used immutable `(created_at, id)` pagination rather than shifting offsets, but `decode_case_cursor` caught only JSON/ValueError/TypeError and assumed the decoded JSON root was a dictionary. Invalid Base64 padding can raise `binascii.Error`, non-UTF-8 bytes raise `UnicodeDecodeError`, and a valid JSON array/number/null raises `AttributeError` at `payload.get`. An unauthenticated or daily-scoped caller could produce a server error instead of a structured 422 (the endpoint still enforces daily read before parsing).

## Implementation

- Enforce ≤1024-character Base64URL cursor and its alphabet *before* decoding; reject noncanonical ID strings and non-object JSON values.
- Use strict Base64 validation and UTF-8 decode; convert parser errors to `ValidationFailed` (HTTP 422). Do not convert unexpected database/server errors into accepted user input.
- Existing `encode_case_cursor` output and the immutable keyset pagination contract are unchanged. A cursor is a navigation position, **not** a signed capability, and all requests still need pet-scoped DAILY_READ.
- Real API integration tests cover wrong padding, illegal characters, invalid UTF-8, JSON null/number/array, naive timestamps, invalid ID types, oversize payloads, and valid server-issued cursor roundtrip over multiple Cases.

## Acceptance boundary

Pass exact-HEAD Backend Ruff + pytest, Frontend, Blind UI, Browser E2E, Android APK and emulator evidence; no vision-model-based screenshot acceptance. Owner visual acceptance is independently pending. PR #2 remains unmerged.
