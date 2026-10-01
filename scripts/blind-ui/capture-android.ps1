# capture-android.ps1 — blind capture of all owner screens on the running
# emulator (main acceptance runtime). Per screen writes screenshot.png,
# ui.xml (uiautomator), 3d.json (persisted runtime manifest), then
# android_extract.py builds layout.json / visual.json / report.md.
#
# No vision model: geometry/text come from the uiautomator accessibility tree,
# manifest from the RN-persisted pli_manifest.json (release APT is not
# debuggable — read via adb root).
#
# Navigation: demo deep links (pli-demo://nav?screen=...) — the app's
# DemoSession auto-logs into the demo household and navigates deterministically
# when built with EXPO_PUBLIC_PLI_DEMO_ENV=1 (required; without it the app
# never auto-logs-in and the links are inert).
#
# Usage: powershell -ExecutionPolicy Bypass -File scripts/blind-ui/capture-android.ps1
param(
    [string]$Out = "artifacts\blind-ui\android",
    [string]$Adb = "D:\Code\Android\SDK\platform-tools\adb.exe",
    [string]$Serial = "emulator-5554"
)
$ErrorActionPreference = "Continue"
$PSNativeCommandUseErrorActionPreference = $false
$repo = "E:\AI\Pet Life Intelligence"
$out = Join-Path $repo $Out
$pkg = "com.pli.mobile"
$py = Join-Path $repo ".venv\Scripts\python.exe"
if (-not (Test-Path $Adb)) { $Adb = "adb" }

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
    # Release Hermes strips console.log, so [plimanifest] logcat never fires.
    # The RN viewer persists the runtime manifest to app storage; read it by
    # root (the APT release build is not debuggable, run-as fails).
    $persisted = ((& $Adb -s $Serial shell cat /data/data/com.pli.mobile/files/pli_manifest.json 2>&1 | Out-String) | Out-String).Trim()
    if (-not [string]::IsNullOrWhiteSpace($persisted) -and $persisted.StartsWith("{")) {
        [System.IO.File]::WriteAllText((Join-Path $dir $file), $persisted, [System.Text.UTF8Encoding]::new($false))
        return
    }
    # Fallback: legacy logcat channel (debug builds).
    $hit = (& $Adb -s $Serial logcat -d -s ReactNativeJS:I 2>&1 | Select-String -Pattern "plimanifest" | Select-Object -Last 1)
    if ($null -ne $hit -and $hit.ToString() -match "\[plimanifest\] (.+)$") {
        [System.IO.File]::WriteAllText((Join-Path $dir $file), $Matches[1], [System.Text.UTF8Encoding]::new($false))
        return
    }
    [System.IO.File]::WriteAllText((Join-Path $dir $file), "{}", [System.Text.UTF8Encoding]::new($false))
}

function RestoreTwin([string]$petId, [int]$version) {
    $h = @{ "X-Dev-User-Id" = "8ec41f0f-8ca0-4afc-92aa-6a3deb08c7ae"; "Content-Type" = "application/json" }
    try {
        $null = Invoke-RestMethod -Uri "http://localhost:8800/api/v1/pets/$petId/visual-models/$version/verify" -Method Post -Headers $h -Body '{"result":"like","issues":[],"notes":"restored by harness"}'
        $null = Invoke-RestMethod -Uri "http://localhost:8800/api/v1/pets/$petId/visual-models/$version/activate" -Method Post -Headers $h -Body '{}'
        Write-Host "  restored ACTIVE twin for pet $petId v$version"
    } catch { Write-Host "  WARN: twin restore failed for $petId : $($_.Exception.Message)" }
}

function DismissAnr() {
    $xml = (& $Adb -s $Serial shell uiautomator dump /sdcard/anr.xml 2>&1 | Out-String)
    if ($xml -match "isn't responding|unresponsive|无响应|未响应") {
        & $Adb -s $Serial shell input keyevent 22 2>&1 | Out-Null
        & $Adb -s $Serial shell input keyevent 66 2>&1 | Out-Null
        Start-Sleep -Seconds 3
    }
}

