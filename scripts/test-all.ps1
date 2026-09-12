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

Run-Step "ruff (python lint)" ".\.venv\Scripts\python.exe -m ruff check services/api services/worker packages/rules services/ai-gateway"
Run-Step "pytest (unit+integration+contract+safety+ai-evals+e2e)" ".\.venv\Scripts\python.exe -m pytest -q"
Run-Step "web typecheck" "pnpm --dir apps/web typecheck"
Run-Step "web build" "pnpm --dir apps/web build"

if ($failed -ne 0) {
    exit 1
}
Write-Host "All configured checks passed."
