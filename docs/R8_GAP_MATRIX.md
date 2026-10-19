# PLI 功能差距矩阵（R8AK 轮）

更新时间：2026-10-17。范围：Owner Web / Mini / Android / Backend。状态只使用终态词汇；`LOCAL_PASS` 表示本机真实执行通过，`PENDING_CI` 表示等待 exact-HEAD 云端验证，`PENDING_RUNTIME` 表示等待真实 Android 取证。

| # | 能力 | 代码位置 | 测试 | 客户端 | 状态 / 证据 |
|---|---|---|---|---|---|
| 1 | 五端一级 IA（Today/Timeline/Pet/Assistant/Me，无第六 Tab） | `apps/web/app`, `apps/mobile/src/navigation.tsx`, `apps/mini/src/app.config.ts` | blind-ui R8AJ/R8AK | 全端 | PASS（本轮 typecheck；导航契约测试通过） |
| 2 | Today Living Canvas（Pet→Now→Change→Attention→Action） | `apps/web/app/page.tsx`, `apps/mobile/src/screens/TodayScreen.tsx` | vitest today-page / Playwright | Web/Android | LOCAL_PASS（vitest 54/54） |
| 3 | Timeline 双时间 Life Replay（R7） | `services/api/app/api/routes/events.py`, `apps/*/timeline` | `tests/unit/test_life_replay.py`, `tests/integration/test_life_replay_api.py` | Web/Mini/Android | LOCAL_PASS_PENDING_CI |
| 4 | 个人基线与缺失数据语义 | `app/services/life_replay.py`, baseline endpoints | 同上 + R8 集成 | 全端 | LOCAL_PASS_PENDING_CI |
| 5 | R8 Case 创建（来源锚定、指纹幂等、三指标） | `app/api/routes/life_changes.py` | `tests/integration/test_r8_life_change_cases.py` | 全端 | PASS（历史 + 本轮回归） |
| 6 | 主人 Review（append-only、CAS、幂等、审计） | 同上 | 同上 | Android/Web/Mini | LOCAL_PASS_PENDING_CI |
| 7 | 来源撤回/修正 → Case 失效、Review 保留 | 同上 | 同上 | 全端 | PASS |
| 8 | R8AI Today 持久化 Case 日志 | `OwnerChangeHistory.tsx`, `CaseJournalCard.tsx` | blind-ui + Node probe | Android/Web | LOCAL_PASS_PENDING_CI |
| 9 | R8AJ Case 详情：冻结值、原始来源、全部 Review | `LifeChangeCaseScreen.tsx`, `CaseSourceList.tsx` | blind-ui R8AJ + CI 原生 XML | Android | PASS（CI `case-detail-truth.json` 13/13 来源、3 条 Review；本机模拟器复核） |
| 10 | R8AG 服务器冻结来源角色 | `life_changes.py`, `models/life_changes.py` | 集成 + Android XML | 全端 | PASS |
| 11 | **R8AK 稳定游标分页 + total/has_more** | `app/services/life_change_history.py` | `test_r8ak_case_history.py` 6/6 | API | PASS |
| 12 | **R8AK 指标/时间窗/关键词检索（有界）** | 同上 + `list_cases` | 同上 | Android/Web/Mini | PASS |
| 13 | **R8AK 授权来源详情（逐条时间/值/有效性/角色）** | `app/api/routes/life_change_sources.py` | 同上 + 本机 4/4 原生来源 | 全端 | PASS |
| 14 | **R8AK 旧 Case 内继续复核（不新建 Case）** | `CaseReviewActions.tsx`, `CaseDetail`, POST API | CI `case-continue-review-truth.json` + 本机 `FOLLOW_UP_LATER` | Android/Web/Mini | PASS |
| 15 | **R8AK 完整历史入口与列表** | `LifeChangeHistoryScreen.tsx`, Web history, Mini observations | CI `case-history-truth.json` + 本机截图 | 全端 | PASS |
| 16 | **R8AK 真实观察反馈闭环（QuickLog→RECORD_OBSERVATION）** | `QuickLogScreen.tsx` + Case detail 入口 | 既有 R8C/R8T 测试 | Android | PASS（上一 HEAD 真实取证）；本轮待复跑 |
| 17 | **真实观察补录并关联 Case（Web）** | `apps/web/lib/caseFollowUp.ts`, `app/page.tsx`, Case 详情 | Vitest 4 项 + 真实浏览器闭环 | Web | PASS（R8AL；事件→Review→档案页，console 0 error） |
| 17b | **真实观察补录并关联 Case（Mini）** | `apps/mini/src/utils/caseFollowUp.ts`, 详情页, Today | 静态契约 4 项 + `tsc` + weapp build | Mini | PASS（代码/构建/契约）；Mini 真机运行 = NOT_YET_OBSERVED |
| 17c | **原始来源撤回（Web 主人操作）** | Web Case 详情来源卡 + `/events/{id}/retract` | blind 2 项 + Playwright 扩展 | Web | PASS（两步确认；服务端派生 INVALIDATED；Review 保留） |
| 17d | **原始来源撤回（Android）** | `CaseSourceList.tsx` + 详情重载 | blind 3 项 + Android 真实取证 | Android | PASS（`case-source-retraction-truth.json`：原生失效 + INVALIDATED + Review 3→3） |
| 17e | **原始来源撤回（Mini）** | Mini Case 详情来源卡 | blind 4 项 + `tsc` + weapp build | Mini | PASS（代码/构建/契约）；Mini 真机运行 = NOT_YET_OBSERVED |
| 17f | **用新记录修正并取代旧记录（supersede，Web）** | `POST /events/{id}/supersede` + Web 来源卡 | 集成 2 项 + blind 3 项 + Playwright | Web/API | PASS（原行不变、发生时间保持、`INVALIDATED`、Review 保留、幂等） |
| 17g | **supersede（Mini）** | Mini Case 详情来源卡 | blind 2 项 + `tsc` + weapp build | Mini | PASS（代码/构建/契约）；Mini 真机运行 = NOT_YET_OBSERVED |
| 17h | **supersede（Android）** | `CaseSourceList.tsx` + 详情 metric | blind 3 项 + 真实 UIAutomator | Android | PASS（`case-source-correction-truth.json`：原生失效 + `INVALIDATED` + 原值 20 不变 + successor） |
| 18 | 非主人 `DAILY_READ` 不获得私人备注 | `_review_response(owner_view=...)` | 集成 | API | PASS |
| 19 | 医疗事件 `medical:read` 边界 | `events.py`, `life_change_sources.py` | 集成 | API | PASS |
| 20 | 宠物数据隔离 / 跨宠 Case 404 | `_get_case`, `_pet_scoped_case` | `test_r8ak...`（陌生用户/跨宠） | API | LOCAL_PASS |
| 21 | A→B→A 切宠遮蔽与异步竞态 | `TodayScreen`, `LifeChangeCaseScreen`, history screens | blind-ui R8N/R8R/R8Z | Android/Web/Mini | PASS（契约）+ PENDING_RUNTIME |
| 22 | Android 3D 首帧/真 GLB 门禁 | `LifeViewScreen`, evidence script | Android workflow | Android | PASS at `06c0ba5c`（artifact 存在）；新 HEAD 待复跑 |
| 23 | 主副宠切换 + 双宠 runtime manifest | `capture-android-final.py` | Android workflow | Android | PASS at `06c0ba5c`；新 HEAD 待复跑 |
| 24 | Twin Review 三视角真实截图 | 同上 | 同上 | Android | PASS at `06c0ba5c`；新 HEAD 待复跑 |
| 25 | 真实个体 3D 身份还原 | provider adapter | — | Android/Web | EXTERNAL_BLOCKED（无真实生成服务/主人确认资产） |
| 26 | 3D 历史回看不得伪造过去 | `life-view` 历史限制 | Playwright/Android | Web/Android | PASS |
| 27 | 主人视觉验收 | — | — | 全端 | NOT_YET_OBSERVED（`HUMAN_VISUAL_ACCEPTANCE=PENDING`） |
| 28 | 真实 AI 能力 | `AI_PROVIDER=mock` | — | 全端 | EXTERNAL_BLOCKED（未接真实模型/密钥） |
| 29 | 跨端语义一致（Pet/Event/Permission/Source） | 共享 domain 契约 | 各端 typecheck + 集成 | 全端 | LOCAL_PASS（读语义一致；写入口见 #17） |
| 30 | 无障碍（标签/44px/实时区域） | 各端组件 | blind-ui | 全端 | PASS（新增控件均带 accessibilityLabel/Role） |
| 31 | 空/错/加载/权限拒绝/失效态 | 新增页面 | 手动 + 单测 | 全端 | LOCAL_PASS |
| 32 | 历史“按有效状态筛选” | — | — | 全端 | ACCEPTED_LIMITATION（读时计算，无法稳定 keyset；已显式记录） |
| 33 | 全量后端回归 | — | pytest | API | 见 `docs/r8/R8AK...` 与最终报告（本轮复跑） |
| 34 | Alembic upgrade/downgrade | 迁移链 `… → f1e2d3c4b5a6` | pytest session 自动 upgrade | API | LOCAL_PASS（本轮无新迁移） |
| 35 | Playwright / Blind Visual Contract | `tests/e2e` / `tests/blind_ui` | 本轮复跑 | Web | 见最终报告 |

## 下一阶段（R8AL 候选，未开工）

1. Android/Web 端“后续观察”直接补录并关联 Case 的统一写入口（消除 #17）。
2. Case 历史的服务端“有效状态”物化列（消除 #32 的 keyset 限制）。
3. 3D 历史与真实资产的 provider 接入（#25，外部阻断）。
