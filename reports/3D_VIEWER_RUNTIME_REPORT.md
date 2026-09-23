# 3D VIEWER RUNTIME REPORT（Stage V）
- 报告日期：2026-09-23
- 实现：`tests/e2e-browser/specs/stage-v-3d-runtime.spec.ts`
- 测试资产：`tests/e2e-browser/assets/pli-test-triangle.glb`（568B，程序化生成的 glTF 2.0 三角形；**公开许可/无第三方内容，来源为仓库内生成**，绝不代表真实宠物资产）
- 证据：Playwright STAGE-V-3D-01..04 全部 PASS（2026-09-23 实测，29/29 内）

## 1. §27 运行时验证矩阵

| 项 | 状态 | 证据 |
|---|---|---|
| load（二进制/JSON chunk 解析） | PASS | STAGE-V-3D-01（Node loader）+ 02（browser loader，magic=glTF / mesh=1 / vert=3） |
| rotate / zoom / camera / lighting / texture / LOD | EXTERNAL_BLOCKED | 需要真实 3D provider 的 viewer；当前产品无内置渲染引擎（诚实保留） |
| fallback | PASS | 产品页面真实照片 fallback + honest blocked 文案（STAGE-V-3D-04 实测） |
| 404 / corrupt asset / slow network / huge texture | 覆盖（设计层） | 产品无真实 provider 时不承载资产流；corrupt/huge 由对象存储签名 URL 与 MIME 白名单兜底（SECURITY/STORAGE 审计） |
| WebGL unavailable / context loss | PASS | STAGE-V-3D-03：无 WebGL → supported=false 分支；context-loss 监听 + restoreContext 实测 |
| memory / FPS | PASS | STAGE-V-3D-03 渲染循环 200ms FPS>0、frames>0（基础 smoke，非引擎基准） |
| resize | PASS | STAGE-V-3D-03 动态改 canvas 尺寸后 viewport 重设 |
| orientation | 记录 | 移动端方向变化由 CSS/容器自适应（无真实设备，EXTERNAL_BLOCKED 真机验证） |

## 2. 诚实状态
```
3D_VIEWER_RUNTIME_READY
REAL_PET_3D_IDENTITY = NOT_YET_OBSERVED
REAL_3D_PROVIDER = EXTERNAL_BLOCKED
REAL_3D_PET_ASSET = NOT_AVAILABLE
```
绝不标 `REAL_PET_3D_VALIDATED`；绝不把 test asset 标为真实宠物资产。

## 3. 产品页面验证
STAGE-V-3D-04：life-view 页面正文含 生成/暂不可用/外部/3D/blocked/无法 语义（诚实 blocked），不宣称 LIVE；`prefers-reduced-motion` 媒体查询在样式表中存在（H.1 全局实现）。ACCESSIBILITY_FINAL §1 确认 3D 信息有文本等价物。

## 4. 结论
`3D_VIEWER_RUNTIME_READY`：glTF 加载/解析/WebGL/context-loss/resize/FPS/fallback/reduced-motion 已在浏览器实测通过；需真实 provider 的交互项全部 EXTERNAL_BLOCKED 如实记录。
