# PLI Canonical Documents — 索引与权威顺序

> 本目录存放 Pet Life Intelligence 的 canonical（权威）文档。进入本目录的文档是
> 长期参考基线；运行事实（L0）与代码（L1）始终高于文档文字。

## L2 Feature Index（功能主清单）

| 文档 | 路径 | 状态 |
|---|---|---|
| PLI Feature Inventory 228 项 | `docs/reference/Pet_Life_Intelligence_v2.0_Feature_Inventory_228.xlsx` | **L2 权威**（Feature ID / Stage 冲突以此为准） |

## L3 Current Canonical（当前权威母版）

| 文档 | 路径 | 状态 |
|---|---|---|
| **PLI v3.3-R1 统一全量母版**（产品 · UX/UI · 多端体验 · Pilot 前收口 · Companion · 个体 3D 生命界面） | `docs/canonical/PLI_v3.3-R1.md` | **CURRENT**（Stage R.1 起为当前验收基线） |

原始文件名（历史映射）：`Pet_Life_Intelligence_v3.3-R1_产品技术UIUX多端体验Pilot前收口Companion与个体3D生命界面_统一全量母版_2026-09-20.md`
（Stage R.1 将其从仓库根目录移入 `docs/canonical/` 并采用稳定短路径。）

## Historical Masters（历史母版，不删除、只标注）

| 文档 | 路径 | 状态 |
|---|---|---|
| PLI v3.1-R1 母版 | `Pet_Life_Intelligence_v3.1-R1_产品技术运营与Companion统一全量母版_2026-09-18.md`（仓库根目录） | **HISTORICAL** |
| PLI v3.2-R1 | repo 内无独立 v3.2 文件；v3.3-R1 声明以 v3.2-R1 为直接 canonical baseline（其内容并入 v3.3-R1 母版第一节文档定位） | **HISTORICAL** |
| 更早设计/研究文档 | `docs/product/`、`docs/decisions/` 等 | HISTORICAL，仅作历史参考 |

> CLI/UI 前 Stage R 验收曾使用 v3.1-R1 + DESIGN_SYSTEM_V3（记录于
> `reports/STAGE_R_UIUX_ACCEPTANCE.md`）。Stage R.1 起验收基线升级为
> v3.3-R1（见 `reports/STAGE_R1_V3_3_UIUX_REACCEPTANCE.md`、`reports/V3_3_CANONICAL_DELTA_AUDIT.md`）。

## Design System（UI 规范）

| 文档 | 路径 |
|---|---|
| DESIGN_SYSTEM_V3 | `docs/ui/PLI_DESIGN_SYSTEM_V3.md` |

## Authority Order（权威顺序，与 AGENTS.md 一致）

```text
L0 runtime / DB / API / logs / staging / 当前测试结果
  > L1 Git / migrations / schema / API contracts / tests
  > L2 Pet_Life_Intelligence_v2.0_Feature_Inventory_228.xlsx
  > L3 docs/canonical/PLI_v3.3-R1.md（CURRENT）
  > L4 更早设计/研究文档（v3.1 等 = HISTORICAL）
```

规则：
1. 文档不得静默覆盖代码/运行事实。
2. Feature ID / Stage 冲突由 L2（228 项清单）裁决。
3. 文档中的运行/测试数字是历史值，重新运行前不视为当前事实。
4. 任何行为/范围漂移必须显式记录。

## 维护约定

- 新增权威母版：复制为 `PLI_v<major>.<minor>-R<n>.md`，旧版本标记 `HISTORICAL`，**不删除、不改写历史事实**。
- 历史报告如需更正措辞只允许追加注记（如 `Historical wording corrected by Stage R.1`），不得篡改内容。
- 本索引文件本身归档于 git，随 canonical 变更一起提交。