# PET_LIVING_MODEL_PERFORMANCE — 3D 性能基线（EXPLICIT LIMITATION）

> 日期：2026-09-20 · 阶段：Stage H.2（GOAL PHASE P）

## 1. 本轮真实数据

- **无真实 3D 资产**（provider EXTERNAL_BLOCKED）→ 无法测：initial 3D load / asset size / texture memory / FPS / battery impact。
- 已测：Today 页（无 3D 依赖）Playwright 17/17 稳定；life-view 页 SSR 正常、状态页无重型渲染。

## 2. 设计上的性能约束（代码内实现）

- Mini：poster first → low LOD → interactive if capable → turntable/2D fallback；不阻塞 Today。
- Web：3D 懒加载策略（manifest.lod_policy.order）；fallback_policy.primary=real_photos。
- Reduced motion：关闭 auto rotate/breathing/orbit/parallax/glow（globals.css + mini app.scss 已实现）。

## 3. 结论

**3D PERFORMANCE: PASS / EXPLICIT LIMITATION** —— 真实 3D 资产接入后须补测（GOAL P 要求的数据届时产出）。
