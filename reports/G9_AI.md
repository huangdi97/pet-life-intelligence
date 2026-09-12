# G9 — AI Gateway / RAG / Eval Report

- Verdict: **PASS**

## Implemented

- `pli-ai-gateway` package (services/ai-gateway): provider abstraction
  (Protocol), deterministic offline `MockProvider` (default; product never
  blocked on API keys), `Gateway.invoke` validating every output against
  strict Pydantic capability schemas and attaching metadata (provider,
  model, prompt_version, schema_version, trace_id, latency_ms,
  fallback_used, safety_flags).
- Capabilities: intake_questions, extract_observations, summarize_timeline,
  vet_brief_draft. Output schemas forbid decision fields (triage /
  diagnosis / emergency / medication_change) — enforced by schema + an
  explicit forbidden-field check that raises OutputSchemaError.
- Every inference persisted to `ai_inference_logs` (PLI-214) with
  model/prompt/schema versions — visible in Vet Brief engine_versions.
- Fallback: primary provider failure falls back to MockProvider with
  fallback_used=True (tested with a broken provider fixture).
- RAG: v0.1 uses structured DB queries for personal pet history (per GOAL —
  no vector RAG complexity added); pgvector available in the Postgres image
  for future versions.
- Offline eval suite (PLI-227): schema validity, hallucination control
  (observations must be verbatim clauses), no-invention on unrelated input,
  provenance labeling, prompt-injection resistance (injector + decision
  leaker providers), emergency-downgrade prevention (no triage fields in
  outputs), fallback behavior.

## Evidence

```text
$ pytest tests/ai-evals -q → 9 passed
```

## Gate checklist

- [x] mock AI 全套测试可离线跑（no network; deterministic)
- [x] 结构化输出 schema 通过（all 4 capabilities schema-validated)
- [x] safety suite 通过（tests/safety 28 passed)
- [x] 有模型/Prompt版本审计（ai_inference_logs + engine_versions in briefs)
