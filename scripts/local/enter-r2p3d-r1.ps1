# enter-r2p3d-r1.ps1 — R2P3D-R1 LOCAL-FIRST process environment.
#
# Sets repository-local directories for caches/temp for THIS PowerShell
# process only. Nothing here is persisted to the user profile, HKCU/HKLM,
# PowerShell profile, or system/user environment variables (R2P3D-R1 §7/§8).
#
# Usage:
#   . .\scripts\local\enter-r2p3d-r1.ps1
#   (dot-source so the environment is applied to the current session)

$ErrorActionPreference = "Stop"

# Resolve the repository root from this script's location (repo/scripts/local/).
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

$localRoot = Join-Path $repoRoot ".local"

function Ensure-Dir([string]$Path) {
    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Force -Path $Path | Out-Null
    }
}

Ensure-Dir (Join-Path $localRoot "cache")
Ensure-Dir (Join-Path $localRoot "cache\huggingface")
Ensure-Dir (Join-Path $localRoot "cache\pip")
Ensure-Dir (Join-Path $localRoot "cache\torch")
Ensure-Dir (Join-Path $localRoot "cache\gradle")
Ensure-Dir (Join-Path $localRoot "envs")
Ensure-Dir (Join-Path $localRoot "models")
Ensure-Dir (Join-Path $localRoot "vendors")
Ensure-Dir (Join-Path $localRoot "tools")
Ensure-Dir (Join-Path $localRoot "tmp")
Ensure-Dir (Join-Path $localRoot "logs")
Ensure-Dir (Join-Path $localRoot "avd")

$env:HF_HOME = Join-Path $localRoot "cache\huggingface"
$env:HF_HUB_CACHE = Join-Path $localRoot "cache\huggingface\hub"
$env:HF_ASSETS_CACHE = Join-Path $localRoot "cache\huggingface\assets"
$env:PIP_CACHE_DIR = Join-Path $localRoot "cache\pip"
$env:TORCH_HOME = Join-Path $localRoot "cache\torch"
$env:TEMP = Join-Path $localRoot "tmp"
$env:TMP = Join-Path $localRoot "tmp"
$env:PLI_R2P3D_R1_REPO_ROOT = $repoRoot
$env:PLI_R2P3D_R1_LOCAL_ROOT = $localRoot

Write-Host "[r2p3d-r1] repo root : $repoRoot"
Write-Host "[r2p3d-r1] local root: $localRoot"
Write-Host "[r2p3d-r1] Process-local env set (HF/PIP/TORCH/TEMP -> .local). No persistent env changes."