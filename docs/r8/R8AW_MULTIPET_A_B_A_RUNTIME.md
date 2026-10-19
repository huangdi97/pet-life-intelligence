# PLI R8AW · 多宠物 A→B→A 真实 Android 回归

2026-10-19。分支 `feat/r2p3d-r3-render-truth-ui-closure`；PR #2 保持 OPEN。

## 起步状态

矩阵第 21 行“A→B→A 切宠遮蔽与异步竞态”只有静态契约（`PASS + PENDING_RUNTIME`）：
Android 取证覆盖了主宠、副宠与副宠 3D/Review，但没有**真实回到主宠**并验证
身份、不可变 Case 与 3D manifest 全部替换为 A。

## 实现（仅取证脚本）

新增 `capture_multipet_return`，在副宠 Twin Review 完成后：

1. deep link 回主宠 Today；
2. 等待 `pli.today.identity` 挂载，读取其合并 label：
   - 必须包含主宠名字；
   - **不得**包含副宠名字（防止 B 的身份/状态泄漏到 A）；
3. 滚动到“持续记忆”，必须再次看到主宠的不可变 Case 行；
4. 等待 Today 3D manifest，`petId` 必须等于主宠 ID、`stageRole=today`；
5. 输出 `multipet-a-b-a-truth.json` 与 `multipet-return-today.png`。

预等待/重挂载等 3D 稳定性逻辑沿用 R8AV；断言不放宽。

## 测试

- `tests/blind_ui/test_r8_demo_navigation_lifecycle.py` 新增 1 项：
  主 Case 由 owner review 返回、A→B→A 取证存在、身份 label 与 Case/manifest 门禁存在。
- 本地 blind 文件 **4 passed**。

## 诚实边界

- 该步只证明真实 Android 的 A→B→A 表面替换；不新增多宠领域语义。
- 3D 仍为已标记的示例资产；`HUMAN_VISUAL_ACCEPTANCE=PENDING`。
- `NO_VISION_MODEL_USED = TRUE`。
