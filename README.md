# Pet Life Intelligence

当前仓库是 v0.1 bootstrap。

先读：
1. `00_START_HERE.md`
2. `GOAL_今晚从零到v0.1_RELEASE.md`
3. `AGENTS.md`

## Windows quick bootstrap

```powershell
cd "E:\AI\Pet Life Intelligence"
.\scripts\bootstrap.ps1
```

然后让 AI 编码 Agent 按 `START_PROMPT_直接粘贴给Agent.txt` 连续执行。

## Bootstrap 存活测试

```powershell
docker compose up -d

python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e "services/api[dev]"
python -m pytest services/api/tests -q

corepack enable
pnpm install
pnpm --dir apps/web typecheck
pnpm --dir apps/web build
```

API：
```powershell
cd services\api
..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Web：
```powershell
pnpm --dir apps/web dev
```

> bootstrap 页不是 v0.1 完成版。真正范围见 GOAL 和 50 P0。
