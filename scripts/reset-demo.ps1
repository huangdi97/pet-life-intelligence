# Reset + reseed demo data (dev only). Drops ALL rows in the dev database.
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host "== PLI demo reset (dev only) =="
Push-Location services\api
..\..\.venv\Scripts\python.exe -m app.seed
Pop-Location
Write-Host "Demo data reseeded: Demo Family / Coco (dog) / Mimi (cat)"
Write-Host "Login at http://localhost:3100/login with owner@pli.demo"
