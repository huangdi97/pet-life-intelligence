# WAVE_0_PREFLIGHT — Wave 0 就绪审计（全部真实命令验证）

> 状态：**WAVE_0_READY / AWAITING_REAL_PARTICIPANTS**
> 审计时间：2026-09-19（UTC）。全部以本机 + 公网 staging 实际命令验证，非假设。
> 本轮 Feature Freeze 未解除；代码改动仅限测量/隔离基础设施与 P1 修复。

## 0. Git / Version / 部署

| 项 | 值 | 证据 |
|---|---|---|
| HEAD（本地） | `8bcc0bf`（fix pilot filter）← f1c416d ← d89d08f（Stage G ops pack + W0 isolation） | git log |
| 版本 | app_version 1.1.1（staging）/ v1.2.1 CHANGELOG 条目 | staging config |
| 公网 staging | **LIVE**：https://staging.haoleilab.com/pli (200) · /pli-api/health (200) · /pli-admin (200) | HTTP 实测 |
| PILOT_MODE | **false**（演练后已恢复；本轮演练临时 true 两次，均恢复） | /pilot/status + 服务器 /opt/pli/.env |
| AI | **EXTERNAL_BLOCKED**（`/ai/status` → provider=mock, real:false, reason=AI_PROVIDER=mock） | HTTP 实测 |
| SMTP | **console**（EMAIL_DELIVERY=console，验证码 in-band 返回；无凭据） | staging env + auth/status |
| git remote | **无**（EXTERNAL_BLOCKED_REMOTE_URL） | git remote -v |
| 服务器 | zhishen-tokyo（43.153.166.191）SSH 可达；6 容器 Up（api healthy） | ssh + docker ps |

## 1. 本轮部署（新增代码已上线 staging，回滚可用）

| 步骤 | 结果 |
|---|---|
| 源码备份 | 服务器 /tmp/pli_src_backup_w0.tar.gz（回滚点） |
| 变更打包 | services/api/app + migrations + apps/admin/app + apps/web/app + packages/api-client/src（460KB） |
| 镜像重建 | pli-api:staging（02897d128bc0→eb3c956b3016）、pli-web:staging（729637744a70）、pli-admin:staging（ac439f7dcc8f） |
| 迁移 | alembic upgrade head → **c4d8e2a71b93 (head)**：users/pets is_demo/is_internal 列 + pilot_orgs 表 + legacy demo/test 回填 |
| 容器重建 | api/worker/web/admin 全部 Up |
| 回滚方式 | sudo cp /tmp/pli_src_backup_w0.tar.gz 解包 + 旧镜像 retag + downgrade（列/表可逆） |

## 2. A2 demo/internal/test 工程级隔离 — 已验证

- **隔离修复上线后**：`/pilot/status` 从 **pets_total: 7（全部合成数据污染）→ 0（真实数）**，
  并声明 `excludes: [demo, internal, synthetic_domain]`；新增 invited / registered / activated_owners 字段。
- **迁移回填**：`@pli.demo` → is_demo=TRUE；`@pli.test` → is_internal=TRUE（legacy 行 + 由其创建的 pets）。
- **查询时安全网**：创建者邮箱匹配任一合成域（@pli.demo/@pli.test/@pli.pilot）即排除，
  覆盖未回填的新合成注册。
- **Live 验证**：dry-run 宠物（dryrun-…@pli.test，is_internal=false 未回填）被正确排除（DR-11）。
- **回归测试**：tests/v10/test_stage_g_wave0.py 6/6（含回归 test_synthetic_domain_excluded_even_without_flag）。
- **期间发现并修复 P1 测量 bug**：合成域过滤 OR-of-NOT-LIKEs 恒真 → 改 AND（commit 8bcc0bf）；
  该 bug 由 live dry-run DR-11 抓到（dry-run 宠物漏入 pets_total）——Wave 0 dry-run 价值的直接证明。

## 3. A3 邀请制门控演练 — 9/9 ALL-PASS（临时 true，已恢复 false）

| # | 检查 | 结果 |
|---|---|---|
| PG-01 | gating off 时注册真实管理员 | PASS |
| PG-02 | PILOT_MODE=true + api healthy | PASS |
| PG-03 | auth/status pilot_mode=true | PASS |
| PG-04 | 无邀请码注册被拒（服务端校验，422） | PASS |
| PG-05 | 管理员铸造邀请码（201） | PASS |
| PG-06 | 有邀请码注册成功 | PASS |
| PG-07 | 恢复 PILOT_MODE=false + api healthy | PASS |
| PG-08 | pilot_mode 恢复 false | PASS |
| PG-09 | 恢复后公网注册+登录 | PASS |

脚本：scripts/pli_pilot_gating_drill.sh（服务器执行，trap 自动恢复）。
**正式切换决策**：待第一波真实邀请发出时把 staging `PILOT_MODE=true`（用户已确认此安排）。

## 4. A4 无干预 Onboarding Dry-run — 11/11 ALL-PASS

