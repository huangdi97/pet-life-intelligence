# Known-Bad Calibration

The 18 Android screenshots captured 2026-09-29 (R2P3D-R1 stage) are frozen as
`KNOWN_BAD_2026_09_29` — evidence, **not** an approved baseline. The blind
harness must be able to FAIL them, otherwise the oracle is invalid.

## Fixtures (no vision needed)

`tests/blind_ui/fixtures/known-bad/` encode the known-bad structure as machine
snapshots (from the captured DOM/a11y semantics and the raw terms observed):

- `known_bad_today.json` — 2 anchors, static-image twin with ready manifest
  (FAKE_3D), raw `OPEN` in text, card stack.
- `known_bad_pet.json` — species-glyph hero, 5 grid cards, no friends/caregivers.
- `known_bad_lifeview.json` — undersized stage, static twin, `OWNER_REPORTED` leak.
- `known_bad_twinreview.json` — static cartoon image as twin, no manifest.

## Calibration tests (`tests/blind_ui/test_known_bad_calibration.py`)

- known-bad Today/Pet/LifeView/TwinReview → **must FAIL** (score < threshold or
  critical blocker).
- `OPEN` in Training text and `STRESS_RECOVERY`/`OWNER_REPORTED` in Welfare text
  are detected by the anti-pattern scanner.
- known-good fixture (`known-good/known_good_today.json`) → **must PASS**
  (ORACLE_INVALID ≠ TRUE).

## Registry

`artifacts/blind-ui/known-bad/2026-09-29/` holds the metadata manifest
(hash-registered; files reused from `artifacts/r2p3d-r1/android/screens/`,
not duplicated).
