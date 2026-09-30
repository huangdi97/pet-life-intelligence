# Blind Visual Contract

Design as data. Every screen has an executable contract in
`packages/visual-contract/screens/<screen>.json`.

## Scorecard dimensions (sum = 100 per screen)

| Dimension | Weight | Meaning |
|---|---|---|
| Pet / Identity Presence | 20 | currentPet identity, individual twin, basic states |
| Composition Contract | 20 | stage/hero ratios, centering, dominance |
| Information Hierarchy | 15 | health separate, attention ≤1, narrative order, real modules |
| Surface Governance | 10 | large card surfaces above the fold ≤ N, no Card Dashboard |
| Content Purity | 10 | no raw internal enums/terms in owner text |
| Interaction Contract | 10 | nav 5 items, primary action, controls clickable, activate gating |
| Accessibility | 5 | elements reachable/labeled (doubles as the blind test hook) |
| 3D / Runtime Truth | 10 | manifest truth: wireframe=false, fallback honest, no fake 3D |

## Check kinds

`element`, `ratio`, `center`, `count`, `text-free`, `text-has`, `manifest`,
`surface`, `interaction`. Evaluated by `packages/visual-contract/src/evaluate.ts`.

## Thresholds

- All main screens: `pass ≥ 92` and zero critical blockers.
- Today / Pet World / Life View / Twin Review: `heroPass ≥ 95`.
- Special states contract: `pass ≥ 85`.

## Critical blockers (any → FAIL regardless of score)

Generic species hero · static image pretending 3D · wireframe=true · raw
internal enum · hard-coded pet name · pet context cross-contamination ·
Life View rotation unavailable · Health mixed into the four basic Today states ·
more than one primary attention · Today card dashboard.
