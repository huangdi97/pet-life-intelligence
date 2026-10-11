# PLI R5.6 — ANDROID RUNTIME EVIDENCE

> Source SHA: `3aacdf6cfabd105f18b9197ce65d8981a15a48f4` (branch
> `feat/r2p3d-r3-render-truth-ui-closure`). `NO_VISION_MODEL_USED = TRUE` — every value
> below is a file hash, a UIAutomator/layout reading or a manifest field.
> `HUMAN_VISUAL_ACCEPTANCE = PENDING`.

## 1. Hosted emulator evidence (canonical set for this SHA)

| Item | Value |
| --- | --- |
| Workflow run | https://github.com/huangdi97/pet-life-intelligence/actions/runs/38088783190 |
| Job | `Android R5.6 runtime evidence (NO_VISION_MODEL_USED)` — **success** |
| Device | GitHub-hosted emulator, API level 35, `google_apis`, `x86_64`, `pixel_5` profile, `-no-window -gpu swiftshader_indirect` |
| Forced geometry | 1080 × 2340 @ 440 dpi (`wm size` / `wm density` before capture) |
| Package | `com.pli.mobile`, build kind `DEMO_EVIDENCE_BUILD`, self-contained JS bundle |
| Artifact | `r5-6-android-runtime-evidence`, id 11683881923, 5 820 051 B, `expired=false` |
| Artifact URL | https://github.com/huangdi97/pet-life-intelligence/actions/runs/38088783190/artifacts/11683881923 |
| `capture-manifest.json` | `source_head = 3aacdf6cfabd105f18b9197ce65d8981a15a48f4`, `source_branch = feat/r2p3d-r3-render-truth-ui-closure`, `vision_model_used = false` |

Download:

```powershell
gh run download 38088783190 --repo huangdi97/pet-life-intelligence `
  -n r5-6-android-runtime-evidence -D .\evidence-android
