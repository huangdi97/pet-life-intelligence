# TEST_REPORT — v0.1 Test Matrix (G11)

- Date: 2026-09-13
- Environment: Windows 11 / Python 3.13.14 / Node 22.15.0 / Docker 29.2.1
- Databases: PostgreSQL 16 (pgvector) on localhost:55432 (`pli` dev,
  `pli_test` test), Redis 7 on 56379, MinIO on 59000.

## Final run (all real commands)

| Command | Exit code | Result |
|---|---|---|
| `.venv\Scripts\python.exe -m ruff check services/api services/worker packages/rules services/ai-gateway` | 0 | All checks passed |
| `.venv\Scripts\python.exe -m pytest -q` | 0 | **106 passed** (1 deprecation warning from starlette TestClient) |
| `pnpm --dir apps/web typecheck` | 0 | no errors |
| `pnpm --dir apps/web build` | 0 | 12 routes built |

## Breakdown of the 106 tests

| Suite | Path | Count | Covers |
|---|---|---|---|
| Unit — rule engine | tests/unit/test_rule_engine.py | 33 | every red-flag rule positive+negative, max_level, determinism, species gating, bad-data rejection |
| Unit — event registry | tests/unit/test_event_registry.py | 7 | 46 canonical types, strict payloads, string amounts, provenance levels, dedupe key |
| Safety | tests/safety/test_red_flag_safety.py | 11 | JSONL eval cases (min/max triage), owner-dismissal under-triage attempts, empty-input baseline |
| AI evals | tests/ai-evals/test_ai_gateway_evals.py | 9 | schema validity, no hallucination, prompt injection, decision-field ban, fallback |
| Contract | tests/contract/test_contracts.py | 4 | JSON Schema validation of API events, error envelope, OpenAPI paths |
| Integration | tests/integration/test_api_integration.py | 32 | idempotency/duplicates, permissions (8 negative cases), cross-pet isolation, expired/revoked grants, tasks conflict, handoff, care card, health flow, medication conflict, notifications, deletion request, artifact upload validation |
| E2E | tests/e2e/test_seven_paths.py | 7 | E2E-01 … E2E-07 full paths |
| System | services/api/tests/test_health.py | 3 | /health, engine-info, error envelope |

Security checks included in the run:
- auth/permission negative cases (8+)
- duplicate completion + duplicate administration conflicts
- event idempotency replay + duplicate rejection
- upload validation: MIME allowlist + signature sniffing + wrong-signature rejection (422)
- random storage keys (server-generated UUID; original filename never used in paths)
- error envelope with request_id on all failures

## Blocked / NOT_RUN

- Playwright browser E2E: **NOT_RUN** — GOAL marks it optional "如果环境支持";
  the 7 E2E paths are covered at API level with the same user-visible flows.
  UI smoke verified via HTTP 200 + build output.
- Push to remote: **BLOCKED** — no git remote configured (see
  FINAL_RELEASE_REPORT.md).

## Known limitations

1. Dev auth only (signed cookie / header); no passwords, no MFA (v0.2, PLI-217 partial).
2. Rate limiting is in-memory per-process (Redis-backed limiter deferred).
3. Worker is a polling loop (30–60 s); no durable queue (documented ADR).
4. Artifact malware scanning is a documented boundary, not implemented.
5. Vet Brief share links are HTML-less JSON endpoints (PDF export deferred).
