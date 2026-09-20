# PET_LIVING_MODEL_SAFETY — PLM 安全 / 隐私 / 溯源

> 阶段：Stage H.2（GOAL PHASE L）· 日期：2026-09-20

## 1. Provenance（系统层区分）

OWNER_REPORTED / DEVICE / PROFESSIONAL / LAB / AI_STRUCTURED / AI_INFERENCE / GENERATED_3D / RECORDED / LIVE

- 3D 模型 `provenance_kind=GENERATED_3D` 是**硬约束**（模型默认值 + schema 校验），前端展示「3D 形象」而非 Live 画面。

## 2. Privacy（Capture 处理）

- EXIF strip、人脸/儿童/车牌/地址扫描（privacy_scan 字段，deterministic/basic QC）。
- background removal、consent、retention、delete：capture 表有 consent_visual_model_training 独立开关。
- 默认：Pet 3D source media NOT FOR GENERAL MODEL TRAINING。

## 3. Medical Safety

- **LLM 不得单独决定 emergency**：Red Flag Rule Engine 独立（未改弱）。
- State Overlay 只引用真实事实；**禁止**从 3D 外观推断器官/疾病/疼痛/情绪/寿命/概率/疗效。
- 不把未发现红旗写成「没有疾病」；Vet Brief 仍为信息整理。

## 4. 激活安全

- `owner_verified=False`（not_like）→ `/activate` 返回 422（contract 测试覆盖）。
- 版本化：retire 旧版本、可 re-activate、delete 待实现（RESERVED）。
