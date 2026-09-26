/**
 * AskPanel — Ask 主模式 (Stage R.2 §50-53).
 * 回答按契约展示：结论 → 依据 → 不确定性 → 下一步。空态是宠物身份
 * + 引导文案，不再是“还没有回答”。
 */
import { Button, Input, Text, View } from "@tarojs/components";
import { SUGGESTED, type AnswerResult, type AskState } from "../_lib";

export function AskPanel(props: {
  petName?: string;
  question: string;
  askState: AskState;
  result: AnswerResult | null;
  onQuestionChange: (v: string) => void;
  onAsk: (q?: string) => void;
}) {
  const { petName, question, askState, result, onQuestionChange, onAsk } = props;

  const uncertain = result ? !result.sufficient : false;

  return (
    <View>
      <View className="ask-box">
        <View className="field">
          <Text>想了解什么？</Text>
          <Input
            className="input"
            value={question}
            onInput={(e) => onQuestionChange(e.detail.value)}
            placeholder="问关于这只宠物的问题"
          />
        </View>
        <Button className="btn btn-primary" onClick={() => onAsk()} disabled={askState === "loading" || !question.trim()}>
          {askState === "loading" ? "分析中…" : "提问"}
        </Button>
      </View>

      {askState === "idle" && !result && (
        <View className="empty-state">
          <View className="empty-state-icon">
            <Text style={{ fontSize: 44, color: "#6E8B5E" }}>问</Text>
          </View>
          <View className="empty-state-title">我会基于{petName ?? "宠物"}已有的真实记录回答。</View>
          <View className="empty-state-body">你可以问最近变化、任务、训练、健康记录。</View>
        </View>
      )}

      {askState === "loading" && <View className="state">分析中……</View>}
      {askState === "error" && <View className="state state-error">暂时无法回答，请稍后重试。</View>}

      {askState === "ready" && result && (
        <View style={{ marginTop: 16 }}>
          <View className="answer-block">
            <Text className="answer-label">结论</Text>
            <View className="answer-body">{result.answer}</View>
          </View>

          {result.citations.length > 0 && (
            <View className="answer-block">
              <Text className="answer-label">依据</Text>
              {result.citations.map((c, i) => (
                <View className="citation-row" key={i}>
                  {c}
                </View>
              ))}
            </View>
          )}

          <View className="answer-block">
            <Text className="answer-label">不确定性</Text>
            <View className="answer-body">
              {uncertain ? "当前记录不足以完整回答该问题。" : "基于现有记录的回答；如有不适请及时就医。"}
            </View>
          </View>

          <View className="answer-block">
            <Text className="answer-label">下一步</Text>
            <View className="answer-body">可以继续追问，或在时间线中查看来源。</View>
          </View>

          <View className="life-row-source" style={{ marginTop: 16 }}>
            {result.disclaimer || "助手不做医疗诊断；风险判断以独立规则引擎为准。"}
          </View>
        </View>
      )}

      <View className="open-section">
        <View className="section-title">建议问题</View>
        <View className="chips">
          {SUGGESTED.map((s) => (
            <View key={s} className="chip" onClick={() => onAsk(s)}>{s}</View>
          ))}
        </View>
      </View>
    </View>
  );
}
