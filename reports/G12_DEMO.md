# G12 — Demo Seed Report

- Verdict: **PASS**

## Seed contents (python -m app.seed)

- Household: Demo Family
- Users: owner@pli.demo (OWNER), family@pli.demo (FAMILY), sitter@pli.demo
  (temporary caregiver with an EXPIRED historical grant)
- Pet A: Coco (dog, Corgi) — meal/walk/weight events, daily feeding task
  (repeats), behavior event (ABC), Doxycycline plan (2/day, one dose given)
- Pet B: Mimi (cat, DLH) — elimination event, non-emergency ear health
  event (triage MONITOR + intake answer + owner observation + outcome
  IMPROVED), emergency red-flag sample (urinary obstruction → triage
  EMERGENCY)
- Reset: the seed wipes all tables first, so `scripts/reset-demo.ps1` gives
  a clean reproducible state.

## Reproduce the 7 E2E paths

Automated proof: `pytest tests/e2e -q` (7 passed) — see reports/TEST_REPORT.md.

Manual demo (PowerShell):

```powershell
cd "E:\AI\Pet Life Intelligence"
.\scripts\dev.ps1            # compose + migrate + seed + API 8800 + web 3100 + worker
# open http://localhost:3100/login → login owner@pli.demo
# E2E-01: Today 页 Quick Log → Timeline 查 provenance
# E2E-02/03: Tasks 页创建/完成任务；第二账号 family@pli.demo 完成同一任务看冲突
# E2E-04: Care 页发起 Handoff（用 family 用户的 uuid）→ 生成 Care Card
# E2E-05: Health 页“发现异常”→ 输入“反复进猫砂盆但几乎尿不出来”→ EMERGENCY 红旗 → Vet Brief
# E2E-06: Medication 页建计划/给药；Outcome 在健康事件详情页
# E2E-07: Behavior 页记录 ABC
.\scripts\reset-demo.ps1     # 任何时候重置演示数据
```

## Gate checklist

- [x] 新环境可 seed（fresh pli_test migration + seed exercised every CI run)
- [x] Demo 数据可重置（reset-demo.ps1)
- [x] 7 条主路径可复现（pytest tests/e2e 7 passed)
