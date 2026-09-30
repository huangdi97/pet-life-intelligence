# capture-android.ps1 — blind capture of all owner screens on the running
# emulator (main acceptance runtime). Per screen writes screenshot.png,
# ui.xml (uiautomator), 3d.json (manifest via logcat), then android_extract.py
# builds layout.json / visual.json / report.md.
#
# No vision model: geometry/text come from the uiautomator accessibility tree,
# manifest from the [plimanifest] logcat channel (see Pet3DViewer).
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

function Manifest([string]$dir) {
    $hit = (& $Adb -s $Serial logcat -d -s ReactNativeJS:I 2>&1 | Select-String -Pattern "plimanifest" | Select-Object -Last 1)
    if ($null -ne $hit -and $hit.ToString() -match "\[plimanifest\] (.+)$") {
        [System.IO.File]::WriteAllText((Join-Path $dir "3d.json"), $Matches[1], [System.Text.UTF8Encoding]::new($false))
        return
    }
    [System.IO.File]::WriteAllText((Join-Path $dir "3d.json"), "{}", [System.Text.UTF8Encoding]::new($false))
}

function DismissAnr() {
    $xml = (& $Adb -s $Serial shell uiautomator dump /sdcard/anr.xml 2>&1 | Out-String)
    if ($xml -match "isn't responding|unresponsive|无响应|未响应") {
        & $Adb -s $Serial shell input keyevent 22 2>&1 | Out-Null
        & $Adb -s $Serial shell input keyevent 66 2>&1 | Out-Null
        Start-Sleep -Seconds 3
    }
}

function Nav([string]$screen, [string]$dir, [int]$wait = 10, [switch]$ScrollMerge) {
    DismissAnr
    & $Adb -s $Serial logcat -c 2>&1 | Out-Null
    & $Adb -s $Serial shell am start -a android.intent.action.VIEW -d "pli-demo://nav?screen=$screen" $pkg/.MainActivity 2>&1 | Out-Null
    Start-Sleep -Seconds $wait
    Shot (Split-Path $dir -Leaf) $dir
    UiDump $dir
    if ($ScrollMerge) {
        # Long screens: scroll down and take a second dump so below-the-fold
        # contract elements (pet friends/caregivers, me settings, etc.) enter
        # the accessibility tree; android_extract.py merges both dumps.
        & $Adb -s $Serial shell input swipe 540 1800 540 500 500 2>&1 | Out-Null
        Start-Sleep -Seconds 2
        UiDump $dir "ui_bottom.xml"
    }
    Manifest $dir
}

function Login([string]$email) {
    & $Adb -s $Serial shell am start -a android.intent.action.VIEW -d "pli-demo://login?email=$email" $pkg/.MainActivity 2>&1 | Out-Null
    Start-Sleep -Seconds 6
}

function TapByText([string]$needle, [string]$dir) {
    $xml = Join-Path $dir "ui.xml"
    if (-not (Test-Path $xml)) { return }
    $raw = Get-Content -Raw -Encoding UTF8 $xml
    $m = [regex]::Match($raw, '<node[^>]*content-desc="[^"]*' + [regex]::Escape($needle) + '[^"]*"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"')
    if (-not $m.Success) { return }
    $x = ([int]$m.Groups[1].Value + [int]$m.Groups[3].Value) / 2
    $y = ([int]$m.Groups[2].Value + [int]$m.Groups[4].Value) / 2
    & $Adb -s $Serial shell input tap ([int]$x) ([int]$y) 2>&1 | Out-Null
}


Write-Host "== verify device =="
$d = (& $Adb devices 2>$null | Out-String)
if ($d -notmatch "$Serial\s+device") { Write-Host "DEVICE NOT READY: $d"; exit 1 }

