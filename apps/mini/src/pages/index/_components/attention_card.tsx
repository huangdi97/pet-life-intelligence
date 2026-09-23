import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { fmtTime } from "../../../utils/format";
import type { HealthEventRow } from "../_lib";

/** 值得关注：进行中健康事件的规则引擎分级（只显示后端分级值） */
export function AttentionCard({ attention }: { attention: HealthEventRow[] }) {
  return (
    <View className="card">
      <Text>值得关注</Text>
      {attention.slice(0, 3).map((h) => (
        <View className="tl-item" key={h.health_event_id} onClick={() => Taro.navigateTo({ url: "/pages/health/index" })}>
          <View className="tl-head">
            <Text className="tl-type">{h.chief_complaint}</Text>
            <Text className={`badge ${h.latest_triage_level ?? ""}`}>{h.latest_triage_level}</Text>
            <Text className="tl-time">{fmtTime(h.opened_at)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
