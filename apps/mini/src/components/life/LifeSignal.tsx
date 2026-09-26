/**
 * LifeSignal — the "Now" layer of Today / Life View (Stage R.2 §22).
 * Compact current-life summary derived from real API events; when the API
 * has no data it renders "今天还没有足够记录" — never invents values.
 */
import { Text, View } from "@tarojs/components";

export interface LifeSignalRow {
  id: string;
  label: string;
  value: string;
}

export function LifeSignal(props: { title?: string; rows: LifeSignalRow[]; empty?: boolean; emptyNote?: string }) {
  const { title = "此刻", rows, empty = false, emptyNote } = props;
  return (
    <View className="open-section">
      <View className="section-title">{title}</View>
      {empty ? (
        <Text className="life-empty-note">{emptyNote ?? "今天还没有足够记录"}</Text>
      ) : (
        <View className="life-signal">
          {rows.map((r) => (
            <View className="life-metric" key={r.id}>
              <View className="life-metric-value">{r.value}</View>
              <View className="life-metric-label">{r.label}</View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
