# capture-android-r4-2-live.ps1 — live R4.2 Android evidence (app is running).
# Uses adb pull for screenshots (binary-safe) + CDP (webview_devtools) for the
# RUNTIME manifest via document.title (release-proof channel). No vision model.
param(
    [string]$Adb = "D:\\Code\\Android\\SDK\\platform-tools\\adb.exe",
    [string]$Serial = "emulator-5554",
    [string]$Out = "artifacts\\r2p3d-r4-2\\android"
)
$repo = (Get-Location).Path
$out = Join-Path $repo $Out
$pkg = "com.pli.mobile"
$cdp = "http://localhost:9222/json"
New-Item -ItemType Directory -Force -Path $out | Out-Null

function Shot([string]$name, [string]$dir) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    & $Adb -s $Serial shell screencap -p /sdcard/pli_shot.png 2>&1 | Out-Null
    & $Adb -s $Serial pull /sdcard/pli_shot.png (Join-Path $dir "$name.png") 2>&1 | Out-Null
    Write-Host "  shot $name"
}
function ManifestCdp([string]$dir, [string]$file = "3d.json") {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    try {
        $targets = Invoke-RestMethod -Uri $cdp -TimeoutSec 6
        $title = $targets[0].title
        if ($title -like "PLI_MANIFEST:*") {
            $json = $title.Substring(12)
            [System.IO.File]::WriteAllText((Join-Path $dir $file), [System.Net.WebUtility]::HtmlDecode($json), [System.Text.UTF8Encoding]::new($false))
            Write-Host "  manifest $file OK"
            return
        }
    } catch { Write-Host "  manifest CDP err: $($_.Exception.Message)" }
    [System.IO.File]::WriteAllText((Join-Path $dir $file), "{}", [System.Text.UTF8Encoding]::new($false))
    Write-Host "  manifest $file EMPTY"
}
function Nav([string]$screen) {
    & $Adb -s $Serial shell am start -a android.intent.action.VIEW -d "pli-demo://nav?screen=$screen" $pkg/.MainActivity 2>&1 | Out-Null
    Start-Sleep -Seconds 18
}
function TapByDesc([string]$needle) {
    & $Adb -s $Serial shell uiautomator dump /sdcard/pli_ui.xml 2>&1 | Out-Null
    & $Adb -s $Serial pull /sdcard/pli_ui.xml "$env:PI_SCRATCH_DIR\pli_ui.xml" 2>&1 | Out-Null
    & (Join-Path $repo ".venv\Scripts\python.exe") (Join-Path $repo "scripts\blind-ui\android_tap.py") "$env:PI_SCRATCH_DIR\pli_ui.xml" $needle "desc" $Adb $Serial 2>&1 | Out-Null
}

Write-Host "== today =="
$d = Join-Path $out "today"; Nav "today"; Shot "today" $d; ManifestCdp $d

Write-Host "== pet =="
$d = Join-Path $out "pet"; Nav "pet"; Shot "pet" $d; ManifestCdp $d

Write-Host "== lifeview =="
$d = Join-Path $out "lifeview"; Nav "lifeview"; Start-Sleep -Seconds 4; Shot "lifeview" $d; ManifestCdp $d "3d.json"
ManifestCdp $d "3d_rotate_a.json"
& $Adb -s $Serial shell input swipe 540 900 800 900 400 2>&1 | Out-Null
Start-Sleep -Seconds 5
ManifestCdp $d "3d_rotate_b.json"; Shot "lifeview_b" $d

Write-Host "== twinreview (front/side/back) =="
$d = Join-Path $out "twinreview"; Nav "twinreview"; Start-Sleep -Seconds 4
Shot "twinreview" $d; ManifestCdp $d
TapByDesc "正面"; Start-Sleep -Seconds 5; ManifestCdp $d "3d_view_front.json"; Shot "twin_front" $d
TapByDesc "侧面"; Start-Sleep -Seconds 5; ManifestCdp $d "3d_view_side.json"; Shot "twin_side" $d
TapByDesc "背面"; Start-Sleep -Seconds 5; ManifestCdp $d "3d_view_back.json"; Shot "twin_back" $d

Write-Host "== mimi (switch pet via today header) =="
$d = Join-Path $out "mimi-sanity"; Nav "today"; Start-Sleep -Seconds 4
TapByDesc "咪咪"; Start-Sleep -Seconds 25
Shot "mimi_today" $d; ManifestCdp $d
Write-Host "== mimi twinreview =="
$d = Join-Path $out "mimi-review"; Nav "twinreview"; Start-Sleep -Seconds 4
TapByDesc "正面"; Start-Sleep -Seconds 5; ManifestCdp $d "3d_view_front.json"; Shot "mimi_front" $d
TapByDesc "侧面"; Start-Sleep -Seconds 5; ManifestCdp $d "3d_view_side.json"; Shot "mimi_side" $d
TapByDesc "背面"; Start-Sleep -Seconds 5; ManifestCdp $d "3d_view_back.json"; Shot "mimi_back" $d

Write-Host "== done =="
