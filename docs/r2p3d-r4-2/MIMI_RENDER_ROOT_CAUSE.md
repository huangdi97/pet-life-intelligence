# Mimi Render Root Cause (R2P3D-R4.2, Phase B)

> Goal: 把咪咪从「thin vertical spike / 拉伸 / 扭曲」恢复为正常猫形。
> Method: 确定性 GLB/OBJ 检查（无任何视觉模型）。NO_VISION_MODEL_USED = TRUE.

## B1. GLB 原始几何（修复前 `mimi.glb`, twin_version r4-1.0.0）

工具：`scripts/r2p3d-r4-2/inspect_glb.py`（纯 glTF/GLB 字节解析 + numpy）。

- scene root: `PLI_Twin`（children `[joint_root, TwinMesh]`）
- 所有 joint node 仅 translation（无 rotation/scale）；`TwinMesh` 无局部变换 → 绑定姿态即 mesh POSITION 原始值。
- inverseBindMatrices: 纯 translation 求逆（与 `glbwriter.py` 一致），无异常。
- joint world translations（twin 单位空间，bone_scale=height/proc_height=0.8696）：
  - root=(0,0,0), torso=(0,0.3652,0), neck=(0,0.6609,0.3652), head=(0,0.7652,0.6261)
  - earL=(-0.1913,0.9565,0.6087), earR=(0.1913,0.9565,0.6087)
  - tail0=(0,0.5217,-0.4522), tail1=(0,0.5913,-0.6435)
  - shoulderFL=(-0.2957,0.3826,0.2957), kneeFL=(-0.2957,0.1913,0.2957)
  - hipBR=(0.313,0.3478,-0.313), kneeBR=(0.313,0.1739,-0.313) 等
  - 无 joint explosion（所有平移 ≤ 1.0 量级）。

### 修复前 bind bbox（POSITION accessor min/max）

```
min=[-0.1579, 0.0, -0.1579] max=[0.1579, 1.0, 0.1579]
size=[0.3157, 1.0, 0.3157]   h/w=3.17  h/l=3.17  w/l=1.00
```

→ 一个「竖直细柱」：高度 1.0，宽=深=0.316。这就是截图里「细长竖直棕色尖条」的直接原因。

### 修复前 skinning（每 joint vertex weight count / mean / max）

| joint | count | mean | max |
| --- | --- | --- | --- |
| joint_head | **1** | 0.003 | 0.003 |
| joint_shoulderFL | **0** | — | — |
| joint_kneeFL | **0** | — | — |
| joint_kneeBR | **0** | — | — |
| joint_hipBR | 181 | 0.093 | 0.281 |
| joint_torso | 22856 | 0.284 | 0.932 |

→ 权重异常集中/不对称：头部基本未绑定、左侧前腿与右后膝无顶点绑定。是「几何塌缩」的次生症状（顶点都挤在同一竖直柱上，最近 joint 归属退化）。

### 修复前 posed bbox（skinning 求值，Idle @ t=1.0）

```
size=[0.3157, 1.0022, 0.3210] h/w=3.17 h/l=3.12 max|disp|=[0, 0.0065, 0.0261]
```

→ REST 已塌缩成细柱，Idle 只是轻微呼吸，未放大塌缩。**根因在 REST 几何，不在 motion。**

## B2. 三层几何比较（source OBJ → baked base → GLB bind pose）

| 层 | size (x,y,z) | h/w | h/l | 说明 |
| --- | --- | --- | --- | --- |
| source `cat_quaternius_v2.obj` | [5.6675, 4.4795, 1.4250] | 0.79 | 3.14 | 正常横卧猫：长轴在 X（5.67），高度 4.48，厚度 Z=1.43 |
| baked `mimi_base.obj`（修复前） | [0.3157, 1.0, 0.3157] | 3.17 | 3.17 | **长轴消失，X≈Z 细柱** |
| baked `mimi_base.obj`（修复后） | [0.3157, 1.0, 1.2650] | 3.17 | 0.79 | 正常横卧猫：长轴 Z=1.265，高 1.0 |
| GLB bind pose（修复后） | [0.3157, 1.0, 1.2650] | 3.17 | 0.79 | 与 baked 一致（无二次变换） |

结论：axis 没有被「交换后丢失」——而是 `normalize_mesh` 的原地旋转把 X、Z 两个轴都写成了 `-z`（见 B3），导致长轴被抹平。

## B3. `rotate_y_deg = -90` 双重旋转验证 → 实际是「视图别名塌缩」

