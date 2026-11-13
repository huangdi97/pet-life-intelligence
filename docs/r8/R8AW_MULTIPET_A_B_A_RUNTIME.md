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
   - 该容器同时暴露多宠切换器（合法列出全家宠物名），因此**不以“无副宠名字”判定泄漏**；
   - 真正的隔离由下一步的主宠 Case 与 3D manifest `petId` 证明；
3. 滚动到“持续记忆”，必须再次看到主宠的不可变 Case 行；
4. 等待 Today 3D manifest，`petId` 必须等于主宠 ID、`stageRole=today`；
5. 输出 `multipet-a-b-a-truth.json` 与 `multipet-return-today.png`。

预等待/重挂载等 3D 稳定性逻辑沿用 R8AV；断言不放宽。

## 测试

- `tests/blind_ui/test_r8_demo_navigation_lifecycle.py` 新增 1 项：
  主 Case 由 owner review 返回、A→B→A 取证存在、身份 label 与 Case/manifest 门禁存在。
- 本地 blind 文件 **4 passed**。

## exact-HEAD 验证

| 项 | 值 |
|---|---|
| 实现提交 | `3d3688cbd3b1d4e2d1ac26a7c171fc856d697304` |
| 断言修正 | `4ed2e10678969816c03c45fcbb2d23b4f4ad2b94` |
| CI | run `39243214096` **success** |
| Android | run `39243214446` **success**（含 A→B→A） |
| OpenAPI | run `39243214087` **success** |

真实 manifest：

```json
{
  "primary_name": "豆豆",
  "secondary_name": "咪咪",
  "identity_includes_primary_name": true,
  "identity_contains_shared_switcher": true,
  "primary_case_visible_after_return": true,
  "today_stage_role": "today",
  "today_manifest_pet_id": "0753cc46-1d2a-4c2a-b6d0-909cdfb51a32"
}
```

截图：`multipet-return-today.png`（Android runtime evidence artifact）。

## 诚实边界

- 该步只证明真实 Android 的 A→B→A 表面替换；不新增多宠领域语义。
- 3D 仍为已标记的示例资产；`HUMAN_VISUAL_ACCEPTANCE=PENDING`。
- `NO_VISION_MODEL_USED = TRUE`。