# Tap a node whose content-desc contains $needle (used for the quicklog form
# tile and the twin-review "不像" interaction).
function TapByText([string]$needle, [string]$dir) {
    $xml = Join-Path $dir "ui.xml"
    if (-not (Test-Path $xml)) { return $false }
    $raw = Get-Content -Raw -Encoding UTF8 $xml
    $m = [regex]::Match($raw, '<node[^>]*content-desc="[^"]*' + [regex]::Escape($needle) + '[^"]*"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"')
    if (-not $m.Success) { return $false }
    $x = ([int]$m.Groups[1].Value + [int]$m.Groups[3].Value) / 2
    $y = ([int]$m.Groups[2].Value + [int]$m.Groups[4].Value) / 2
    & $Adb -s $Serial shell input tap ([int]$x) ([int]$y) 2>&1 | Out-Null
    return $true
}

function ManifestTwin([string]$dir) {
    # The ACTIVE-twin WebView remount (key change) races the first read: poll
    # until the RUNTIME manifest shows the individual twin (generic=false,
    # twin mesh count) instead of the initial demo stage.

    $path = Join-Path $dir "3d.json"
    for ($i = 0; $i -lt 12; $i++) {
        $poll = ((& $Adb -s $Serial shell cat /data/data/com.pli.mobile/files/pli_manifest.json 2>&1 | Out-String)).Trim()
        if ($poll -match '"generic":\s*false' -and $poll -match '"meshCount":\s*2') {
            [System.IO.File]::WriteAllText($path, $poll, [System.Text.UTF8Encoding]::new($false))
            return
        }
        Start-Sleep -Seconds 4
    }
    Manifest $dir
}

# Encoding-safe tap: delegate CJK matching to python (PS 5.1 mangles UTF-8).
function TapNeedle([string]$needle, [string]$dir, [string]$attr = "desc") {
    $xml = Join-Path $dir "ui.xml"
    if (-not (Test-Path $xml)) { return }
    & $py (Join-Path $repo "scripts\blind-ui\android_tap.py") $xml $needle $attr $Adb $Serial 2>&1 | Out-Null
}

function Nav([string]$screen, [string]$dir, [switch]$ScrollMerge) {
    DismissAnr
    & $Adb -s $Serial logcat -c 2>&1 | Out-Null
    & $Adb -s $Serial shell am start -a android.intent.action.VIEW -d "pli-demo://nav?screen=$screen" $pkg/.MainActivity 2>&1 | Out-Null
    # Twin-bearing hero screens settle longer: the ACTIVE-twin WebView remount
    # (key change) re-posts its manifest after the initial demo one.
    $hero = @("today", "pet", "lifeview", "twinreview") -contains $screen
    if ($hero) { Start-Sleep -Seconds 22 } else { Start-Sleep -Seconds 10 }
    Shot (Split-Path $dir -Leaf) $dir
    UiDump $dir
    if ($ScrollMerge) {
        # Long screens: scroll down and take a second dump so below-the-fold
        # contract elements (pet friends/caregivers, me settings, etc.) enter
        # the accessibility tree; android_extract.py merges both dumps.
        & $Adb -s $Serial shell input swipe 540 1800 540 500 500 2>&1 | Out-Null
        Start-Sleep -Seconds 2
        if ($screen -eq "pet") {
            # Pet World is tall: a second swipe surfaces the below-the-fold
            # recent / friends / caregivers / entry.lifeview contract ids.
            & $Adb -s $Serial shell input swipe 540 1800 540 500 500 2>&1 | Out-Null
            Start-Sleep -Seconds 2
        }
        UiDump $dir "ui_bottom.xml"
    }
    if ($hero) { ManifestTwin $dir } else { Manifest $dir }
}

function Login([string]$email) {
    & $Adb -s $Serial shell am start -a android.intent.action.VIEW -d "pli-demo://login?email=$email" $pkg/.MainActivity 2>&1 | Out-Null
    Start-Sleep -Seconds 6
}

$screens = @(
    @{ n = "today";        s = "today" },
    @{ n = "timeline";     s = "timeline" },
    @{ n = "pet";          s = "pet" },
    @{ n = "lifeview";     s = "lifeview" },
    @{ n = "assistant";    s = "assistant" },
    @{ n = "me";           s = "me" },
    @{ n = "quicklog";     s = "quicklog" },
    @{ n = "health";       s = "health" },
    @{ n = "behavior";     s = "behavior" },
    @{ n = "training";     s = "training" },
    @{ n = "welfare";      s = "welfare" },
    @{ n = "social";       s = "social" },
    @{ n = "companion";    s = "companion" },
    @{ n = "monitoring";   s = "monitoring" },
    @{ n = "twincapture";  s = "twincapture" },
    @{ n = "twinversion";  s = "twinversion" },
    @{ n = "twinreview";   s = "twinreview" }
)

