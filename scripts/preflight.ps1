$ErrorActionPreference = "Continue"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host "== PLI PRECHECK =="
Write-Host "Root: $root"

$results = @()

function Check-Tool($name, $command) {
    try {
        $output = Invoke-Expression $command 2>&1
        $results += [PSCustomObject]@{ Tool=$name; Status="PASS"; Detail=($output | Select-Object -First 1) }
    } catch {
        $results += [PSCustomObject]@{ Tool=$name; Status="MISSING"; Detail=$_.Exception.Message }
    }
}

Check-Tool "git" "git --version"
Check-Tool "python" "python --version"
Check-Tool "node" "node --version"
Check-Tool "pnpm" "pnpm --version"
Check-Tool "docker" "docker --version"

$results | Format-Table -AutoSize

Write-Host ""
if (Test-Path ".git") {
    Write-Host "Git repository: YES"
    git status --short
} else {
    Write-Host "Git repository: NO"
}

Write-Host ""
Write-Host "Reference files:"
Get-ChildItem "docs\reference" -ErrorAction SilentlyContinue | Select-Object Name,Length

Write-Host ""
Write-Host "Do not interpret this precheck as a release PASS. It is only Phase 0 evidence."
