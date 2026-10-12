# R7 · Historical Living Space: truthful visual hierarchy

## Runtime evidence behind the change

The exact `e3fab18a` Android evidence artifact `11733568579` included real `verified-now.png`, `as-known-then.png`, UIAutomator XML and `api-truth.json` for 2026-10-09. The API truth showed a 17-minute walk backfilled on 2026-10-12, present in `verified_now` and absent in `as_known_then`. Both real Android modes were observed. **However**, the prior Life View stage retained an oversized mostly empty hero and an illustration overlapping text when the selected history had no authenticated 3D version.

## Implemented UI rule

- **Today/Now** or **historical 3D actually available in current verified records:** keep the interactive pet-first Living Stage and its owner controls.
- **Historical date without a confirmed historic 3D version, historical 7/30 day range, and any `as_known_then` view whose historic 3D record time is unverified:** display a compact warm editorial history cover instead of a 520dp empty stage.
- The cover shows the selected real date/range, source-event count from the current pet/date/perspective response, read error/loading truth and a note that no historical appearance will be invented.
- **No animal illustration is presented as its past self.** Genuine event media remains accessible in the existing timeline below. Approved historical 3D versions remain supported; don't delete the 3D journey.
- Date-specific facts remain scoped by pet+day+perspective; instant UI switching must not replay another pet's stale state. Screenshots and human owner acceptance must separately verify typography, contrast, scroll and first-fold density.

## Acceptance gates

1. New HEAD CI, Android build and R7 demo real-interaction capture both states.
2. Runtime screenshot should show the compact cover, meaningful recorded facts and both perspective buttons; no overlapping giant fallback illustration.
3. Human visual acceptance remains PENDING. No baseline update, release, merge or tag. `NO_VISION_MODEL_USED = TRUE` in automated gates.
