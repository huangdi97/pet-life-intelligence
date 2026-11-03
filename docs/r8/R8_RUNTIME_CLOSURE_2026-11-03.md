# PLI R8 · Current Runtime Closure — 2026-11-03

This document records the current repository/runtime facts after re-auditing PR #2 and fixing the remaining Android evidence gaps. It supersedes dated status assumptions for **current state only**; older closure reports remain historical records for their own SHAs.

## 1. Repository state

- Repository: `huangdi97/pet-life-intelligence`
- Branch: `feat/r2p3d-r3-render-truth-ui-closure`
- PR: #2 — **OPEN / NOT MERGED**
- Current code-bearing runtime-evidence HEAD: `3cb2e2a15e4b07f2aff8c1593d5618d276078cf0`
- No merge, tag, Release, or visual-baseline approval was performed.
- `NO_VISION_MODEL_USED = TRUE`
- `HUMAN_VISUAL_ACCEPTANCE = PENDING`

The later documentation commits do not change runtime code; evidence below remains tied to the exact code-bearing SHA.

## 2. Exact-HEAD hosted gates

For `3cb2e2a15e4b07f2aff8c1593d5618d276078cf0`:

| Workflow | Run | Result |
|---|---:|---|
| CI | #1822 / `41587931879` | **SUCCESS** |
| OpenAPI Artifact Sync | #1054 / `41587931835` | **SUCCESS** |
| Android + Release Artifacts | #1763 / `41587931823` | **SUCCESS** |

Android run #1763 includes:

- Android release APK — SUCCESS
- Web standalone artifact — SUCCESS
- Hosted Android R5.6 runtime evidence — SUCCESS
- real emulator capture — SUCCESS
- contact sheet generation — SUCCESS
- runtime evidence upload — SUCCESS

Runtime artifact:

- name: `r5-6-android-runtime-evidence`
- artifact id: `13210108125`
- digest: `sha256:fb64ede41d0d5b185435b0a77a5579232b91ef7e1ace38e508018098ad0ba4`

Release APK artifact:

- artifact id: `13208684241`
- digest: `sha256:495b59a689e3b6e949de935b0f6f96f683807bfc19f6085ef48a43aa0decf06a`

## 3. R8CB Knowledge Delta — post-withdrawal native refresh closure

The previous failing Android run was not a second-pet 3D identity failure. The current true failure was a stale harness expectation: the owner UI groups same-day delta rows, while the capture still demanded singular copy.

The fix preserved the product contract and strengthened evidence:

- the newly created late event ID must be present in the journal-derived `LATE_RECORDED_EVENT` items;
- owner copy is derived from the real grouped count;
- after owner withdrawal, the current delta must remove exactly one late-record item;
- Android must cross a real navigation boundary and refetch Life View;
- a **new post-withdrawal UI XML and screenshot** must be produced;
- stale pre-withdrawal grouped copy is forbidden.

Observed runtime evidence on the successful hosted run:

`knowledge-delta-truth.json`:

- before withdrawal: `late_record_delta_count = 3`
- UI: `当天之后补录了 3 条记录`
- after withdrawal: `after_retraction_late_record_delta_count = 2`
- UI after native refetch: `当天之后补录了 2 条记录`
- `native_refetched_after_retraction = true`
- `as_known_then_excludes_late_record = true`
- `withdrawn_record_no_longer_explained = true`
- `derived_from_journal = true`
- `llm_generated = false`
- `health_inference = false`

Artifact files now actually exist:

- `android/r8-owner-review/knowledge-delta-ui.xml`
- `android/r8-owner-review/knowledge-delta.png`
- `android/r8-owner-review/knowledge-delta-after-retraction-ui.xml`
- `android/r8-owner-review/knowledge-delta-after-retraction.png`
- `android/r8-owner-review/knowledge-delta-truth.json`

This closes the prior gap where `ui_xml_after_retraction` was named in a manifest but no such artifact was produced.

## 4. R8AS correction — append-only successor truth closure

The Android owner correction path is now proven at both the event layer and the native owner surface.

Real owner action:

1. a Case source contains a 20-minute walk;
2. the owner opens the frozen source on Android;
3. enters `35`;
4. submits the correction through the production supersede endpoint.

Server/event truth:

- original payload remains `20`;
- Case becomes `source_valid=false`, `state=INVALIDATED`;
- successor exists;
- successor belongs to the same `pet_id`;
- successor payload is exactly `duration_minutes=35`;
- successor.`supersedes_event_id` points to the original event;
- successor `occurred_at` equals original `occurred_at`.

Native owner truth:

- Case status becomes `原始记录已变更 · 需重新核对`;
- the frozen original source still reads **20 minutes**;
- the frozen original source is labelled `记录已由后续修正替代`;
- the frozen source row does **not** get silently rewritten to 35 minutes.

Successful artifact:

`android/r8-owner-correction/case-source-correction-truth.json` records:

- `successor_payload_duration_minutes: 35`
- `successor_occurred_at_matches_original: true`
- `native_original_source_marked_superseded: true`
- `native_original_value_preserved: true`
- `original_row_unchanged: true`

Additional native evidence:

- `correction-invalidated.xml`
- `correction-invalidated-sources.xml`
- `owner-case-source-corrected.png`

This enforces the intended bitemporal/append-only rule:

`correction != in-place edit`

The historical source stays historical; the corrected fact is a successor.

## 5. Multi-pet and 3D identity runtime state

The same successful Android capture continues beyond R8 correction and proves:

- secondary pet Today reaches a pet-scoped `stageRole=today` RUNTIME manifest;
- secondary Twin Review reaches `stageRole=review`;
- front / side / back camera views are captured;
- A→B→A returns to the primary pet;
- primary persistent Case returns with A;
- Today runtime manifest returns to A's `petId`.

The demo 3D manifest continues to declare:

- `visualFidelityTier = STYLIZED_REFERENCE`
- `individualIdentityEvidence = false`

Therefore the rigged demo asset is **not** claimed as a verified individual pet twin.

## 6. Product truth preserved

The runtime closure did not change these core rules:

- `unknown != normal`
- `no record != zero`
- `occurred_at != recorded_at`
- later correction/retraction does not rewrite `as_known_then`
- a Case is a record-derived change description, not a diagnosis
- owner Review/Outcome is append-only owner workflow history
- invalidated source evidence invalidates current interpretation without deleting historical owner actions
- suggestion is not fact
- no AI health/causal claim is introduced by Knowledge Delta

## 7. Current completion boundary

Engineering/runtime status:

- Backend — PASS
- Frontend — PASS
- Blind Visual Contract — PASS
- Browser E2E / Playwright — PASS
- OpenAPI artifact sync — PASS
- Android release APK — PASS
- Android hosted-emulator runtime evidence — PASS
- R8CB post-withdrawal native refresh — PASS
- R8AS append-only correction truth — PASS
- secondary-pet Today manifest / Twin Review / A→B→A isolation — PASS

Still intentionally **not** closed:

- `HUMAN_VISUAL_ACCEPTANCE = PENDING`
- approved visual baseline promotion requires explicit human approval
- real individual pet identity/reconstruction validation is not observed
- demo/stylized 3D is not an individual confirmed twin
- PR #2 is not merged
- no tag or Release is created

R8 feature expansion remains frozen after R8CB. Further work should prefer runtime/evidence hardening, real-pet pilot validation, visual human acceptance, or a separately defined next product phase rather than adding more R8 cards/screens.
