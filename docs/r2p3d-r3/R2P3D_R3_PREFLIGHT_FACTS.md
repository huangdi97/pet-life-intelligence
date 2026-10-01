# R2P3D-R3 Preflight Facts

> Stage: R.2-P3D-R3 鈥?Render Truth & Visual Composition Closure
> Generated: 2026-10-01 (Phase 0, before any code change)
> Method: every value below taken from an executed command this session; nothing assumed from prior docs.

## 1. Repository

| Fact | Value | Command evidence |
|---|---|---|
| REPO_ROOT | `E:/AI/Pet Life Intelligence` | `git rev-parse --show-toplevel` |
| branch | `main` | `git branch --show-current` |
| HEAD | `2069d8a8c8b4df9752f7c65fb3ddaad831100010` | `git rev-parse HEAD` |
| HEAD short | `2069d8a docs(blind-ui): fix hero-acceptance row to final web pet=100 score` | `git log -1 --oneline` |
| origin/main | `2069d8a8c8b4df9752f7c65fb3ddaad831100010` | `git rev-parse origin/main` |
| merge-base(origin/main, HEAD) ancestor | yes (exit 0) | `git merge-base --is-ancestor origin/main HEAD` |
| git status --short | only untracked `.pi/goal/...` host goal artifact; working tree otherwise clean | `git status --short` |
| origin remote | `https://github.com/huangdi97/pet-life-intelligence.git` (fetch+push) | `git remote -v` |
| latest tag | `v0.2.2` | `git tag --sort=-creatordate` head |
| previous tags | v0.2.1, v0.2.0, v0.1.2, v0.1.1, v0.1.0, v1.2.0, ... | `git tag --sort=-creatordate` |
| Canonical Master (L3) | repo root `Pet_Life_Intelligence_v3.4-R1_浜у搧鎶€鏈疷IUX澶氱浣撻獙Release浜у搧鍖朙ivingPetExperience涓嶱ilot鍓嶆敹鍙缁熶竴鍏ㄩ噺姣嶇増_2026-09-27.md` (272,822 bytes) | `Get-ChildItem -Filter *v3.4*` |
| R2 total goal doc | user-provided 123-section R2P3D-R3 master goal (3153 lines) 鈥?the contract for this round | pasted in goal |

## 2. CI status (at preflight, before push)

- No branch push has been made for R3 yet; remote CI state reflects R2 (**v0.2.2** history).
- Known historical red: VISUAL-V2/V3 pixel-diff baseline drift existed on main before R2 (per `docs/blind-ui/BLIND_UI_FINAL_REPORT.md` 搂108). This round does NOT use "historical red" as a pass.
- `CURRENT_MAIN_FULL_CI_GREEN` = FALSE at preflight (not re-verified on remote yet; will be re-verified after R3 candidate push).

## 3. Android runtime environment

| Fact | Value | Command evidence |
|---|---|---|
| Android SDK | `D:\Code\Android\SDK` | `$env:ANDROID_HOME` |
| adb present | yes | `Test-Path $env:ANDROID_HOME\platform-tools\adb.exe` = True |
| platforms | android-34, android-35, android-36, android-36.1, android-37.0 | `Get-ChildItem $env:ANDROID_HOME\platforms` |
| build-tools | 34.0.0, 35.0.0, 36.0.0, 36.1.0, 37.0.0 | `Get-ChildItem $env:ANDROID_HOME\build-tools` |
| AVD list | `main`, `zhishen_rc` | `emulator -list-avds` |
| AVD actually used | `main` (running) 鈥?`ro.boot.qemu.avd_name=main` | `adb shell getprop ro.boot.qemu.avd_name` |
| running device | `emulator-5554  device` | `adb devices` |
| Android version / SDK | 16 / API 36 | `adb shell getprop ro.build.version.release` / `.sdk` |
| device model | `sdk_gphone64_x86_64` | `adb shell getprop ro.product.model` |
| WebView provider | `com.google.android.webview` version `133.0.6943.137` (targetSdk 34) | `adb shell dumpsys webviewupdate` |
| GPU / graphics mode | **SwiftShader software** 鈥?`OpenGL ES 3.0 SwiftShader 4.0.0.1` (GLES 3.0 max), Vulkan present | `adb shell dumpsys SurfaceFlinger` (GLES section) |
| HW UI renderer | `skiagl` (hwui), GLES version 196608 = ES 3.0 | `adb shell getprop debug.hwui.renderer` / `ro.boot.opengles.version` |
| app hardwareAccelerated | not set (defaults true on modern targetSdk); no explicit config in `apps/mobile/app.json` | file inspection |

Route note: WebView 133 with SwiftShader GLES 3.0 is a plausible Route-A (WebView/WebGL) target; R2 had recorded "emulator WebGL unavailable" 鈥?this will be re-diagnosed empirically this round (see `ANDROID_3D_RUNTIME_DIAGNOSIS.md`).

## 4. Host toolchain

| Fact | Value | Command evidence |
|---|---|---|
| Node | `v22.15.0` | `node --version` |
| pnpm | `12.4.1` | `pnpm --version` |
| Python (system) | `Python 3.13.14` | `python --version` |
| Python venv | `.venv\Scripts\python.exe` exists, Python 3.13.14 | `Test-Path` + version |
| Java | Temurin OpenJDK `21.0.12.1` LTS | `java -version` |
| gh (GitHub CLI) | `2.96.0`, authenticated as `huangdi97`, scopes include repo+workflow | `gh --version` / `gh auth status` |
| node_modules (webroot) | present | `Test-Path` |
| packages/visual-contract dist | `dist/index.js` present | `Test-Path` |
| packages/pet-3d dist | `dist/index.js` present | `Test-Path` |
| `.local/` gitignored | yes (`.gitignore` line 56) | file inspection |

## 5. Round-2 state (what R3 is building on)

- `docs/blind-ui/BLIND_UI_FINAL_REPORT.md` 鈥?R2 blind UI closure (21/21 web + 21/21 android machine PASS, but android PASS was achieved without real 3D; see 搂4 honest limits in that report).
- Known R2 false-positives targeted by R3 (from the master goal 搂0):
  1. `unlessPlatform:["android"]` skipped ready/no-fallback in hero contracts.
  2. Android extractor built an honest fallback manifest that still satisfied runtime-truth checks.
  3. Life View rotation gate checked a button, not yaw A/B.
  4. Twin Review "not_like 鈫?activate disabled" could be satisfied by injected state.
  5. Android surface detector depended on `e.type`, which the android extractor never emits.
  6. Pixel Oracle recorded near-identical candidates without blocking.
  7. Generic demo 3D (corgi) could pass as final Individual Twin.

## 6. Scope commitments for this round (from approved goal)

- NO_VISION_MODEL_USED = TRUE (no VLM/OCR/aesthetic model for UI acceptance).
- Local-first: no clone, no repo-outside worktrees, no global installs, no new AVD.
- Agent-owned repo-outside writes = 0; logs to `<REPO_ROOT>\.local\logs\`.
- Fixed order: Preflight 鈫?Blind Contract V2 鈫?Android 3D 鈫?Individual Twin 鈫?Hero 4 鈫?Secondary 鈫?regression 鈫?candidate screenshots 鈫?CI 鈫?final report.
- HUMAN_VISUAL_ACCEPTANCE stays PENDING until the user reviews contact sheets.