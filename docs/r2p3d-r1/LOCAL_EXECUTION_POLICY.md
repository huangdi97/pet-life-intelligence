# R2P3D-R1 — Local Execution Policy

> Binding execution policy for this round, derived from the Goal document
> (R2P3D-R1 §2–§15) and the user approvals captured in the goal contract
> (2026-09-28): full Phase 0–8 closure; demo-only media; **zero external
> model weight downloads**.

## 1. Workspace (唯一工作空间)

- The **only** workspace is `<REPO_ROOT> = E:\AI\Pet Life Intelligence`
  (verified via `git rev-parse --show-toplevel`).
- All project reads/writes/generation/downloads/caches/temp/evidence live inside
  `<REPO_ROOT>`; runtime artifacts go to `<REPO_ROOT>\.local\` (gitignored).
- Prohibited scatter points: Desktop / Downloads / Documents / `C:\temp` / user home
  subdirs / other repos / other disks / cloud scratch spaces.

## 2. Allowed access outside the repo (limited)

1. **READ-ONLY host discovery** — PATH, env vars, installed tool locations,
   Android SDK path, AVD list, GPU/CUDA state, tool versions
   (`scripts/local/doctor-r2p3d-r1.ps1`).
2. **Launching existing host tools** — Android Emulator (+ its own AVD snapshot
   state under `ANDROID_AVD_HOME=D:\avdhome` or SDK tool caches), `adb`,
   browser, python/conda, java, android sdk, ffmpeg, gradle caches
   (tool-owned, unavoidable state is permissible and recorded).
3. Project output, downloads, screenshots, scripts, third-party sources must
   NOT be written outside the repo by the agent (tool-unavoidable exceptions
   listed in `LOCAL_EXECUTION_PROOF.md`).

## 3. Forbidden execution methods (unless user re-authorizes)

- Docker / new images; remote cloud GPU; cloud notebooks; remote agent computer;
  GitHub Codespaces; new WSL install; new VMs; new Android SDK copy; re-clone of
  this repo elsewhere; npm -g; pip --user; system-level Python installs;
  winget/choco/scoop global installs; registry edits; permanent PATH changes;
  editing code directly on GitHub web; force push.
- If a local-native Windows run is impossible for a research model: record
  `LOCAL_BLOCKER`; do not jump to the cloud.

## 4. Download policy — this round is ZERO model downloads (user decision)

- **No external model weights are downloaded this round** (explicit user choice).
  SPAR3D / SF3D / Hunyuan3D-2.1 / TRELLIS.2 / SAM2 / BITE etc. that would need
  new weights are marked `NOT_AVAILABLE` (policy) or `SKIP_BY_CAPABILITY` /
  `BLOCKED_BY_LICENSE` in the provider research/benchmark docs, and their
  interfaces/fallbacks/contract tests are still completed.
- Order of preference for any resource: 1) repo has it → 2) machine already
  installed → 3) machine cache → 4) SDK/AVD/model present → 5) repo-local new
  isolated tooling → 6) repo-local minimal download. This round stops at 4/5:
  no model weights are fetched from the internet at all.
- Any unavoidable non-weight download (e.g. a tiny npm dev tool already declared
  in the workspace) must be ledgered in `LOCAL_RESOURCE_AND_DOWNLOAD_LEDGER.md`
  and be `< 500 MB` automatically, or be `500 MB–5 GB` only after proving it is
  the minimal path; `>5 GB` is never automatic (`LARGE_DOWNLOAD_REQUIRES_HUMAN_APPROVAL`).

## 5. Blender rule

- `where blender` → NOT_FOUND on this machine. First evaluate completion of
  rig/animation/GLB with the existing three.js/pet-3d runtime.
- Only if Blender proves to be the minimal necessary tool: download a **portable**
  Blender into `<REPO_ROOT>\.local\tools\blender\` (no system install), ledgered.
  No Blender download is planned this round.

## 6. Android emulator rule

- Reuse existing AVD **`main`** (Pixel 7, x86_64, 1080x2400@420, 2 GB) —
  `pdig5` does not exist on this machine (documented).
- New AVD only after a written `WHY_EXISTING_AVD_CANNOT_BE_USED`; data path would
  be `<REPO_ROOT>\.local\avd\` when possible; SDK metadata exception if forced is
  recorded (existing `ANDROID_AVD_HOME=D:\avdhome` is reused as-is).
- No new SDK packages unless a required build-tools/platform/system-image is
  genuinely missing; then minimal `sdkmanager` package + ledger.

## 7. Credentials

- No HF token / GitHub token / API key / password written into tracked files.
- Gated providers: use existing environment credentials or record `AUTH_REQUIRED`.

## 8. Process-local environment only

- `scripts/local/enter-r2p3d-r1.ps1` sets HF/PIP/TORCH/TEMP/TMP/GRADLE
  (when needed) into `<REPO_ROOT>\.local\` for the current PowerShell process.
  No user/system env, no registry, no profile changes.
- Existing Gradle caches are reused (user-level) to avoid duplicate downloads.

## 9. Git policy

- Branch `feat/r2p3d-r1-individual-twin-local-closure` (created from the current
  main). No force push / history rewrite / rebase of shared history / merge commits.
- Push branch to origin; main closure only via fast-forward after full local gates
  and a `STOP_AND_RECONCILE` check if origin/main advanced. GitHub is remote+CI+Release
  only — never a development surface.

## 10. Verification of compliance

- `LOCAL_EXECUTION_PROOF.md` (final) lists every tool-unavoidable external write
  (path/reason/tool-owned or agent-owned); agent-owned outside-repo writes must
  be **0**.

## 11. Honesty gates (unchanged)

- REAL_PETS = 0 → `REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED`.
- No demo/synthetic media claimed as real-pet validation.
- `HUMAN_VISUAL_ACCEPTANCE` stays `PENDING` until the user signs.
- Tests are not weakened/removed to make CI green; blocked items are reported as
  `NOT_RUN` / `NOT_AVAILABLE` rather than guessed.