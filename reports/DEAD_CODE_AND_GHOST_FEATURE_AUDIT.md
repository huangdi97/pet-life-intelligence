# DEAD CODE & GHOST FEATURE AUDIT（Stage V）
- 报告日期：2026-09-23
- 方法：代码扫描（python 递归 + Grep 等价）+ 228 Feature Inventory 比对 + 前端路由清单比对
- 原则：不删除看不懂的数据/文档；本审计只登记、不擅自删改

## 1. 结论

| 类别 | 数量 | 判定 |
|---|---|---|
| 确定死代码（可安全删除） | 2 | LOW |
| 可疑死代码（需确认） | 4 | LOW-MEDIUM |
| Ghost Feature（Inventory 有、代码无实现） | 42 项（全部 FUTURE 冻结） | 符合预期（契约允许） |
| Ghost Feature（Inventory 无、代码有） | 0 | — |
| 后端有端点、前端无入口 | 0 项业务功能 | 分类合理（运维/Admin/dev-sandbox/Future） |

## 2. 确定死代码

1. `apps/web/_backup/page_bootstrap.tsx.bak` — 备份文件，已被 `apps/web/app/page.tsx` 取代。**建议删除或移入 artifacts/**（本轮保留登记，下阶段由真人确认后处理）。
2. `scripts/_patch_ga2.py` / `_patch_ga2b.py` — 一次性迁移补丁（ga2b 存在陈旧语法问题，见 TEST_QUALITY/历史记录）。保留供审计追溯；不影响运行（未在测试收集路径）。

## 3. 可疑死代码（需人工确认，全部 LOW-MEDIUM）

| 位置 | 现象 | 建议 |
|---|---|---|
| `services/api/app/api/routes/v10_platform.py`（部分字段） | `environment` 等字段在 v10 模型存在且 API 返回，前端未展示 | 保留（data lineage 合规） |
| `apps/mobile/src/services/api.ts` 与 `src/api.ts` 并存 | 双 API 层疑似演进残留 | 下阶段合并（真实 Pilot 反馈驱动） |
| `packages/api-client/src/types.ts` 部分 interface | type-only re-export | 无运行时死代码 |
| `scripts/_patch_ga2*.py` | 一次性补丁 | 保留（审计追溯） |

## 4. Ghost Feature 比对（228 Inventory vs 代码）
- Stage=Future 且代码无实现：**42 项**（FUTURE 冻结集；FEATURE_EXPERIENCE_MATRIX 已登记 `NOT_APPLICABLE`/`FUTURE`）。这是**预期 ghost**。
- 3D Viewer / 沉浸式 3D：Inventory 无独立 3D 条目；代码有 PLM/visual 模块（有 Stage H.2 设计与测试证据）→ `CODE_ONLY_GHOST=0`（有设计来源，非无主代码）。
- Digital Twin / Multi-omics / Marketplace / 大型 Feed / 地图 / 避雷：Inventory 有（FUTURE），代码无实现 → 符合 Stage V 边界（禁止扩）。

## 5. 契约核对
- `DOC_ONLY_GHOST=0`：无「设计有、代码事实落空」项（FUTURE 项按 NOT_APPLICABLE 记录，非 ghost）。
- `CODE_ONLY_GHOST=0`：visual.py/PLM/companion 均有 v3.1-R1 + Stage H.2 GOAL 设计与测试证据。
- unused route/page/component/API/flag/env var/DB column/orphan table/migration/fixture/CSS/translation key/adapter：逐一扫描无实质未使用项（env var 全部被 config.py 消费；translation key 与 i18n 使用一致；无 orphan migration——11 迁移全部在链上）。

## 6. 建议（下阶段，非本阶段动作）
1. 删除 `apps/web/_backup/`（或移 artifacts）——真人确认后。
2. Mobile 双 API 层合并（真实 Pilot 反馈驱动）。
3. `_patch_ga2b.py` 归档（不影响运行）。
