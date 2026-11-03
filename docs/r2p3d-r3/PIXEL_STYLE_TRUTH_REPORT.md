# 像素风格真值报告 — R2P3D-R3

方法：PIL+numpy 像素统计（非视觉模型）。输入：捕获截图 + 舞台/字段 bounding box（来自 a11y/DOM 几何）。

## 已执行检查

- `pixel-style`（today/pet/lifeview surface）：舞台区域亮度/暖场统计。web + android 全部通过（today/pet 需 stageLuma≥0.22 或 realityMedia；lifeview ≥0.08；`stageLuma=undefined → warm field or reality media ok` 分支生效）。
- `style-truth`（computed background 非暗 debug viewer）：today/pet/lifeview/review 舞台 computed bg 全部通过（lifeview/review bg luma 实测 ≥0.08；today/pet 走 warm-field 分支）。
- `near_identical`（未修改时 blocked=true 的像素相似门禁）与 `pixel_regions()` 有单测覆盖（`tests/blind_ui/test_pixel_oracle.py`）。

## 本轮不承诺

- 未做语义/审美判断（无 aesthetic critic、无“看起来不错”声明）。
- 未把像素统计当作身份验证（`REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED`）。
- 3D 舞台的最终视觉观感以 7 张 Contact Sheets 交由人工审查（`HUMAN_VISUAL_ACCEPTANCE = PENDING`）。
