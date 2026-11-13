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
  /** Optional canonical fact-detail entry. Static rows remain valid elsewhere. */
  onPress?: () => void;
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
            <View
              className={`life-metric${r.onPress ? " life-metric-action" : ""}`}
              key={r.id}
              onClick={r.onPress}
              data-testid={r.onPress ? `pli.mini.today.anchor.${r.id}` : undefined}
            >
              <View className="life-metric-value">{r.value}</View>
              <View className="life-metric-label">{r.label}{r.onPress ? " · 查看" : ""}</View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
