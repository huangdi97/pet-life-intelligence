# capture-android-r4-2.ps1 — R4.2 Android evidence pass (hand-controlled AVD).
# Heroes captured for 豆豆 (coco) + 咪咪 (mimi); Twin Review front/side/back
# presets drive the real camera (manifest yaw). No vision model.
param(
    [string]$Out = "artifacts\\r2p3d-r4-2\\android",
    [string]$Adb = "D:\\Code\\Android\\SDK\\platform-tools\\adb.exe",
    [string]$Serial = "emulator-5554"
)
$ErrorActionPreference = "Continue"
$PSNativeCommandUseErrorActionPreference = $false
$repo = (Get-Location).Path
$out = Join-Path $repo $Out
$pkg = "com.pli.mobile"
$py = Join-Path $repo ".venv\\Scripts\\python.exe"
$coco = "f122ca7b-bc1c-4ae6-a746-40107a920c6d"
$mimi = "f4755c3a-2c59-4fcf-a73e-508011d19679"
$scratch = "$env:PI_SCRATCH_DIR"

function Shot([string]$name, [string]$dir) {
    # Binary-safe: screencap on-device then pull (adb exec-out through a pipe on
    # Windows can corrupt PNGs when the emulator is under load).
    for ($i = 0; $i -lt 3; $i++) {
        & $Adb -s $Serial shell screencap -p /sdcard/pli_shot.png 2>&1 | Out-Null
        & $Adb -s $Serial pull /sdcard/pli_shot.png (Join-Path $dir "$name.png") 2>&1 | Out-Null
        $f = Join-Path $dir "$name.png"
        if ((Test-Path $f) -and ((Get-Item $f).Length -gt 2000)) { return }
        Start-Sleep -Seconds 2
    }
}
function UiDump([string]$dir, [string]$file = "ui.xml") {
    & $Adb -s $Serial shell uiautomator dump /sdcard/pli_ui.xml 2>&1 | Out-Null
    & $Adb -s $Serial pull /sdcard/pli_ui.xml (Join-Path $dir $file) 2>&1 | Out-Null
}
function Manifest([string]$dir, [string]$file = "3d.json") {
    $p = ((& $Adb -s $Serial shell "su 0 cat /data/data/com.pli.mobile/files/pli_manifest.json" 2>&1 | Out-String)).Trim()
    if ($p.StartsWith("{")) { [System.IO.File]::WriteAllText((Join-Path $dir $file), $p, [System.Text.UTF8Encoding]::new($false)) }
    else { [System.IO.File]::WriteAllText((Join-Path $dir $file), "{}", [System.Text.UTF8Encoding]::new($false)) }
}
function ManifestTwin([string]$dir) {
    for ($i = 0; $i -lt 12; $i++) {
        $p = ((& $Adb -s $Serial shell "su 0 cat /data/data/com.pli.mobile/files/pli_manifest.json" 2>&1 | Out-String)).Trim()
        if ($p -match '"generic":\s*false' -and $p -match '"sourceMediaCount":\s*[1-9]') {
            [System.IO.File]::WriteAllText((Join-Path $dir "3d.json"), $p, [System.Text.UTF8Encoding]::new($false)); return
        }
        Start-Sleep -Seconds 5
    }
    Manifest $dir
}
function TapById([string]$xmlPath, [string]$id) {
    & $py (Join-Path $repo "scripts\\blind-ui\\android_tap.py") $xmlPath $id "id" $Adb $Serial 2>&1 | Out-Null
}
function TapDesc([string]$xmlPath, [string]$needle) {
    & $py (Join-Path $repo "scripts\\blind-ui\\android_tap.py") $xmlPath $needle "desc" $Adb $Serial 2>&1 | Out-Null
}
function Nav([string]$screen) {
    & $Adb -s $Serial shell am start -a android.intent.action.VIEW -d "pli-demo://nav?screen=$screen" $pkg/.MainActivity 2>&1 | Out-Null
    Start-Sleep -Seconds 24
}
function DumpTo([string]$name) {
    & $Adb -s $Serial shell uiautomator dump "/sdcard/$name.xml" 2>&1 | Out-Null
    & $Adb -s $Serial pull "/sdcard/$name.xml" "$scratch\\$name.xml" 2>&1 | Out-Null
    return Get-Content "$scratch\\$name.xml" -Raw -Encoding UTF8
}
function EnsurePet([string]$target) {
    $raw = DumpTo "c0"
    if ($raw -match "pli\.multipet\.switch\.$target") {
        TapById "$scratch\\c0.xml" "pli.multipet.switch.$target"
        Start-Sleep -Seconds 14
    }
}
function TapDescRetry([string]$needle) {
    for ($i = 0; $i -lt 5; $i++) {
        $raw = DumpTo "zz"
        if ($raw -match [regex]::Escape($needle)) {
            TapDesc "$scratch\\zz.xml" $needle
            return
        }
        Start-Sleep -Seconds 2
    }
    Write-Host "  WARN: control not found: $needle"
}

Write-Host "== login + launch =="
& $Adb -s $Serial shell am start -a android.intent.action.VIEW -d "pli-demo://login?email=owner@pli.demo" $pkg/.MainActivity 2>&1 | Out-Null
Start-Sleep -Seconds 10
& $Adb -s $Serial shell am force-stop $pkg 2>&1 | Out-Null
& $Adb -s $Serial shell am start -n $pkg/.MainActivity 2>&1 | Out-Null
Start-Sleep -Seconds 35
Nav "today"
EnsurePet $coco

