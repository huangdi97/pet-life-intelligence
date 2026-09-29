# recapture-android-evidence-r2.ps1 - recapture R2P3D-R1 Android evidence on the
# ALREADY-BOOTED emulator (no reboot, no reinstall; app/login/API already live).
# Single PowerShell session keeps the adb connection stable.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/local/recapture-android-evidence-r2.ps1

$ErrorActionPreference = "Continue"
$PSNativeCommandUseErrorActionPreference = $false
$repo = "E:\AI\Pet Life Intelligence"
$out = Join-Path $repo "artifacts\r2p3d-r1\android"
$screens = Join-Path $out "screens"
New-Item -ItemType Directory -Force -Path $screens | Out-Null

$adb = "D:\Code\Android\SDK\platform-tools\adb.exe"
$serial = "emulator-5554"
$pkg = "com.pli.mobile"

function Shot([string]$name) {
    $tmp = Join-Path $screens "$name.png"
    # cmd.exe redirect keeps binary INTACT (PS native redirect mangles UTF-16).
    & cmd.exe /c "`"$adb`" -s $serial exec-out screencap -p > `"$tmp`"" 2>&1 | Out-Null
    $len = (Get-Item $tmp -ErrorAction SilentlyContinue).Length
    Write-Host "shot $name = $len bytes"
    if ($len -lt 20000) { Write-Host "  WARNING: suspiciously small" }
}

function Nav([string]$screen, [string]$name) {
    & $adb -s $serial shell am start -a android.intent.action.VIEW -d "pli-demo://nav?screen=$screen" $pkg/.MainActivity 2>&1 | Out-Null
    Start-Sleep -Seconds 10
    Shot $name
}

Write-Host "== verify device =="
$d = (& $adb devices 2>$null | Out-String)
if ($d -notmatch "emulator-5554\s+device") { Write-Host "DEVICE NOT READY"; exit 1 }

# make sure our app is in front
& $adb -s $serial shell am start -n $pkg/.MainActivity 2>&1 | Out-Null
Start-Sleep -Seconds 6

Write-Host "== recapture 18 pages =="
Nav "today"     "01_today"
Nav "timeline"  "02_timeline"
Nav "pet"       "03_pet"
Nav "lifeview"  "04_lifeview_a"
Nav "assistant" "05_assistant"
Nav "me"        "06_me"
Nav "quicklog"  "07_quicklog"
Nav "health"    "08_health"
Nav "behavior"  "09_behavior"
Nav "training"  "10_training"
Nav "welfare"   "11_welfare"
Nav "social"    "12_social"
Nav "companion" "13_companion"
Nav "monitoring" "14_monitoring"
Nav "lifeview"  "15_lifeview_b"
Nav "twinversion" "16_twinversion"
Nav "twincapture" "17_twincapture"
Nav "twinreview"  "18_twinreview"

Write-Host "== verify all files =="
Get-ChildItem $screens -Filter "*.png" | ForEach-Object { "{0,8} {1}" -f $_.Length, $_.Name }
Write-Host "DONE"
