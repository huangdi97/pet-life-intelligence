# Stage V.2 Issue Ledger — 全仓质量收口

> 生成于 2026-09-24（Stage V.2 最终收口轮）。上一版 `STAGE_V_ISSUE_LEDGER.md` 的开放项在本轮全部处置。
> 列：ID / Category / Severity / Evidence / File / Status / Fix / Test / Remaining Risk。
> 基线：真实命令证据见 `STAGE_V2_FULL_CODEBASE_REVIEW.md` 与 `WORK_STATUS.md`（command/date/duration/result）。

## 本轮新增/承接项

| ID | Category | Severity | Evidence | File | Status | Fix | Test | Remaining Risk |
|---|---|---|---|---|---|---|---|---|
| SV-006 | Architecture | P3（承接） | 工作树已删除 `apps/mobile/src/services/api.ts`；全仓 grep `services/api` 仅剩 `src/api.ts` 文档注释（指后端服务路径，非导入）；11 个消费方统一从 `../api` / `./api` 单一契约层导入 | apps/mobile | **CLOSED** | 完成单一契约层整合：删除双 API 层中的 `src/services/api.ts`，统一引用 `src/api.ts`（类型经 `src/services/types.ts` 复用），修复拆分遗留的 `TodayResp` 缺失导入（`TodayScreen.tsx`） | `pnpm --dir apps/mobile typecheck` → 0 errors | 低（后续若引入新端契约，需复用同一层，不得再造第二层） |
| SV-007 | Security | SHOULD_FIX（承接） | 原限流为 `app.main` 内 in-process deque，多 uvicorn worker 各自独立预算；`rate_limit_backend` 此前不存在 | services/api/app/core/rate_limit.py；app/main.py；app/core/config.py | **CLOSED** | Redis 分布式（INCR+EXPIRE 固定窗口）+ in-process 回退 adapter；backend 三态 `auto`/`redis`/`in_process`；`auto` 下 Redis 不可达时记录日志并回退；`redis` 显式选择时启动 fail-fast；配置集中 `rate_limit_enabled` / `rate_limit_per_minute` / `rate_limit_backend` / `redis_url`；中间件仅对写方法（POST/PUT/DELETE）在启用时限流，超限返回 429 `RATE_LIMITED` | `tests/unit/test_rate_limit.py`：7 个用例覆盖 in-process 窗口/额度/键隔离、Redis 计数+TTL、backend 选择、auto 回退、redis fail-fast；本地测试不依赖常驻 Redis（当前 Redis 未监听，回退路径真实通过）；全量 pytest 含该文件 | 低（分布式限流的一致性窗口为固定窗口；若未来要求滑动窗口精确性，需升级为 Lua 脚本） |

## 历史项收口确认（承接自 STAGE_V_ISSUE_LEDGER.md）

| ID | Category | Severity | Evidence | File | Status | Fix | Test | Remaining Risk |
|---|---|---|---|---|---|---|---|---|
| SV-004 | Chore | P3 | 备份已归档至 `artifacts/archive/`，`_backup` 目录已清空 | — | CLOSED（承接确认） | 上一轮已完成归档 | 上一轮回归 | 无 |
| SV-005 | Style | P2 | `patch_ga2b` 语法已修复，ruff 已复核 | scripts/ | CLOSED（承接确认） | 上一轮已修复 | 上一轮 ruff | 无 |

## 统计

- **P0 = 0 / P1 = 0（剩余）**
- **SV-006 = CLOSED、SV-007 = CLOSED**；无剩余 OPEN 项。
- 新增说明：`reports/STAGE_V_ISSUE_LEDGER.md`（上一轮）中的 SV-006/SV-007 状态由本表覆盖（该文件历史数字保留为审计轨迹，不作为最终证据）。
