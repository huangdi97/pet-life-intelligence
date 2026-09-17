# Changelog
## v1.2.0 (2026-09-17) — Stage F Deployment Activation（WEB_LIVE + PILOT_LIVE）

从 `WEB_READY_PILOT_READY` 推进到 `PLI_V1_0_WEB_LIVE_PILOT_LIVE`（公网 staging 真实可用）。
### Added
- **真实公网部署**：https://staging.haoleilab.com（path-prefix /pli web · /pli-api API · /pli-admin admin；独立 DB/Redis/volume；Caddy Let's Encrypt TLS + HSTS 安全头）。
- **远程验证套件**（scripts/remote_*.py，全部真实公网执行）：全链路 smoke 20/20、Auth 矩阵 15/15、医疗安全 9/9、存储 9/9、隐私 8/8、share-revoke 7/7、Pilot 8/8、Pilot 闸门 9/9、备份恢复 10/10（exit 0）。
- **Playwright 远程化**：PLI_E2E_BASE_URL / PLI_E2E_BASE_PATH / PLI_E2E_API 环境变量驱动 + goto base-path fixture；本地 12/12 + 远程公网 12/12。
- **PWA basePath 感知**：动态 manifest 路由（start_url/scope/icons 随 NEXT_BASE_PATH）、PwaShell basePath prop、sw.js v2 从 registration.scope 派生 BASE、API/share 响应同域前缀下永不缓存。
### Fixed
- web/admin 镜像缺 NEXT_PUBLIC_API_URL 构建 ARG → bundle 烘焙 localhost:8800，公网浏览器端 API 全断（远程 Playwright 发现）。
- seed 清理列表漏 auth/pilot 表（FK 引用 users）→ 服务器有会话时 seed 崩溃（远程 seed 发现）。
- 健康页 window.location.href 不感知 basePath → 公网部署健康详情流 404；改 router.push。
- Web typecheck：本地 node_modules 漂移（stale react 19.3.0）致 Suspense/ReactNode 伪错误；pnpm install --force 修复（无代码 hack）。
### Quality
- pytest **267 passed**；ruff 全绿；typecheck 0 error；本地 + 远程 Playwright **12/12**；远程部署后全链路回归绿。
### External blockers（诚实标注）
git remote URL、真实 AI API key（代码 REAL_PROVIDER_READY）、SMTP（代码+模板齐备）、独立生产域名/DNS 控制、微信 AppID / 商店账号 / 签名。
## v1.1.1 (2026-09-14) — Stage E Real Launch Preparation

从 `PRODUCTION_READY_MULTI_CLIENT` 推进到 `WEB_READY_PILOT_READY`（发布步骤外部 blocker）。

### Added
- **Real Auth**：Argon2id 密码、rotating refresh tokens（family reuse detection）、
  注册/登录/刷新/登出/忘记密码/重置/邮箱验证/会话管理/改密/删号/登录限流；
  dev-auth 生产 fail-fast；注册自动创建 household（修复真实用户无法建档）。
- **Real AI**：OpenAI-compatible provider（经 AI Gateway，JSON+schema 强制，
  mock fallback 保产品可用）；`/ai/status` 如实报告 real/mock。
- **Pilot Mode**：invite-only（管理员单次邀请码）、注册门禁、反馈通道、
  指标（北极星：Active Pets with Continuous Evidence Chain）；业务包全套文档。
- **WeChat 登录**：jscode2session 后端 exchange + find-or-create；无凭据诚实
  EXTERNAL_BLOCKED。
- **监控**：/metrics 端点；worker crash/restart 语义测试。
- **配置**：生产 fail-fast 校验；staging compose + nginx（HSTS/CSP）。
- **Demo**：`scripts/pilot_demo_seed.py`（虚构宠物"豆包"全链路）。

### Quality
- pytest **267 passed**（+28：auth 11 / pilot 5 / config 4 / onboarding 2 / worker crash 2 / ai provider 4）；
  Playwright **12/12**（+2 真实注册/登录/重置浏览器 E2E）；ruff 全绿；
  Web/Admin/Mini/Mobile build 全绿。

### External blockers（诚实）
git remote、服务器/域名/证书、AI key、微信 AppID、移动商店账号、SMTP。

## v1.1.0 (2026-09-14) — Multi-Client Productionization

从 `PLI_V1_0_RELEASE_CANDIDATE_READY` 推进到 `PLI_V1_0_PRODUCTION_READY_MULTI_CLIENT`。

### Added
- **多端客户端**：`apps/mini`（Taro 微信/支付宝/抖音小程序，12 页 + 平台抽象层）、
  `apps/mobile`（Expo iOS/Android，secure-store + 底部 Tab）、`apps/admin`（运营概览/Feature Flags/能力注册表/审计/就诊摘要）。
