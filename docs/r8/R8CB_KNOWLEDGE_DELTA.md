# PLI R8CB · Knowledge Delta / Why History Changed

## Why this slice exists

R7 Life Replay already answers *"what is recorded for that day?"* in two
perspectives:

- `verified_now` — the record as it stands today, including later backfill,
  retraction and correction;
- `as_known_then` — only what was knowable by the end of that day.

R8CA added the owner-intelligence journal to the same replay:

`LifeEvent history → Case → Review(s) → Outcome(s) → effective owner workflow at cutoff`

After R8CA an owner could switch between the two perspectives, but still had to
compare two screens by eye to understand *why* they differ. R8CB closes that
last semantic gap: the server derives the difference deterministically and the
owner surface states it in one short, read-only explanation.

R8CB is the **final R8 slice**. After it, R8 feature expansion is frozen.

## Core invariant

```
Knowledge Delta  !=  Pet Health Delta
```

R8CB only reports what became *knowable* later:

- a record added after the day ended;
- a source the owner later retracted;
- a correction the owner later recorded;
- a review or outcome the owner later appended;
- a workflow state (or evidence validity) that later changed.

It never reports that the animal recovered, deteriorated, became normal, or is
at risk. No LLM, embedding, or model of any kind participates: every item is a
timestamp and journal comparison.

```
occurred_at  !=  recorded_at  !=  knowledge_cutoff
correlation  !=  causality
workflow state  !=  physiological state
```

## Delta kinds (frozen enum)

| Kind | Meaning | Derived from |
| --- | --- | --- |
| `LATE_RECORDED_EVENT` | occurrence on D, recorded after D ended | `LifeEvent.recorded_at >= historical_cutoff` |
| `SOURCE_RETRACTED_LATER` | known on D, withdrawn afterwards | `LifeEvent.retracted_at >= historical_cutoff` |
| `SOURCE_SUPERSEDED_LATER` | known on D, corrected afterwards | successor `LifeEvent.recorded_at` |
| `REVIEW_ADDED_LATER` | owner appended a review after D | `LifeChangeReview.reviewed_at` |
| `OUTCOME_ADDED_LATER` | owner appended an outcome after D | `LifeChangeOutcome.recorded_at` |
| `WORKFLOW_CHANGED_LATER` | effective owner workflow moved | `project_case_workflow_at` at both cutoffs |
| `CASE_BECAME_INVALID_LATER` | the Case's original sources stopped being valid | `source_valid` true→false |
| `FOLLOWUP_BECAME_INVALID_LATER` | the follow-up observation behind an Outcome was withdrawn | `follow_up_source_valid` true→false |

No further kinds are added while the feature freeze holds. Unknown kinds are
rendered with neutral copy on the client instead of echoing server strings.

## Bitemporal semantics

`historical_cutoff` defaults to the end of the selected day; `current_cutoff` is
now. A day that is still running therefore reports
`changed: false` — nothing has "later" happened yet, and R8CB must not invent an
explanation for a day that has not closed.

Later facts never flow back into `as_known_then`. R8CB *explains* the difference;
it never rewrites either perspective:

- a retracted-follow-up Outcome keeps the same Outcome ID and remains the
  historical truth of that day (`R8BW`), while the current view reports
  `FOLLOW_UP_EVIDENCE_INVALIDATED`;
- a correction supersedes an event without deleting the original row;
- a later Review cannot appear in an earlier replay.

An explicit `historical_cutoff` query parameter is accepted for audit and
verification. It must be timezone-aware, must not be in the future, and must not
precede the replayed day — otherwise the request is rejected with 422.

## API

`GET /pets/{pet_id}/life-replay` now returns, next to `events`,
`owner_workflows`, and `truth_note`:

