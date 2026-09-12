# G5 — Care Network / Handoff / Care Card Report

- Verdict: **PASS**

## Implemented

- Household invitations (PLI-035): owner/co-owner invites by email+role;
  7-day token (hashed at rest); acceptance binds user to household with
  role; OWNER role invitation rejected (ownership transfer needs explicit
  human confirmation — PLI-204 boundary).
- Role templates (PLI-036): role determines default capabilities.
- Care Handoff (PLI-037): owner creates time-bounded handoff to caregiver
  with explicit scopes; creates Grant(source=HANDOFF); early end revokes
  the grant; worker expires handoffs past end_at.
- Care Card (PLI-038): minimal-field snapshot (pet info, active meds,
  behavior taboos / critical notes, emergency contacts, open tasks, preferred
  clinic as text fields — no maps); issued via hashed share token with
  expiry; access increments counter + writes audit; revocation endpoint.
- Grant expiry worker: emits `grant.expired` + notification (idempotent via
  dedupe keys).

## Evidence

```text
$ pytest tests/integration/test_api_integration.py::TestCareHandoff -q → 3 passed
$ pytest tests/e2e/test_seven_paths.py::test_e2e_02 -q → passed
  (invite → accept → role assigned → task → second member completes →
   completed_by visible → audit shows task.create + task.complete)
$ pytest tests/e2e/test_seven_paths.py::test_e2e_04 -q → passed
  (handoff → caregiver logs daily event → medical still 403 → care card
   minimal content → end handoff → access dead → expired-at-creation rejected)
```

## Gate checklist

- [x] E2E-04 完整通过
- [x] 未授权字段不可读（care card minimal content assert; medical 403 under daily scope)
- [x] 到期自动拒绝（expired grant + worker expiry job tested)
- [x] Care Card 可分享（token URL; UI displays share link; printable content JSON）
