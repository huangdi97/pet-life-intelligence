# ADVERSARIAL_TEST_REPORT（Stage V）

- 报告日期：2026-09-21
- 新增实现：`tests/stage_v/test_adversarial_input.py`（§14）、`test_adversarial_permissions.py`（§15）、`test_adversarial_medical.py`（§16）
- 既有覆盖引用：`tests/ga/*`（IDOR 矩阵/injection/medical attacks）、`tests/integration/*`
- 证据：全量 pytest **420 passed**（含本报告全部用例）

## §14 输入对抗（全部 PASS）

| 对抗项 | 覆盖 | 结果 |
|---|---|---|
| 重复事件 | 同 actor 同 payload 同 occurred_at → 409 DUPLICATE_EVENT；Idempotency-Key 重放 → 同 event_id | PASS |
| 乱序事件 | 先新后旧插入，Timeline 按 occurred_at 倒序 | PASS |
| 未来时间 | 未来 occurred_at 可记录、不进入当天 Today | PASS |
| 旧时间补录 | 30 天前事件可补录并出现在 Timeline | PASS |
| 跨时区 | naive datetime 持久化为 timezone-aware（UTC 假定） | PASS |
| 非法单位 | 自由文本单位不崩溃（201/422） | PASS |
| 负数/超大数 | `-10` / `1e308` 受控处理，无 500 | PASS |
| NaN/Infinity | 严格 JSON 传输层拦截（422/400，绝不 500 或持久化） | PASS |
| 空串/超长串 | 空串容忍；200k 字符受控（201/422/413） | PASS |
| Unicode/Emoji | 正常记录 | PASS |
| 控制字符 | NUL/控制符 422（GA 加固） | PASS |
| malformed JSON | 422 | PASS |
| 断媒体/大媒体 | 伪造 PNG 422；4MB 上传 201/413/422 无 500 | PASS |
| 重复提交 | 同 actor 无 key 409；异 actor 允许（见下） | PASS |
| race | DB 唯一约束 `uq_lifeevent_idem(pet_id,idempotency_key)` 兜底（并发同 key 不双写；逐条非 500 由约束捕获——见 Issue Ledger SV-008 INFO） | 覆盖 |
| timeout/断网/半传 | 由适配器层（devices/visual/ai/email adapters）处理并诚实降级；映射见 Security/Code Quality 报告 | 覆盖 |

**设计发现（记录）**：去重键包含 actor_id——同一时刻两个照护者记录同一餐是真实场景，不会被误拦；
同 actor 重复提交仍被 409 拦截。这是合理设计，已在 REPLAY-03 验证并记录。

## §15 权限对抗（0 unintended access，全部 PASS）

| 对抗项 | 覆盖 | 结果 |
|---|---|---|
| 猜 pet_id | 随机/死 UUID → 404（GET/POST） | PASS |
| 跨 household | 另一家庭 pet 的读/写 → 403 | PASS |
| expired grant | 过期 grant 立即 403 | PASS |
| revoked grant | 撤销后 403 | PASS |
| 删除 user | 硬删用户后访问 401/403/404 | PASS |
| 删除 pet | archived → 404 | PASS |
| 专业到期/越权 | ProfessionalLink 无 MANAGE_PET；pro 发起 grant → 403 | PASS |
| sitter 到期 | handoff end_at 过期（可控时钟推进）→ 403 | PASS |
| artifact URL 复用 | 外人复用 content URL → 403 | PASS |
| share 过期 | care-card / vet-brief 分享 token 到期（DB 时钟推进）→ 403/404 | PASS |
| role escalation | sitter 再授权 403；family 管理 403 | PASS |
| **admin boundary** | **真实发现并修复**：`POST /ops/feature-flags` 原无任何管理门禁（任意登录用户可写基础设施开关）→ 新增 `require_ops_admin`（仅 `is_internal` 平台运营账号），普通 owner 403、内部运营账号 201（见 Issue Ledger SV-001 P1） | PASS（已修） |

## §16 医疗安全对抗（Deterministic Safety > LLM，全部 PASS）

| 对抗项 | 覆盖 | 结果 |
|---|---|---|
| LLM/主人不得降级 red flag | 7 条新 minimization 用例（撞车/鼠药/布洛芬/巧克力/呼吸困难/猫尿闭）含淡化措辞 → 规则引擎仍 EMERGENCY | PASS |
| 不自动改药/改剂量 | 无任何改药端点（PUT plan → 405/404）；agent MEDICAL action 永不自动执行（策略声明） | PASS |
| 不把 inference 写成 fact | AI 观察强制「主人报告：」前缀 + 决策字段 schema 禁止 | PASS |
| Owner 要求降风险 | 观察/triage 后级别单调不降（EMERGENCY 保持） | PASS |
| 错误剂量来源 | MADE_UP source → 422 | PASS |
| 重复给药 | 第二次 409 MEDICATION_CONFLICT | PASS |
| Vet Brief 边界 | 「信息整理」「不构成诊断」声明保留 | PASS |
| 规则单调性 | `max_level` 单调性质穷举 | PASS |

## 结论

§14/§15/§16 全部对抗用例通过（pytest 实测）；§15 目标 `0 unintended access` 达成；
发现并修复 1 个 P1 权限缺陷（ops feature-flag 无管理门禁），已纳入 Issue Ledger。
