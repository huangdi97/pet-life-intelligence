import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { fmtTime, riskLabel } from "../../../utils/format";
import type { HealthEventRow } from "../_lib";
export function BriefPanel({ healthRows }: { healthRows: HealthEventRow[] | null }) {
  const latestOpen = healthRows?.find((h) => h.status !== "CLOSED") ?? null;
  return (
    <View>
      <View className="open-section">
        <View className="section-title">最新健康摘要</View>
        {healthRows === null && <Text className="life-empty-note" style={{ marginTop: 12 }}>加载中……</Text>}
        {healthRows !== null && !latestOpen && (
          <Text className="life-empty-note" style={{ marginTop: 12 }}>当前没有进行中的健康事件。</Text>
        )}
        {latestOpen && (
          <View className="life-row" style={{ marginTop: 8 }}>
            <View className="life-dot" />
            <View className="life-row-body">
              <View className="life-row-head">
                <Text className="life-row-type">{latestOpen.chief_complaint}</Text>
                <Text className="life-row-time">{riskLabel(latestOpen.latest_triage_level)}</Text>
              </View>
              <View className="life-row-detail">开始于 {fmtTime(latestOpen.opened_at)}</View>
            </View>
          </View>
        )}
        <Text className="life-empty-note" style={{ marginTop: 12 }}>
          摘要为信息整理，不是兽医诊断；风险分级以独立规则引擎为准。
        </Text>
        <View className="btn" style={{ marginTop: 8 }} onClick={() => Taro.navigateTo({ url: "/pages/health/index" })}>
          打开健康 ›
        </View>
      </View>
    </View>
  );
}