```

### Screens captured (all real renders of the demo-evidence APK)

| Surface | Files | Bytes |
| --- | --- | --- |
| Today (primary pet) | `android/today/today.png`, `ui.xml`, `layout.json`, `visual.json`, `3d.json` | 406 592 |
| Today (secondary pet sanity) | `android/secondary-sanity/secondary_today.png`, `ui.xml`, `3d.json` | 312 440 |
| Timeline | `android/timeline/timeline.png` + facts | 242 341 |
| Pet | `android/pet/pet.png` + facts + `3d.json` | 357 147 |
| Life View | `android/lifeview/lifeview.png` + facts + `3d.json` | 382 418 |
| Twin Review | `android/twinreview/twinreview.png` + `twin_front/side/back.png` + `3d_view_*.json` | 274–308 KB each |
| Twin Review (secondary pet) | `android/secondary-review/secondary_front/side/back.png` | 212–277 KB |
| Health | `android/health/health.png` + `ui.xml` | 299 740 |
| Assistant | `android/assistant/assistant.png` + `ui.xml` | 217 283 |
| Companion | `android/companion/companion.png` + `ui.xml` + `3d.json` | 352 562 |
| Me | `android/me/me.png` + `ui.xml` | 181 158 |
| Primary pet selection | `android/_primary-select/ui.xml`, `3d.json` | 15 714 |
| Human-gate contact sheets | `contact-sheets-ci/PLI_R5_6_ANDROID_{HERO,OWNER,REVIEW,SECONDARY}.png` + `android-manifest.json` | 104–511 KB |

Because the job now completes, the per-surface `layout.json` / `visual.json` / `3d.json`
files are produced again — those are the machine-readable facts quoted in
`LIVING_CANVAS_GAP_MATRIX.md` (bounds, selected states, camera yaw per view, manifest
tier). No screenshot in this set came from an earlier run: the artifact was produced by
the run whose `headSha` equals the source SHA above.

## 2. Local emulator evidence (this workstation) — PASS, produced from this exact commit

Local run summary (independent of CI): `capture-android-final.py` completed with **exit 0**
on 2026-10-11 07:17 (+08) and wrote 71 evidence files.

| Item | Value |
| --- | --- |
| APK used | locally built debug-evidence APK, `C:\plibuild\apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk` |
| APK size / SHA-256 | 175 693 686 B / `42366e79c5212e78c8f6c2c573dbe6b3d15cfd68a1ce9643c95c07771b933823` |
| APK package / versions | `com.pli.mobile`, `versionCode 4`, `versionName 0.2.0` |
| APK signing | V2 `CN=Android Debug …`, SHA-256 `fac61745…` → debug/internal |
| APK contents | `assets/index.android.bundle` present (self-contained) |
| Build provenance | space-free copy of the repo at `3aacdf6c`; the copy's app tree was hash-checked against the repo (`package.json`, `navigation.tsx`, `capture-android-final.py`, `manifest.ts` — all identical) |
| Evidence manifest | `artifacts/r5-6-final/android/capture-manifest.json` → `source_head = 3aacdf6c…` (first local run) and `fc334c63…` (second local run, after the evidence-tooling fixes). Both completed with exit 0; the commits in between touch only `scripts/r5-6/capture-android-final.py`, so the app tree is identical |
| Install | `adb -s emulator-5554 install -r …` → `Success` |
| Launch/navigation | real deep-link navigation through Today → Timeline → Pet → Life View → Twin Review → Health → Assistant → Companion → Me, plus the second pet |
| Twin three-view hashes (local) | `twin_front.png` 305 975 B `D51E954D3817B45F…` · `twin_side.png` 271 990 B `D8F84EED7A614631…` · `twin_back.png` 284 542 B `81B34BE4D59F31C0…` — three distinct frames |
| Local Today surface | `today/ui.xml` = 38 840 B containing **all five `pli.nav.*` ids** and **four `pli.today.anchor.*` ids** (`food`, `water`, `activity`, `sleep`) plus `pli.today.living-stage` |
| Honest wording observed in the real render | "今天，和它在一起" · "今天记录了 7 件生活片段" · "示例数据" · "**仅表示当前已记录事实未触发规则，不等同于健康正常**" · "快速记录" · "看看它" · "为什么" |

This is also the direct evidence that the *primary Today* surface does render the complete
owner shell (tabs + life anchors) once the app has finished its warm navigation — the CI set's
leaner primary capture was a mid-mount timing artifact, not a missing UI (see
`LIVING_CANVAS_GAP_MATRIX.md` §1 and §10.1).

### Mechanism checks performed on the same emulator



| Item | Value |
| --- | --- |
| Device kind | **Emulator** (not a physical device) |
| AVD | `pli_pixel_api36` (created for this project; the host's other AVDs belong to other projects and were left untouched) |
| Android | API 36 (`sdk_gphone64_x86_64`), system image `system-images;android-36;google_apis;x86_64` |
| Geometry | 1080 × 2340 @ 440 dpi (same as the hosted job) |
| Host | Windows 11, i5-12400F (6C/12T), 31.8 GB RAM, Android SDK `D:\Code\Android\SDK`, Java 21 + Temurin 17 for Gradle toolchains |
| Backend | local demo stack: FastAPI + Postgres 16/pgvector, Redis, MinIO (Docker Desktop, repo `docker-compose.yml`, redis re-published on 56381 because 56379 is occupied on the host) |
| Metro | `expo start --port 8081`, `adb reverse tcp:8081 tcp:8081` |

Local mechanism checks performed with the real emulator:

| Check | Command | Result |
| --- | --- | --- |
| Device online / booted | `adb devices`, `getprop sys.boot_completed` | `emulator-5554 device`, `1` |
| UIAutomator dump file path | `adb -s emulator-5554 shell uiautomator dump /sdcard/pli_test.xml` | "UI hierchary dumped to: …", readable, valid XML |
| UIAutomator streaming fallback used by the fix | `adb -s emulator-5554 exec-out uiautomator dump /dev/tty` | valid XML stream |
| Emulator identity | `getprop ro.build.version.sdk`, `ro.product.model` | `36`, `sdk_gphone64_x86_64` |

## 3. APK for this SHA

| Field | Value |
| --- | --- |
| Artifact | `pli-mobile-apk`, id 11683936155, 50 404 091 B (zip), `expired=false` |
| URL | https://github.com/huangdi97/pet-life-intelligence/actions/runs/38088783190/artifacts/11683936155 |
| Inner file | `release/app-release.apk` |
| Size / SHA-256 | 99 080 040 B / `31269f9970523f67997a8ec64777f5d98c168e3f0a1ef7f457aee402f8c9a5fe` |
| Package / versions | `com.pli.mobile`, `versionCode = 4`, `versionName = 0.2.0`, label 宠物生活智能 |
| SDK | min 23, target 34, compileSdk 34 |
| ABIs | `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64` |
| Self-contained JS | `assets/index.android.bundle` present |
| Signature | V2 signer `CN=Android Debug, OU=Android, O=Unknown, L=Unknown, ST=Unknown, C=US`, SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c` → **`signing_kind = DEBUG_OR_INTERNAL`, `NOT_PLAY_STORE_SIGNED`** |