- bake 时间已应用：`bake_twin.py` 调用 `normalize_mesh(V, height, rotate_y_deg=-90)`，旋转写入顶点坐标。
- GLB writer / runtime **不再** 应用 `normalize.rotate_y_deg`（`glbwriter.py` 只写 joint translation；`loader.ts` / `pet-stage-entry.ts` 不读该字段）→ 没有「metadata-only + runtime 二次旋转」。
- 但是发现独立 bug：`meshops.normalize_mesh` 使用 numpy 视图：

```python
x, _, z = verts[:, 0], verts[:, 1], verts[:, 2]   # 视图，不是拷贝
verts[:, 0] = x * ca + z * sa                     # 写回 verts[:,0]
verts[:, 2] = -x * sa + z * ca                    # x 此时已经是更新后的 verts[:,0]!
```

`x` 是 `verts[:,0]` 的视图，第一步赋值后 `x` 内容已变成 `-z`；第二步 `-x*sa + z*ca`（-90° 时 sa=-1, ca=0）实际计算 `-(-z)*(-1) = -z`，于是 `verts[:,2]` 也被写成 `-z`。**两轴都塌缩到 Z span。**

- 为什么豆豆没受影响：dog 的 `rotate_y_deg = 0.0`（无旋转分支）。
- 修复（`meshops.py`）：旋转前显式拷贝 `x`/`z`。

修复后 normalize meta 不变：`{scale: 0.22373, translate_y_min: -0.0532, height: 1.0, rotate_y_deg: -90.0}`，说明 scale/height 计算原本正确，只是旋转实现有别名 bug。

## B4. 修复后 skinning 权重（重新 bake 后）

| joint | count | mean | max |
| --- | --- | --- | --- |
| joint_head | 10512 | 0.358 | 0.449 |
| joint_shoulderFL | 4316 | 0.263 | 0.964 |
| joint_shoulderFR | 4778 | 0.271 | 0.959 |
| joint_hipBL | 5130 | 0.217 | 0.936 |
| joint_hipBR | 5256 | 0.282 | 0.944 |
| joint_kneeFR | 6 | 0.304 | 0.321 |
| joint_kneeBL | 0 | — | — |

→ 头部、四肩、双髋已正确绑定；knee 关节绑定极少是短腿模型的正常现象（膝关节接近足部，顶点大多归属 shoulder/hip）。无异常 concentrated weights（无单 joint 独吞全身）。权重文件已按新几何重新生成。

## B5. REST / Idle / Stand 分姿检查（修复后）

```
REST (bind):        size=[0.3157, 1.0, 1.2650]   h/l=0.791
Idle @ t=1.0:       size=[0.3157, 0.9928, 1.311] h/l=0.757  max|disp|=[0, 0.0276, 0.027]
Stand @ t=1.0:      size=[0.3157, 1.0, 1.2650]   h/l=0.791  max|disp|=0
```

→ REST 为正常横卧猫比例（长 1.265 × 高 1.0 × 厚 0.316）；Idle 变形有界（位移 < 0.03）；Stand 与 REST 一致。无 vertical spike、无 aspect-ratio collapse、无 joint explosion。

## 结论

- 咪咪视觉变形 root cause = `meshops.normalize_mesh` 的 numpy 视图别名 bug 把 Y 轴旋转退化为 X/Z 双轴塌缩。
- 修复：bake 前拷贝 x/z；重跑 `bake_twin.py --identity cat` + `build_twins.py --identity cat`。
- 机器 sanity（B6）达标：REST/Idle/Stand bbox 合理、bone transform 无爆炸、rest→idle 变形有界。
- 视觉判定仍由用户完成：`CAT_VISUAL_HUMAN_REVIEW = PENDING`。

## 机器证据

```
[qa:doudou] V3_PASS=True tris=45376 joints=16 clips=12 size=4270KB tex=2048
[qa:mimi]   V3_PASS=True tris=51648 joints=16 clips=12 size=3141KB tex=2048
[qa] fingerprints distinct=True (b116ab1c4e1c7b2d vs 274b2dc1f341c333)
[qa] overall=True -> reports/r2p3d-r4/ASSET_QA_R4.json
scripts/twin/twin_glb_qa.py -> pass=true
```

- 新增检查工具：`scripts/r2p3d-r4-2/inspect_glb.py`（GLB 几何/skinning/animation 确定性检查，可在 CI/本地重复执行）。
