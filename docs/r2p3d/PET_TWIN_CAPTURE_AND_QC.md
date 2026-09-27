# PET_TWIN_CAPTURE_AND_QC

> 总 Goal §11/§12/§63。2026-09-28。

## Capture Wizard（Owner 流程）

- 6 角度覆盖：正面 / 左侧 / 右侧 / 背面 / 全身 / 头部（✓/✗ 实时状态）。
- 覆盖声明随 capture 写入后端（`PetVisualCapture.coverage`）。
- **硬门（确定性）**：QC 要求 `front + full_body + head` 均覆盖且 ≥2 张素材才 PASS；
  失败返回 `retake_guidance`（补拍指引），QC_FAILED 的 capture 禁止进入生成。
- 上层演示从 Timeline/Media 自动挑选候选（未来路径，当前 EXTERNAL_BLOCKED 注明）。

## QC 检查项（诚实状态）

| 检查 | 实现 |
|---|---|
| 角度覆盖 | 确定性（coverage 门）✅ |
| 补拍提示 | 确定性 retake_guidance ✅ |
| identity consistency / contamination / blur / exposure / occlusion / multi-pet / resolution | `heuristic_only`（真实 AI 视觉 EXTERNAL_BLOCKED，结果存为 QC 事实而非诊断） |
| 隐私扫描 | faces/children 标记位（当前 False + heuristic；EXIF 清洗属上传层职责） |

## 生成门

- 候选生成仅对 `QC_PASSED`（或未跑 QC 的 UPLOADED）capture 开放；QC_FAILED → 422。
- 激活门：owner verify（like/basic_like）后 ACTIVE；not_like 永不自动激活。