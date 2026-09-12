# G4 — Today / Daily / Task / Timeline Report

- Verdict: **PASS**

## Implemented

- Today (PLI-017): current pet context, today's events with per-type
  counts, open tasks; every view emits `today.viewed`.
- Quick Log (PLI-018..025): meal / drink / elimination / walk / play /
  weight with strict typed payloads (amounts as strings), media attachable
  via artifact_ids.
- Tasks (PLI-026/027/028): create, repeat rule (NONE/DAILY/WEEKLY spawning
  next occurrence), assignee, complete with `completed_by` recorded;
  duplicate completion → 409 TASK_CONFLICT + conflict event + notification
  + audit; first completion never overwritten.
- Timeline (PLI-185/186): per-pet, event_type filter, actor name, source,
  provenance badge, retracted/superseded states shown.

## Evidence

```text
$ pytest tests/integration/test_api_integration.py::TestTasks -q → 3 passed
$ pytest tests/e2e/test_seven_paths.py::test_e2e_01 -q → passed
  (create pet → multi-pet switch → quick log → today → timeline → provenance)
$ pytest tests/e2e/test_seven_paths.py::test_e2e_03 -q → passed
  (duplicate completion conflict → explicit 409 → audit + notification)
```

## Gate checklist

- [x] E2E-01 通过
- [x] E2E-02 通过（household collaboration — see G5 report for details）
- [x] E2E-03 通过
- [x] Today 与 Timeline 数据一致（both served from life_events, same pet_id filter)
- [x] 多宠不会写错 Pet（pet_id always required in path; cross-pet isolation test）
