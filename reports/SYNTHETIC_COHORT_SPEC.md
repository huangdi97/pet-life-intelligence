# SYNTHETIC_COHORT_SPEC（Stage V）

- 报告日期：2026-09-21
- 实现：`tests/stage_v/test_synthetic_isolation.py`（cohort builder + 隔离回归）
- 证据：`pytest tests/stage_v -q` → **132 passed**（含本报告全部用例）

## 1. Cohort 定义（固定、可复现）

| 项 | 值 |
|---|---|
| 宠物数 | **40**（每个场景 2 只，`PET_NAMES` 固定 40 个名字，无随机 seed） |
| 家庭数 | **12**（`SYN Household 00..11`，每户 1 位 owner，共 12 owner） |
| 场景 | SYN-01..SYN-20 全覆盖（20 场景 × 2 宠 = 40） |
| 确定性 | 名字/物种/性别/生日全部由固定表驱动（`SCENARIOS` + `PET_NAMES` 常量）；`test_cohort_is_deterministic` 断言名字表与场景序固定 |
| 数据标记 | `is_demo=True`、`is_internal=True`、邮箱域 `@pli.demo`（保留的 synthetic domain）、文档级 `source=SYNTHETIC`（cohort 元数据） |

## 2. 场景清单（SYN-01..SYN-20）

SYN-01 健康成年犬 · SYN-02 健康成年猫 · SYN-03 多宠家庭 · SYN-04 多成员共同照护 ·
SYN-05 幼宠成长 · SYN-06 老年宠物 · SYN-07 慢病（CKD）长期管理 · SYN-08 急性健康异常 ·
SYN-09 行为问题 · SYN-10 训练计划 · SYN-11 临时寄养/保姆 · SYN-12 专业人士协作 ·
SYN-13 Device-heavy · SYN-14 Companion Candidate · SYN-15 3D Lifecycle ·
SYN-16 数据稀疏 · SYN-17 数据高频 · SYN-18 跨时区 · SYN-19 Consent Withdrawal ·
SYN-20 Pet Lifecycle End / Archive。

每只宠绑定一个区分性 LifeEvent（deterministic payload），确保队列在 Timeline/搜索场景中可区分。

## 3. 隔离强制（SYNTHETIC_NEVER_COUNTS_AS_REAL）

回归测试（pytest 全绿）：

| 用例 | 断言 | 结果 |
|---|---|---|
| `test_synthetic_never_counts_as_real` | 40 宠 + synthetic feedback 后，`/api/v1/pilot/status` 的 `pets_total / active_pets_3d/7d / feedback_count / registered` **全部 = 0**；`excludes` 含 demo/internal | PASS |
| `test_synthetic_pets_flagged` | 40 只队列宠全部 `is_demo ∧ is_internal` | PASS |
| `test_synthetic_email_domain_reserved` | ≥12 个 `@pli.demo` 用户全部 `is_demo ∧ is_internal` | PASS |
| `test_synthetic_events_do_not_enter_timeline_of_real_pets` | 真实 owner 访问 synthetic pet → 403/404；synthetic owner 访问真实 pet → 403/404（双向隔离） | PASS |

**Grep 双重验证（报告级）**：`app/services/pilot.py` 的所有真实指标查询均同时按
`Pet.is_demo=False ∧ Pet.is_internal=False ∧ 创建者邮箱 NOT LIKE %@pli.demo/pli.test/pli.pilot`
过滤（第 145-204 行）。Synthetic 数据因此在 **Pilot 指标 / Retention / Outcome / Vet Usefulness /
Commercial Metrics** 五条路径上均被查询级排除——不是仅靠约定。

## 4. 结论

- 队列可复现（固定表驱动，无随机 seed）；规模 40 pets / 12 households 满足 30–50/10–15 契约。
- `SYNTHETIC_NEVER_COUNTS_AS_REAL` 回归通过（pytest 实测 + 代码 Grep 双重验证）。
- 隔离是**查询级强制**（服务端过滤），非仅文档约定。
