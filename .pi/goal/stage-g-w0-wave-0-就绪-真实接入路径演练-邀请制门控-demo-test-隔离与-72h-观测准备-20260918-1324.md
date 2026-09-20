# Goal — Stage G-W0：Wave 0 就绪（WAVE_0_READY + AWAITING_REAL_PARTICIPANTS）

## Goal

在 FEATURE_FREEZE=TRUE 下，把项目从「PILOT_OPERATIONS_READY / AWAITING_REAL_PARTICIPANTS」推进到可诚实声明的 **WAVE_0_READY**：真实参与者接入路径完全演练可用（无开发者干预即可完成 邀请码→注册→登录→同意→创建 Pet→第一条 Quick Log→查看 Timeline），邀请制门控经公网 staging 演练验证，demo/internal/test 数据被工程级隔离且不进入真实指标，监控/备份/数据保护复查通过。因当前仅有真实参与者意向（无确定名单），本轮不进入 WAVE_0_ACTIVE，不伪造任何真实参与者数据；待真实用户确认到位后再放量（Wave 0-A → Wave 0-B）。

## Acceptance criteria（每项客观可验证）

- **A1 Reality Audit（Wave 0 Preflight）**：`reports/pilot/WAVE_0_PREFLIGHT.md` 存在，内容基于实际命令/代码事实，包含：HEAD commit、version、公网 staging URL、PILOT_MODE、AI 状态（real / EXTERNAL_BLOCKED）、SMTP 状态（real / console / blocked）、git remote 状态、当前外部 Blocker、当前未解决 P0/P1 清单，以及 72h 观测检查项（注册成功、Pet 创建、第一 Event、24h Activation、Event 写入失败、页面错误、Auth failure、Storage failure、Support、Privacy/Safety incident）的监控可观测性结论。
- **A2 demo/internal/test 工程级隔离（已批准的测量缺口）**：
  - `User` 与/或 `Pet` 增加 `is_demo` / `is_internal` 标记（默认 false），含 Alembic migration；现有 demo seed（owner@pli.demo / Demo Family 等）被正确标记为 is_demo。
  - 轻量 `pilot_org` 元数据表落地：name / type(VET|TRAINER|STORE|CARE_SERVICE|OWNER_COHORT|OTHER) / contact / status（LEAD→ONBOARDING→ACTIVE→PAUSED→COMPLETED + WITHDRAWN/TERMINATED_*）/ started_at / expected_end_at / participant_limit / notes / consent_version，含 migration；无硬删除（生命周期状态流转）。
  - Pilot 指标（`/pilot/status` 等）默认排除 demo/internal；Activation/Retention/Outcome 口径含排除逻辑。
  - 新增 pytest 覆盖：标记正确性、指标排除、pilot_org 状态流转；全量 `pytest` 0 失败（≥267 或注明差异）、`ruff check` CLEAN、web/admin typecheck 通过。
  - 验证记录：demo pet 不计入真实 activation/retention；Playwright/测试账号不出现在真实 Pilot 指标（以测试 + 实测证据写入 preflight）。
