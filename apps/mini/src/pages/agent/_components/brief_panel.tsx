import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { fmtTime } from "../../../utils/format";
import type { HealthEventRow } from "../_lib";

export function BriefPanel({ healthRows }: { healthRows: HealthEventRow[] | null }) {
  const latestOpen = healthRows?.find((h) => h.status !== "CLOSED") ?? null;
  return (
    <View>
      <View className="card">
        <Text>最新健康摘要</Text>
        {healthRows === null && <View className="muted" style={{ marginTop: 12 }}>加载中……</View>}
        {healthRows !== null && !latestOpen && (
          <View className="muted" style={{ marginTop: 12 }}>当前没有进行中的健康事件。</View>
        )}
        {latestOpen && (
          <View style={{ marginTop: 12 }}>
            <View className="tl-item">
              <View className="tl-head">
                <Text className="tl-type">{latestOpen.chief_complaint}</Text>
                <Text className={`badge ${latestOpen.latest_triage_level ?? ""}`}>
                  {latestOpen.latest_triage_level ?? "未分级"}
                </Text>
                <Text className="tl-time">{fmtTime(latestOpen.opened_at)}</Text>
              </View>
            </View>
          </View>
        )}
        <View className="muted" style={{ marginTop: 12 }}>
          完整流程（追问 → 红旗 → 分级 → 就诊摘要 → 结局）在健康页查看；摘要为信息整理，不是兽医诊断。
        </View>
        <View className="btn" style={{ marginTop: 8 }} onClick={() => Taro.navigateTo({ url: "/pages/health/index" })}>
          打开健康 ›
        </View>
      </View>
    </View>
  );
}
