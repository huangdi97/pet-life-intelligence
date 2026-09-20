# PET_LIVING_MODEL_PRIVACY_SAFETY — PLM 隐私与安全

> 日期：2026-09-20 · 阶段：Stage H.2（GOAL PHASE L）

## 1. 隐私

- capture 表：privacy_scan（人脸/儿童/车牌/地址 heuristic）、consent_visual_model_training 独立开关（默认 False）。
- 3D 源媒体 NOT FOR GENERAL MODEL TRAINING（文档 + schema 字段）。
- 删除/保留：capture/model 通过既有 deletion-requests 流程登记（不自动删，人工确认）。

## 2. 医疗安全

- Red Flag Rule Engine 独立未改弱（`safety.policy_applied` 事件保持）。
- State Overlay 只引用真实事实（state-overlay 路由 note 声明 + 实现仅用 LifeEvent/Baseline）。
- 禁止从 3D 外观推断：器官/疾病/疼痛/情绪/寿命/概率/疗效 —— 实现层无此路径。

## 3. 禁止项扫描

- 用户侧无「数字孪生」文案（life-view 页用「3D 形象/生命视图」）。
- 无「情绪 88 分」「豆豆想你了」等（COPY_GUIDELINES 保持）。

## 4. 结论

**PET_LIVING_MODEL_PRIVACY_SAFETY: PASS**