| # | 检查 | 结果 |
|---|---|---|
| DR-01 | 管理员注册+登录 | PASS |
| DR-02 | PILOT_MODE=true api healthy | PASS |
| DR-03 | 邀请码铸造（wave0-dryrun, max_uses=1, 24h） | PASS |
| DR-04 | 注册（带邀请码）+验证+登录 | PASS |
| DR-05 | 创建 Pet（无开发干预） | PASS |
| DR-06 | 第一条 Quick Log 事件写入 | PASS |
| DR-07 | Timeline 可读 | PASS |
| DR-08 | Today 可读 | PASS |
| DR-09 | 反馈提交 | PASS |
| DR-10 | 恢复 PILOT_MODE=false api healthy | PASS |
| DR-11 | 指标排除 dry-run 数据（pets_total=0） | PASS |

脚本：scripts/pli_wave0_dryrun.sh（本轮新增入库）。全程 API 驱动，无需手动进数据库修复。
**诚实说明**：本 dry-run 为 API 级；浏览器 UI 级 dry-run 将在 Wave 0-A 首位真实宠主 onboarding 时执行
（部署后的注册页已确认含邀请码字段 /register 200，设置页含试点反馈卡 200）。

## 5. A5 监控与 Dashboard — 已验证

- `/metrics`（实测快照 2026-09-18T06:14Z）：pets_total / life_events_24h / ai_calls_24h /
  login_failures_24h / security_events_24h / audit_entries_24h / open_incidents — HTTP 错误经 5xx/
  security/audit 信号覆盖；Auth failure 经 login_failures；Storage failure 经 remote_storage_check 9/9 +
  /ready；**Pilot feedback/activation 经 /pilot/status（feedback_count / activated_owners）**。
- `/pilot/status`（隔离后实测）：pilot_mode / pets_total / active_pets_3d/7d / feedback_count /
  invited / registered / activated_owners / north_star / excludes。
- Admin 面板（已部署）：「试点 Pilot 状态」卡片展示以上指标（pli-admin 200）。
- 结论：**放真实用户前可观测性达标（PASS）**。

## 6. A6 数据保护复查 — 8/8 PASS（针对已部署隔离代码）

PRIV-01 care card share+view (201) / PRIV-02 bogus token denied (404) / PRIV-03 vet brief share (201) /
PRIV-04 owner export 含自己数据 (200) / PRIV-05 跨用户 export denied (403) / PRIV-06 consent revoke (200) /
PRIV-07 SERVICE_ESSENTIAL 不可撤 (422) / PRIV-08 删除请求登记（非破坏性, 201）。
Playwright 12/12（公网 staging）：含 E2E-07 IDOR / URL 篡改（跨 owner 403/404 且不泄漏）。
无 Pet name / Owner identity / Health info / Media metadata 泄漏证据。

## 7. A7 备份 — PASS

- **PRE_WAVE0_BACKUP**：2026-09-18（UTC ~06:4x）远程演练 **10/10 ALL-PASS**：
  74 表 baseline → pg_dump → 空库恢复 → counts 一致 → 恢复库 API smoke（health/register/login/建宠/metrics）→ 清理。
  迁移 head（备份时）：3756fdb0fb13；备份后已升级 c4d8e2a71b93。
- **Pilot 期间每日备份策略**：沿用 pli_backup_drill.sh 每日一次（服务器 cron 或手动），
  加上 Postgres volume 快照；真实用户数据丢失不可接受（W0 §21）。

## 8. A8 W0 运营模板（不伪造机构）

- pilot_orgs 表已上线；**未落任何真实机构数据**。模板见 `reports/pilot/ORG_LEDGER.md`
  （W0-OWNER-01 / W0-PROFESSIONAL-01 占位行，status=LEAD，实际名称由真实信息决定）。
- 反馈 10 类可用（bug/confusing/slow/missing/unnecessary/safety/privacy/feature_request/health_concern/other）。
- Feature Request 只进 FEATURE_REQUEST_BACKLOG.md（不实现）；Companion/Device/Commercial Discovery
  保持 NOT_YET_OBSERVED（无真实数据）。

## 9. 当前未解决 P0/P1

| 级 | 项 | 状态 |
|---|---|---|
| P0 | 无未解决 P0 | — |
| P1 | AI 未启用（无 key） | 外部 blocker，等 key（提供即按 §41 流程启用） |
| P1 | SMTP console（无凭据） | invite-only 阶段可接受（EMAIL_DELIVERY_LIMITATION 已标注） |
| P1 | git remote 无 | 外部 blocker，提供即 push |
| 已修复 | 合成域过滤 OR→AND（本轮 P1 测量 bug） | 8bcc0bf + 回归测试 |

## 10. FINAL STATUS

```
PILOT MODE:       OFF（演练后恢复；正式切换待第一波真实邀请）
WAVE 0:           READY
REAL PARTICIPANTS: 0
REAL PETS:        0
ACTIVATED OWNERS: 0
P0:               0（未解决）
P1:               3（全部外部 blocker：AI key / SMTP / git remote）
AI:               EXTERNAL_BLOCKED
EMAIL:            LIMITED（console，in-band）
PUBLIC STAGING:   LIVE
BACKUP:           PASS（10/10）
MONITORING:       PASS
NEXT:             AWAITING_REAL_PARTICIPANTS → 真实用户确认后 Wave 0-A（1–2 Owner / 1–3 Pet）
```
