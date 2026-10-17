# PLI R8D — Owner Review privacy boundary (2026-10-12)

**Scope:** R8A LifeChangeCase / LifeChangeReview GET privacy; PR #2 feature branch, no release or human visual acceptance.

## Confirmed exposure

Before this patch, `GET /pets/{pet_id}/life-change-cases/{case_id}` required only `DAILY_READ` but serialized every Review's `note` and `related_task_id`. The Review author is required to be OWNER/CO_OWNER, yet other daily readers could see owner-only free text. Such notes may include clinical symptoms or sensitive family context, and linked task identities may carry healthcare semantics. The LifeChangeCase itself is still strictly based on nonmedical recorded daily events.

## Implemented visibility rule

- DAILY_READ alone may see the nonclinical Case, the append-only decision, review timestamp and eligible daily `related_event_ids`, so authorized family coordination remains functional.
- OWNER/CO_OWNER can additionally see the original optional `note` and linked `related_task_id`.
- Nonowner Case detail responses return `note: ""` and `related_task_id: null`, never a partially masked fragment. POST Review is already owner-only, so its own immediate response remains complete.
- Cross-pet permission checks and existing invalidation behavior do not change. API shape remains stable for Android.
- Regression test constructs a real owner Review with a sensitive free-text marker; owner GET retains it, an authorized daily family reader sees decision/status but not free text, and the marker never appears in the serialized response.

## Follow-up gaps

The separate CareTask endpoint, free-text diary indexing, source artifact confidentiality and access-revocation caches still require specific audits. This patch does not assert medical interoperability, a diagnosis, or a verified individual 3D asset. Require exact new HEAD backend/CI and Android runtime evidence before any overall PASS.

`NO_VISION_MODEL_USED = TRUE`; `HUMAN_VISUAL_ACCEPTANCE = PENDING`. Do not merge PR #2, change visual baselines, issue a tag or publish a Release.
