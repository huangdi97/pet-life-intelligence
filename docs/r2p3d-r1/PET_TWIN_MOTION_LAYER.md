# R2P3D-R1 — PET_TWIN_MOTION_LAYER

> 动作层：从“会呼吸”升级为 Living Model（R2P3D-R1 §41/§44/§45/§61/§65）。
> 状态：2026-09-28。**CORE_ANIMATION_LIBRARY = PASS（12 个真实骨骼关节动画）。**

## 1. 动作清单（统一命名，R2P3D-R1 §61）

| clip | truth | 来源 |
|---|---|---|
| `Idle` | AMBIENT | 数字存在（呼吸级微动） |
| `Stand` | AMBIENT | 绑定姿态（干净站姿） |
| `Sit` | REPRESENTATIVE | `behavior.sit` 记录 |
| `Lie` | REPRESENTATIVE | `behavior.lie` 记录 |
| `Sleep` | REPRESENTATIVE | `daily.sleep` 记录 |
| `Walk` | REPRESENTATIVE | `daily.walk` 记录 |
| `Run` | REPRESENTATIVE | `daily.play` 记录 |
| `Eat` | REPRESENTATIVE | `daily.meal` 记录 |
| `Drink` | REPRESENTATIVE | `daily.drink` 记录 |
| `Play` | REPRESENTATIVE | `daily.play` 记录 |
| `Sniff` | OBSERVED | 仅相机/真实视频/人确认观察 |
| `Stretch` | OBSERVED | 同上 |

## 2. True Model（R2P3D-R1 §44）

- **AMBIENT**：Idle/Stand —— 数字存在，不声称宠物行为。
- **REPRESENTATIVE**：从已记录事件映射（WalkEvent → Walk…），UI 必须能
  知道“这是基于记录的表示”。
- **OBSERVED**：只有 Camera / real video / human-confirmed observation。
- **Health 永远不是 pose 来源**（§45）：饮水下降 → Twin 变虚弱 ❌；
  健康 Attention → Twin 躺下 ❌；Health Risk → Twin 变红 ❌。

## 3. 实现机制（packages/pet-3d）

- `rig.ts`：16 关节四足骨骼层次（root/torso/neck/head/earL/earR/
  tail0/tail1/shoulderFL…kneeBR）。所有动作都是**关节旋转**（肩/髋/膝/
  颈/头/尾），不是整模浮动。
- `motion.ts`：`POSE_FN` 确定性求值器（t → 每关节 rotation/position/scale）
  + `POSE_CLIPS` 元数据 + `buildClip()`（8fps 采样 → QuaternionKeyframeTrack
  → THREE.AnimationClip，供 GLB 导出与 QA）。
- `motionManifest()`：JSON 清单（names/truth/channels），QA 与 UI 共用。
- 运行时同一求值器驱动 web（`pet3d-viewer.tsx`）、mobile WebView
  （`pet-stage-entry.ts`）与 GLB 导出 —— runtime pose == exported clip。

## 4. GLB

- `scripts/twin/twin-glb-export.mjs`：demo dog + cat 各导出 GLB（~350 KB，
  12 clips，joint 节点动画）。
- `scripts/twin/twin_glb_qa.py`：场景/节点/动画清单/通道目标为 joint_*/包围盒/
  校验和 —— **全部 PASS**（见 `artifacts/r2p3d-r1/glb/glb-qa-report.json`）。

## 5. UI 集成

- Life View：pose switcher（Idle/Sit/Walk/Run/Eat/Drink/Sleep chips），
  仅当 active twin 存在时显示；POSE_META.label 为中文文案。
- Today：最近事件 → REPRESENTATIVE pose（`poseForEvent`）。
- Twin Review：候选渲染 Idle。
- Health 状态从不参与 pose 选择。

## 6. 动作资产许可证

- 全部动作由本仓程序化定义（骨骼旋转关键帧），**无第三方动画资产**
  （§42：禁止来历不明 Sketchfab/Mixamo 资产）。
- license：MIT（本仓），见 `PET_TWIN_MODEL_LICENSE_AUDIT.md` §3。

## 7. 测试

- `tests/unit/test_r2p3d_r1_twin_pipeline.py::test_glb_qa_and_motion_manifest`
  （12 names，包含 Idle/Sit/Walk/Eat/Drink/Sleep）。
- GLB QA 独立可跑：`python scripts/twin/twin_glb_qa.py`。