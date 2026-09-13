# G15 — Final Staging Smoke (Stage D Phase 14)

- Date: 2026-09-13
- Verdict: **PASS**
- 前提：服务重启加载最新 commit（head 61da455+）；`python -m app.seed` 重置确定性数据。

## Run（scripts/staging_smoke.py，Python UTF-8 权威判定）

```text
PASS  health
PASS  ready.postgres
PASS  ready.redis
PASS  login
PASS  pets.count>=2
PASS  quicklog.meal
PASS  triage.emergency
PASS  vetbrief
PASS  export.events>0
PASS  device.sync.ingested
PASS  agent.booking.refused
PASS  agent.booking.executed
STAGING SMOKE PASS   (12/12)
```

## GOAL Phase 14 覆盖对照

- health ✓ / auth ✓ / pet ✓ / timeline ✓（export+timeline 读）/ task（E2E-02 浏览器层）/
  care（care card via E2E-05 + device sync）/ health（red-flag triage）✓ /
  vet brief ✓ / medication（E2E-04 浏览器层）/ behavior（E2E-06 浏览器层）/
  notification（G12/G10 审计链）/ capability registry（/capabilities G16 测试）/
  EXTERNAL_BLOCKED 路径（G08: device provider petkit → 403 EXTERNAL_BLOCKED）✓

## 编码纪律

- 中文请求体一律经 Python httpx（UTF-8）；PowerShell 5.1 中文 body 编码问题
  已知（scripts/staging-smoke.ps1 中已改 UTF-8 bytes 并注明 Python 为权威判定）。
