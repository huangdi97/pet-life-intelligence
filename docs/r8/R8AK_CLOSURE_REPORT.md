# PLI R8AK 收口报告 · 完整观察历史与旧 Case 继续复核

日期：2026-10-17（Asia/Shanghai）。分支 `feat/r2p3d-r3-render-truth-ui-closure`，PR #2 保持 OPEN。

## 1. 当前 HEAD 与远端

| 项 | 值 |
|---|---|
| R8AK 主体提交 | `3b2ed2a3b3c5d02a3a87b619f4475a7ca9dddc65` |
| 最终代码提交（含 UX 修复） | `028d8f94f1c56859bbe1622e3a99fcddc149b4a6` |
| 推送 | `06c0ba5c..028d8f94` → `origin/feat/r2p3d-r3-render-truth-ui-closure` |
| PR #2 | OPEN / MERGEABLE / 未合并 |
| CI（028d8f94） | run [39090868894](https://github.com/huangdi97/pet-life-intelligence/actions/runs/39090868894) **success**：Backend、Frontend、Blind Visual Contract、Playwright 全绿 |
| Android（028d8f94） | run [39090868925](https://github.com/huangdi97/pet-life-intelligence/actions/runs/39090868925) **success**：APK、Web standalone、**真实 Android 运行取证** 全绿 |
| OpenAPI（028d8f94） | run [39090868918](https://github.com/huangdi97/pet-life-intelligence/actions/runs/39090868918) **success** |
| 产物（028d8f94） | `pli-mobile-apk`、`r5-6-android-runtime-evidence`、`pli-web-standalone` 均未过期 |

> 本文件更新提交为 docs-only；Android 证据取自与最终代码相同的 `028d8f94`。若 docs-only 提交改变了 HEAD，应用代码仍与该取证提交逐字节一致。

## 2. 本轮交付

见 `docs/r8/R8AK_OWNER_CASE_HISTORY_AND_CONTINUATION.md`。摘要：

- 后端稳定 keyset 分页 + 指标/时间窗/关键词检索；`total/has_more/next_cursor`。
- 新授权来源详情端点，逐条重授权、冻结角色、双时间、有效性、缺失来源。
- 旧 Case 继续复核（CAS + 幂等 + 审计），详情暴露 token。
- Android 完整历史页、详情继续复核、来源分页明细、Today 全部档案入口。
- Web 历史/详情页 + Today 回顾卡；Mini 观察列表/详情页 + 宠物页入口。

## 3. exact-HEAD 真实 Android 取证（CI `028d8f94`）

artifact：`r5-6-android-runtime-evidence` / `android/r8-owner-review/`（每次运行创建真实新 Case；
下列取自最终运行）。

| 证据 | 内容 |
|---|---|
| `case-continue-review-truth.json` | 同一 Case `7cdbdf0f-…` 追加 **恰好 1 条** `CORRECT_SOURCE`，Review 总数 3，Case ID 不变 |
| `case-history-truth.json` | 从详情真实进入完整历史；真实 Case 出现在列表；筛选控件存在 |
| `case-detail-truth.json` | 全部原始来源 ID 在原生 XML 中逐条出现；全部 Review 出现 |
| `case-journal-truth.json` | 变化提示归一后 Case 仍可见，原始与后续来源均有效 |
| 截图 | `owner-case-history-list.png`、`owner-case-detail-firstfold.png`、`owner-case-detail-evidence.png` |
| 原生层级 | 每次滚动的 `case-detail-scroll-*.xml`、`case-history-list.xml` |

关键取值：`appended_exactly_one_review=true`、`same_case_id_retained=true`、
`history_opened_from_detail=true`、`real_case_listed_in_complete_history=true`、
`native_revealed_source_ids == source_event_ids`。

## 4. 本地验证

| 项目 | 结果 |
|---|---|
| `ruff check .` | PASS |
| `pytest`（UTF-8，含 blind_ui，`--basetemp`） | **770 passed, 0 failed, 0 error**（429.5s） |
| `pytest tests/integration/test_r8ak_case_history.py` | 6 passed |
| `pytest tests/blind_ui/test_r8aj_case_history_detail.py` | 6 passed |
| Web typecheck / build | PASS（新路由 `ƒ /pets/[id]/history/[caseId]`） |
| Web Vitest | 58 passed（含新增 4 项 R8AK 状态语义） |
| Mobile typecheck | PASS |
| Mini typecheck + weapp build | PASS |
| Alembic | 无新迁移；session fixture 从空库 upgrade 到 head `f1e2d3c4b5a6` |
| OpenAPI | 本地重新生成，202 paths / 94 schemas，提交后 CI 校验一致 |
| 本地 release APK | PASS：`apps/mobile/android/app/build/outputs/apk/release/app-release.apk`（102,056,507 B，2026-10-18 10:35） |
| 本地模拟器安装 | PASS：`adb install -r` 成功（emulator-5554，API 35） |
| 本地真实 UI 取证 | PASS：Today 持久化 Case 入口 → 完整历史 → Case 详情 → 继续复核 → 来源 4/4 逐条展开；截图与 UIAutomator XML 见 `.local/local-evidence/` |
| 本地继续复核 | PASS：点击「稍后关注」后，同一 Case 追加 `FOLLOW_UP_LATER`（API reviews = `CORRECT_SOURCE`,`FOLLOW_UP_LATER`，state=`FOLLOW_UP`），确认提示在刷新后仍可见 |

### 本地 Android 构建限制（已解除）

Windows 本机 Gradle 曾遇到 `ninja: manifest 'build.ninja' still dirty after 100 tries`
（Expo 每次构建重写原生输入时间戳，Ninja 反复重生成 CMake）。已用本地 CMake
`CMAKE_SUPPRESS_REGENERATION` 规避，并成功构建、安装、取证。该规避位于 gitignored 的
`node_modules` 与 `apps/mobile/android`，不入库。

### 本地取证文件（不入库）

- `.local/local-evidence/today.png` / `today-scrolled.png`：Today 与持久化 Case 入口
- `history.png` / `history.xml`：完整历史、筛选与真实 Case ID
- `detail-final.png` / `detail-final.xml`：详情主视觉与继续复核区
- `detail-after-followup.png/xml`：刷新后仍保留「已记录继续关注」
- `detail-sources-final.png/xml`：`已核对 4 / 4 条原始来源` 与逐条时间/值/有效性

## 5. 本地复跑命令

```powershell
$env:PYTHONUTF8='1'
.\.venv\Scripts\python.exe -m pytest -q --basetemp=.local/pytest-tmp-final
pnpm --dir apps/web typecheck; pnpm --dir apps/web test; pnpm --dir apps/web build
pnpm --dir apps/mobile typecheck; pnpm --dir apps/mini typecheck
```

## 6. 未完成 / 诚实边界

- `HUMAN_VISUAL_ACCEPTANCE = PENDING`；`NO_VISION_MODEL_USED = TRUE`。
- 真实个体 3D 资产：`EXTERNAL_BLOCKED`。
- 真实 AI：mock provider。
- Web 端“补录后续观察并关联 Case”：**R8AL 已关闭 Web 部分**（真实浏览器闭环）；
  Mini 端仍为 `ACCEPTED_LIMITATION`。详见 `docs/r8/R8AL_WEB_FOLLOW_UP_OBSERVATION_LOOP.md`。
- 历史“按有效状态筛选”未提供（读时计算无法稳定 keyset），已记录为限制。
- 未合并 PR、未改 main、未打 tag/Release、未批准视觉基线。
