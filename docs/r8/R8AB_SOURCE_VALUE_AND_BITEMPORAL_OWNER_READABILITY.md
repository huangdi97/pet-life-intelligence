# R8AB · 原始来源可读性：实测数值与双时间（2026-10-14）

## Evidence-grounded gap
At prior HEAD `74dc19b2`, CI and hosted Android accepted an actual eleven-event source evidence pagination path. Native list rows showed type, date, reporter and a shortened event ID, without the **numeric recorded minutes** required to help an owner check an individual baseline difference.

## Code landing
- Whitelist only `daily.walk` and `daily.sleep`'s valid, finite `duration_minutes` for the owner source row. Missing/invalid/zero is **unknown**, never fabricated measured zero. This is the stored owner/device record, not real-time verification.
- A `daily.meal` LifeEvent contributes one **recorded event**, not a measured meal quantity or grams.
- Use two separate labels, `发生` and `录入`, both rendered in the user's current device timezone from the immutable returned ISO timestamp, so backfilled reports cannot appear to have been logged when they occurred.
- If the actual source GET includes `retracted_at`, visibly state it is withdrawn; no claim of current valid evidence.
- Keep full immutable event ID in the native accessibility label and testID, 8-record pagination and pet-ID verification. Never echo an arbitrary `payload` free-text field, since generic life logs can contain private information.
- Add executable tests of the REAL TypeScript helper and JSX wiring; no visual model, fabricated backend observation or API schema alteration.

## Acceptance
New HEAD TypeScript + Node owner-evidence regression, CI, Android APK and genuine UIAutomator eleven-event multi-page capture must PASS. Actual UI aesthetics and approval remain owner-gated. No release, tag, merge or accepted-screenshot baseline changes.

`NO_VISION_MODEL_USED=TRUE`, `HUMAN_VISUAL_ACCEPTANCE=PENDING`, `3D_ASSET_QUALITY=BLOCKED_BY_SOURCE_ASSET`.
