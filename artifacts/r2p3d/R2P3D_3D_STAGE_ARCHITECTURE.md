# R2P3D_3D_STAGE_ARCHITECTURE — 3D Stage 与 renderer contract

> 目标：统一 renderer contract，未来 REAL_3D_PROVIDER 接通后只替换 asset/provider，不重写三屏。
> 决策性质：开发阶段必须建立 Demo 个体 3D 资产 + 真实 3D Viewer + Living Stage + 交互契约（§6 goal spec）。

## 1. 栈 audit（结论：每客户端仅一套 3D framework）

| 客户端 | 现状 | 选型 | 理由 |
|---|---|---|---|
| Web (Next 15) | 无 3D | **three.js**（直接 WebGLRenderer，React wrapper）| 浏览器原生 WebGL；零额外 native 依赖；Playwright 可断言 canvas/renderer |
| Mobile (Expo 51 / RN 0.74, android/ 已提交) | 无 3D | **react-native-webview + three（自包含页面）** | 纯 Java/Kotlin 模块：无 C++/CMake，避免 pnpm 深路径下 expo-gl 的 CMake 对象路径超限（`build.ninja still dirty`，Windows 实测根因）；场景页由 esbuild 打包同一 @pli/pet-3d 资产为内联 HTML（`src/three/petStageHtml.ts`），拖拽/捏合/按钮全部在页面内，postMessage 上报状态与朝向 |
| 小程序/其他 | — | 不纳入本轮（P1）| 契约保留 fallback 通道（turntable/2.5D/photo）|

否决项记录：**expo-gl + three**（Windows + pnpm node_modules 深路径 → CMake 对象路径超过 CMAKE_OBJECT_PATH_MAX=250 → `ninja: build.ninja still dirty`，实测两次 FAILED，弃用）；Skia/自绘（不满足“真实 3D runtime”）；不改动 repo 现有 2.5D 组件（保留为显式 fallback）。`expo-asset` 承载 .html 在 SDK51 `export:embed` 下无 res/raw 注册元数据，release 无法解析 → 页面改为构建期内联 TS 字符串（见 build-3d-page.mjs）。

## 2. 统一 renderer contract

```ts
type RendererType = "demo3d" | "real3d" | "photo" | "2.5d" | "fallback";

interface PetRepresentation {
  identity: Pet3DIdentity;           // "doudou" | "mimi" | "unknown"
  rendererType: RendererType;
  asset: { version: string; provenance: "DEMO_SYNTHETIC"; devOnly: true };
  state: PetStageState;              // anchors + headline + caption（消费层提供）
  capability: "full" | "lod" | "poster"; // 设备能力
}
```

输入：pet identity / asset / version / provenance / state / device capability。
输出：render scene（Web: WebGLRenderer canvas；Mobile: WebView 承载的自包含 pet-stage 页面，同一 @pli/pet-3d 场景）。
替换点：`buildPetScene(identity)` 一处；provider 接通 real3d 后新增 builder 即可。

## 3. Demo 资产（程序化，provenance 显式）

- 资产源：**程序化 three primitives 组合**（development-only），不走外部下载/生成器（imagegen IMAGE_HTTP_404，REAL_PETS=0）。
- `packages/pet-3d`（新 workspace 包，纯 TS，peerDep `three`）：
  - `registry.ts`：`Pet3DIdentity = "doudou" | "mimi"`；资产元数据（version、provenance=DEMO_SYNTHETIC、devOnly、组件清单）。
  - `palette.ts`：demo 材质板（暖炭/暖白/雾灰/earth-green/陶土 + 柯基 coat 色），与 R2P3D_VISUAL_DIRECTION tokens 对齐。
  - `buildCorgi.ts`：豆豆 = body/chest/head/ears(圆耳+内耳)/muzzle/blaze(额头白纹)/legs×4/tail/胸白，低多边形分组，可旋转根节点 `doudouRoot`。
  - `buildCat.ts`：咪咪 = 独立猫形（圆头/三角耳/细体/长尾），根节点 `mimiRoot`。
  - `scene.ts`：`createPetStageScene(identity, opts)` → { group, setPose(idle), bounds }；绑定材料、接触阴影（圆盘）、可选雾参数。
  - 同一豆豆身份资产贯穿三屏：三屏都调 `createPetStageScene("doudou", ...)`（唯一共享注册表）。
- 咪咪确定性校验：单测断言 `buildPetScene("mimi")` 输出不同 group 形状（顶点数/耳形/尾形），并断言 registry 里豆豆≠咪咪。

## 4. 平台 viewer（各自一个薄 adapter）

- Web `apps/web/components/three/Pet3DViewer.tsx`：
  - canvas + WebGLRenderer（antialias、alpha、sRGB）；PerspectiveCamera；
  - 灯光：暖 Ambient/Directional + rim Spot + GroundShadow（contact）；Fog 低密度；
  - 交互：pointer drag=rotate（Life 全量 / stage 轻量）、wheel/按钮=zoom、双击/按钮=Reset；
  - 生命周期：帧循环（呼吸式中性起伏）、resize、WebGL 失败 → `rendererStatus:"failed"` → 父层 fallback（2.5D/photo）；
  - reduced-motion：关闭自转/呼吸；提供静态帧。
  - 导出 `rendererStatus` 供 Playwright 断言（data-testid="pet3d-canvas" + status attr）。
- Mobile `apps/mobile/src/components/three/Pet3DViewer.tsx`：
  - Mobile `Pet3DViewer`：`react-native-webview` 加载 `PET_STAGE_HTML`（脚本构建，含 three + @pli/pet-3d）；页面内单指旋转、捏合缩放、Reset 按钮；`postMessage` → RN 上报 status/orientation（logcat 证据）；失败 → `onStatus("failed")` → 2.5D/photo fallback。

## 5. 状态锚点与 overlay（三屏共用）

- `PetStateAnchor`（已有，视觉升级）：label+value+icon，浮标化（毛玻璃深色底），点击展开详情 sheet：
  事实 / 与自己相比 / 来源 / 更新时间 / 证据 —— 全部来自 API 事实，禁止医学评分。
- 空间排布：stage 上轨 2、中轨 2、下轨 2，宠物永远不被遮挡；zoom 后锚点保持屏幕对齐（renderer projections 或基于比例的回读）。

## 6. Fallback / 性能 / 诚实

- 加载优先级：poster（2.5D 已有）→ low LOD（简化几何）→ interactive（Life）；Today/Pet 用完整几何但限制交互。
- 低能力设备：pre-rendered turntable / 2.5D / photo，显式标记 FALLBACK；**不得因开发机 Provider blocked 而全产品默认 fallback**。
- 3D 永不单点失效：Quick Log/Health/Timeline/权限/安全不依赖 3D；文字+数据+操作始终可用。
- 监控：renderer status 上报（log/telemetry only，不暴露 Owner）；记录一次加载时长与首帧渲染时长。

## 7. 术语/诚实文案（三屏 note 策略）

- Life View note（demo 态）：`演示 3D 形象（开发环境）· 未来连接真实服务后，将用豆豆的照片生成它`（替换“尚未创建”）。
- 禁：数字孪生/生理仿真/AI 诊断体/预测生命/虚拟生命体/LIVE/实时/provider 名/model_id/raw enum。
- 演示 3D 外观不替代真实照片/记录（Pet 页媒体区与现实时间线文本并存，不伪造媒体）。