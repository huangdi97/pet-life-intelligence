import { Text, View } from "@tarojs/components";
import { DAILY_COUNT_LABELS, type TodayData } from "../_lib";

/** 当前状态卡：今天各事件计数（低密度统计） */
export function CurrentStateCard({ today }: { today: TodayData }) {
  return (
    <View className="card">
      <Text>当前状态</Text>
      <View className="statgrid" style={{ marginTop: 16 }}>
        {Object.entries(today.event_counts)
          .filter(([, n]) => n > 0)
          .slice(0, 6)
          .map(([t, n]) => (
            <View className="stat" key={t}>
              <View className="stat-n">{n}</View>
              <View className="stat-label">{DAILY_COUNT_LABELS[t] ?? t}</View>
            </View>
          ))}
      </View>
      {Object.values(today.event_counts).every((n) => n === 0) && (
        <View className="muted" style={{ marginTop: 12 }}>今天还没有记录。</View>
      )}
    </View>
  );
}
