$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host "Starting local dependencies..."
docker compose up -d

Write-Host "Starting API and Web in separate PowerShell windows..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\services\api'; ..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; pnpm --dir apps/web dev"

Write-Host "API: http://localhost:8000/docs"
Write-Host "Web: http://localhost:3000"
