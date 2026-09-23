import { Text, View } from "@tarojs/components";
import type { LifeEvent } from "../../../services/api";
import { fmtTime } from "../../../utils/format";

export function RecentEventsCard({ events }: { events: LifeEvent[] }) {
  return (
    <View className="card">
      <Text>最近记录</Text>
      {events.slice(0, 5).map((e) => (
        <View className="tl-item" key={e.event_id}>
          <View className="tl-head">
            <Text className="tl-type">{e.event_type}</Text>
            <Text className="badge">{e.provenance_level}</Text>
            <Text className="tl-time">{fmtTime(e.occurred_at)}</Text>
          </View>
          <View className="tl-body">
            {Object.entries(e.payload)
              .filter(([k]) => k !== "health_event_id" && k !== "task_id")
              .map(([k, v]) => `${k}: ${String(v)}`)
              .join(" · ")}
          </View>
        </View>
      ))}
    </View>
  );
}