- **A3 邀请制门控演练（临时切换，最终恢复）**：对公网 staging 执行邀请制闸门演练（`scripts/pli_pilot_gating_drill.sh` 或等价流程）：PILOT_MODE 临时置 true → 验证 无码注册被拒（422）/ 有效邀请码注册成功（201）/ 过期码被拒 / 错误码被拒 / 已用码按 max_uses 策略处理 / 校验在服务端而非仅前端 → 完成后恢复 `PILOT_MODE=false`；演练结果（N/N PASS）与恢复确认写入 preflight。任何部署配置改动仅限本次演练且可回滚，不把 staging 永久改为邀请制。
- **A4 无干预 Onboarding Dry-run**：使用演练用邀请码在公网 staging 完整走通 注册→登录→同意（试点说明可见：试点版本/数据用途/AI 边界/医疗边界/隐私/反馈/退出/删除）→创建 Pet→第一条 Quick Log→查看 Timeline；全程无需开发人员手动进数据库修复；若有必须人工修数据的环节则如实判为 WAVE_0_NOT_READY 并记录缺口。
- **A5 监控与 Dashboard 可观测**：`/metrics` 与 `/pilot/status` 可观察到 W0 检查清单所需信号（HTTP 请求/错误、Auth failure、Storage failure、Feedback、Activation 计数）；Admin 面板可展示 Pilot 机构/邀请用户/注册用户/激活 Owner/Pets/Events/Feedback/P0/P1；实测快照记录于 preflight。
- **A6 数据保护复查**：重新运行跨用户访问检查（remote_privacy_check.py 或等价）：User A 无法访问 User B 的 Pet/Timeline/Health/Media/Care/Search（403/404），不泄漏 Pet name/Owner identity/Health info/Media metadata；结果 PASS 记录。
- **A7 备份**：真实用户进入前执行 `PRE_WAVE0_BACKUP`（含 timestamp、migration head、备份结果、可恢复验证，可复用 `scripts/pli_backup_drill.sh`），结果 PASS 记录于 preflight；同时写明 Pilot 期间每日备份策略。
- **A8 W0 运营模板（不伪造机构）**：仅以配置模板形式准备 `W0-OWNER-01` / `W0-PROFESSIONAL-01`（放入 pilot_org 数据模板/文档，status=LEAD，无真实机构信息时不落真实 org 数据）；反馈 10 类可用；Feature Request 只进 `FEATURE_REQUEST_BACKLOG.md`（记录 problem/context/frequency/workaround/evidence，不实现）；Companion/Device/Commercial Discovery 文件更新为 `NOT_YET_OBSERVED`（无真实数据，不编造）。
- **A9 状态与报告**：`WORK_STATUS.md` 更新为 WAVE_0_READY + AWAITING_REAL_PARTICIPANTS + 上述真实证据；`reports/pilot/WAVE_0_PREFLIGHT.md` 完整；输出 FINAL STATUS 块（PILOT MODE: OFF（演练后恢复）、WAVE 0: READY、REAL PARTICIPANTS: 0、REAL PETS: 0、ACTIVATED OWNERS: 0、P0/P1: 0 未解决、AI: EXTERNAL_BLOCKED、EMAIL: LIMITED(console)、PUBLIC STAGING: LIVE、BACKUP: PASS、MONITORING: PASS、NEXT: AWAITING_REAL_PARTICIPANTS）。若真实参与者在本轮内确认到位，可启动 Wave 0-A（1–2 Owner / 1–3 Pet）并按需生成 `WAVE_0_DAY_<N>.md`；否则如实停在 READY。
- **A10 Git 纪律**：完成既有 Stage G 首轮交付（docs/pilot、reports/pilot、注册/设置/Admin 改动等未提交内容）与 Wave 0 新增内容的正常 commit（关联 PLI 编号如 PLI-STAGEGW0 前缀）；不使用 `git reset --hard`、force push、重写 tag；remote 仍为空则如实记录 EXTERNAL_BLOCKED（若会话中获得 remote URL 则 push main + tags）。

## Boundaries

- **Feature Freeze**：不新增任何端用户功能；本轮代码仅限已批准的测量/隔离基础设施（is_demo/is_internal、pilot_org 元数据、指标过滤、演练脚本），以及 P0 Safety/Security/Privacy/Data Loss 与 Pilot-blocking 修复；不进入 Future 42、不实现 PLI Companion、不接设备厂商、不做支付/商城。
- **零伪造**：不伪造真实用户/机构/宠物/反馈/访谈/Retention/Outcome/专业认可；无数据一律 NOT_YET_OBSERVED；不自动联系真实机构、不冒充人工客服。
- **真实服务边界**：无 AI Key → AI 保持 EXTERNAL_BLOCKED，界面不得把 mock 当真实 AI（隐藏/disabled/标注“暂未开放”）；SMTP 为 console → 如实标注 EMAIL_DELIVERY_LIMITATION，不得在未实际发送时显示“邮件已发送”；不把 staging 永久切为邀请制（演练后恢复 false）；不擅自改域名/DNS/生产配置；不触发支付。
- **数据不可破坏**：不删除历史 Pilot 事实；PRE_WAVE0_BACKUP 先行；真实数据不得默认用于训练/研究/营销；Pilot Consent ≠ Research Consent；不提交密钥/敏感配置。
- **规模冻结**：不自动进入 Wave 1 / 50–200 Pet；真实参与者到位后仅按 Wave 0-A → 0-B 顺序放量。
- 工作仅限本仓库 workspace，临时文件放 scratch。
