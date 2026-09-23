import { Text, View } from "@tarojs/components";
import { deviceStatusLabel, type DeviceRow } from "../_lib";

/** 监测入口：今天在家状态 + 设备（设备集成为原型，如实显示） */
export function MonitorCard(props: {
  monitorOpen: boolean;
  monitorCounts: Record<string, number> | null;
  monitorDevices: DeviceRow[] | null;
  onToggle: () => void;
}) {
  const { monitorOpen, monitorCounts, monitorDevices, onToggle } = props;
  return (
    <View className="card">
      <View className="row" style={{ justifyContent: "space-between" }} onClick={onToggle}>
        <Text>在家监测</Text>
        <Text className="muted">{monitorOpen ? "收起" : "展开"}</Text>
      </View>
      {monitorOpen && (
        <View style={{ marginTop: 12 }}>
          {monitorCounts === null && <View className="muted">加载中……</View>}
          {monitorCounts !== null && Object.keys(monitorCounts).length === 0 && (
            <View className="muted">今天还没有设备事件（设备集成为原型）。</View>
          )}
          {monitorCounts !== null &&
            Object.entries(monitorCounts).map(([k, n]) => (
              <Text key={k} className="badge">{k} × {n}</Text>
            ))}
          {monitorDevices !== null && monitorDevices.length === 0 && (
            <View className="muted" style={{ marginTop: 8 }}>还没有绑定设备（设备集成为原型）。</View>
          )}
          {monitorDevices?.map((d) => (
            <View className="tl-item" key={d.device_id}>
              <View className="tl-head">
                <Text className="tl-type">{d.display_name || d.provider}</Text>
                <Text className="muted">{deviceStatusLabel(d.status)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
