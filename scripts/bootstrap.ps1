$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "== Pet Life Intelligence bootstrap =="

function Show-Version($name, $cmd) {
    try {
        $out = & $cmd[0] $cmd[1..($cmd.Length-1)] 2>&1
        Write-Host "$name: $out"
    } catch {
        Write-Warning "$name not available"
    }
}

git --version
python --version
node --version
try { pnpm --version } catch { Write-Warning "pnpm missing. Install with: corepack enable" }
docker --version

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example"
}

Write-Host ""
Write-Host "Next:"
Write-Host "  docker compose up -d"
Write-Host "  python -m venv .venv"
Write-Host "  .\.venv\Scripts\Activate.ps1"
Write-Host "  pip install -e 'services/api[dev]'"
Write-Host "  corepack enable"
Write-Host "  pnpm install"
