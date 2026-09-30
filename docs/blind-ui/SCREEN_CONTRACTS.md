# Screen Contracts

17 owner screens + 4 special states, each with a contract in
`packages/visual-contract/screens/`.

| Screen | Contract | Key requirements |
|---|---|---|
| today | today.json | identity, living-stage 43–53% content height, twin centered ≤10%, 4 anchors water/food/activity/sleep always, health separate, narrative Now→Change→Attention→Action→Memory, above-fold cards ≤2, nav 5 |
| timeline | timeline.json | identity, ≤5 filters, time groups, story rows, above-fold cards ≤2, no system noise |
| pet-world | pet-world.json | hero stage ≥35%, individual twin, 6 life domains with label+meaning, friends + caregivers, not a grid |
| life-view | life-view.json | stage ≥52%, real 3D rotate/zoom/reset, 2–4 anchors, 4 modes, panel |
| assistant | assistant.json | currentPet context + suggestions, no provider/debug copy |
| me | me.json | owner, pets, care network, notifications, privacy, data, help; no dev mode |
| quick-log | quick-log.json | feed/water/elimination/walk first, light form |
| health | health.json | overview, changes, prevention, medication, records, vet brief; no fake |
| behavior | behavior.json | observations, patterns, context, recent; no raw enums/emotion claims |
| training | training.json | goal, progress, recent, reward, next; localized status |
| welfare | welfare.json | enrichment, comfort, liked; no STRESS_RECOVERY/OWNER_REPORTED, no scores |
| social | social.json | friends (1–2 explainable), interactions, preferences; not a public feed |
| companion | companion.json | overview, device-empty, recent, next; no prototype/TODO |
| monitoring | monitoring.json | one explicit state machine state; content, last, action |
| twin-capture | twin-capture.json | 6 views front/left/right/back/full/head + QC + retake guidance |
| twin-review | twin-review.json | real 3D twin, views, 很像/基本像/不像, 不像 → activate disabled |
| twin-version | twin-version.json | current version, time, source count, verification, history |
| special-states | special-states.json | empty/attention/offline/multipet sub-contracts |

Machine element IDs follow `pli.<screen>.<role>[.<key>]` (e.g. `pli.today.anchor.water`,
`pli.nav.pet`, `pli.lifeview.mode.now`). The full list is maintained inside each
contract's check ids.
