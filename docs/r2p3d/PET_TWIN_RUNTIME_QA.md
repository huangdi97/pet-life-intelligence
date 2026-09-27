# PET_TWIN_RUNTIME_QA

> 总 Goal §64/§65/§66/§67。2026-09-28。

## 客户端运行时

- Web：three.js WebGL（`components/three/pet3d-viewer.tsx`）— rotate/zoom/reset；reduced-motion 冻结漂移；
  失败 → 2.5D/photo fallback（显式标注）。`r2p3d.spec`（R2P3D-02/03/04）断言 canvas 存在、旋转改变
  `data-orientation`、滚轮缩放改变渲染像素。
- Mobile：`react-native-webview` 承载自包含 `pet-stage.html`（同一 `@pli/pet-3d` 场景）— 拖拽旋转/捏合缩放/
  按钮；postMessage 上报 status/orientation；失败 → `PetTwoPointFiveD` fallback。Android AVD pdig5 实机验证记录于
  `artifacts/r2p3d/R2P3D_P0_EVIDENCE.md`（Life View angle A/B 角度像素差由脚本实测 > 阈值）。

## 证据清单（artifacts/r2p3d/）

- `core/`：01_today_3d、02_pet_world_3d、03_life_view_3d、04_life_view_angle_A、05_life_view_angle_B、
  android_runtime_01_today、before/after pairs、v0.2.0 对比。
- `web/`：today/pet/life-view @ 390/1440（含 fold）。
- `final/`：4 张 contact sheet + `v0.2.0_vs_R2P3D.png` + `gallery.html`。
- 交互证据：Life View rotate/zoom 以 angle A/B 帧序列 + 像素差脚本 + Playwright 断言（R2P3D-03/04）保留
  （repo 不存视频）。

## 性能与降级

- 加载策略 poster → low LOD → interactive；低能力客户端 turntable/2.5D/photo（显式 FALLBACK）。
- 3D 永不单点失效：文本/数据/操作不依赖 3D；健康/安全动作不依赖渲染器。
- 确定性：visual capture 在 reduced-motion 下冻结 3D 动画，baseline 可复现（CI 全绿证实）。