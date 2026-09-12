# G7 — Health Event / Safety Engine Report

- Verdict: **PASS**

## Implemented

- Health event open with structured intake (complaint, onset, duration,
  eating/drinking/elimination/activity, current meds, history) → rule
  engine triages immediately (rules first).
- Dynamic follow-up (PLI-050): deterministic template questions + AI mock
  questions (asked_by RULE|AI); questions only, never conclusions.
- Observable findings (PLI-052): strict kinds — OWNER_STATEMENT,
  AI_OBSERVATION, RULE_CONCLUSION, PROFESSIONAL_CONFIRMATION. AI
  observations always labeled "主人报告：…" with provenance AI_DERIVED and
  an AIInferenceLog row (PLI-214).
- Red Flag Rule Engine (PLI-053): independent package `pli-rules`,
  versioned rules JSON (10 rules covering all 8 required emergency
  patterns + persistent vomiting + lethargy), keyword matching over zh/en,
  deterministic, species-gated.
- Triage levels: MONITOR / VET_SOON / URGENT / EMERGENCY (PLI-054).
  Never auto-downgrades: new assessments take max(level) with prior.
- Vet Brief (PLI-055): snapshot (pet, complaint, timeline facts by source,
  triage history, meds, engine versions, AI disclaimer); AI draft is
  narrative only. Share link (PLI-056): hashed token, 72h default expiry,
  revocable, access audited.

## Under-triage safety tests

- data/evals/health_safety_cases.jsonl cases all pass (min/max triage).
- Owner-dismissal texts ("我觉得只是心情不好不用管" etc.) still EMERGENCY (6 cases).
- Rule escalation on intake answers (MONITOR → EMERGENCY) tested.
- AI observation with benign text never lowers EMERGENCY (tested).
- No red flags → MONITOR (never phrased as "没有疾病") (tested).

## Evidence

```text
$ pytest tests/safety -q → 28 passed
$ pytest tests/integration/test_api_integration.py::TestHealthFlow -q → 6 passed
$ pytest tests/e2e/test_seven_paths.py::test_e2e_05 -q → passed
 (open → questions(RULE+AI) → answers escalate → evidence upload → AI/rule
  extraction → triage EMERGENCY → vet brief → share link anonymous view)
```

## Gate checklist

- [x] E2E-05 通过
- [x] 每条 red flag 有正/反例（16 positive + 10 negative controls）
- [x] under-triage safety tests 通过（dismissal-language suite）
- [x] AI 不可覆盖 rule engine 紧急度（max-level merge + no decision fields in AI schema）
- [x] Vet Brief 可生成
- [x] Vet Brief 可撤销分享（revoke endpoint + expiry + 404 after revoke/expiry）
