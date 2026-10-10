import { useState } from "react";\nimport { Text, View } from "@tarojs/components";

interface Props {
  summary: string;
  evidence?: string;
  unknown?: boolean;
}

/** Today CHANGE layer: this pet versus its own recorded baseline.
 * It stays visually quieter than health Attention because ordinary variance
 * is not itself a medical warning. */
export function ChangeNarrative({ summary, evidence, unknown = false }: Props) {
  return (
    <View
      className={`change-narrative${unknown ? " change-narrative-unknown" : ""}`}
      data-testid="pli.mini.today.change"
    >
      <Text className="change-kicker">与它自己相比</Text>
      <Text className="change-summary">{summary}</Text>
      {evidence ? <Text className="change-evidence">{evidence}</Text> : null}
      <View
        className="change-why"
        data-testid="pli.mini.today.change.why"
        onClick={() => setExpanded((value) => !value)}
      >
        为什么
      </View>
      {expanded ? (
        <View className="change-explain" data-testid="pli.mini.today.change.explain">
          <Text className="change-explain-label">事实</Text>
          <Text className="change-explain-body">{summary}</Text>
          <Text className="change-explain-label">比较依据</Text>
          <Text className="change-explain-body">{evidence ?? "只比较已经记录的事实。"}</Text>
          <Text className="change-explain-label">不确定性</Text>
          <Text className="change-explain-body">这里只说明与它自己的已记录常态的差异，不能据此判断疾病、疼痛或情绪。</Text>
          <Text className="change-explain-label">下一步</Text>
          <Text className="change-explain-body">继续记录饮水、进食、活动和睡眠；变化持续或出现明确健康信号时，再进入健康页查看。</Text>
        </View>
      ) : null}
    </View>
  );
}
