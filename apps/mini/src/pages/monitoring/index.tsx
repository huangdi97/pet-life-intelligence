import { useEffect, useState } from "react";
import { Button, Text, View } from "@tarojs/components";
import { api } from "../../services/api";
import { usePets } from "../../utils/usePets";

interface DeviceRow {
  device_id: string;
  display_name?: string | null;
  status: string;
}

function deviceStateLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "connected" || s === "online") return "在线";
  if (s === "offline") return "离线";
  if (s === "degraded") return "连接不稳定";
  if (s === "permission_required") return "需要授权";
  return "状态待确认";
}

export default function Monitoring() {
  const { pets, petId } = usePets();
  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!petId) return;
    setState("loading");
    api.get<DeviceRow[]>(`/pets/${petId}/devices`)
      .then((rows) => {
        setDevices(rows);
        setState("ready");
      })
      .catch(() => {
        setDevices([]);
        setState("error");
      });
  }, [petId, tick]);

  return (
    <View className="page">
      <View className="h1">{current ? `${current.name} · 在家` : "在家"}</View>
      <View className="sub">只展示真实设备状态；没有设备时不会模拟在线。</View>

      <View className="open-section">
        <View className="section-title">当前状态</View>
        {state === "loading" ? (
          <View className="state">正在读取设备状态……</View>
        ) : state === "error" ? (
          <View className="state state-error">暂时连接不上；没有缓存内容时不会猜测当前状态。</View>
        ) : devices.length === 0 ? (
          <View className="empty-state">
            <View className="empty-state-title">尚未连接设备</View>
            <View className="empty-state-body">连接支持的摄像头或互动设备后，可以在这里看到最近一次真实状态。</View>
          </View>
        ) : (
          devices.map((d) => (
            <View className="life-row" key={d.device_id}>
              <View className="life-dot" />
              <View className="life-row-body">
                <View className="life-row-head">
                  <Text className="life-row-type">{d.display_name || "设备"}</Text>
                  <Text className="life-row-time">{deviceStateLabel(d.status)}</Text>
                </View>
              </View>
            </View>
          ))
        )}
        <View className="life-row-source">
          {state === "ready" ? "状态为最近一次同步结果。" : "当前没有可确认的设备状态。"}
        </View>
      </View>

      <Button className="btn" onClick={() => setTick((v) => v + 1)}>刷新状态</Button>
    </View>
  );
}
