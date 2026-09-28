# doctor-r2p3d-r1.ps1 — READ-ONLY host capability discovery for R2P3D-R1.
#
# Discovers what the local machine already provides (git, GPU, runtimes,
# Android SDK/AVDs, tools). It never installs, downloads, writes outside
# the repo, or changes anything. Output is reflected into
# docs/r2p3d-r1/LOCAL_MACHINE_CAPABILITY_REPORT.md by the caller.
#
# PRIVACY: environment values matching secret-like names are redacted.
# SAFETY: hang-prone probes (conda env list, cl --version) are reduced to
# presence checks so the script always terminates quickly.

$ErrorActionPreference = "Continue"

function Section([string]$Title) {
    Write-Output ""
    Write-Output "=== $Title ==="
}

function Show-Command([string]$Name, [string[]]$ArgList) {
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($null -eq $cmd) { Write-Output "${Name}: NOT_FOUND"; return }
    try {
        $out = & $Name @ArgList 2>&1 | Out-String
        Write-Output "${Name}: $($out.Trim())"
    } catch {
        Write-Output "${Name}: ERROR $($_.Exception.Message)"
    }
}

function Present-Check([string]$Name) {
    if (Get-Command $Name -ErrorAction SilentlyContinue) {
        Write-Output "${Name}: PRESENT (version probe skipped to avoid hang)"
    } else {
        Write-Output "${Name}: NOT_FOUND"
    }
}

Section "Git"
git --version 2>&1
git rev-parse --show-toplevel 2>&1
git status --short 2>&1
git branch --show-current 2>&1
git rev-parse HEAD 2>&1

Section "GPU / CUDA"
$smi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
if ($null -eq $smi) { Write-Output "nvidia-smi: NOT_FOUND" }
else { nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv 2>&1 }
Present-Check "nvcc"

Section "Python"
Show-Command "py" @("-0p")
$py = Get-Command python -ErrorAction SilentlyContinue
if ($null -eq $py) { Write-Output "python: NOT_FOUND" }
else {
    python --version 2>&1
    python -c "import sys; print('exe:', sys.executable)" 2>&1
}
Present-Check "conda"

Section "Node / pnpm"
Show-Command "node" @("--version")
Show-Command "pnpm" @("--version")
Show-Command "npm" @("--version")

Section "Java"
Show-Command "java" @("-version")

Section "Android"
Show-Command "adb" @("devices", "-l")
Show-Command "emulator" @("-list-avds")
$sdk = $env:ANDROID_HOME
if (-not $sdk) { $sdk = $env:ANDROID_SDK_ROOT }
Write-Output "ANDROID_HOME=$env:ANDROID_HOME"
Write-Output "ANDROID_SDK_ROOT=$env:ANDROID_SDK_ROOT"
Write-Output "ANDROID_AVD_HOME=$env:ANDROID_AVD_HOME"
if ($sdk) {
    Write-Output "sdk_exists=$(Test-Path $sdk)"
    Write-Output "emulator_exists=$(Test-Path "$sdk\emulator\emulator.exe")"
    Write-Output "platform_tools_exists=$(Test-Path "$sdk\platform-tools\adb.exe")"
    Write-Output "system_images=$(Test-Path "$sdk\system-images")"
}

Section "Blender / FFmpeg / CMake / MSVC"
Show-Command "blender" @("--version")
Show-Command "ffmpeg" @("-version")
Show-Command "cmake" @("--version")
Present-Check "cl"

Section "Relevant environment variables (redacted)"
Get-ChildItem Env: | Where-Object {
    $_.Name -match 'ANDROID|JAVA|CUDA|PYTHON|CONDA|HF_|TORCH|GRADLE|PLI_'
} | ForEach-Object {
    $name = $_.Name
    $val = $_.Value
    if ($name -match 'TOKEN|KEY|SECRET|PASSWORD|CREDENTIAL') {
        $val = "***REDACTED***"
    }
    Write-Output "$name=$val"
}