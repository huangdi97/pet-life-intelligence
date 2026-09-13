# Changelog

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
