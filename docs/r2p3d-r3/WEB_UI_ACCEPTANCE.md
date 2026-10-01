# Web UI 验收 — R2P3D-R3

捕获：`node scripts/blind-ui/capture-web.mjs --out artifacts/r2p3d-r3/web`（390×844，真实 DOM/a11y/manifest）。
评分：`scorecard.py artifacts/r2p3d-r3/web web --out artifacts/r2p3d-r3/reports`。

## 全屏结果（21/21 heroPass）

| 屏 | total | heroPass | 屏 | total | heroPass |
| --- | --- | --- | --- | --- | --- |
| today | 100 | ✅ | behavior | 95 | ✅ |
| timeline | 100 | ✅ | training | 100 | ✅ |
| pet | 100 | ✅ | welfare | 95 | ✅ |
| lifeview | 100 | ✅ | social | 95 | ✅ |
| assistant | 100 | ✅ | companion | 95 | ✅ |
| me | 95 | ✅ | monitoring | 95 | ✅ |
| quicklog | 100 | ✅ | twincapture | 100 | ✅ |
| health | 95 | ✅ | twinreview | 100 | ✅ |
| twinversion | 95 | ✅ | special-* | 92–100 | ✅ |

Hero 四屏关键证据：

- identity gate：`generic=false` + petId `0070551c…` + sources=2（4 屏）
- `manifestOrigin=RUNTIME`、`fallbackUsed=false`、`wireframe=false`
- projectedAreaRatio：0.172/0.214/0.275/0.234（全部在契约区间）
- LifeView camera：rotate Δyaw 0.568、zoom Δdistance 0.60、reset 偏差 0.0000（真实 handler 驱动）
- TwinReview 交互：真实点击「不像」→ issue 面板 8 项、activate disabled=true（selected=not_like）

## 主要修复项（本轮）

- twin 未达 3 屏的根因：harness 自身污染 ACTIVE（已拦截 verify POST）；页面统一 ACTIVE twin + WebView key 重挂载。
- 取景：aspect 感知 autofit（见 VISUAL_COMPOSITION_V2）。
- Life View 外观/可信面板文案与 ACTIVE twin 对齐（真话修复）。
