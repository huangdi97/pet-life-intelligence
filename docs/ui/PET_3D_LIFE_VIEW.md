# PET_3D_LIFE_VIEW — 3D 生命视图页面规范

> 阶段：Stage H.2（GOAL PHASE H/I/K）· 日期：2026-09-20 · 状态：WEB + MINI IMPLEMENTED

## 1. 页面（Web：/pets/[id]/life-view · Mini：pages/pets/life-view）

- 3D 服务状态（诚实：REAL_3D_PROVIDER_EXTERNAL_BLOCKED → 「暂未开放」+ 不伪装）。
- 3D 形象版本列表（version/provider/status/owner_verified/failure_reason）。
- 当前状态（state overlay，引用事实）。
- 真实照片 fallback（**核心产品不依赖 3D**）。

## 2. 加载策略（Mini 优先性能）

poster first → low LOD → interactive if capable → fallback turntable / 2D；**不阻塞 Today**。

## 3. 3D Failure（任何失败回退）

真实宠物照片 + Current State + Baseline + Actions。

## 4. Companion 入口（GOAL K1）

从 Today / Pet 3D Life View 进入「看看它」；GENERATED_3D ≠ LIVE（用户必须知道看到的是什么）。

## 5. Reduced Motion（GOAL N3）

prefers-reduced-motion 下关闭 auto rotate / breathing loop / orbit ring / parallax / glow pulse；3D 保持静态可操作。
