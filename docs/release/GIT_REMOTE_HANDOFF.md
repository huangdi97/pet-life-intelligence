# GIT_REMOTE_HANDOFF

## 状态

```
REMOTE_PUSH_READY  （仓库已就绪，等待 remote URL）
EXTERNAL_BLOCKED_REMOTE_URL
```

本仓库无远端（`git remote -v` 为空）。代码已完整提交并打 tag，但缺少远端用于 push/协作/CI 触发。

## 需要的外部信息

一个 GitHub / GitLab / Gitee 仓库 URL（HTTPS 或 SSH 均可），例如：

```text
https://github.com/<org>/pet-life-intelligence.git
git@github.com:<org>/pet-life-intelligence.git
```

## 精确命令（拿到 URL 后执行）

```bash
git remote add origin <REMOTE_URL>
git push -u origin main
git push --tags
```

确认：

```bash
git remote -v
git fetch origin
git log --oneline origin/main -5   # 确认无意外 divergence
```

## 注意

- 仓库内含 `.env.*.example` 模板，但**不含任何真实 secret**；push 前可复查：
  ```bash
  git ls-files | findstr /i "secret key password .env"
  ```
- 已有 tag `v1.0.0`、`v1.1.0`；`git push --tags` 会一并同步。
- CI 定义 `.github/workflows/ci.yml` 将在 push 后自动运行全部门禁。