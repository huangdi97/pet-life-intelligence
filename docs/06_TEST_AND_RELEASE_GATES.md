# Test & Release Gates

## G0 Preflight
目录 / Git / toolchain / docs。

## G1 Runtime
Web/API/DB/Redis/Object storage 可启动。

## G2 Schema
Migration + seed + idempotency + provenance。

## G3 Permission
Owner / Family / Temporary + expiry + revoke + audit。

## G4 Daily
Today/QuickLog/Tasks/Timeline。

## G5 Care
Handoff/Care Card/access scope。

## G6 Behavior
ABC/event/provenance/media。

## G7 Health
Intake/observable facts/red flag/triage/Vet Brief。

## G8 Medication
Plan/admin/missed/conflict/outcome。

## G9 AI
mock provider + JSON schema + offline eval + safety。

## G10 Frontend
14 surfaces + loading/error/empty/permission denied。

## G11 QA
lint/typecheck/unit/integration/contract/e2e/safety/build。

## G12 Demo
seed + reset + seven E2E flows。

## Release status

`PLI_V0_1_RELEASE_CANDIDATE_READY`
仅当核心 Gates 真实通过。

`PLI_V0_1_IMPLEMENTATION_COMPLETE_EXTERNAL_BLOCKERS`
仅外部服务/远端/密钥阻塞。

`PLI_V0_1_NOT_RELEASE_READY`
核心测试未通过。
