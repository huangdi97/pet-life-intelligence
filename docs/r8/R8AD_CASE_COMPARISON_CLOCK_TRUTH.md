# PLI R8AD · Case comparison clock truth

## Specific defect

The R7 `abnormal-day-hint` computation fixes its observation window and returns `as_of`. R8 LifeChangeCase formerly saved `computed_at=datetime.now(UTC)` after the comparison and several database checks. If that work crossed the existing UTC+08 calendar midnight, the Case's saved date could disagree with the historical fact partition used for its actual `current_value` and `baseline_value`. R8AC's owner-visible 当日依据 / 同期参考 classification would then shift a source between groups.

## Change

- `computed_at` and `knowledge_cutoff` now persist the **same timezone-aware instant** `hint.as_of` that generated the source IDs and individual comparison; canonical storage is UTC.
- A timezone-naive hint instant is rejected rather than silently treated as local or UTC time.
- Case `created_at` remains the actual persistence time, so the data calculation time is not conflated with DB creation time. Append-only Case/Review, fingerprint/idempotency, all permissions and historical Case rows are unchanged.
- The native R8AC comparison-role helper can now interpret new Case sources with the correct frozen comparison-date boundary. Older Cases retain their previous timestamps; no unreviewed retroactive migration.
- Unit tests cover exact 23:59:59.9999 local time, the explicit midnight rollover, and unzoned rejection. Full CI, actual Android Case evidence and human visual review still must be verified at the new HEAD.

## Next source-truth boundary

Even with the clock fixed, source role is still reconstructed from an event's occurred date and the Case as-of. The strongest future protocol will **freeze current/historical event-ID membership as server-owned source-role metadata** at Case creation, then return those groups to the UI. Do not claim the full versioned explainability protocol is complete until that is implemented and tested.

`NO_VISION_MODEL_USED=TRUE`; `HUMAN_VISUAL_ACCEPTANCE=PENDING`; `3D_ASSET_QUALITY=BLOCKED_BY_SOURCE_ASSET`. No PR merge, tag, Release or baseline promotion.
