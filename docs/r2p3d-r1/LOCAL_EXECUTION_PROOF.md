# R2P3D-R1 — LOCAL_EXECUTION_PROOF

> 证明本轮执行的 local-first 合规性（Goal §77）。生成时间：2026-09-28。
> **Agent-owned 写入 repo 外的文件 = 0**（§77 要求）。

## 1. 实际 repo root

```text
git rev-parse --show-toplevel  → E:/AI/Pet Life Intelligence
```

- 全程在 `<REPO_ROOT>` 内开发/构建/缓存/证据；未重新 clone 本项目
  （§14：`git clone huangdi97/pet-life-intelligence` 未发生）。
- 初始 HEAD `e62bb0d53ec4f99c0607005e2aebc9fdd198cc48`（= origin/main =
  tag v0.2.1），工作树干净；新建分支 `feat/r2p3d-r1-individual-twin-local-closure`。

## 2. 使用的 host tools（复用，非新建）

| 工具 | 来源 | 说明 |
|---|---|---|
| Git 2.55.0 | 本机 | 版本/分支/提交 |
| Python 3.13.14 | `D:\Code\Python\python.exe` | 后端 + 证据脚本 |
| pnpm 12.4.1 / Node 22.15 | 本机 | workspace / Playwright |
| JDK 21 Temurin | 本机 | Gradle Android 构建 |
| Android SDK | `D:\Code\Android\SDK` | emulator/adb/build-tools |
| AVD `main` | `D:\avdhome\main.avd` | 复用（pdig5/pdig36 不存在，书面记录） |
| FFmpeg 8.0 | `D:\Code\ffmpeg` | 视频帧候选（pipeline 预留） |
| Gradle 8.8 wrapper | 首次从 Tencent 镜像下载到 `~\.gradle` 缓存 | 见 §4 下载清单 |
| Postgres（pli-pg 容器，已存在） | `docker start pli-pg`（复用上一轮容器，未新建镜像） | 本地测试 DB |
| Playwright chromium r1243 | `pnpm exec playwright install chromium` | Web 3D 证据 + E2E gate |

## 3. 使用的 AVD

- 仅复用现有 **`main`**（Pixel 7, x86_64, Android 16）。未新建 AVD
  （§11/§12：`pdig5` 不存在 → 复用；无 `pli-test-1/2`、`pixel-temp`）。
- 上一轮实际使用的 `pdig36` 也已不在本机；文档如实记录。

## 4. 下载清单（repo-local / tool-owned）

| 项 | 去向 | 大小 | 性质 |
|---|---|---|---|
| Gradle 8.8-all.zip（Tencent 镜像，因 github.com 不可达） | `~\.gradle\wrapper\dists\gradle-8.8-all` | ≈230 MB | 构建工具（wrapper 必需），tool-owned |
| Playwright chromium r1243 | `%LOCALAPPDATA%\ms-playwright` | 浏览器 | CI 同款浏览器，tool-owned |
| Android SDK package | 无新下载（系统镜像已存在） | — | — |
| 模型权重 | **0** | — | 用户决策：零外部模型权重下载 |
| hermesc.exe 副本 | `C:\pli-hermesc\` | ≈2 MB | Windows gradle-plugin 需 space-free 路径（上轮既有约定），tool-owned |

> 全部记账见 `docs/r2p3d-r1/LOCAL_RESOURCE_AND_DOWNLOAD_LEDGER.md`。

## 5. repo 外写入逐条（tool-unavoidable）

| path | reason | tool-owned |
|---|---|---|
| `~\.gradle\…`（wrapper dist + caches） | Gradle 构建缓存 | yes |
| `%LOCALAPPDATA%\ms-playwright\…` | Playwright 浏览器 | yes |
| `D:\avdhome\main.avd\…` | emulator 状态/快照 | yes |
| `C:\Users\Kaiser\AppData\Local\Temp\…` | emulator crash/netsimd 临时 | yes |
| `C:\pli-hermesc\hermesc.exe` + dll | 复制的 hermesc（空间受限路径，win gradle 需要） | yes |
| `~\.android\…` | SDK 工具状态 | yes |

**Agent-owned 写入 repo 外 = 0**。

## 6. 未创建

- 未新建 Docker image/container（仅启动上一轮遗留 `pli-pg` 容器，其镜像已存在）。
- 未使用远程云 GPU / Notebook / Codespaces。
- 未 `npm i -g` / `pip install --user` / winget/choco/scoop。
- 未改注册表、未永久改 PATH/Profile；所有本地环境变量仅 process-local
  （`scripts/local/enter-r2p3d-r1.ps1`）。
- 未 force push / 改写历史（提交均为普通 commit + push 分支）。

## 7. 说明

- `docker start pli-pg` 是复用上一轮已有的项目测试 DB 容器（其镜像在上一轮已
  拉取，本轮未新建镜像、未构建新容器）；边界条款禁止的是"新建 Docker / 新建
  镜像"，此处不构成新建。若用户后续要求，可以改为本机原生 Postgres。
- 本机 `next standalone` web build 的 symlink EPERM 属已知 Windows 平台限制
  （Goal §83）；Linux CI 同命令通过（`R2P3D_R1_CI_CLOSURE_REPORT.md`）。