```json
{
  "knowledge_delta": {
    "changed": true,
    "items": [
      {
        "kind": "SOURCE_RETRACTED_LATER",
        "reason": "后来这条来源被主人撤回",
        "changed_at": "2026-10-20T09:12:33+00:00",
        "occurred_at": "2026-10-18T02:00:00+00:00",
        "recorded_at": "2026-10-18T02:05:11+00:00",
        "case_id": null,
        "event_id": "…",
        "review_id": null,
        "outcome_id": null
      }
    ],
    "event_delta_count": 1,
    "owner_workflow_delta_count": 0,
    "historical_cutoff": "2026-10-18T16:00:00+00:00",
    "current_cutoff": "2026-10-28T10:00:00+00:00",
    "truth_note": "这些变化只说明记录和主人核对后来发生了什么，不代表宠物健康状态改变。",
    "derived_from": "APPEND_ONLY_JOURNAL",
    "model_status": "DETERMINISTIC_NO_LLM_NO_HEALTH_INFERENCE"
  }
}
```

Private owner notes (`LifeChangeReview.note`, `LifeChangeOutcome.note`) are never
copied into the delta. Only ids, kinds, reasons and timestamps are exposed.

## Android owner surface

`LifeViewScreen` renders a single quiet section under the
`现有记录 / 当时所知` switcher, and only when `knowledge_delta.changed` is true:

```
后来发生了什么
为什么现在看到的不一样
2 条记录变化 · 1 条主人核对变化
· 10月18日 这条记录是在当天之后补录的
· 10月20日 后来这条来源被主人撤回
· 10月21日 主人后来追加了一次核对
这些变化只说明记录和主人核对后来发生了什么，不代表宠物健康状态改变。
```

`NO CTA`: the block is text only. No record/retract/correct/outcome/QuickLog
action can be started from a historical day — the owner still goes back to
Today or the current Case to act.

## Cross-client scope

- **Android** — implemented (Life View replay section).
- **Web** — no bitemporal day-level Life Replay surface exists, so no delta is
  shown there. This is a recorded capability limitation, not fake parity.
- **Mini** — no full bitemporal Life Replay; the limitation is kept explicit
  rather than simulating replay locally.

## Verification

Backend (`tests/integration/test_r8cb_knowledge_delta.py`):

- late backfill, later retraction, later correction, later review, later
  outcome, and outcome-source invalidation each produce the documented kind;
- no retroactive rewrite of `as_known_then`;
- no private note leakage, no health wording, no LLM (`derived_from`,
  `model_status` asserted);
- pet-scoped isolation, permission denial for outsiders, and cutoff validation;
- a day with no later knowledge yields an empty delta.

Mobile contract (`apps/mobile/scripts/test-knowledge-delta.cjs`, run through
`pnpm --dir apps/mobile test:knowledge-delta`):

- wired, visibility-gated, deterministic copy;
- read-only (no `onPress`/`Pressable`/navigation inside the delta block);
- no health wording in generated copy;
- unknown kinds degrade to neutral copy.

Real Android runtime evidence (`artifacts/r5-6-final/android/r8-owner-review/`):

- `knowledge-delta-truth.json` — `derived_from_journal: true`,
  `llm_generated: false`, `read_only: true`, `health_inference: false`,
  `ui_kinds_observed`, `ui_wording_asserted`, `retraction_cutoff_kinds`,
  `as_known_then_excludes_late_record`,
  `withdrawn_record_no_longer_explained`;
- `knowledge-delta-ui.xml` — the native section identity and headline;
- `knowledge-delta.png` — the rendered owner surface.

### What the native runtime can and cannot show

A record that was made *after* a day ended can never be "known then", so on a
completed day the device shows exactly one honest thing: the backfill
explanation acquired from that real record. Withdrawing that record must then
remove it from the current view and stop explaining it — a demo day may still
hold other later-recorded Case sources, and none of them may be recycled into a
retroactive retraction story. The capture asserts both directions.

`SOURCE_RETRACTED_LATER` needs a record that existed at the day's own end, which
a fresh demo capture can only produce with an explicit pre-withdrawal cutoff.
That kind is therefore proven at the journal boundary for the same day, while
the device proves the rendering, wording and read-only posture.

`NO_VISION_MODEL_USED = TRUE`; every check above is deterministic UI/API
assertion text, never a vision model judgement.
