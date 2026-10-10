# PLI R5.6 — ANDROID INSTALL AND HUMAN REVIEW

> Purpose: let the owner install the exact build under review and judge it with their own
> eyes. `HUMAN_VISUAL_ACCEPTANCE = PENDING` — nothing in this file, and nothing the
> automated gates produced, counts as visual acceptance.

## 1. Which APK to install

| Field | Value |
| --- | --- |
| Source SHA | `3aacdf6cfabd105f18b9197ce65d8981a15a48f4` |
| Artifact | `pli-mobile-apk` (GitHub Actions **run artifact**, not a Release) |
| Artifact page | https://github.com/huangdi97/pet-life-intelligence/actions/runs/38088783190/artifacts/11683936155 |
| Download command | `gh run download 38088783190 --repo huangdi97/pet-life-intelligence -n pli-mobile-apk -D .\pli-apk` |
| File inside the zip | `release/app-release.apk` |
| Size | 99 080 040 bytes |
| SHA-256 | `31269f9970523f67997a8ec64777f5d98c168e3f0a1ef7f457aee402f8c9a5fe` |
| Package / versions | `com.pli.mobile` · `versionCode 4` · `versionName 0.2.0` |
| Signing | V2 signer `CN=Android Debug, OU=Android, O=Unknown, …, C=US` → **debug/internal signed, NOT Play-Store signed** |
| Self-contained | yes (`assets/index.android.bundle` inside), so no Metro/dev-server is required |
| ABIs | `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64` |

Verify before installing:

```powershell
Get-FileHash .\pli-apk\release\app-release.apk -Algorithm SHA256
# must be 31269F9970523F67997A8EC64777F5D98C168E3F0A1EF7F457AEE402F8C9A5FE
```

## 2. Install and start

```powershell
adb devices                       # expect exactly one authorised device/emulator
adb install -r .\pli-apk\release\app-release.apk
adb shell monkey -p com.pli.mobile -c android.intent.category.LAUNCHER 1
```

Notes:

- `-r` keeps existing app data; the package is debug-signed, so a previous build signed with
  the same debug key upgrades cleanly. If Android reports `INSTALL_FAILED_UPDATE_INCOMPATIBLE`,
  the previously installed build was signed with a different key — uninstall that one **only
  if you accept losing its local data**.
- The artifact is a **demo-evidence capable** build. For the owner's own login it needs a
  reachable API: either the local demo stack (`http://127.0.0.1:8800` + `adb reverse`) or a
  deployed staging URL. Without it the app must show its honest offline/error states — that
  is expected behaviour, not a defect.

## 3. What to look at (owner review path)

Open the four contact sheets first — they are small and are built exactly for this:

```powershell
gh run download 38088783190 --repo huangdi97/pet-life-intelligence `
  -n r5-6-android-runtime-evidence -D .\evidence-android
start .\evidence-android\contact-sheets-ci\PLI_R5_6_ANDROID_HERO.png      # Today + Life View hero
start .\evidence-android\contact-sheets-ci\PLI_R5_6_ANDROID_OWNER.png     # owner surfaces
start .\evidence-android\contact-sheets-ci\PLI_R5_6_ANDROID_REVIEW.png    # Twin Review three views
start .\evidence-android\contact-sheets-ci\PLI_R5_6_ANDROID_SECONDARY.png # second pet (isolation)
```

Then check the full-size frames per screen:
`android\today\today.png`, `timeline\timeline.png`, `pet\pet.png`, `lifeview\lifeview.png`,
`twinreview\twin_front.png|twin_side.png|twin_back.png`, `assistant\assistant.png`,
`health\health.png`, `companion\companion.png`, `me\me.png`,
`secondary-sanity\secondary_today.png`, `secondary-review\secondary_front|side|back.png`.

Questions only you can answer:

1. Does Today feel like *your pet is living here* on the first screen, with 吃/喝/活动/睡眠/关注
   as part of that life space rather than four KPI cards?
2. Is the pet the visual subject (not a widget), and is the demo 3D identity clearly marked as
   an **示例形象** rather than passed off as your pet?
3. Does the Twin Review three-view row sit on the first screen and do the three frames really
   look like front/side/back of the same animal?
4. Would you accept "unknown" instead of "normal" wherever nothing has been recorded?
5. Any horizontal overflow, hidden control, or bottom-bar overlap on your own phone?

Known limitations to keep in the judgement honest:

- The rendered individual is a **CC0 corgi template demo asset** (`visualFidelityTier =
  STYLIZED_REFERENCE`, `sourceMediaCount = 0`) → `3D_ASSET_QUALITY = BLOCKED_BY_SOURCE_ASSET`.
- Screenshots come from **emulators** (hosted API 35 and local API 36), not from a physical
  phone → `REAL_DEVICE_HUMAN_REVIEW = PENDING`.
- The Today first-screen capture in the CI set was taken while the shell was still mounting
  (a `加载中` node is visible next to a complete later capture of the same screen) — see
  `LIVING_CANVAS_GAP_MATRIX.md` §10.1.
- Mini (WeChat) native screenshots are not in this bundle: `EXTERNAL_BLOCKED`, they need your
  DevTools session.

## 4. Physical-device check (when you are ready)

```powershell
adb devices                                  # confirm your phone is authorised
adb install -r .\pli-apk\release\app-release.apk
adb shell am start -n com.pli.mobile/.MainActivity
```

This agent did not connect to, install on, reset, or reconfigure any physical phone; no
authorised device was reachable. Once you run the steps above, record the result yourself —
that is what moves `REAL_DEVICE_HUMAN_REVIEW` from `PENDING`.

## 5. What this build is not

- It is **not** a Play Store release: debug/internal signing, no store listing, no release
  notes, no tag, no GitHub Release was created.
- It is **not** proof of real AI or real 3D-provider quality: locally and in CI the AI
  provider is a sandbox and the 3D pipeline reports `REAL_3D_PROVIDER_EXTERNAL_BLOCKED`.
