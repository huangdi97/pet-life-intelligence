# STAGE_H_FEATURE_UI_AUDIT — 228 Feature 前端覆盖复审计

> 日期：2026-09-20 · 阶段：Stage H（全产品设计 / UI·UX / 多端前端完成）
> 范围：PLI-001 ~ PLI-228（来源：`docs/reference/Pet_Life_Intelligence_v2.0_Feature_Inventory_228.xlsx`）
> 依据：`docs/product/FEATURE_EXPERIENCE_MATRIX.md`（Stage H 冻结版）+ 真实代码审计（apps/* + packages/*，2026-09-20）
> 方法：矩阵为唯一权威映射（覆盖 228 项）；本报告给出聚合统计、按域缺口、Future 冻结确认与结论。

## 1. 聚合统计（按 Status）

		| Status | 数量 | 含义 |
		|---|---|---|
		| FULL_UI | 30 | 五端或主要端完整产品 UI，入口/页面/组件齐备 |
		| PARTIAL_UI | 128 | 后端主体实现；前端有入口/部分 UI，或依赖领域页二级入口 |
		| BACKGROUND_ONLY | 17 | 纯后台能力（jobs/migrations/audit 流），允许无 Owner UI |
		| EXTERNAL_BLOCKED | 11 | 依赖真实外部服务（AI provider / 支付 / 保险 / 设备 / SMTP），当前不能有假成功 UI |
		| FUTURE | 42 | Future 42 冻结域；**不做 UI**（§105 不强迫画未来页面） |
		| NOT_APPLICABLE | 0 | — |

> 合计 = 30 + 128 + 17 + 11 + 42 = 228（逐行校验：对 PLI-001..228 按 Status 列解析，全部合法，无越界值）。

## 2. 按业务域缺口（PARTIAL_UI 集中域）

矩阵中 PARTIAL_UI 占比最高的域（后端主体实现、前端仅在领域页/二级入口）：

| Domain | 代表 Feature | Stage H 处理 |
|---|---|---|
| 07 Welfare 福祉 | PLI 福祉域 | 新页面 `/welfare`（OWN-011）：生活质量/舒适/压力/活动/丰富化，Evidence/Trend/Uncertainty 输出，**禁止 AI 情绪百分比** |
| 08 Social 社交 | PLI-111..113 | 新页面 `/social`（OWN-012）：关系图谱 + 互动历史 + 安全 + 反馈 + 基线，**非传统 Feed** |
| 09 Devices / Home Intelligence | PLI 设备域 | 新页面 `/monitoring`（OWN-013）：宠物在哪/最近发生/今日状态/设备状态/与自己历史对比；五档设备状态 UI 完整 |
| 10 Care Services | PLI 服务域 | Care 页内展示；真实外部服务 EXTERNAL_BLOCKED 时不伪装预约成功 |
| 12 Nutrition | PLI 营养域 | Pet Profile / Today 分区（Record/Document 级），不做商城 |
| 15 Pet Agent | PLI Agent 域 / PLI-033 | 新页面 `/agent`（OWN-015）：Ask/Brief/Find/Plan/Explain 五 tab；AI Answer 带 Facts/Inference/Sources/Uncertainty/Action |

## 3. Client 覆盖

- **Owner Web**：27 路由（含新 `/welfare` `/social` `/monitoring` `/companion` `/agent` `/pets/[id]`）；ui-kit 组件接入 Stage H（契约 B6）。
- **Mini（Taro）**：13 页：index/timeline/health/agent/mine/pets/tasks/training/behavior/medication/care/notifications/companion；Bottom Tab 5 + Sheet。
- **Mobile（Expo）**：9 screens：Today/Timeline/Monitoring/Companion/Me/Notifications/QuickLog/Health + ui。
- **Admin**：13 路由：Overview/Pilot/Users/Pets/Safety/AI/Devices/Integrations/Audit/Incidents/Flags + capabilities 折叠。
- **Professional**：新建 apps/pro，11 路由：Vet（Assigned Pets/Vet Brief/Evidence/Timeline/Outcome）+ Trainer（Behavior/Training）+ Service（Care Card/Tasks）。
- **H5 Share**：share/vet-brief + share/care-card（mobile-first、revocable、expiry 可见）。

## 4. 不需要 UI 的能力（允许 BACKGROUND_ONLY）

- 幂等 worker、审计流、migration、合成域过滤、备份/恢复脚本、AI gateway 内部路由等纯后台能力 —— 无 Owner UI 需求，Admin 侧提供 Audit/Incidents 审计页，不冒充产品功能。

## 5. Future 冻结确认（§105）

- **Future 42 冻结域**全部保持 `FUTURE`，**未为"完整性"画任何未来页面**：
  - Digital Twin / Multi-omics / Complex Multi-Agent / 全国 Marketplace / 大型公开 Feed / 宠物地图 / 宠物避雷 / 自研硬件 / 自营保险 / 新支付系统。
- 矩阵 FUTURE 行 Entry Point / Page / Component 均为 `—`，Risk `-`，符合契约。

## 6. 外部 Blocked 确认（§书面）

| Feature 域 | Status | 说明 |
|---|---|---|
| AI 总结/问答（每日摘要、Agent 回答） | EXTERNAL_BLOCKED（后端 mock 可用） | 无真实 provider；前端显示「服务暂未开放」，不输出 AI 编造兜底 |
| Care Services 预约 / 保险理赔 / 支付 | EXTERNAL_BLOCKED | 无真实 provider，不展示假成功 |
| Monitoring 真实设备（摄像头/喂食器/饮水机/猫砂盆） | EXTERNAL_BLOCKED | 前端 PROTOTYPE/DEMO 标签 + Unknown 状态，不伪装在线 |
| Companion 四层（Camera/Audio/Treat/Toy/Robot） | EXTERNAL_BLOCKED / DESIGN_ONLY | 见 STAGE_H_FINAL_REPORT §Companion Blocker |

## 7. 结论

- 228 项全覆盖审计完成：需要 UI 的项均具备确定入口/页面/组件（FULL_UI 或 PARTIAL_UI）；
- PARTIAL_UI 的 129 项均已在矩阵中标注入口与 Stage H 页面映射（多为二级入口/领域页）；
- Future 42 与外部 Blocked 未伪造 UI/成功态；
- 通过：**STAGE_H_FEATURE_UI_AUDIT PASS**。