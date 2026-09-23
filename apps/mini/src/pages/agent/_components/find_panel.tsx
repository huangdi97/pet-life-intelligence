import { Button, Input, Text, View } from "@tarojs/components";
import { fmtTime } from "../../../utils/format";
import type { FindState, SearchHit } from "../_lib";

export function FindPanel(props: {
  query: string;
  findState: FindState;
  hits: SearchHit[];
  onQueryChange: (v: string) => void;
  onSearch: () => void;
}) {
  const { query, findState, hits, onQueryChange, onSearch } = props;
  return (
    <View>
      <View className="card">
        <View className="field">
          <Text>在时间线里找</Text>
          <Input
            className="input"
            value={query}
            onInput={(e) => onQueryChange(e.detail.value)}
            placeholder="关键词，例如：呕吐"
          />
        </View>
        <Button className="btn btn-primary" onClick={onSearch} disabled={findState === "loading" || !query.trim()}>
          {findState === "loading" ? "搜索中…" : "搜索"}
        </Button>
      </View>
      {findState === "error" && <View className="state state-error">搜索失败，请稍后重试。</View>}
      {findState === "ready" && hits.length === 0 && (
        <View className="state">无结果（只返回真实事件引用；无记录即无结果）。</View>
      )}
      {hits.map((h) => (
        <View className="tl-item" key={h.event_id}>
          <View className="tl-head">
            <Text className="tl-type">{h.event_type}</Text>
            <Text className="tl-time">{fmtTime(h.occurred_at)}</Text>
          </View>
          <View className="tl-body">
            {Object.entries(h.payload)
              .map(([k, v]) => `${k}: ${String(v)}`)
              .join(" · ")}
          </View>
        </View>
      ))}
    </View>
  );
}
