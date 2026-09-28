# R2P3D-R1 — Local Resource & Download Ledger

> One place that records every resource added during this round: downloads,
> new caches, new tooling, new AVD/SDK packages, model weights.
> Policy: **zero external model weight downloads this round** (user decision).
> Rule: `>5 GB` is never automatic (LARGE_DOWNLOAD_REQUIRES_HUMAN_APPROVAL);
> `500 MB–5 GB` only after proving it is the minimal necessary path; `<500 MB`
> only when truly needed — each entry below explains the need.

## 0. Summary

- **External model weights downloaded: 0** (policy: none allowed this round).
- AVDs created: 0 (reused existing `main` / `zhishen_rc`).
- Android SDK packages installed: 0.
- System-wide installs: 0.
- Blender/portable tooling downloads: 0 (existing runtime covers rig/GLB).

## 1. Resource ledger

| # | name | version | source | reason | size | license | target_path | why existing insufficient | committed |
| - | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| (none yet) | | | | | | | | | |

## 2. Provider weight status (for traceability — NOT downloaded)

| Provider | weights needed | status this round | reason |
| --- | --- | --- | --- |
| SAM2 | segmentation checkpoints | `SKIP_BY_POLICY` (no download) | user zero-download decision; deterministic/heuristic segmentation + provider interface instead |
| SPAR3D | ~several GB checkpoint | `SKIP_BY_POLICY` (no download) | user zero-download decision; documented as candidate for future local preview |
| SF3D | several GB checkpoint | `SKIP_BY_POLICY` (no download) | user zero-download decision; license audit records Community License conditions |
| Hunyuan3D 2.1 | 10–29 GB total | `SKIP_BY_POLICY` + `SKIP_BY_HARDWARE` (16 GB VRAM) | user zero-download decision; no license-safe path this round |
| TRELLIS.2 | large | `SKIP_BY_HARDWARE` (needs >=24 GB VRAM) + `SKIP_BY_POLICY` | machine 16 GB VRAM; user zero-download decision |
| BITE / SMAL / AnimalAvatar | weights + external data | `SKIP_BY_POLICY` + `BLOCKED_BY_LICENSE` (research-only) | non-commercial research license; method reference only |
| DeepLabCut | SuperAnimal models | `RESEARCH_ONLY` | research-use restrictions; not a production dependency |

## 3. Mirrors / caches that will be reused (already present, no download)

| resource | location | note |
| --- | --- | --- |
| Python 3.13 | `D:\Code\Python\python.exe` | active interpreter |
| Repo venv | `<REPO_ROOT>\.venv` | backend env |
| pnpm node_modules | `<REPO_ROOT>\node_modules` | workspace deps |
| Android SDK | `D:\Code\Android\SDK` | emulator + platforms + system-images |
| AVD `main` | `D:\avdhome\main.avd` | Pixel 7 x86_64 |
| Gradle cache | user `~\.gradle` | reused to avoid re-downloads |
| FFmpeg 8.0 | `D:\Code\ffmpeg\ffmpeg-8.0\bin\ffmpeg.exe` | video demo frames if needed |
| CUDA 13.2 toolkit | `D:\Code\CUDA` | present (not required by this round's runtime) |

## 4. Tool-unavoidable external writes (recorded; not agent-owned project output)

| path | reason | tool-owned |
| --- | --- | --- |
| `D:\avdhome\main.avd\…` (snapshots/userdata) | emulator state | yes |
| `~\.gradle\…` | gradle cache (may update timestamps) | yes |
| `~\.android\…` / SDK tool caches | SDK tool state | yes |
| `D:\Code\Android\SDK\\.temp\…` | sdk/adb tooling temp | yes |

Agent-owned writes outside `<REPO_ROOT>` = **0** (verified in `LOCAL_EXECUTION_PROOF.md`).