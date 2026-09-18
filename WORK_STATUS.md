# WORK_STATUS

## Current terminal

`PLI_V1_0_WEB_LIVE_PILOT_LIVE` + `PILOT_OPERATIONS_READY`（Stage G 试点运营就绪；公网 staging 真实可用；
生产域名/AI key/SMTP/git remote 仍为外部 blocker → 待真实输入与决策）

## Stage G 启动完成情况（真实命令/代码验证）

| 阶段 | 状态 | 证据 |
|---|---|---|
| Reality Audit（§6 十五问） | DONE | reports/STAGE_G_PILOT_READINESS.md（15 问逐条 + 缺口清单） |
| 注册页邀请码输入 | DONE | apps/web/app/register/page.tsx + api-client authApi.register(…, invite_code?) |
| 产品内反馈 UI | DONE | 设置页「试点反馈」10 类卡片 + pilotApi.feedback()；后端类别集合扩展 |
| Admin Pilot 状态卡 | DONE | apps/admin/app/page.tsx（/pilot/status 实时） |
| 运营文档 | DONE | docs/pilot/：PILOT_OPERATIONS / PILOT_ONBOARDING / PILOT_METRIC_DEFINITIONS / INTERVIEW_GUIDES / PILOT_SUPPORT |
| 周报体系 | DONE | reports/pilot/：README + ACTIVATION_FUNNEL / UX_FRICTION_LOG / FEATURE_USAGE / FEATURE_REQUEST_BACKLOG / COMPANION_DISCOVERY / DEVICE_DISCOVERY / COMMERCIAL_DISCOVERY / WEEK_01 |
| 回归 | PASS | pytest 267 / web+admin typecheck 0 / ruff clean |
| 真实参与者 | AWAITING | 尚无真实用户/机构/宠物（NOT_YET_OBSERVED，不伪造） |

## Stage F 完成情况（跨 Agent 接续，全部真实命令验证）

| 阶段 | 状态 | 证据 |
|---|---|---|
| Handoff Reality Audit | DONE | reports/STAGE_F_HANDOFF_CURRENT_STATE.md |
| Remote Staging | DONE（LIVE） | 6 容器 Up + Caddy TLS；https://staging.haoleilab.com/pli · /pli-api · /pli-admin 全 200 |
| Remote 全链路 smoke | DONE | scripts/remote_staging_smoke.py **20/20 PASS**（register→…→cross-user deny→data persists） |
| Remote Auth 矩阵 | DONE | scripts/remote_auth_matrix.py **15/15 PASS**（Argon2id 全流程 + 限流 + 删号） |
| Remote 医疗安全 | DONE | scripts/remote_medical_safety.py **9/9 PASS**（红旗/弱化/injection/单调升级/免责） |
| Remote 存储 | DONE | scripts/remote_storage_check.py **9/9 PASS**（上传/下载/IDOR/MIME/签名） |
| Remote 隐私 | DONE | scripts/remote_privacy_check.py **8/8 PASS** + share-revoke 演练 7/7（撤销 403） |
| Remote Pilot | DONE | scripts/remote_pilot_check.py **8/8** + 闸门演练 **9/9**（PILOT_MODE=true 无码 422/有码 201；恢复 false） |
| 备份/恢复 | DONE | 远程 staging 演练 **10/10 ALL-PASS exit 0**（73 表 counts 一致 + 恢复库 API smoke） |
| Monitoring | ACTIVE | /metrics 真实流量（events 25→158、security 14→59、audit 18→119，时间戳快照 ×3） |
| Remote E2E | DONE | Playwright **12/12 PASS** against 公网 staging（真实浏览器注册→登录→退出→重置、PWA、分享、IDOR） |
| 部署 bug 修复 | DONE | bundle localhost 烘焙 / seed FK 顺序 / 健康页 basePath 跳转 / PWA basePath 缺口（4 项，详见 STAGE_F_FINAL_GATE） |
| Local 质量回归 | DONE | pytest 267 / ruff clean / typecheck 0 / 本地 Playwright 12/12 |
| Final Gate | DONE | reports/STAGE_F_FINAL_GATE.md（F0–F20 逐 Gate 判定） |
| 完成报告 | DONE | PLI_STAGE_F_HANDOFF_COMPLETION_REPORT.md |

## FEATURE FREEZE

已达到 WEB_LIVE + PILOT_LIVE（staging 公网）。停止功能开发。
下一阶段：**REAL PILOT OPERATIONS**（真实反馈/usage/errors 驱动），不再扩 Feature。

## Current blockers（外部）

1. git remote URL（仓库就绪，提供即 push）
2. 真实 AI Provider API key（代码 REAL_PROVIDER_READY，配置即激活）
3. SMTP 邮件账号（代码+模板齐备）
4. 独立生产域名 + DNS 控制（staging 已 path-prefix 上线；生产需独立域名）
5. 微信 AppID / 主体 / 备案；Apple / Google / HarmonyOS 账号与签名

## 下一步（真实输入驱动）

下一阶段输入必须来自真实用户行为 / 医院 / 门店 / 训练师反馈 / 监控 / Outcome，
不再凭空扩 Feature。