Login "owner@pli.demo"
& $Adb -s $Serial shell am force-stop $pkg 2>&1 | Out-Null
& $Adb -s $Serial logcat -c 2>&1 | Out-Null
& $Adb -s $Serial shell am start -n $pkg/.MainActivity 2>&1 | Out-Null
Start-Sleep -Seconds 40
foreach ($sc in $screens) {
    $dir = Join-Path $out $sc.n
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Write-Host "== $($sc.n) =="
    # Long content screens get a scroll-merge second dump so below-the-fold
    # contract elements enter the accessibility tree.
    $scroll = @("pet", "me", "welfare", "quicklog", "health", "companion", "timeline", "twinversion") -contains $sc.n
    Nav $sc.s $dir 10 -ScrollMerge:$scroll
    if ($sc.n -eq "quicklog") {
        # Open the light form by tapping the first primary tile (喂食) so
        # pli.quicklog.form / save / feedback are present in the tree.
        TapByText "喂食" $dir
        Start-Sleep -Seconds 2
        UiDump $dir
        Shot "quicklog_form" $dir
    }
}

Write-Host "== twinreview (interaction: 不像 selected) =="
$dir = Join-Path $out "twinreview"
& $Adb -s $Serial shell am start -a android.intent.action.VIEW -d "pli-demo://nav?screen=twinreview" $pkg/.MainActivity 2>&1 | Out-Null
Start-Sleep -Seconds 10
TapByText "不像" $dir
Start-Sleep -Seconds 2
UiDump $dir
Shot "twinreview_b" $dir
Write-Host "== lifeview rotation proof (a/b) =="
$dir = Join-Path $out "lifeview"
& $Adb -s $Serial shell input swipe 540 900 900 900 400 2>&1 | Out-Null
Start-Sleep -Seconds 3
Shot "lifeview_b" $dir
Write-Host "== offline (API stopped = real network failure) =="
$apiPid = (Get-NetTCPConnection -LocalPort 8800 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)
if ($apiPid) {
    # Kill the actual port owner (the python/uvicorn process), not a cmd wrapper.
    & taskkill /F /T /PID $apiPid 2>&1 | Out-Null
    Start-Sleep -Seconds 3
    $dead = curl.exe -s -o NUL -w "%{http_code}" http://localhost:8800/api/v1/system/health
    Write-Host "  stopped API pid $apiPid (health=$dead)"
} else {
    Write-Host "  WARN: no API listener on 8800; offline capture would be meaningless"
}
$dir = Join-Path $out "offline"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
# Warm app already has pets + a successful today load (cachedAt set). Stop the
# API, then switch pet so the refetch fails -> the real offline banner state.
Nav "today" $dir 8
& $Adb -s $Serial shell input tap 300 220 2>&1 | Out-Null
Start-Sleep -Seconds 25
UiDump $dir
Shot "offline" $dir
if ($apiPid) {
    # Restart the API exactly as before (WMI-detached so it survives this shell).
    $cmd = 'cmd.exe /c set "DATABASE_URL=postgresql+asyncpg://pli:pli_dev_password@localhost:55679/pli" && set "PLI_ENV=dev" && "E:\AI\Pet Life Intelligence\.venv\Scripts\python.exe" -m uvicorn app.main:app --app-dir "E:\AI\Pet Life Intelligence\services\api" --host 127.0.0.1 --port 8800 > "C:\Users\Kaiser\.pi-desktop\scratch\ea6fce6e-f578-45cd-aa8f-fb70804eadb7\api-out.log" 2>&1'
    $null = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $cmd }
    Start-Sleep -Seconds 8
    Write-Host "  API restarted"
}
Write-Host "== multipet (switch first pet) =="
# Offline capture left the app petless; restart it fresh with the API up so
# the multi-pet switcher renders both pets again.
& $Adb -s $Serial shell am force-stop $pkg 2>&1 | Out-Null
Login "owner@pli.demo"
$dir = Join-Path $out "multipet"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Nav "today" $dir 10
& $Adb -s $Serial shell input tap 300 220 2>&1 | Out-Null
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