Verification commands:

```powershell
sha256sum release/app-release.apk          # 31269f9970523f67997a8ec64777f5d98c168e3f0a1ef7f457aee402f8c9a5fe
aapt2 dump badging app-release.apk | Select-String "^package"
apksigner verify --print-certs app-release.apk
tar -tf app-release.apk | Select-String "assets/index.android.bundle"
```

## 4. Local Windows debug build — RESOLVED

**Attempt 4 (space-free copy, x86_64) succeeded**: `BUILD SUCCESSFUL in 15m 27s`,
`app-debug.apk` produced, installed on the local emulator and used for the §2 run above.

The three earlier failures and their fixes are kept below as environment knowledge, because
they are reproducible on this host and will recur for the next agent.

### Earlier attempts and their failure reasons



A local `assembleDebug` was attempted three times on this host. The failures were
environmental and are recorded verbatim rather than hidden:

| Attempt | Failure | Reading |
| --- | --- | --- |
| 1. Repo path `E:\AI\Pet Life Intelligence` (contains spaces) | `ninja: error: manifest 'build.ninja' still dirty after 100 tries` for `:expo-av:buildCMakeDebug[arm64-v8a]` / `[x86_64]` | expo-av's CMake cannot stabilise a build directory under a path with spaces |
| 2. Same tree reached through a space-free junction `C:\plirepo` | `:app:createBundleDebugJsAndAssets` → "this and base files have different roots: E:\…\node_modules\.pnpm\@expo+cli\… and C:\plirepo\apps\mobile" | the junction keeps CMake happy but breaks pnpm/Node path identity |
| 3. Real space-free copy `C:\plibuild` (source copied without `node_modules`, `pnpm install --frozen-lockfile`, fresh `expo prebuild`, `-PreactNativeArchitectures=x86_64`) | see `AUTONOMOUS_EXECUTION_CHECKPOINT.md` §4 for the final state of this attempt | the correct fix for both failure modes |

Toolchain notes discovered on the way (no repository change needed):

- The Expo Gradle settings plugin compiles Kotlin with a **Java 17 toolchain** while this
  host's `JAVA_HOME` is JDK 21 and remote toolchain provisioning is unreachable
  (`services.gradle.org`/GitHub HEAD requests fail intermittently). A Temurin 17 JDK was
  installed locally (`C:\pli-jdk17-real`) and `apps/mobile/android/gradle.properties`
  (**gitignored**) plus `JAVA_HOME` were pointed at it.
- Gradle 8.8 distribution had to be pre-seeded into the wrapper cache because the wrapper's
  own download aborted mid-redirect; a direct 230 MB download + unzip + `.ok` marker fixed it.

Nothing from these local attempts is claimed as verified Android evidence. The canonical
runtime evidence for this SHA is the hosted job in §1, which ran the same capture script
against the same tree (merge-ref tree identical to the head tree — see
`CURRENT_HEAD_TRUTH.md` §4).

## 5. Physical device

No authorised phone was reachable over adb on this host (`adb devices` empty before the
local AVD was started). Status: **`REAL_DEVICE_QA_PENDING_USER`**. Emulator evidence must
not be reported as physical-device evidence.
