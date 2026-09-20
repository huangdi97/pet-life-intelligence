# THREED_PROVIDER_ADAPTER — 3D 生成 Provider 适配层

> 阶段：Stage H.2（GOAL PHASE F）· 日期：2026-09-20 · 状态：ADAPTER IMPLEMENTED / REAL PROVIDER EXTERNAL_BLOCKED

## 1. Provider-agnostic 接口（services/api/app/adapters/visual_provider.py）

```python
class VisualProvider(Protocol):
    name: str
    real: bool
    def generate(capture_id, artifact_ids, opts) -> job_id
    def status(job_id) -> dict
    def cancel(job_id) -> dict
    def artifacts(job_id) -> dict
    def metadata(job_id) -> dict
```

## 2. 技术候选（评估但未耦合）

- SMAL 类动物参数模型（rig 交互强）
- Hunyuan3D-2.1 / TRELLIS / TRELLIS.2（外观保真）
- Gaussian Splatting / Mesh+PBR / Rigged LOD Mesh

**推荐双表示**：High Fidelity View（外观相似度）+ Interactive Rigged（轻动画/移动端/状态交互）。

## 3. 当前状态

- `SandboxProvider`：确定性本地占位，job QUEUED→GENERATING→FAILED(`REAL_3D_PROVIDER_EXTERNAL_BLOCKED`)，**绝不伪装成功**。
- `ExternalBlockedProvider`：PILOT_MODE 下显式 blocked。
- `get_provider()` / `provider_status()` / `reset_provider_cache()`。
- 真实 provider 接入 = 实现同协议 + feature flag + 凭据，`real=True` 后前端才显示「已就绪」。

## 4. 测试

- contract tests：/visual/status 诚实 blocked、capture→qc→generate→verify→activate 全流程、not_like 不能激活、版本递增、非 owner 403（tests/contract/test_plm_visual.py，8 项）。
