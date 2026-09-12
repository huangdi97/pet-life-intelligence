# G6 — Behavior Event Report

- Verdict: **PASS**

## Implemented

- ABC structured record (PLI-069): antecedent, observable behavior,
  consequence, duration, intensity (owner-reported, provenance-labeled
  OWNER_REPORTED), people/animals involved, environment, owner notes,
  artifact attachment.
- Stored as first-class `behavior_events` row + `behavior.observed`
  LifeEvent in the same transaction → appears in Timeline with provenance.
- No diagnosis: API response and UI state explicitly that observations are
  facts only; no AI summary can upgrade behavior into a disease (AI
  capabilities have no behavior-diagnosis output at all).

## Evidence

```text
$ pytest tests/e2e/test_seven_paths.py::test_e2e_07 -q → passed
 (create ABC event → artifact bind → timeline entry with OWNER_REPORTED
  provenance → no diagnosis language → intensity_source asserted)
```

## Gate checklist

- [x] E2E-07 通过
- [x] 行为记录进入 Timeline（behavior.observed event asserted）
- [x] 原始记录与 AI 摘要分开（no AI summary endpoint for behavior; raw facts only）
- [x] provenance 正确（OWNER_REPORTED asserted; intensity_source asserted）
