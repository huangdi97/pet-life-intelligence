import { View } from "@tarojs/components";
import { TABS, type AgentTab } from "../_lib";

export function AgentTabs({ tab, onChange }: { tab: AgentTab; onChange: (t: AgentTab) => void }) {
  return (
    <View className="agent-tabs">
      {TABS.map((t) => (
        <View
          key={t.key}
          className={`agent-tab${tab === t.key ? " agent-tab-active" : ""}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </View>
      ))}
    </View>
  );
}
