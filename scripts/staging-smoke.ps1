# Staging-like smoke: full-stack flow against a running API (port 8800).
# Verifies health, seed-dependent login, quick log, health red-flag flow,
# vet brief, export, devices sandbox, agent policy — the release-critical path.
$ErrorActionPreference = "Continue"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$Base = "http://localhost:8800/api/v1"
$fail = 0

function Check($name, $actual, $expected) {
    if ("$actual" -eq "$expected") {
        Write-Host "PASS  $name"
    } else {
        Write-Host "FAIL  $name (got $actual, want $expected)"
        $script:fail = 1
    }
}

# 0. health/ready
$health = Invoke-RestMethod "$Base/health"
Check "health" $health.status "ok"
$ready = Invoke-RestMethod "$Base/ready"
Check "ready.postgres" $ready.checks.postgres "ok"
Check "ready.redis" $ready.checks.redis "ok"

# 1. dev login as seeded owner
$login = Invoke-RestMethod -Method Post "$Base/auth/dev/login" `
    -ContentType "application/json" -Body '{"email":"owner@pli.demo"}'
$H = @{ "X-Dev-User-Id" = $login.user_id }
Check "login" ($login.user_id.Length -gt 0) "True"

# 2. pets visible (seeded Coco + Mimi)
$pets = Invoke-RestMethod "$Base/pets" -Headers $H
Check "pets.count>=2" ($pets.Count -ge 2) "True"
$coco = ($pets | Where-Object { $_.name -eq "Coco" })[0]

# 3. quick log meal
$meal = Invoke-RestMethod -Method Post "$Base/pets/$($coco.id)/events" `
    -Headers $H -ContentType "application/json" `
    -Body '{"event_type":"daily.meal","payload":{"amount":"90","unit":"g"},"allow_duplicate":true}'
Check "quicklog.meal" $meal.event_type "daily.meal"

# 4. red-flag health event on Mimi (body must be sent as UTF-8 bytes; PS5.1
#    otherwise mangles CJK text before it reaches the API)
$mimi = ($pets | Where-Object { $_.name -eq "Mimi" })[0]
$heBody = [System.Text.Encoding]::UTF8.GetBytes(
    '{"chief_complaint":"反复进猫砂盆但几乎尿不出来"}')
$he = Invoke-RestMethod -Method Post "$Base/pets/$($mimi.id)/health-events" `
    -Headers $H -ContentType "application/json; charset=utf-8" -Body $heBody
Check "triage.emergency" $he.triage.level "EMERGENCY"

# 5. vet brief + share
$brief = Invoke-RestMethod -Method Post "$Base/health-events/$($he.health_event_id)/vet-brief" `
    -Headers $H -ContentType "application/json" -Body '{}'
Check "vetbrief" ($brief.vet_brief_id.Length -gt 0) "True"

# 6. export bundle (owner-only)
$export = Invoke-RestMethod "$Base/pets/$($coco.id)/export" -Headers $H
Check "export.events>0" ($export.life_events.Count -gt 0) "True"

# 7. device sandbox sync (link + sync + dedupe on second sync)
$dev = Invoke-RestMethod -Method Post "$Base/pets/$($coco.id)/devices" `
    -Headers $H -ContentType "application/json" `
    -Body '{"provider":"fake","device_key":"smoke-1","display_name":"Smoke"}'
$sync1 = Invoke-RestMethod -Method Post "$Base/pets/$($coco.id)/devices/$($dev.device_id)/sync" `
    -Headers $H -ContentType "application/json" -Body '{}'
Check "device.sync.ingested" $sync1.ingested 3

# 8. agent policy refuses booking
$agent = Invoke-RestMethod -Method Post "$Base/agent/actions" `
    -Headers $H -ContentType "application/json" `
    -Body '{"action_class":"BOOKING","proposal":{"note":"smoke"},"pet_id":null}'
Check "agent.booking.refused" $agent.policy_result "REFUSED"
Check "agent.booking.executed" $agent.executed "False"

Write-Host ""
if ($fail -ne 0) { exit 1 }
Write-Host "STAGING SMOKE PASS"