Write-Host "== verify device =="
$d = (& $Adb devices 2>$null | Out-String)
if ($d -notmatch "$Serial\s+device") { Write-Host "DEVICE NOT READY: $d"; exit 1 }

& $Adb -s $Serial root 2>&1 | Out-Null
Start-Sleep -Seconds 2

Login "owner@pli.demo"
& $Adb -s $Serial shell am force-stop $pkg 2>&1 | Out-Null
& $Adb -s $Serial logcat -c 2>&1 | Out-Null
& $Adb -s $Serial shell am start -n $pkg/.MainActivity 2>&1 | Out-Null
Start-Sleep -Seconds 30

foreach ($sc in $screens) {
    $dir = Join-Path $out $sc.n
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Write-Host "== $($sc.n) =="
    $scroll = @("pet", "me", "welfare", "quicklog", "health", "companion", "timeline", "twinversion", "lifeview", "twinreview") -contains $sc.n
    Nav $sc.s $dir -ScrollMerge:$scroll
    if ($sc.n -eq "quicklog") {
        # Open the light form by tapping the first primary tile (喂食) so
        # pli.quicklog.form / save / feedback are present in the tree.
        TapNeedle "喂食" $dir
        Start-Sleep -Seconds 2
        UiDump $dir
        Shot "quicklog_form" $dir
    }
}

Write-Host "== twinreview (interaction: 不像 selected) =="
$dir = Join-Path $out "twinreview"
Nav "twinreview" $dir
Start-Sleep -Seconds 2
[void](TapByText "不像" $dir)
# The 不像 click is a REAL verify POST (interaction truth), which flips the
# twin back to VERIFYING; restore the ACTIVE demo twin so the demo data stays
# truthful (earlier rounds corrupted it silently).
RestoreTwin "0070551c-8634-42b1-a361-81a635b66653" 1
RestoreTwin "386bfba3-5485-4d4f-90f9-9a775d546259" 1
Start-Sleep -Seconds 2
# Scroll so the below-the-fold activate button enters the a11y dump (it sits
# under the issue panel once not_like is selected).
& $Adb -s $Serial shell input swipe 540 1800 540 900 350 2>&1 | Out-Null
Start-Sleep -Seconds 2
UiDump $dir
Shot "twinreview_b" $dir

Write-Host "== lifeview rotation proof (real camera yaw A/B) =="
$dir = Join-Path $out "lifeview"
Nav "lifeview" $dir
Manifest $dir "3d_rotate_a.json"
# Real drag across the stage center (rotates the twin; the page reports
# orientation). Anchored to the pet3d-stage-mobile bounds from the a11y dump
# instead of a fixed coordinate (the Life View identity row shifts the stage).
$sxml = Get-Content -Raw -Encoding UTF8 (Join-Path $dir "ui.xml")
$sm = [regex]::Match($sxml, '<node[^>]*resource-id="pet3d-stage-mobile"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"')
if ($sm.Success) {
    $sx1 = [int]$sm.Groups[1].Value; $sy1 = [int]$sm.Groups[2].Value
    $sx2 = [int]$sm.Groups[3].Value; $sy2 = [int]$sm.Groups[4].Value
    $mx = ($sx1 + $sx2) / 2; $my = ($sy1 + $sy2) / 2
    & $Adb -s $Serial shell input swipe ([int]$mx) ([int]$my) ([int]($mx + 130)) ([int]$my) 400 2>&1 | Out-Null
} else {
    & $Adb -s $Serial shell input swipe 540 900 900 900 400 2>&1 | Out-Null
}
Start-Sleep -Seconds 4
Manifest $dir "3d_rotate_b.json"
Shot "lifeview_b" $dir
# Zoom: tap the zoom + control (real button event -> radius change).
& $Adb -s $Serial shell uiautomator dump /sdcard/z.xml 2>&1 | Out-Null
$zoomHit = (& $Adb -s $Serial shell cat /sdcard/z.xml 2>&1 | Out-String)
$zm = [regex]::Match($zoomHit, '<node[^>]*content-desc="[^"]*放大[^"]*"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"')
if ($zm.Success) {
    # Zoom source state BEFORE the real button tap (evidence pair A/B).
    Manifest $dir "3d_zoom_a.json"
    $zx = ([int]$zm.Groups[1].Value + [int]$zm.Groups[3].Value) / 2
    $zy = ([int]$zm.Groups[2].Value + [int]$zm.Groups[4].Value) / 2
    & $Adb -s $Serial shell input tap ([int]$zx) ([int]$zy) 2>&1 | Out-Null
    Start-Sleep -Seconds 4
    Manifest $dir "3d_zoom_b.json"
} else {
    Manifest $dir "3d_zoom_a.json"
}
# Reset: tap the reset control -> camera back to canonical.
$rm = [regex]::Match($zoomHit, '<node[^>]*content-desc="[^"]*重置视图[^"]*"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"')
if ($rm.Success) {
    $rx = ([int]$rm.Groups[1].Value + [int]$rm.Groups[3].Value) / 2
    $ry = ([int]$rm.Groups[2].Value + [int]$rm.Groups[4].Value) / 2
    & $Adb -s $Serial shell input tap ([int]$rx) ([int]$ry) 2>&1 | Out-Null
    Start-Sleep -Seconds 4
    Manifest $dir "3d_reset.json"
} else {
    Manifest $dir "3d_reset.json"
}

