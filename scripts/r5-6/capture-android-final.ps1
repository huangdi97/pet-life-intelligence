# capture-android-final.ps1 — R5.6 final Android runtime evidence.
#
# Captures the canonical owner surfaces after the LAST source commit:
# Today / Timeline / Pet / Life View / Twin Review / Health / Assistant / Me.
# No vision model. Evidence = screenshot + UIAutomator + runtime manifest
# where a real 3D stage is present.
#
# Required preconditions:
# - existing API36 AVD is running;
# - demo-capable APK is installed;
# - local API is reachable by the emulator;
# - repo-local Python venv exists for android_extract.py.
param(
    [string]$Out = "artifacts\r5-6-final\android",
    [string]$Adb = "adb",
    [string]$Serial = "emulator-5554",
    [string]$Package = "com.pli.mobile",
    [string]$LoginEmail = "owner@pli.demo",
    [string]$SecondaryPetLabel = ""
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false
$repo = (Get-Location).Path
$out = Join-Path $repo $Out
$py = Join-Path $repo ".venv\Scripts\python.exe"

function Invoke-Adb([string[]]$Args) {
    & $Adb -s $Serial @Args | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "adb failed: $($Args -join ' ')" }
}

function Shot([string]$Name, [string]$Dir) {
    $dest = Join-Path $Dir "$Name.png"
    & cmd.exe /c "`"$Adb`" -s $Serial exec-out screencap -p > `"$dest`"" | Out-Null
    if (!(Test-Path $dest) -or (Get-Item $dest).Length -lt 1024) {
        throw "invalid screenshot: $dest"
    }
}

function UiDump([string]$Dir) {
    Invoke-Adb @("shell", "uiautomator", "dump", "/sdcard/pli_final_ui.xml")
    Invoke-Adb @("pull", "/sdcard/pli_final_ui.xml", (Join-Path $Dir "ui.xml"))
}

function Manifest([string]$Dir) {
    $dest = Join-Path $Dir "3d.json"
    $raw = (& $Adb -s $Serial shell cat /data/data/$Package/files/pli_manifest.json 2>$null | Out-String).Trim()
    if ($raw.StartsWith("{")) {
        [System.IO.File]::WriteAllText($dest, $raw, [System.Text.UTF8Encoding]::new($false))
    } else {
        [System.IO.File]::WriteAllText($dest, "{}", [System.Text.UTF8Encoding]::new($false))
    }
}


function Tap-ByText([string]$Text, [string]$Dir) {
    if ([string]::IsNullOrWhiteSpace($Text)) { throw "text target is required" }
    UiDump $Dir
    $tapScript = Join-Path $repo "scripts\\blind-ui\\android_tap.py"
    & $py $tapScript (Join-Path $Dir "ui.xml") $Text "text" $Adb $Serial | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "failed to tap text target: $Text" }
}

function Nav([string]$Screen) {
    Invoke-Adb @("shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", "pli-demo://nav?screen=$Screen", "$Package/.MainActivity")
    Start-Sleep -Seconds 7
}

function Capture-Surface([string]$Screen, [bool]$NeedsManifest = $false) {
    $dir = Join-Path $out $Screen
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Nav $Screen
    UiDump $dir
    Shot $Screen $dir
    if ($NeedsManifest) { Manifest $dir }

    if (Test-Path $py) {
        & $py (Join-Path $repo "scripts\blind-ui\android_extract.py") $dir | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "android_extract failed: $Screen" }
    }
    Write-Host "captured $Screen"
}

New-Item -ItemType Directory -Force -Path $out | Out-Null

# Deterministic demo login. Production builds do not expose this deep link.
Invoke-Adb @("shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", "pli-demo://login?email=$LoginEmail", "$Package/.MainActivity")
Start-Sleep -Seconds 8

$surfacePlan = @(
    @{ name = "today"; manifest = $true },
    @{ name = "timeline"; manifest = $false },
    @{ name = "pet"; manifest = $true },
    @{ name = "lifeview"; manifest = $true },
    @{ name = "twinreview"; manifest = $true },
    @{ name = "health"; manifest = $false },
    @{ name = "assistant"; manifest = $false },
    @{ name = "me"; manifest = $false }
)

foreach ($surface in $surfacePlan) {
    Capture-Surface $surface.name $surface.manifest
}

# Twin Review camera truth: these controls already drive the real embedded
# camera. Capture each required view rather than synthesizing a turntable.
$reviewDir = Join-Path $out "twinreview"
Nav "twinreview"
UiDump $reviewDir
foreach ($view in @("front", "side", "back")) {
    $tapScript = Join-Path $repo "scripts\blind-ui\android_tap.py"
    & $py $tapScript (Join-Path $reviewDir "ui.xml") "pli.twinreview.view.$view" "id" $Adb $Serial | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "failed to tap twin review view: $view" }
    Start-Sleep -Seconds 3
    Manifest $reviewDir
    Copy-Item (Join-Path $reviewDir "3d.json") (Join-Path $reviewDir "3d_view_$view.json") -Force
    Shot "twin_$view" $reviewDir
    UiDump $reviewDir
}


# Secondary-pet sanity/review is mandatory when a label is supplied.
# The script intentionally does not hard-code an owner pet name; pass the
# current demo label from the runtime fixture, e.g. -SecondaryPetLabel <label>.
if (-not [string]::IsNullOrWhiteSpace($SecondaryPetLabel)) {
    $sanityDir = Join-Path $out "secondary-sanity"
    New-Item -ItemType Directory -Force -Path $sanityDir | Out-Null
    Nav "today"
    Tap-ByText $SecondaryPetLabel $sanityDir
    Start-Sleep -Seconds 8
    UiDump $sanityDir
    Shot "secondary_today" $sanityDir
    Manifest $sanityDir

    $secondaryReviewDir = Join-Path $out "secondary-review"
    New-Item -ItemType Directory -Force -Path $secondaryReviewDir | Out-Null
    Nav "twinreview"
    UiDump $secondaryReviewDir
    Shot "secondary_twinreview" $secondaryReviewDir
    Manifest $secondaryReviewDir
    foreach ($view in @("front", "side", "back")) {
        $tapScript = Join-Path $repo "scripts\\blind-ui\\android_tap.py"
        & $py $tapScript (Join-Path $secondaryReviewDir "ui.xml") "pli.twinreview.view.$view" "id" $Adb $Serial | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "failed secondary review view: $view" }
        Start-Sleep -Seconds 3
        Manifest $secondaryReviewDir
        Copy-Item (Join-Path $secondaryReviewDir "3d.json") (Join-Path $secondaryReviewDir "3d_view_$view.json") -Force
        Shot "secondary_$view" $secondaryReviewDir
        UiDump $secondaryReviewDir
    }
}

Write-Host "R5.6 Android final evidence complete: $out"
