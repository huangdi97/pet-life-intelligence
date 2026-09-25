# ANDROID EMULATOR ACCEPTANCE PREFLIGHT — Stage R.1-E

> Stage: R.1-E 路 日期：2026-09-25
> 目标：Android Emulator 真实运行 + 逐屏视觉验收 + 交互修复 + 移动端最终收口

## 1. Git Preflight（真实命令输出）

```text
git status --short     -> (clean)
git branch --show-current -> main
git rev-parse HEAD     -> e5e5825361917f7670d1f0db01995d85b153c7a9
git fetch origin       -> ok
git rev-parse origin/main -> e5e5825361917f7670d1f0db01995d85b153c7a9
```

| 项 | 值 |
|---|---|
| HEAD | `e5e5825361917f7670d1f0db01995d85b153c7a9` |
| Branch | `main` |
| Worktree | clean（无未提交改动） |
| origin/main | 与 HEAD 同步 |

约束承诺：本轮全程无 `reset --hard` / `clean -fd` / force push / 无授权 rebase / 不移动 v0.1.0 与 v0.1.1 tag。

## 2. Android 环境勘察（真实探测）

| 项 | 发现 |
|---|---|
| adb | `D:\Code\Android\SDK\platform-tools\adb.exe` v37.0.0 (1.0.41) |
| emulator | `D:\Code\Android\SDK\emulator\emulator.exe` 36.5.11.0 (gfxstream / QEMU2) |
| 加速 | `emulator -accel-check` → `WHPX(10.0.26200) is installed and usable.`；hypervisor present（Hyper-V 运行中） |
| system images | `android-34`(default/google_apis) `android-35`(google_apis_playstore) `android-36`(google_apis) x86_64 |
| AVD 候选 | `pdig36`（C:\Android\.android\avd，Pixel 5 规格）可用；`C:\Users\Kaiser\.android\avd` 下的 pdig35/pdig36 副本缺镜像不可用 |
| AVD 规格 | Google Pixel 5：1080×2340 @ 440dpi ≈ **393×851dp**（目标 ~390×844dp 量级 ✓）；API 36；x86_64；RAM 2G；hw.keyboard=yes |

## 3. 模拟器启动方案（已实测）

- `ANDROID_SDK_HOME=C:\Android`（用户环境变量）→ AVD home = `C:\Android\.android\avd`（含项目曾使用过的完整 AVD：userdata/snapshot/hardware-qemu 等）。
- 启动命令：`emulator.exe -avd pdig36 -no-window -no-snapshot -no-boot-anim -no-audio -gpu swiftshader_indirect -no-metrics`。
- 持久化：模拟器与后端均以 Windows 计划任务方式启动（`PLI_EMU2` / `PLI_API_8800`），避免工具会话清理子进程；首启全量启动约 100s，`sys.boot_completed=1` 后可用。
- 已知注意：多实例锁 `multiinstance.lock` 会在异常退出后残留，重启前需清理；`C:\Users\Kaiser\.android\avd` 的 AVD 副本（仅 config.ini，无镜像）不可直接使用。

## 4. Backend / 数据前置（真实命令输出）

```text
API bind      : uvicorn app.main:app --host 0.0.0.0 --port 8800（仓库根目录 + --app-dir services/api，.env 在根目录）
health host   : GET http://127.0.0.1:8800/api/v1/health -> 200 {"status":"ok","service":"pli-api","version":"0.1.0"}
容器           : PLI postgres 56532 / redis 56632 / minio 59000 运行中（.env DATABASE_URL=localhost:56532 匹配）
dev login     : POST /api/v1/auth/dev/login {email:owner@pli.demo} -> user_id 42356cfc-1d26-43fb-acd0-ec7d5ff1c923
pets          : 2 只（dog/Corgi/FEMALE，cat/DLH/MALE）——豆豆 / 咪咪 Demo 数据
pilot/status  : pilot_mode=false, pets_total=0, activated_owners=0, excludes=[demo,internal,synthetic_domain]
```

## 5. 待移植功能端点（真实探活，全部 200）

```text
/pets/{id}/behavior-events        OK
/pets/{id}/training-goals         OK
/pets/{id}/welfare-profile        OK
/pets/{id}/welfare-evidence       OK
/pets/{id}/social-profile         OK
/pets/{id}/friends                OK
/training/tools                   OK
/ai/status                        OK
/pets/{id}/ask (POST, mock AI)    OK
```

## 6. 本轮范围与授权

经用户确认（Goal 契约 Stage R.1-E，2026-09-25）：
1. 移动端新增 5 个既有 Web 功能移植屏：Behavior / Training / Welfare / Social / Assistant（复用既有后端路由，不新增业务域；不改 5 Tab IA）；
2. Me 页补齐开发模式登录入口（复用 `devLogin` + demo 账号），使 Login/Logout/Re-login 可真实点击；
3. 修复落地后 commit + push origin/main，并创建 tag v0.1.2 + GitHub Release（Internal/Pre-Pilot，附 emulator APK）；
4. 保持诚实状态：`ANDROID_REAL_DEVICE_QA=NOT_YET_OBSERVED`、`REAL_PARTICIPANTS=0`、`REAL_PETS=0`、`PRODUCT_VALIDATION=NOT_YET_OBSERVED`。

## 7. 前置结论

```text
ANDROID_EMULATOR_ACCEPTANCE_PREFLIGHT = READY
（模拟器 AVD 可用 + WHPX 加速可用 + 后端/数据就绪 + 目标端点可用）
```
