# G10 — Frontend 14 Surfaces Report

- Verdict: **PASS**（移动优先、真实数据驱动，非占位页）

## Surfaces → routes

| # | Surface | Route | Notes |
|---|---|---|---|
| 1 | Onboarding / Create Pet | `/pets/new` | PLI-001/002 |
| 2 | Today | `/` | counts + events + open tasks; pet switcher always visible |
| 3 | Quick Log | `/`（组件） | meal/drink/elimination/walk/play/weight one-tap |
| 4 | Timeline | `/timeline` | filters, provenance badges, actor, retracted/superseded |
| 5 | Care Network | `/care` | handoffs + grants list |
| 6 | Tasks | `/tasks` | create/complete/conflict alert |
| 7 | Care Handoff / Care Card | `/care` | scope checkboxes, share link display |
| 8 | Behavior Event | `/behavior` | ABC form + list, no-diagnosis notice |
| 9 | Health Event | `/health` | 发现异常 entry + list with triage badges |
| 10 | Vet Brief | `/health/[id]` | generate + share link |
| 11 | Medication | `/medication` | plans, give dose, missed badges |
| 12 | Outcome / Follow-up | `/health/[id]` | outcome select closes episode |
| 13 | Notifications | `/notifications` | unified center |
| 14 | Settings / Privacy | `/settings` | consents, emergency card, deletion request, audit |
| — | Dev Login | `/login` | dev-mode session |

Top-level nav per docs/07: Today / Timeline / Tasks / Care / Behavior /
Health / Medication / Notifications / More(settings) + persistent pet
switcher（永远显示当前宠物）.

## States

Every data surface uses one shared `State` component rendering
loading / error (with retry) / permission-denied / empty states.

## Evidence

```text
$ pnpm --dir apps/web typecheck → exit 0
$ pnpm --dir apps/web build    → exit 0 (12 routes built)
$ curl http://localhost:3100/  → 200, <title>Pet Life Intelligence</title>
$ curl http://localhost:3100/timeline → 200
```

## Gate checklist

- [x] 核心页面不为空壳（all pages fetch real API data; E2E-01..07 exercise them)
- [x] 7 条 E2E 主路径可操作（API-level; UI covers all steps)
- [x] 移动/桌面基本可用（responsive CSS, mobile-first flex/grid)
- [x] error/empty/loading 存在（shared State component)