Write-Host "== offline (API stopped = real network failure) =="
$apiPid = (Get-NetTCPConnection -LocalPort 8800 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)
if ($apiPid) {
    & taskkill /F /T /PID $apiPid 2>&1 | Out-Null
    Start-Sleep -Seconds 3
    $dead = curl.exe -s -o NUL -w "%{http_code}" http://localhost:8800/api/v1/system/health
    Write-Host "  stopped API pid $apiPid (health=$dead)"
} else {
    Write-Host "  WARN: no API listener on 8800; offline capture would be meaningless"
}
$dir = Join-Path $out "offline"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Nav "today" $dir
TapNeedle "pli.multipet.switch.386bfba3-5485-4d4f-90f9-9a775d546259" $dir "id"
Start-Sleep -Seconds 25
UiDump $dir
Shot "offline" $dir
if ($apiPid) {
    $logDir = Join-Path $repo ".local\logs"
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    $apiLog = Join-Path $logDir "api-r2p3d-r3.log"
    $cmd = 'cmd.exe /c set "DATABASE_URL=postgresql+asyncpg://pli:pli_dev_password@localhost:55679/pli" && set "PLI_ENV=dev" && "E:\AI\Pet Life Intelligence\.venv\Scripts\python.exe" -m uvicorn app.main:app --app-dir "E:\AI\Pet Life Intelligence\services\api" --host 127.0.0.1 --port 8800 > "' + $apiLog + '" 2>&1'
    $null = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $cmd }
    Start-Sleep -Seconds 8
    Write-Host "  API restarted"
}

Write-Host "== multipet (switch first pet) =="
& $Adb -s $Serial shell am force-stop $pkg 2>&1 | Out-Null
Login "owner@pli.demo"
$dir = Join-Path $out "multipet"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Nav "today" $dir
TapNeedle "pli.multipet.switch.386bfba3-5485-4d4f-90f9-9a775d546259" $dir "id"
Start-Sleep -Seconds 4
Shot "multipet" $dir
UiDump $dir

Write-Host "== empty (nobody@pli.demo, petless) =="
Login "nobody@pli.demo"
$dir = Join-Path $out "empty"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Nav "today" $dir

Write-Host "== attention (demo-attn@pli.dev, URGENT) =="
Login "demo-attn@pli.dev"
$dir = Join-Path $out "attention"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Nav "today" $dir

Write-Host "== back to owner =="
Login "owner@pli.demo"

Write-Host "== build visual.json per screen =="
Get-ChildItem $out -Directory | ForEach-Object {
    $dir = $_.FullName
    if (Test-Path (Join-Path $dir "ui.xml")) {
        & $py (Join-Path $repo "scripts\blind-ui\android_extract.py") $dir 2>&1 | ForEach-Object { Write-Host "  $_" }
    }
}
Write-Host "== done -> $out =="