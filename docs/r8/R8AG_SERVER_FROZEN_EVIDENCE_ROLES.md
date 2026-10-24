# PLI R8AG · Server-frozen evidence role at LifeChangeCase creation

## Problem and source of truth

R8AD froze Case `computed_at` to `abnormal-day-hint.as_of`. R8AF then verified that all eleven actually rendered Android source rows were correctly labelled **当日依据** (today) or **同期参考** (historical). But the roles were reconstructed on the handset using UTC+08 date arithmetic. Future product timezone/metric-window changes must never silently rewrite the membership of an old reviewed Case.

## Canonical protocol now implemented

- At owner-initiated Case creation, the **server algorithm's explicit current_event_ids and historical_event_ids** become an immutable event-ID-to-role map in `life_change_cases.evidence_role_by_event_id`, a nullable JSONB schema addition.
- The API validates disjoint/unique/nonempty role ID groups. Roles `CURRENT` and `HISTORICAL` form an exact partition of the frozen `evidence_event_ids`. No user-supplied role metadata is accepted.
- All Case responses now include `evidence_role_by_event_id` and `evidence_role_source`. Replayed POST, list, GET and subsequent human reviews show the **same source snapshot**.
- Android source pagination and owner evidence cards preferentially display the frozen server roles, never reclassify a known Case due to device timezone. A missing role inside an asserted frozen map becomes `日期待核实` rather than an invented category. UI emits the role policy as visible plain-language text.
- Old Cases retain NULL in the new column: `evidence_role_source=LEGACY_DATE_DERIVED`; Android falls back to the former UTC+08 date interpretation and **labels it as compatibility inference**, not frozen truth. No retrospective role backfill pretending that earlier source classification was stored.

## Compatibility and release gates

- No alteration to existing algorithm threshold, event source ids, idempotency fingerprint, Case/Review permission, owner acknowledgement, recovery token or historical 3D.
- Migration `f1e2d3c4b5a6` follows `c8d8e1a4b301`; rerun actual Alembic upgrade/downgrade/migration replay, full backend pytest, React Native typecheck, Browser and Android screenshot/evidence gates.
- R8AF's requirement to prove all eleven actual source IDs, times, values and comparison roles in native UIAutomator remains binding. A new exact-HEAD runtime run must confirm it.
- This is a record-backed comparison classification, **not** laboratory/medical verification and not a biological inference. `NO_VISION_MODEL_USED=TRUE`, `HUMAN_VISUAL_ACCEPTANCE=PENDING`, no PR merge, tag, Release or visual-baseline promotion.

## R8AG actual Android release evidence extension

The native Android UIAutomator fixture now first proves the persisted server Case includes **every** source role, exact source IDs and `FROZEN_AT_CREATION` metadata, and checks each of the 11 planted real-event IDs against its expected current/historical membership. After this API-level invariant, it still requires **each** full immutable ID, recorded minutes, occurred/recorded timestamps and correct role in the actual native accessibility node, including owner-tapped pagination. It adds `case_frozen_role_by_event_id`, `case_role_source` and `native_roles_match_frozen_server_evidence` to `api-truth.json`. Existing human visual acceptance remains a separate unwaived gate.
