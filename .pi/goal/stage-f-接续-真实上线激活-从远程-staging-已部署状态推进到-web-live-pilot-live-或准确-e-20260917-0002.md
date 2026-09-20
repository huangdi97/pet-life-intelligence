# Goal — Stage F 接续执行（PLI 真实上线激活）

## Goal

在项目 `E:\AI\Pet Life Intelligence`（当前 HEAD `a222563`，无未提交改动除 `scripts/remote_staging_smoke.py` 未跟踪）中，从第一个尚未真正完成的 Stage F Gate 无缝接续，连续执行所有不依赖外部凭证/账号/域名的工作，将 PLI 从“远程 staging 已部署”推进到 `WEB_LIVE` + `PILOT_LIVE`；凡依赖真实外部权限（AI key / SMTP / git remote URL / 独立生产域名 / 平台账号）者，标记为准确的 `EXTERNAL_BLOCKED` 并给出缺失项，绝不伪造 PASS。

已核实的接续基线（真实命令验证）：
- 服务器 `zhishen-tokyo` = `43.153.166.191:62222` 可达，Ubuntu 24.04 + Docker/Compose + Caddy(Let's Encrypt)，sudo NOPASSWD。
- 远程 staging 已上线运行：`pli-api-1`/`pli-worker-1`/`pli-web-1`/`pli-admin-1`/`pli-redis-1`/`pli-postgres-1`（Up 5 hours，healthy）。
- 公网地址：`https://staging.haoleilab.com/pli`(web)、`/pli-api`(api)、`/pli-admin`(admin)，path-prefix 路由。
- 无 git remote、无 AI key、无 SMTP 凭据、无新子域 DNS 控制（历史 blocker 部分已被上一 Agent 解决，以现状为准）。

## Acceptance criteria（全部客观可验证）

1. `reports/STAGE_F_HANDOFF_CURRENT_STATE.md` 生成，包含 §4.1–4.6（Git / 已完成含证据 / 部分完成 / 未开始 / External Blockers / Next Executable Gate），所有判断基于本次重新读取的真实状态（git status、docker ps、真实 HTTP 响应），不得照抄旧 WORK_STATUS 中已过时的 blocker。
2. 公网连通性用真实命令验证并记录：WEB 与 ADMIN 在跟随 Caddy 重定向后返回 200；API `https://staging.haoleilab.com/pli-api/api/v1/health` 返回 200；服务器容器经 ssh 确认 healthy。结果写入报告。
3. `scripts/remote_staging_smoke.py`（未跟踪 → 提交）对远程 staging 完整跑通：register→verify→login→create pet→quick log→timeline→task→care→behavior→training→health intake→triage→vet brief→medication→outcome→search→logout→login again→data persists→cross-user deny，全部步骤 PASS，退出码 0。
4. 远程 Auth 矩阵真实执行：register/verify/login/refresh/logout/wrong-password/session revoke/token expiry/rate limit；结果记录（email 真实投递若无 SMTP 单独列 BLOCKED，但 token/auth 核心必须过）。
5. 远程医疗安全套件真实执行（无 key 时以 mock AI 运行但状态如实标注）：emergency red flags、owner minimization、prompt injection、diagnosis overclaim、medication modification attempt、triage downgrade 全部 PASS；`/ai/status` 如实（无 key 则 `real:false` + `AI_REAL_EXTERNAL_BLOCKED_API_KEY`，代码侧保持 REAL_PROVIDER_READY）。
6. Monitoring 升级为“看到真实远程请求”：远程 metrics/logs 中出现本次 smoke 产生的 API 请求计数、5xx（应为 0 或如实）、latency、worker、auth-failure 计数，并带时间戳证据。
7. 备份/恢复演练在远程 **staging** 真实执行（§25 流程）：造数→记录 counts→备份→新建空库→恢复→counts 相等→对恢复后的 DB 跑 API smoke→通过；证据写入 `reports/STAGE_F_DISASTER_RECOVERY.md`（或等价 REMOTE_BACKUP_RESTORE 报告）。
8. `reports/STAGE_F_FINAL_GATE.md` 建立并随进度增量更新，F0–F20 每个 Gate 标注 PASS / PARTIAL / FAIL / EXTERNAL_BLOCKED / NOT_APPLICABLE 及证据。
9. `PLI_STAGE_F_HANDOFF_COMPLETION_REPORT.md` 生成，包含 FINAL STATUS / HANDOFF RESULT / CLIENT / CORE SERVICES / ENVIRONMENTS / QUALITY / LIVE URLS / BLOCKERS / GIT 全部章节；最终状态为 `PLI_V1_0_WEB_LIVE_PILOT_LIVE` 或逐项真实状态；BLOCKERS 只列真实外部缺失项。
10. 远程 Pilot 验证：admin 创建邀请码→新用户凭邀请注册→建 pet→记事件→pilot metrics 可见；确认 demo seed 不污染真实 pilot analytics。
11. Production：staging 全绿后，若同服务器可行则以独立 compose/env、独立 DB/Redis/Storage/secrets/URLs 部署 production；否则标记 `PRODUCTION_EXTERNAL_BLOCKED` 并写明缺失项（如独立生产域名）。Production 禁止自动 seed、禁止与 staging 混用环境。
12. 质量门禁：本阶段任何代码改动后 `pytest` 全绿、`ruff` clean、相关 build/typecheck/Playwright 绿；不得删除/skip/xfail 测试或吞异常。
13. Git 规范：按 conventional commits + PLI-xxx 拆分提交；`scripts/remote_staging_smoke.py` 与全部新报告入库；不触碰已有 tag（v1.0.0/v1.1.0/v1.1.1）；无 remote 则记 `GIT_REMOTE_EXTERNAL_BLOCKED` 且不 force push；任何 commit 不含 secret，报告中 secret 只允许 `configured=true`。

## Boundaries

- 不重新初始化项目、不重新设计产品、不重做 Stage E 已 PASS 的工作；不扩 228 之外功能，不进入 Future 42 / Digital Twin / 多组学 / 市场 / 新支付等被禁止方向。
- 不伪造凭证：无 AI key / SMTP / 生产域名时如实 EXTERNAL_BLOCKED，禁止假 key、mock 当 real、fake email success。
- 不做 `git reset --hard` / `git clean -fd`；不删除/移动/覆盖已有 tag。
- 备份/恢复演练只针对 staging 环境，绝不触碰生产数据；不删除看不懂的数据/文档。
- 医疗安全红线（AGENTS.md §4）：LLM 不得单独决定 emergency；不诊断、不改药、不自动停药物；不把未发现红旗写成"没有疾病"；Vet Brief 仅信息整理。
- 不执行生产支付、生产数据删除、Pet 所有权转移、外部真实服务下单。
- 达到 WEB_LIVE + PILOT_LIVE 即 FEATURE FREEZE，不自动开始下一版本开发；下一阶段应为 REAL PILOT OPERATIONS。
- 报告与日志不输出完整敏感病历/媒体内容、不打印任何真实 secret。