- **H5 分享页**：Vet Brief / Care Card 匿名 token 访问（过期/撤销/审计）。
- **设计系统**：`packages/ui-tokens`（Color/Typography/Spacing/Radius/Elevation/Motion/Risk/Semantic）+ 品牌视觉资产。
- **Web/PWA**：manifest + service worker + 离线壳、loading/error/not-found 边界、
  中文导航重构（今日/时间线/宠物/助手/我的）、i18n 基础、响应式。
- **后端硬化**：lifespan 优雅启停、DB 连接池、structlog JSON 日志、
  OpenAPI 契约 artifact（157 paths）、生产/staging/pilot env 模板。
- **基础设施**：docker-compose.production + Dockerfiles + nginx、CI（.github/workflows/ci.yml）。
- **测试**：`tests/multi-client`（跨端一致性 4 项）、Playwright 扩至 10 条（PWA/share/404/中文导航）、
  OpenAPI 生成校验脚本。

### Quality
- pytest **239 passed**；ruff 全绿；Web/Admin build 绿；Mini（weapp/alipay/tt）build 绿；
  Mobile（android/ios）bundle 绿 + typecheck 绿；Playwright **10/10**；staging smoke 12/12；
  性能基线 p95<1s 0 error；备份/恢复（历史 round2）。

### External blockers（诚实标注）
- 微信 AppID/主体、App Store/Google Play/HarmonyOS 账号、域名备案/证书、生产服务器、git remote。

## v1.0.0 (2026-09-13) — GA

Stage A v0.1（50 P0）→ Stage B v0.2（48 P1）→ Stage C v1.0（88 P2）→ Stage D GA Hardening。

### Added
- v0.1：canonical event graph（46 事件类型、provenance/幂等/不可静默覆盖）、
  RBAC+ABAC+审计、Today/QuickLog/Timeline/Tasks、照护网络（邀请/交接/Care Card）、
  行为 ABC、健康事件→独立红旗规则引擎→分级→Vet Brief→用药→Outcome、
  AI Gateway（mock provider、结构化输出、离线评测）、14 个 UI 界面、7 条 API E2E。
- v0.2：芯片/护照标识、宠物生命周期、确定性基线（trimmed_mean_v1）、日记、
  AI 日报、交接清单与照护报告、角色通知、病历导入（来源分级）、恢复计划、
  症状趋势、疫苗/驱虫/体检提醒、行为图谱/模板/偏好/建议安全过滤、
  奖励式训练全链路、社交（双重同意/拉黑/举报）、饮食档案、费用账本、里程碑、
  回忆、带证据的个人问答/搜索/为什么提示、结构化记忆、内容版本管理、
  隐私分析计数、运行状态。
- v1.0：设备适配器体系（interface+沙箱+flag+契约测试+webhook 去重）、
  统一事件转换/质量检查/多宠归因/AI 审核队列、身份合并与所有权转移
  （仅登记+人工确认）、字段级隐私、数据导出包、专业关系/签名政策、
  紧急授权模式、五域福利/问卷/证据、行为干预计划、慢病/老年视图、术语映射、
  训练泛化/下一步建议/健康约束/成果证明、服务请求记录层（不撮合不收款）、
  商品约束过滤、费用分摊/年度汇总/保单档案/导出、年度回顾/跨期对比、
  Agent 行动策略（booking/purchase/medical 一律 REFUSED）、有害内容过滤、
  跨来源身份归一、实验分组、数据质量评分、capability registry。
- Stage D（GA）：字段级隐私真实掩码、专业记录签名状态、capability registry、
  结构化访问日志、EXTERNAL_BLOCKED 错误码、webhook 重放 409、
  规则引擎正则模式（对抗插词规避）、Playwright 浏览器 E2E（7 主路径）、
  迁移全重放与降级验证、备份/恢复 round 2（恢复库 API smoke）、性能基线。

### Fixed（Stage D 真实缺陷）
- CORS 缺 3100：真实浏览器无法调用 API（仅浏览器 E2E 可发现）。
- NUL/控制字符 payload 导致 500 → 统一 422。
- HealthEventCreate 决策字段未禁 extra → extra=forbid。
- 设备 webhook 重放 → 409 DUPLICATE_EVENT。

### Safety
- 红旗规则引擎独立且版本化；LLM 输出 schema 禁止决策字段；
  triage 只升不降；主人淡化/提示注入攻击测试覆盖。
- 高风险动作（转移/合并/删除/预约/购买/医疗）一律不自动执行。

### Quality @ GA
- pytest 235 passed；Playwright 7 passed；ruff/typecheck/build 绿；
  迁移重放+降级验证；备份恢复（恢复库可读写）；staging smoke 12/12；
  性能基线全端点 p95<100ms。
