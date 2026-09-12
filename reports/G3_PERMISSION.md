# G3 — Auth / Permission / Consent / Audit Report

- Verdict: **PASS**

## Implemented

- Dev auth (v0.1): signed session cookie (`POST /auth/dev/login`) +
  `X-Dev-User-Id` header for tests; real interactive auth is documented as
  v0.2 scope (`/auth/status` returns mode).
- RBAC roles: OWNER / CO_OWNER / FAMILY / SITTER / VET / TRAINER / GROOMER
  with default capability matrix; OWNER/CO_OWNER get full capabilities.
- ABAC: pet_id + household membership + grant scope + time window
  (starts_at/expires_at) resolved in one place
  (`app/services/permissions.py`) — routes never hand-roll checks.
- Grants: scoped (daily:read/write, medical:read/write, manage:pet,
  card:read), time-bounded, revocable; `manage:pet` cannot be delegated
  (hard boundary, PLI-204); expired/revoked grants are dead at resolution
  time; worker marks them EXPIRED and emits `grant.expired` events.
- Care Card / Vet Brief share tokens: random 24-byte, stored hashed,
  explicit expiry, revocable, access-counted + audited.
- Consent: 4 purposes per pet (SERVICE_ESSENTIAL / AI_INFERENCE /
  RESEARCH_SECONDARY_USE / EXTERNAL_SHARING); SERVICE_ESSENTIAL cannot be
  withdrawn; every change emits `consent.changed` + audit.
- Audit: audit_entries record who read/created/changed/revoked what with
  request_id; visible to owner via `/pets/{id}/audit`.

## Hard boundaries tested

- Non-owner cannot transfer/grant ownership (OWNER role invite rejected 403).
- Temporary caregiver cannot re-grant to third parties (403).
- Share links expose minimal fields only (care card content test).
- Expired grants rejected instantly (test).
- Cross-pet isolation: sitter with grant on pet A cannot read pet B (test).

## Evidence

```text
$ pytest tests/integration -q → 29 passed
 (TestPermissions 8 tests, TestTasks, TestCareHandoff, TestHealthFlow,
  TestPlatformFeatures — all permission negatives included)
```

## Gate checklist

- [x] 越权 API 测试（outsider 403, family manage 403, family medical-write 403）
- [x] 到期权限测试（expired grant dead）
- [x] 撤销 token 测试（revoked grant dead; share token revoke endpoint）
- [x] audit 可查（/pets/{id}/audit owner-only, actions asserted in E2E-02/03）
- [x] 多宠串数据测试（cross-pet isolation test）
