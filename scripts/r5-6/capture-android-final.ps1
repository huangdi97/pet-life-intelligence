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
    [string]$SecondaryPetLabel = "",
    [string]$Cdp = "http://localhost:9222/json"
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false
$repo = (Get-Location).Path
$out = [System.IO.Path]::GetFullPath((Join-Path $repo $Out))
$repoRoot = [System.IO.Path]::GetFullPath($repo).TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
if (-not $out.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Out must stay inside the current repository: $out"
}
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

function Read-RuntimeManifestRaw() {
    # Preferred channel for demo/debug APKs: app-private file via run-as.
    $raw = (& $Adb -s $Serial shell run-as $Package cat files/pli_manifest.json 2>$null | Out-String).Trim()
    if ($raw.StartsWith("{")) { return $raw }

    # Compatibility fallback for emulator images that expose /data/data.
    $raw = (& $Adb -s $Serial shell cat /data/data/$Package/files/pli_manifest.json 2>$null | Out-String).Trim()
    if ($raw.StartsWith("{")) { return $raw }

    # Release-proof fallback used by the embedded WebView: document.title
    # contains PLI_MANIFEST:<json>. If a devtools socket is available, read it.
    try {
        $targets = Invoke-RestMethod -Uri $Cdp -TimeoutSec 4
        foreach ($target in @($targets)) {
            if ($target.title -like "PLI_MANIFEST:*") {
                return [System.Net.WebUtility]::HtmlDecode($target.title.Substring(13))
            }
        }
    } catch {
        # Retry loop in Manifest() handles transient absence.
    }
    return ""
}

function Manifest([string]$Dir) {
    $dest = Join-Path $Dir "3d.json"
    for ($attempt = 0; $attempt -lt 8; $attempt++) {
        $raw = Read-RuntimeManifestRaw
        if ($raw.StartsWith("{")) {
            try {
                $m = $raw | ConvertFrom-Json
                $isRuntime = $m.manifestOrigin -eq "RUNTIME"
                $isReady = $m.ready -eq $true
                $isProductTwin = $m.representation -eq "high-fidelity-glb-twin"
                $isFallback = $m.fallbackUsed -eq $true
                if ($isRuntime -and $isReady -and $isProductTwin -and -not $isFallback) {
                    [System.IO.File]::WriteAllText($dest, $raw, [System.Text.UTF8Encoding]::new($false))
                    return
                }
            } catch {
                # Invalid/transient JSON; retry.
            }
        }
        Start-Sleep -Seconds 2
    }
    throw "required high-fidelity RUNTIME 3D manifest unavailable or invalid: $dest"
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

if ([string]::IsNullOrWhiteSpace($SecondaryPetLabel)) {
    throw "SecondaryPetLabel is required for the final R5.6 evidence package."
}

if (Test-Path $out) {
    Remove-Item -Recurse -Force $out
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

$captureManifest = [ordered]@{
    captured_at = [DateTime]::UtcNow.ToString("o")
    source_head = (& git -C $repo rev-parse HEAD | Out-String).Trim()
    source_branch = (& git -C $repo branch --show-current | Out-String).Trim()
    serial = $Serial
    package = $Package
    vision_model_used = $false
    required_secondary_pet = $true
}
$captureManifestJson = $captureManifest | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText(
    (Join-Path $out "capture-manifest.json"),
    $captureManifestJson + [Environment]::NewLine,
    [System.Text.UTF8Encoding]::new($false)
)

Write-Host "R5.6 Android final evidence complete: $out"
