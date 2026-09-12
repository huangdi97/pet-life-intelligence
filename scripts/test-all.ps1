$ErrorActionPreference = "Continue"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$failed = 0

function Run-Step($name, $command) {
    Write-Host ""
    Write-Host "== $name =="
    Invoke-Expression $command
    if ($LASTEXITCODE -ne 0) {
        Write-Error "$name FAILED with exit code $LASTEXITCODE"
        $script:failed = 1
    }
}

Run-Step "API ruff" ".\.venv\Scripts\python.exe -m ruff check services/api"
Run-Step "API pytest" ".\.venv\Scripts\python.exe -m pytest services/api/tests -q"
Run-Step "Web typecheck" "pnpm --dir apps/web typecheck"
Run-Step "Web build" "pnpm --dir apps/web build"

if ($failed -ne 0) {
    exit 1
}
Write-Host "All configured checks passed."
