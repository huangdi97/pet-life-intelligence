# GIT_REMOTE_HANDOFF

## 状态（Stage R 完成，2026-09-24）

```text
REMOTE_CONNECTED: https://github.com/huangdi97/pet-life-intelligence (public)
main + tags（v0.1.0 / v1.0.0 / v1.1.0 / v1.1.1 / v1.2.0）已推送
CI: .github/workflows/ci.yml + android.yml 已启用；Release v0.1.0 已发布
```

## 精确命令（已完成记录）

```bash
git remote add origin https://github.com/huangdi97/pet-life-intelligence.git
git push -u origin main
git push --tags
```

验证结果：

```text
git remote -v            -> origin https://github.com/huangdi97/pet-life-intelligence.git
git ls-remote origin      -> refs/heads/main + 全部 tags 可见
origin/main 与本地 main HEAD 一致（无 divergence）
```

## 后续约定

- 新代码直接 push 到 `main`（或按 CONTRIBUTING.md 开 PR 分支），CI 自动跑后端/前端/E2E 全部门禁。
- 打版本：`git tag vX.Y.Z` → `git push origin vX.Y.Z` → `android.yml` 自动构建 Android APK 与 Web standalone 产物。
- 发布：`gh release create <tag> <assets>`（见 `reports/STAGE_R_RELEASE_REPORT.md` E 节）。
- 仓库内不含真实 secret：`.env*`（非 example）与 keystore 均保持 untracked（.gitignore 已覆盖）。

## 注意

- push 前复查：`git ls-files | findstr /i "secret key password .env"`（取值文件仅 `*.example`）。
- 公开仓库元数据已就绪：`LICENSE`（MIT）、`SECURITY.md`、`CONTRIBUTING.md`、`AGENTS.md`。