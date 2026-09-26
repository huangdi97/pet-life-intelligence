/**
 * MonitorCard — 在家监测（Today 情境入口；R.2 §57）。
 * 设备未接入时如实显示“尚未连接设备”，不暴露内部 provider/事件 key。
 */
import { Text, View } from "@tarojs/components";
import { deviceEventLabel } from "../../../utils/labels";
import { deviceStatusLabel, type DeviceRow } from "../_lib";

export function MonitorCard(props: {
  monitorOpen: boolean;
  monitorCounts: Record<string, number> | null;
  monitorDevices: DeviceRow[] | null;
  onToggle: () => void;
}) {
  const { monitorOpen, monitorCounts, monitorDevices, onToggle } = props;
  const labeled = Object.entries(monitorCounts ?? {})
    .map(([k, n]) => ({ label: deviceEventLabel(k), n }))
    .filter((x) => x.label);
  return (
    <View className="open-section">
      <View className="section-title" onClick={onToggle}>
        在家
        <Text className="section-caption">{monitorOpen ? "收起" : "展开"}</Text>
      </View>
      {monitorOpen && (
        <View style={{ marginTop: 12 }}>
          {monitorCounts === null && <Text className="life-empty-note">加载中……</Text>}
          {monitorCounts !== null && labeled.length === 0 && (
            <Text className="life-empty-note">今天还没有设备事件。</Text>
          )}
          {labeled.length > 0 && (
            <View className="chips">
              {labeled.map((x) => (
                <View className="chip" key={x.label}>
                  {x.label} × {x.n}
                </View>
              ))}
            </View>
          )}
          {monitorDevices !== null && monitorDevices.length === 0 && (
            <Text className="life-empty-note" style={{ marginTop: 8 }}>
              尚未连接设备。
            </Text>
          )}
          {monitorDevices?.map((d) => (
            <View className="life-row" key={d.device_id}>
              <View className="life-dot" />
              <View className="life-row-body">
                <View className="life-row-head">
                  <Text className="life-row-type">{d.display_name || "设备"}</Text>
                  <Text className="life-row-time">{deviceStatusLabel(d.status)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
