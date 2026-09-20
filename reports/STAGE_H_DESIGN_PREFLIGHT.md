# STAGE_H_DESIGN_PREFLIGHT — Design Reality Audit

> 日期：2026-09-19 · 阶段：Stage H（全产品设计 / UI·UX / 多端前端完成）
> 方法：git/代码/文档全量审计（§6 清单）；本报告先于任何 UI 改动生成。
> 起点状态：`WAVE_0_READY + AWAITING_REAL_PARTICIPANTS`；git 干净（仅 .pi/ 会话工件与 v3.1-R1 母版未跟踪）；main @ a85c6b8；tags v1.0.0→v1.2.0。

## 现状基线（真实证据）

- 质量：pytest 273 / ruff clean / web+admin typecheck 0 / 本地+远程 Playwright 12/12（Stage G-W0 收口）。
- 部署：公网 staging LIVE（/pli · /pli-api · /pli-admin）。本阶段不部署。
- 现有前端：Web Next.js 15（21 路由）· Admin Next.js（5 页）· Mini Taro（12 页）· Mobile Expo（仅 App.tsx 骨架）· H5 Share（2 视图）· **Professional 无独立客户端**。
- 设计资产：packages/ui-tokens（tokens.json v1 + build 脚本 + CSS 变量）已存在并被 web 引用（CSS 层）；packages/ui-kit 不存在；docs/ui/ 不存在；docs/product/ 仅 PLATFORM_DELIVERY_MATRIX。
- 母版：v3.1-R1（2026-09-18，项目根）+ 228 Inventory xlsx（已提取 228 项：v0.1 50 / v0.2 48 / v1.0 88 / Future 42）。

## §7 十问逐答

### 1. 当前有哪些页面？
- **Web**：`/`(Today)、/timeline、/tasks、/pets、/pets/new、/health、/health/[id]、/medication、/care、/behavior、/training、/notifications、/settings、/search、/offline、/login、/register、/forgot-password、/reset-password、/share/vet-brief/[token]、/share/care-card/[token] + not-found/error/loading。
- **Admin**：/（Overview+Pilot 卡）、/audit、/capabilities、/flags、/vet-briefs。
- **Mini**：index、timeline、health、agent、mine、pets、tasks、training、behavior、medication、care、notifications。
- **Mobile**：App.tsx 单文件骨架（无 screens）。
- **H5**：share/vet-brief、share/care-card。

### 2. 哪些页面只是工程页面？
- Admin：/audit、/capabilities（工程术语+原始表格）。
- Web：/pets/new（表单工程化）、/offline（极简）、/search（原始列表）。
- Mobile：App.tsx 全部为工程骨架。
- Mini：多数页面为 Taro 默认样式工程页（低设计）。

### 3. 哪些页面缺真实入口？
- Welfare / Social / Monitoring / Companion / Agent：**无路由无入口**（Web/Mini/Mobile 均缺）。
- Devices（设备 UI）：无任何 UI。
- Health Outcome：仅在 health/[id] 内嵌 select，无完整结局视图。
- Nutrition / Insurance / Finance：无入口（矩阵 EXTERNAL_BLOCKED/背景）。
- Professional：整个客户端不存在（admin /vet-briefs 是唯一 Pro 面）。

### 4. 哪些 Feature 有后端但没有前端？
见 `docs/product/FEATURE_EXPERIENCE_MATRIX.md`：PARTIAL_UI 128 项（后端主体实现，前端仅部分/入口缺失）+ BACKGROUND_ONLY 17 项（纯后台，允许无 UI）。重点缺口：Welfare(07)/Social(08)/Devices(09)/Agent 摘要(15)/Care Services(10)/Nutrition(12) 的领域页。

### 5. 哪些页面功能重复？
- /pets 与 /pets/new（创建流程重复，可合并入口）。
- /settings 与 /notifications（通知分区重叠，可接受，导航已收口）。
- /search 与 Agent「Find」（Stage H 收口：search 保留为 Find 能力入口）。
- Admin /capabilities 与 /flags（应合并）。

### 6. 哪些页面应该合并？
- Admin：capabilities → Feature Flags（ADM-010）。
- Web：search → Agent Find tab（路由保留重定向兼容）。
- Today：quick log 独立 sheet（OWN-002），Today 不再平铺表单。
- 保留：health outcome 在 health/[id]（Pro 也可达）。

### 7. 哪些页面移动端不可用？
- **Mobile 端整体**：仅 App.tsx 骨架 → Today/QuickLog/Monitoring/Companion/Notifications/Camera/Health/Timeline 全部待实现（Stage H 范围）。
- Web 在 360/390 宽度：现有 fluid CSS 可用但未系统验证（RESPONSIVE_AUDIT 将覆盖 360/390/768/1024/1440）。
- Mini：12 页可用但信息密度未按 §68 收口。

### 8. 哪些页面设计语言不一致？
- Web：tokens 已引入（CSS 变量）但组件层未统一（ui.tsx 仅 5 个组件）。
- Mini：Taro 默认样式，无 token 引用。
- Mobile：RN 骨架无样式体系。
- Admin：独立样式，未用 tokens。
- 结论：需要 Design System v1（ui-tokens 扩展 + ui-kit）+ 五端接入。

### 9. 哪些页面仍暴露工程术语？
- Admin：capabilities/audit 原始表头。
- Web Timeline：source badge 直接显示 OWNER_REPORTED 等原始值（provenance 要求保留原始值，但需加中文 secondary 标签）；错误 state 直接显示 e.message（需映射人类语言）。
- Quick Log payload 默认值（狗粮/100g 等硬编码演示值）需改为最小输入。

### 10. 哪些业务域缺视觉表现？
- Welfare(07)、Social(08)、Devices & Home Intelligence(09)、Companion、Pet Agent(15)、Care Services(10)、Nutrition(12)、Insurance/Finance(13)、Adoption(11，EXTERNAL_BLOCKED 允许无 UI)。
- Stage H 补齐：Welfare/Social/Monitoring/Companion/Agent 五个新页面 + Pet Profile 域分区；Nutrition/Insurance 在 Pet Profile 分区（Record/Document 级）；Adoption 保持 EXTERNAL_BLOCKED。

## 结论与决定

1. 解除 UI Freeze，按冻结 IA（INFORMATION_ARCHITECTURE.md / NAVIGATION_MODEL.md / MASTER_PAGE_INVENTORY.md）执行五端重构。
2. 建 Design System v1：扩展 packages/ui-tokens（补 Grid/Breakpoint/Z-index/Border 等），新建 packages/ui-kit。
3. 新建 apps/pro（Vet/Trainer/Service 角色 IA）。
4. Companion 走 feature-flagged 前端原型（不伪装硬件）。
5. 全部文档/审计报告按契约 A/F 产出；质量门槛按契约 E 执行。
6. 不部署 staging；不伪造指标；PILOT 配置保持。
