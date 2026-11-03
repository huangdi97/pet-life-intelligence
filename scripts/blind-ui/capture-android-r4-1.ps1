# capture-android-r4-1.ps1 — R4.1 Android Hero runtime closure evidence.
# 4 heroes (today / pet / lifeview / twinreview) with real runtime manifest
# (RUNTIME origin, HIGH_FIDELITY_SKINNED, canonical representation), real
# interactions (rotate/zoom/reset, twin-review front/side/back + not_like
# disable) and mimi parity shot. Reuses the R3 capture mechanics
# (uiautomator dump + screencap + root-read of the persisted WebView
# manifest). No vision model.
param(
    [string]$Out = "artifacts\\r2p3d-r4-1\\android",
    [string]$Adb = "adb",
    [string]$Serial = "emulator-5554"
)
$ErrorActionPreference = "Continue"
$PSNativeCommandUseErrorActionPreference = $false
$repo = (Get-Location).Path
$out = Join-Path $repo $Out
$pkg = "com.pli.mobile"
$py = Join-Path $repo ".venv\\Scripts\\python.exe"
$owner = "e3c3b857-1574-481f-b4d9-cc87999d865f"
$coco = "f122ca7b-bc1c-4ae6-a746-40107a920c6d"
$mimi = "f4755c3a-2c59-4fcf-a73e-508011d19679"
$api = "http://localhost:8800/api/v1"

function Shot([string]$name, [string]$dir) {
    $tmp = Join-Path $dir "$name.png"
    & cmd.exe /c "`"$Adb`" -s $Serial exec-out screencap -p > `"$tmp`"" 2>&1 | Out-Null
    $len = (Get-Item $tmp -ErrorAction SilentlyContinue).Length
    Write-Host "  shot $name = $len bytes"
}

function UiDump([string]$dir, [string]$file = "ui.xml") {
    $xml = Join-Path $dir $file
    & $Adb -s $Serial shell uiautomator dump /sdcard/pli_ui.xml 2>&1 | Out-Null
    & $Adb -s $Serial pull /sdcard/pli_ui.xml $xml 2>&1 | Out-Null
    if (-not (Test-Path $xml)) { New-Item -Force -Path $xml -ItemType File | Out-Null }
}

function Manifest([string]$dir, [string]$file = "3d.json") {
    $persisted = ((& $Adb -s $Serial shell cat /data/data/com.pli.mobile/files/pli_manifest.json 2>&1 | Out-String) | Out-String).Trim()
    if (-not [string]::IsNullOrWhiteSpace($persisted) -and $persisted.StartsWith("{")) {
        [System.IO.File]::WriteAllText((Join-Path $dir $file), $persisted, [System.Text.UTF8Encoding]::new($false))
        return
    }
    [System.IO.File]::WriteAllText((Join-Path $dir $file), "{}", [System.Text.UTF8Encoding]::new($false))
}

function ManifestTwin([string]$dir) {
    # Poll until the ACTIVE-twin runtime manifest (individual, media-backed).
    $path = Join-Path $dir "3d.json"
    for ($i = 0; $i -lt 12; $i++) {
        $poll = ((& $Adb -s $Serial shell cat /data/data/com.pli.mobile/files/pli_manifest.json 2>&1 | Out-String)).Trim()
        if ($poll -match '"generic":\s*false' -and $poll -match '"sourceMediaCount":\s*[1-9]') {
            [System.IO.File]::WriteAllText($path, $poll, [System.Text.UTF8Encoding]::new($false))
            return
        }
        Start-Sleep -Seconds 5
    }
    Manifest $dir
}

function TapNeedle([string]$needle, [string]$dir, [string]$attr = "desc") {
    $xml = Join-Path $dir "ui.xml"
    if (-not (Test-Path $xml)) { return }
    & $py (Join-Path $repo "scripts\\blind-ui\\android_tap.py") $xml $needle $attr $Adb $Serial 2>&1 | Out-Null
}

