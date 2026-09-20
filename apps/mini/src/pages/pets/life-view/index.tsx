import { useEffect, useState } from "react";
import { View, Text, Button } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api } from "../../../services/api";

/** MINI 3D Life View（Stage H.2，Compact 职责）：
 *  3D 形象服务诚实状态 + 版本列表 + 当前状态引用；不伪装成功。 */

interface VisualModel {
  model_id: string;
  version: number;
  provider: string;
  status: string;
  failure_reason: string | null;
  owner_verified: boolean | null;
  provenance_kind: string;
  activated_at: string | null;
}

interface OverlayMetric {
  key: string;
  label: string;
  current: string | number;
  baseline_range: string | null;
  delta: number | null;
  freshness: string;
  source: string;
}

interface StateOverlay {
  pet_id: string;
  provider_real: boolean;
  model_status: string | null;
  metrics: OverlayMetric[];
  note: string;
}

export default function LifeView() {
  const [petId, setPetId] = useState<string | null>(null);
  const [providerReal, setProviderReal] = useState<boolean | null>(null);
  const [models, setModels] = useState<VisualModel[]>([]);
  const [overlay, setOverlay] = useState<StateOverlay | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    Taro.getStorage({ key: "pli_current_pet" })
      .then((r) => setPetId(r.data as string))
      .catch(() => setPetId(null));
  }, []);

  const load = () => {
    setState("loading");
    Promise.all([
      api.get<{ real: boolean; provider: string }>("/visual/status"),
      petId ? api.get<{ models: VisualModel[] }>(`/pets/${petId}/visual-models`) : Promise.resolve({ models: [] }),
      petId ? api.get<StateOverlay>(`/pets/${petId}/state-overlay`) : Promise.resolve(null),
    ])
      .then(([st, ml, ov]) => {
        setProviderReal(st.real);
        setModels(ml.models);
        setOverlay(ov);
        setState("ready");
      })
      .catch(() => setState("error"));
  };

  useEffect(() => {
    if (petId !== null) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  async function startGeneration() {
    if (!petId) return;
    setGenerating(true);
    try {
      await api.post(`/pets/${petId}/visual-models`, { capture_id: null, opts: {} });
      Taro.showToast({ title: "已提交请求（服务未开放会诚实显示）", icon: "none" });
      load();
    } catch {
      Taro.showToast({ title: "提交失败", icon: "none" });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <View className="page">
      <View className="h1">生命视图</View>
      <View className="sub">3D 形象与当前状态；真实照片与记录始终是基础</View>

      <View className="card">
        <View className="layer-name">3D 形象服务</View>
        {state === "loading" && <View className="state">加载中……</View>}
        {state === "error" && (
          <View className="state state-error">
            出错了
            <Button className="btn" onClick={load}>重试</Button>
          </View>
        )}
        {state === "ready" && providerReal === false && (
          <>
            <View className="state">3D 生成服务暂未开放</View>
            <View className="muted">未接入真实 3D 生成服务；不伪装生成成功。</View>
            <Button className="btn btn-primary" onClick={startGeneration} disabled={generating}>
              {generating ? "提交中…" : "尝试提交生成请求"}
            </Button>
          </>
        )}
        {state === "ready" && providerReal === true && (
          <View className="muted">3D 生成服务已就绪。</View>
        )}
      </View>

      <View className="card">
        <View className="layer-name">3D 形象版本</View>
        {models.length === 0 && <View className="muted">还没有 3D 形象版本。</View>}
        {models.map((m) => (
          <View className="tl-item" key={m.model_id}>
            <View className="tl-head">
              <Text className="tl-type">v{m.version}</Text>
              <Text className="badge">{m.status}</Text>
              <Text className="badge">{m.provenance_kind}</Text>
            </View>
            {m.failure_reason && (
              <View className="tl-body">失败原因：{m.failure_reason}</View>
            )}
          </View>
        ))}
      </View>

      <View className="card">
        <View className="layer-name">当前状态</View>
        {overlay && overlay.metrics.length === 0 && <View className="muted">今天还没有记录。</View>}
        {overlay?.metrics.map((m) => (
          <View className="badge" key={m.key + m.label}>
            {m.label}：{String(m.current)}
            {m.baseline_range ? ` · 基线 ${m.baseline_range}` : ""}
            {m.delta != null ? ` · 变化 ${m.delta > 0 ? "+" : ""}${m.delta}` : ""}
          </View>
        ))}
        {overlay?.note && <View className="muted">{overlay.note}</View>}
      </View>
    </View>
  );
}
