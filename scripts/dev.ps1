$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host "== PLI dev environment (ports shifted: API 8800, Web 3100, PG 55432, Redis 56379, MinIO 59000) =="

docker compose up -d

if (-not (Test-Path ".venv")) {
    python -m venv .venv
    .\.venv\Scripts\python.exe -m pip install -q -e "services/api[dev]" -e "packages/rules" -e "services/ai-gateway"
}

if (-not (Test-Path "node_modules")) {
    pnpm install
}

# migrate + seed (idempotent)
Push-Location services\api
..\..\.venv\Scripts\python.exe -m alembic upgrade head
..\..\.venv\Scripts\python.exe -m app.seed
Pop-Location

Write-Host "Starting API (8800), Web (3100) and worker in separate windows..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\services\api'; ..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8800"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\apps\web'; pnpm dev -p 3100"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; .\.venv\Scripts\python.exe services\worker\main.py --loop 60"

Write-Host ""
Write-Host "API  : http://localhost:8800/docs"
Write-Host "Web  : http://localhost:3100"
Write-Host "Login: owner@pli.demo / family@pli.demo / sitter@pli.demo (dev mode)"
