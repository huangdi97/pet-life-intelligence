# PLI R5.6 — AUTONOMOUS EXECUTION CHECKPOINT

> Round log for the autonomous local execution, including the environment obstacles that
> were solved, the exact recovery commands, and what is still open. Written by the agent for
> the next agent or for the owner.
>
> Branch: `feat/r2p3d-r3-render-truth-ui-closure` · Head at the time of writing:
> `3aacdf6cfabd105f18b9197ce65d8981a15a48f4` · `HUMAN_VISUAL_ACCEPTANCE = PENDING` ·
> `NO_VISION_MODEL_USED = TRUE`.

## 1. Round timeline (all times UTC)

| Time | Step | Outcome |
| --- | --- | --- |
| 16:18 | Phase A: read remote facts (`ls-remote`, PR #2, 30 runs, artifacts) | remote head `6738f3c`, local 7 days stale, PR OPEN, `main` untouched, 1 failing job |
| 16:20 | Fast-forward local to `6738f3c`; no destructive git command used | clean tree + untracked GOAL md preserved |
| 16:23 | Pulled the failing job's log and diagnostics artifact | 0-byte `ui.xml` + truncated logcat ⇒ emulator stall |
| 16:30–17:00 | Local infrastructure bring-up (see §2) | demo stack reachable from Windows through an SSH reverse tunnel |
| 19:35 | First local APK build attempt (repo path with spaces) | failed: expo-av CMake "still dirty after 100 tries" |
| 20:15 | JDK 17 toolchain wiring | Gradle could compile Kotlin again |
| 20:43 | Second build attempt (x86_64 only, original path) | failed: same ninja instability |
| 21:16 | Fix implemented + regression tests written | blind-ui 186 passed, ruff clean |
| 21:2x | Commit `a03295c7` pushed | Android workflow succeeded, **runtime evidence job green** |
| 21:50 | CI round 2 failure triage (backend v10 test) | time-window test defect, not a regression |
| 22:0x | Commit `3aacdf6c` pushed | all three workflows green; APK + evidence artifacts verified |
| 22:17 | Local gate suite re-run (12 gates) | all PASS |
| 22:02→ | Space-free copy build `C:\plibuild` | in progress; §4 |

## 2. Local environment obstacles and the working solutions

None of these touch the repository; all are host-side and reversible.

| Obstacle | Root cause found | Solution used |
| --- | --- | --- |
| Background processes died whenever a tool call ended | the automation host reaps the shell's process tree | launch long-lived work as a **Windows scheduled task** (`schtasks /create … /run`), which survives the shell |
| Docker Desktop engine repeatedly disappeared | it was started as a child of the reaped shell | start it through a scheduled task (`PLI_DockerDesktop`); engine then stayed up |
| `docker compose up` could not bind 55432/56379 | WSL2 `networkingMode=mirrored` shares the host port space with the WSL side | re-publish Redis on a free port (`PLI_REDIS_PORT=56381`, the documented override) |
| Windows could not reach anything listening **inside** WSL/containers (timeouts, not refusals) | Hyper-V firewall for mirrored WSL is `DefaultInboundAction=Block` | **SSH reverse tunnel**: WSL can reach the Windows sshd, so `ssh -R 15532/16381/19000` exposes the data services to Windows (task `PLI_SshTunnel`) |
| Gradle: "No matching toolchain … languageVersion=17" | Expo's settings plugin needs JDK 17; host `JAVA_HOME` is 21 and remote toolchain provisioning is unreachable | installed Temurin 17 at `C:\pli-jdk17-real` and set `JAVA_HOME` (plus the gitignored `apps/mobile/android/gradle.properties`) |
| Gradle wrapper download aborted mid-redirect | flaky network to `services.gradle.org` | pre-seeded `gradle-8.8-all.zip` into `~/.gradle/wrapper/dists/...` + unzip + `.ok` marker |
| `ninja: manifest 'build.ninja' still dirty after 100 tries` (expo-av) | project path contains spaces | build from a **space-free copy** of the source |
| Junction `C:\plirepo` fixed CMake but broke bundling | pnpm/Node resolve the physical path → "different roots" | used a real copy instead of a junction |

Recovery commands (run one after another to rebuild the whole local evidence stack):

```powershell
# 1. data services (WSL-side containers) + bridge to Windows
schtasks /run /tn "PLI_DockerDesktop"
$env:PLI_REDIS_PORT='56381'; $env:PLI_PG_PORT='55432'
docker compose up -d postgres redis minio
schtasks /run /tn "PLI_SshTunnel"          # ssh -R 15532/16381/19000 kaiser@127.0.0.1
# 2. demo backend
. $env:PI_SCRATCH_DIR\pli-env.ps1          # DATABASE_URL → localhost:15532, REDIS → 16381
cd services/api; ..\..\.venv\Scripts\python.exe -m alembic upgrade head
..\..\.venv\Scripts\python.exe -m app.seed   # prints SEED_OK + the seeded ids
# 3. API + Metro
schtasks /run /tn "PLI_Api"                # uvicorn 0.0.0.0:8800
schtasks /run /tn "PLI_Metro"              # expo start --port 8081
# 4. emulator
schtasks /run /tn "PLI_Emulator"           # pli_pixel_api36, port 5554, -no-window
adb -s emulator-5554 wait-for-device; adb -s emulator-5554 shell getprop sys.boot_completed
# 5. APK (space-free copy avoids the CMake/ninja path bug)
schtasks /run /tn "PLI_ApkBuildCopy"       # C:\plibuild, x86_64, sample-free JDK 17 toolchain
```

## 3. Safety / boundary compliance in this round

| Boundary | Status |
| --- | --- |
| Only `feat/r2p3d-r3-render-truth-ui-closure` pushed to; always fast-forward | ✅ two pushes, `6738f3c` remains an ancestor |
| PR #2 not merged; `main` untouched; no tag/release created | ✅ verified after every push |
| No force push, no history rewrite, no destructive git command | ✅ |
| No visual baseline updated; no `--update-snapshots` | ✅ |
| No test deleted/skipped; no gate relaxed to get green | ✅ diff limited to one script + one new test file + one test fix |
| No secrets/PII committed; no giant binaries committed | ✅ APK/screenshots stay in Actions artifacts |
| Production data untouched (local demo containers only) | ✅ |
| Physical phone untouched (none authorised) | ✅ `REAL_DEVICE_QA_PENDING_USER` |
| Vision model never used for acceptance | ✅ `NO_VISION_MODEL_USED = TRUE` |
| Owner-only decisions left to the owner | ✅ `HUMAN_VISUAL_ACCEPTANCE = PENDING` |

## 4. Open items at checkpoint time

1. **Local Windows debug APK build** (`C:\plibuild`, space-free copy): running at checkpoint
   time. If it completes, the local emulator run adds an independent install/launch/screenshot
   set for this SHA; if it does not, the honest status and the exported failure reasons live
   in `ANDROID_RUNTIME_EVIDENCE.md` §4 — the canonical evidence for this SHA is the hosted
   job, which already passed.
2. **Today first-screen capture completeness** (`LIVING_CANVAS_GAP_MATRIX.md` §10.1, P2).
3. **Mini native screenshots** — `EXTERNAL_BLOCKED`.
4. **Real individual 3D asset** — `BLOCKED_BY_SOURCE_ASSET`.
5. **Owner visual review + physical-device review** — `HUMAN_VISUAL_ACCEPTANCE = PENDING`,
   `REAL_DEVICE_HUMAN_REVIEW = PENDING`.

## 5. Exact resume commands

```powershell
cd 'E:\AI\Pet Life Intelligence'
git fetch origin --prune
git status -sb                                   # expect: only the GOAL md untracked
gh pr view 2 --repo huangdi97/pet-life-intelligence --json state,headRefOid,mergedAt
gh run list --repo huangdi97/pet-life-intelligence --branch feat/r2p3d-r3-render-truth-ui-closure `
  --limit 6 --json workflowName,headSha,status,conclusion,url
```

Then continue with §2 to rebuild the local stack before capturing anything new.