function VerifyActivate([string]$petId) {
    $h = @{ "X-Dev-User-Id" = $owner; "Content-Type" = "application/json" }
    try {
        $null = Invoke-RestMethod -Uri "$api/pets/$petId/visual-models/1/verify" -Method Post -Headers $h -Body '{"result":"like","issues":[],"notes":"r4.1 restore after not_like"}'
        $null = Invoke-RestMethod -Uri "$api/pets/$petId/visual-models/1/activate" -Method Post -Headers $h -Body '{}'
        Write-Host "  restored ACTIVE twin for $petId v1"
    } catch { Write-Host "  WARN: restore failed for $petId" }
}

function Nav([string]$screen, [string]$dir) {
    & $Adb -s $Serial shell am start -a android.intent.action.VIEW -d "pli-demo://nav?screen=$screen" $pkg/.MainActivity 2>&1 | Out-Null
    Start-Sleep -Seconds 25
    Shot ((Split-Path $dir -Leaf)) $dir
    UiDump $dir
    ManifestTwin $dir
}

function EnsurePet([string]$petId) {
    # The demo app persists the last-selected pet across runs; heroes must be
    # captured for the PRIMARY twin (豆豆). If the current pet differs, switch
    # via the other-pet switch node (android_tap.py resolves by resource id).
    & $Adb -s $Serial shell uiautomator dump /sdcard/cur.xml 2>&1 | Out-Null
    $cur = (& $Adb -s $Serial shell cat /sdcard/cur.xml 2>&1 | Out-String)
    if ($cur -match "pli\.multipet\.current" -and $cur -match "$petId") { return }
    $xml = Join-Path $out "ensure.xml"
    & $Adb -s $Serial pull /sdcard/cur.xml $xml 2>&1 | Out-Null
    & $py (Join-Path $repo "scripts\\blind-ui\\android_tap.py") $xml "pli.multipet.switch.$petId" "id" $Adb $Serial 2>&1 | Out-Null
    Start-Sleep -Seconds 12
}

function TapDescByDump([string]$dump, [string]$needle, [string]$dir, [string]$man) {
    # Find the SMALLEST clickable content-desc node in a FRESH dump and tap its
    # center; save the runtime manifest before/after. Fresh dump per gesture
    # avoids stale coordinates after a stage remount or layout shift.
    & $Adb -s $Serial shell uiautomator dump "/sdcard/$dump.xml" 2>&1 | Out-Null
    $hit = (& $Adb -s $Serial shell cat "/sdcard/$dump.xml" 2>&1 | Out-String)
    $nodes = [regex]::Matches($hit, '<node[^>]*content-desc="[^"]*' + [regex]::Escape($needle) + '[^"]*"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"')
    if ($nodes.Count -eq 0) { return $false }
    # prefer the smallest node (the actual button, not an ancestor container)
    $best = $nodes[0]
    foreach ($n in $nodes) {
        $w = [int]$n.Groups[3].Value - [int]$n.Groups[1].Value
        $bw = [int]$best.Groups[3].Value - [int]$best.Groups[1].Value
        if ($w -lt $bw) { $best = $n }
    }
    Manifest $dir "${man}_a.json"
    $x = ([int]$best.Groups[1].Value + [int]$best.Groups[3].Value) / 2
    $y = ([int]$best.Groups[2].Value + [int]$best.Groups[4].Value) / 2
    & $Adb -s $Serial shell input tap ([int]$x) ([int]$y) 2>&1 | Out-Null
    Start-Sleep -Seconds 5
    Manifest $dir "${man}_b.json"
    return $true
}

Write-Host "== verify device =="
$d = (& $Adb devices 2>$null | Out-String)
if ($d -notmatch "$Serial\s+device") { Write-Host "DEVICE NOT READY: $d"; exit 1 }
& $Adb -s $Serial root 2>&1 | Out-Null
Start-Sleep -Seconds 2

Write-Host "== fresh demo login + launch =="
& $Adb -s $Serial shell am start -a android.intent.action.VIEW -d "pli-demo://login?email=owner@pli.demo" $pkg/.MainActivity 2>&1 | Out-Null
Start-Sleep -Seconds 10
& $Adb -s $Serial shell am force-stop $pkg 2>&1 | Out-Null
& $Adb -s $Serial logcat -c 2>&1 | Out-Null
& $Adb -s $Serial shell am start -n $pkg/.MainActivity 2>&1 | Out-Null
Start-Sleep -Seconds 35
EnsurePet $coco

