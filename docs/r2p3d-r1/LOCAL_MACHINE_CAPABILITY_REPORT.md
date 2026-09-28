# R2P3D-R1 — Local Machine Capability Report

> Captured 2026-09-28 on the local host via `scripts/local/doctor-r2p3d-r1.ps1`
> (read-only discovery; output at `.local/logs/doctor-r2p3d-r1.txt`).
> Purpose: know what this machine already provides before deciding what (if
> anything) must be downloaded — R2P3D-R1 policy is "能不下就不下".

## 1. Repository

- Git version: `2.55.0.windows.5`
- Repo root: `E:/AI/Pet Life Intelligence` (`git rev-parse --show-toplevel`)
- Branch: `feat/r2p3d-r1-individual-twin-local-closure`
- HEAD: `e62bb0d53ec4f99c0607005e2aebc9fdd198cc48`
- Working tree: clean except new R2P3D-R1 scaffolding (`.local/`, `scripts/local/`, the goal artifact)

## 2. GPU / CUDA

- GPU: `NVIDIA GeForce RTX 4060 Ti`, **16380 MiB** total VRAM (16 GB class)
- Driver: `591.86`
- `nvcc`: PRESENT (`CUDA_PATH=D:\Code\CUDA`, CUDA 13.2 environment variable present)
- Consequence: 16 GB VRAM machine. TRELLIS.2 (>24 GB) is out of scope by hardware;
  Hunyuan3D-2.1 full Shape+Texture (~29 GB) is out; SPAR3D default (~10.5 GB) would
  be borderline but is NOT downloaded this round by explicit user policy (zero model downloads).

## 3. Python

- Active default: Python **3.13.14** at `D:\Code\Python\python.exe`
- `py` launcher also sees: Astral/CPython 3.12.9, 3.11.15 (uv managed)
- `conda`: PRESENT (env list probe skipped to avoid hang; presence confirmed)
- Repo venv: `.venv/` exists in repo root (gitignored) — reused for backend tests.

## 4. Node / pnpm

- Node: `v22.15.0`
- pnpm: `12.4.1`
- npm: `11.3.0`
- Repo is a pnpm workspace (root `pnpm-workspace.yaml`); node_modules already installed.

## 5. Java

- OpenJDK `21.0.12.1` LTS (Temurin), `JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot\`

## 6. Android

- ANDROID_HOME / ANDROID_SDK_ROOT = `D:\Code\Android\SDK` (exists; emulator + platform-tools + system-images present)
- ANDROID_AVD_HOME = `D:\avdhome`
- AVDs available: **`main`** (Pixel 7 profile, 1080x2400 @ 420dpi, x86_64, 2 GB RAM, 4 cores, GPU disabled by config) and `zhishen_rc` (Pixel 7, 1536 MB)
- `adb devices -l`: no device currently connected — emulator must be launched.
- `pdig5` from the Goal document does not exist on this machine; `main` is reused instead
  (documented exception, R2P3D-R1 §11).
- System images directory present — no new SDK downloads expected.

## 7. Blender / FFmpeg / CMake / MSVC

- Blender: **NOT_FOUND** (no system install; no download unless strictly necessary)
- FFmpeg: `8.0` full build at `D:\Code\ffmpeg\ffmpeg-8.0\bin\ffmpeg.exe` (gyan.dev build, GPL)
- CMake: `4.4.0`
- MSVC `cl`: PRESENT (version probe skipped to avoid hang)

## 8. Relevant environment (redacted)

```
ANDROID_AVD_HOME=D:\avdhome
ANDROID_HOME=D:\Code\Android\SDK
ANDROID_SDK_ROOT=D:\Code\Android\SDK
CUDA_PATH=D:\Code\CUDA
CUDA_PATH_V13_2=D:\Code\CUDA
HF_HOME=E:\huggingface
JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot\
PYTHON_INCLUDE=E:\ComfyUI_windows_portable\python_embeded\Include
PYTHON_LIB=E:\ComfyUI_windows_portable\python_embeded\Lib
```

> Note: `HF_HOME=E:\huggingface` pre-exists outside the repo. R2P3D-R1 policy
> redirects HF caches into `<REPO_ROOT>\.local\cache\huggingface` **for this
> process only** via `scripts/local/enter-r2p3d-r1.ps1`; we do not rely on or
> seed that external HF home, and no new model downloads happen this round.

## 9. Implications for the round

| Need | Machine answer |
| --- | --- |
| Backend (FastAPI) tests | Python 3.13 + repo `.venv` |
| Gradle Android build | JDK 21 + existing SDK + existing Gradle caches |
| Emulator evidence | existing AVD `main` (PIXEL 7, x86_64) |
| Video frame extraction (optional demo) | FFmpeg 8.0 present |
| 3D geometry editing | no Blender — procedural template/rig via three.js/pet-3d instead |
| Heavy generative 3D (SPAR3D/SF3D/Hunyuan/TRELLIS) | not downloaded (user policy); recorded NOT_AVAILABLE / SKIP_BY_* in provider research |
| Segmentation (SAM2) | not downloaded (user policy); deterministic/heuristic path + provider interface |

No new software was installed to produce this report.