Write-Host "== heroes (coco) =="
foreach ($hero in @("today", "pet", "lifeview", "twinreview")) {
    $dir = Join-Path $out $hero
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Nav $hero
    Start-Sleep -Seconds 2
    Shot $hero $dir
    UiDump $dir
    ManifestTwin $dir
    Write-Host "  captured $hero"
}

Write-Host "== lifeview interactions (rotate/zoom/reset) =="
$dir = Join-Path $out "lifeview"
Nav "lifeview"
Start-Sleep -Seconds 3
Manifest $dir "3d_rotate_a.json"
& $Adb -s $Serial shell input swipe 540 900 800 900 400 2>&1 | Out-Null
Start-Sleep -Seconds 5
Manifest $dir "3d_rotate_b.json"
Shot "lifeview_b" $dir
Manifest $dir "3d_zoom_a.json"
TapDescRetry "放大"
Start-Sleep -Seconds 5
Manifest $dir "3d_zoom_b.json"
TapDescRetry "重置视图"
Start-Sleep -Seconds 5
Manifest $dir "3d_reset.json"

Write-Host "== twinreview views (coco) =="
$dir = Join-Path $out "twinreview"
Nav "twinreview"
Start-Sleep -Seconds 3
UiDump $dir
TapById (Join-Path $dir "ui.xml") "pli.twinreview.view.front"; Start-Sleep -Seconds 4
Manifest $dir "3d_view_front.json"; UiDump $dir; Shot "twin_front" $dir
TapById (Join-Path $dir "ui.xml") "pli.twinreview.view.side"; Start-Sleep -Seconds 4
Manifest $dir "3d_view_side.json"; UiDump $dir; Shot "twin_side" $dir
TapById (Join-Path $dir "ui.xml") "pli.twinreview.view.back"; Start-Sleep -Seconds 4
Manifest $dir "3d_view_back.json"; UiDump $dir; Shot "twin_back" $dir
# front-right: real camera drag on lifeview (yaw -> ~-0.35), captured as evidence
Nav "lifeview"
Start-Sleep -Seconds 3
& $Adb -s $Serial shell input swipe 800 900 540 900 400 2>&1 | Out-Null
Start-Sleep -Seconds 5
Shot "lifeview_frontright" (Join-Path $out "lifeview")
Manifest (Join-Path $out "lifeview") "3d_frontright.json"

Write-Host "== restore ACTIVE (coco) =="
$h = @{ "X-Dev-User-Id" = "e3c3b857-1574-481f-b4d9-cc87999d865f"; "Content-Type" = "application/json" }
try {
    $null = Invoke-RestMethod -Uri "http://localhost:8800/api/v1/pets/$coco/visual-models/1/verify" -Method Post -Headers $h -Body '{"result":"like","issues":[],"notes":"r4.2 restore"}'
    $null = Invoke-RestMethod -Uri "http://localhost:8800/api/v1/pets/$coco/visual-models/1/activate" -Method Post -Headers $h -Body '{}'
    Write-Host "  ACTIVE restored"
} catch { Write-Host "  WARN restore: $($_.Exception.Message)" }

Write-Host "== mimi sanity (today) =="
$dir = Join-Path $out "mimi-sanity"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Nav "today"
UiDump $dir
TapById (Join-Path $dir "ui.xml") "pli.multipet.switch.$mimi"
Start-Sleep -Seconds 28
Shot "mimi_today" $dir
UiDump $dir
ManifestTwin $dir

Write-Host "== mimi twinreview (front/side/back) =="
$dir = Join-Path $out "mimi-review"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Nav "twinreview"
Start-Sleep -Seconds 3
UiDump $dir
TapById (Join-Path $dir "ui.xml") "pli.twinreview.view.front"; Start-Sleep -Seconds 4
Manifest $dir "3d_view_front.json"; UiDump $dir; Shot "mimi_front" $dir
TapById (Join-Path $dir "ui.xml") "pli.twinreview.view.side"; Start-Sleep -Seconds 4
Manifest $dir "3d_view_side.json"; UiDump $dir; Shot "mimi_side" $dir
TapById (Join-Path $dir "ui.xml") "pli.twinreview.view.back"; Start-Sleep -Seconds 4
Manifest $dir "3d_view_back.json"; UiDump $dir; Shot "mimi_back" $dir

Write-Host "== restore ACTIVE (mimi) =="
try {
    $null = Invoke-RestMethod -Uri "http://localhost:8800/api/v1/pets/$mimi/visual-models/1/verify" -Method Post -Headers $h -Body '{"result":"like","issues":[],"notes":"r4.2 restore"}'
    $null = Invoke-RestMethod -Uri "http://localhost:8800/api/v1/pets/$mimi/visual-models/1/activate" -Method Post -Headers $h -Body '{}'
    Write-Host "  ACTIVE restored"
} catch { Write-Host "  WARN restore: $($_.Exception.Message)" }

Write-Host "== extract =="
Get-ChildItem $out -Directory | ForEach-Object {
    if (Test-Path (Join-Path $_.FullName "ui.xml")) {
        & $py (Join-Path $repo "scripts\\blind-ui\\android_extract.py") $_.FullName 2>&1 | ForEach-Object { Write-Host "  $_" }
    }
}
Write-Host "== done =="