foreach ($hero in @("today", "pet", "lifeview", "twinreview")) {
    $dir = Join-Path $out $hero
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Write-Host "== hero: $hero =="
    Nav $hero $dir
    if ($hero -ne "today") { EnsurePet $coco }
}

Write-Host "== lifeview interactions (rotate / zoom / reset) =="
$dir = Join-Path $out "lifeview"
Nav "lifeview" $dir
EnsurePet $coco
Manifest $dir "3d_rotate_a.json"
$sxml = Get-Content -Raw -Encoding UTF8 (Join-Path $dir "ui.xml")
$sm = [regex]::Match($sxml, '<node[^>]*resource-id="pet3d-stage-mobile"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"')
if ($sm.Success) {
    $sx1 = [int]$sm.Groups[1].Value; $sy1 = [int]$sm.Groups[2].Value
    $sx2 = [int]$sm.Groups[3].Value; $sy2 = [int]$sm.Groups[4].Value
    $mx = ($sx1 + $sx2) / 2; $my = ($sy1 + $sy2) / 2
    & $Adb -s $Serial shell input swipe ([int]$mx) ([int]$my) ([int]($mx + 150)) ([int]$my) 400 2>&1 | Out-Null
} else {
    & $Adb -s $Serial shell input swipe 540 900 850 900 400 2>&1 | Out-Null
}
Start-Sleep -Seconds 5
Manifest $dir "3d_rotate_b.json"
Shot "lifeview_b" $dir
[void](TapDescByDump "z_zoom" "放大" $dir "3d_zoom")
[void](TapDescByDump "z_reset" "重置视图" $dir "3d_reset")
# canonical reset file (compat name) = the post-reset manifest
if (Test-Path (Join-Path $dir "3d_reset_b.json")) {
    Copy-Item (Join-Path $dir "3d_reset_b.json") (Join-Path $dir "3d_reset.json") -Force
}

Write-Host "== twinreview views (front / side / back) =="
$dir = Join-Path $out "twinreview"
Nav "twinreview" $dir
EnsurePet $coco
Start-Sleep -Seconds 3
UiDump $dir
TapNeedle "pli.twinreview.view.front" $dir "id"
Start-Sleep -Seconds 4
Manifest $dir "3d_view_front.json"
UiDump $dir
Shot "twin_front" $dir
TapNeedle "pli.twinreview.view.side" $dir "id"
Start-Sleep -Seconds 4
Manifest $dir "3d_view_side.json"
UiDump $dir
Shot "twin_side" $dir
TapNeedle "pli.twinreview.view.back" $dir "id"
Start-Sleep -Seconds 4
Manifest $dir "3d_view_back.json"
UiDump $dir
Shot "twin_back" $dir

Write-Host "== twinreview not_like -> activate disabled =="
TapNeedle "不像" $dir
Start-Sleep -Seconds 6
UiDump $dir
Shot "twinreview_b" $dir
# Restore the ACTIVE demo twins (real verify POST flipped coco to VERIFYING).
VerifyActivate $coco
VerifyActivate $mimi
Start-Sleep -Seconds 2

Write-Host "== mimi parity sanity (switched pet) =="
$dir = Join-Path $out "mimi-sanity"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Nav "today" $dir
TapNeedle "pli.multipet.switch.$mimi" $dir "id"
Start-Sleep -Seconds 30
Shot "mimi_today" $dir
UiDump $dir
ManifestTwin $dir

Write-Host "== build visual.json per screen =="
Get-ChildItem $out -Directory | ForEach-Object {
    $d = $_.FullName
    if (Test-Path (Join-Path $d "ui.xml")) {
        & $py (Join-Path $repo "scripts\\blind-ui\\android_extract.py") $d 2>&1 | ForEach-Object { Write-Host "  $_" }
    }
}
Write-Host "== done -> $out =="