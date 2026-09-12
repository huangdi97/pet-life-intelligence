# G8 — Medication / Follow-up / Outcome Report

- Verdict: **PASS**

## Implemented

- MedicationPlan (PLI-059): medicine_name, dose_text, route, frequency,
  start/end, source_type required (PROFESSIONAL_CONFIRMED / OWNER_REPORTED
  / LAB_CONFIRMED), source_note for vet/clinic. No dose recommendation is
  generated anywhere; no stop-medication advice (hard boundary).
- MedicationDose scheduling: frequency_per_day × days (cap 60) for
  missed-dose detection.
- Administration (PLI-060): records given_at/by_actor against planned dose;
  duplicate administration → 409 MEDICATION_CONFLICT (first record kept);
  skip endpoint; worker marks overdue PENDING doses MISSED (30 min grace,
  idempotent) + `medication.missed` event + notification.
- Outcome (PLI-063): 7 values (RECOVERED / IMPROVED / UNCHANGED / WORSENED
  / RELAPSED / REFERRED / UNRESOLVED), linked to the original HealthEvent;
  recording closes the episode.

## Evidence

```text
$ pytest tests/integration/test_api_integration.py::TestHealthFlow -q → 6 passed
 (duplicate administration conflict, source-type requirement, outcome validation)
$ pytest tests/e2e/test_seven_paths.py::test_e2e_06 -q → passed
 (plan → 6 doses scheduled → give → duplicate conflict → family member 403 →
  missed-dose worker job → MEDICATION_MISSED notification → outcome closes event)
```

## Gate checklist

- [x] E2E-06 通过
- [x] 遗漏提醒（worker job + notification, idempotent via dedupe key）
- [x] 多人重复给药冲突保护（same-user and cross-user attempts → 409/403）
- [x] outcome 与原 HealthEvent 关联（health_event_id FK asserted in detail view）
