# capture-android-evidence.ps1 — R2P3D-R1 Android evidence capture (single session).
#
# Runs entirely in ONE PowerShell process so the adb/emulator connection is
# never orphaned by daemon restarts between tool invocations:
#   1. boot the existing `main` AVD (reused; pdig5/pdig36 absent on this host)
#   2. install the demo APK (EXPO_PUBLIC_PLI_API_URL=http://10.0.2.2:8800)
#   3. deep-link through every owner screen and capture a PNG per page
#   4. capture the twin flow + pose switching screens
#
# Usage: powershell -ExecutionPolicy Bypass -File scripts/local/capture-android-evidence.ps1
# Output: artifacts/r2p3d-r1/android/ (repo-local; committed as evidence)

$ErrorActionPreference = "Continue"
$repo = "E:\AI\Pet Life Intelligence"
$out = Join-Path $repo "artifacts\r2p3d-r1\android"
$screens = Join-Path $out "screens"
New-Item -ItemType Directory -Force -Path $screens | Out-Null

$adb = "D:\Code\Android\SDK\platform-tools\adb.exe"
$emulator = "D:\Code\Android\SDK\emulator\emulator.exe"
$apk = Join-Path $repo "apps\mobile\android\app\build\outputs\apk\release\app-release.apk"
$serial = "emulator-5554"

function A([string]$argsLine) {
    & $adb -s $serial $argsLine 2>&1
}

function Shot([string]$name) {
    Start-Sleep -Seconds 2
    $tmp = Join-Path $screens "$name.png"
    & cmd.exe /c "`"$adb`" -s $serial exec-out screencap -p > `"$tmp`"" 2>&1 | Out-Null
    $len = (Get-Item $tmp -ErrorAction SilentlyContinue).Length
    Write-Host "shot $name = $len bytes"
}

function Nav([string]$screen, [string]$name) {
    & $adb -s $serial shell am start -a android.intent.action.VIEW -d "pli-demo://nav?screen=$screen" 2>&1 | Out-Null
    Start-Sleep -Seconds 5
    Shot $name
}

Write-Host "== boot AVD main =="
Get-Process | Where-Object { $_.ProcessName -match 'emulator|qemu' } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Start-Process -FilePath $emulator -ArgumentList @("-avd","main","-no-window","-no-snapshot","-no-boot-anim","-no-audio","-gpu","swiftshader_indirect","-no-metrics","-port","5554","-memory","4096") -WindowStyle Hidden
$booted = $false
for ($i = 0; $i -lt 50; $i++) {
    $d = & $adb devices 2>$null | Out-String
    if ($d -match "emulator-5554\s+device") {
        $b = & $adb -s $serial shell getprop sys.boot_completed 2>$null
        if ($b -match "1") { $booted = $true; Write-Host "booted after $i checks"; break }
    }
    Start-Sleep -Seconds 8
}
if (-not $booted) { Write-Host "BOOT TIMEOUT"; exit 1 }

Write-Host "== install APK =="
& $adb -s $serial install -r $apk 2>&1 | Out-Null
& $adb -s $serial shell am start -n com.pli.mobile/.MainActivity 2>&1 | Out-Null
Start-Sleep -Seconds 14
Shot "01_today"

Write-Host "== deep-link nav captures =="
Nav "timeline" "02_timeline"
Nav "pet" "03_pet"
Nav "lifeview" "04_lifeview_a"
Nav "assistant" "05_assistant"
Nav "me" "06_me"
Nav "quicklog" "07_quicklog"
Nav "health" "08_health"
Nav "behavior" "09_behavior"
Nav "training" "10_training"
Nav "welfare" "11_welfare"
Nav "social" "12_social"
Nav "companion" "13_companion"
Nav "monitoring" "14_monitoring"
Nav "lifeview" "15_lifeview_b"

Write-Host "== twin screens =="
Nav "twinversion" "16_twinversion"
Nav "twincapture" "17_twincapture"
Nav "twinreview" "18_twinreview"

Write-Host "== device alive? =="
Write-Host $d
Get-Process | Where-Object { $_.ProcessName -match 'emulator|qemu' } | Select-Object ProcessName,Id
Write-Host "DONE"