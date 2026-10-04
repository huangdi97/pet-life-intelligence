# EMPTY_LOADING_ERROR_STATES — R5.6 Truthful State Language

> Authority: canonical v3.4-R1 master + R5.5 implementation master.
> Status: SOURCE DESIGN CLOSED / runtime evidence pending.

## 1. Canonical state vocabulary

Owner surfaces use a shared state model:

- Loading / Skeleton
- Empty
- Partial
- Populated
- Error
- Offline
- Permission denied
- Not found
- Feature unavailable
- External unavailable
- Safety blocked

These states are semantic, not cosmetic. Missing data is never silently presented as “normal”.

## 2. State rules

| State | Meaning | Required owner treatment |
|---|---|---|
| Loading | Initial facts are not ready | Skeleton or retained previous content; avoid full-page spinner when possible |
| Empty | Valid scope, no records yet | Explain what the empty state means + one next action |
| Partial | Some facts available, some missing | Preserve available facts and explicitly mark what is unavailable |
| Populated | Required facts available | Normal product composition |
| Error | Product request failed | Human-readable explanation + retry/recovery |
| Offline | Network is known unavailable | Explain cached/local behavior honestly |
| Permission denied | User/system denied required access | Explain why permission matters + route to recovery |
| Not found | Resource/route does not exist or is inaccessible as designed | Dedicated not-found state; generic error boundary must not swallow it |
| Feature unavailable | Capability is intentionally not supported on this client | Explain capability boundary and alternate route if available |
| External unavailable | Device/provider/external dependency unavailable | Keep product usable where possible; do not fabricate success |
| Safety blocked | Action intentionally blocked by safety/policy | Explain the block and safe next step |

## 3. Truth invariants

- no-device != offline;
- cached != live;
- generated Twin != scan;
- missing sensor value != normal;
- unknown state != healthy;
- request failure != permission denied;
- unavailable hardware != command success;
- an unknown pet 404 must not become a generic crash screen.

## 4. Empty-state writing pattern

`meaning → why it is empty → next useful action`

Examples:

- Timeline: “时间线还很安静。第一次喂食、散步或健康记录会从这里开始。” → 快速记录
- Training: “还没有训练目标。记录它正在学习的第一件事。” → 创建目标
- Today: “今天还没有足够记录。” Do not invent a normal-status summary.
- Monitoring: “还没有连接支持的设备。” Do not show offline when no device exists.
- Twin: “还没有可确认的 3D 形象。” → 收集素材 / 查看要求

## 5. Loading

Prefer:

1. retained previous facts when safe;
2. local skeleton matching the final layout;
3. subtle scoped progress.

Avoid a large blank card with a centered spinner.

## 6. Error

Owner copy contains:

- what failed in owner language;
- whether existing data remains usable;
- one recovery action;
- optional secondary route.

Exception text, stack traces, provider names and internal codes stay in logs.

## 7. Offline / cached

When cached data is shown:

- mark it as cached/last updated;
- never label it LIVE;
- write actions through the real offline queue only if that queue exists.

## 8. Permission

Permission requests must be contextual. Explain the benefit before the OS prompt where possible. A denied state must remain usable for non-dependent capabilities.

## 9. Client capability states

Mini may legitimately show `Feature unavailable` for interactive high-fidelity 3D while preserving Twin status/version and routing to capable clients. This is a truthful capability boundary, not an error.

## 10. Acceptance

Every core owner page must expose all states applicable to its data and external dependencies. Machine tests may assert semantics; final wording/hierarchy remains subject to product review.
