import { Text, View } from "@tarojs/components";

export function ExplainPanel() {
  return (
    <View>
      <View className="card">
        <Text>这个系统如何得出结论？</Text>
        <View className="muted" style={{ marginTop: 12, fontSize: 26, lineHeight: 1.75 }}>
          1. 所有记录都是真实事件：谁（actor）、何时（time）、来源（source）与证据（evidence）进入统一事件图。{"\n"}
          2. 助手回答必须引用真实事件；引用可在时间线核对，不生成历史。{"\n"}
          3. 医疗风险分级来自独立红旗规则引擎，AI 不单独决定 emergency。{"\n"}
          4. 就诊摘要与照护卡是信息整理，不是兽医诊断；系统不改药、不自动停药。{"\n"}
          5. 未发现红旗不等于“没有疾病”；图片结果不写成确定诊断。
        </View>
      </View>
    </View>
  );
}
