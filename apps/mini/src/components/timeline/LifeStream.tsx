/**
 * LifeStream — day-grouped time spine (Stage R.2 §37-39).
 * Day label → rows with semantic dot + time + type + detail + source.
 * Never wraps each event in an independent white card.
 */
import { Text, View } from "@tarojs/components";

export interface LifeStreamRow {
  id: string;
  time: string;
  typeLabel: string;
  detail: string;
  source: string;
  mediaCount?: number;
  artifactIds?: string[];
}

export interface LifeStreamDay {
  id: string;
  label: string;
  isToday?: boolean;
  rows: LifeStreamRow[];
}

export function LifeStream({
  days,
  onOpenMedia,
}: {
  days: LifeStreamDay[];
  onOpenMedia?: (artifactIds: string[]) => void;
}) {
  if (!days.length) return null;
  return (
    <View className="life-stream">
      {days.map((d) => (
        <View className="life-day" key={d.id}>
          <View className="life-day-label">
            {d.label}
            {d.isToday ? " · 今天" : ""}
          </View>
          {d.rows.map((r) => (
            <View className="life-row" key={r.id}>
              <View className="life-dot" />
              <View className="life-row-body">
                <View className="life-row-head">
                  <Text className="life-row-type">{r.typeLabel}</Text>
                  <Text className="life-row-time">{r.time}</Text>
                </View>
                {r.detail ? <View className="life-row-detail">{r.detail}</View> : null}
                <View className="life-row-source">
                  {r.source}{r.mediaCount && r.mediaCount > 0 ? ` · ${r.mediaCount} 个媒体证据` : ""}
                </View>
                {r.artifactIds?.length && onOpenMedia ? (
                  <View
                    className="secondary-action"
                    style={{ marginTop: 6, minHeight: 36 }}
                    onClick={() => onOpenMedia(r.artifactIds ?? [])}
                  >
                    查看原始媒体
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
