import { Button, Input, Text, View } from "@tarojs/components";
import { SUGGESTED, type AnswerResult, type AskState } from "../_lib";

export function AskPanel(props: {
  question: string;
  askState: AskState;
  result: AnswerResult | null;
  onQuestionChange: (v: string) => void;
  onAsk: (q?: string) => void;
}) {
  const { question, askState, result, onQuestionChange, onAsk } = props;
  return (
    <View>
      <View className="card">
        <View className="field">
          <Text>想了解什么？</Text>
          <Input
            className="input"
            value={question}
            onInput={(e) => onQuestionChange(e.detail.value)}
            placeholder="例如：最近 30 天体重有什么变化？"
          />
        </View>
        <Button className="btn btn-primary" onClick={() => onAsk()} disabled={askState === "loading" || !question.trim()}>
          {askState === "loading" ? "分析中…" : "提问"}
        </Button>
      </View>

      <View className="card">
        <Text>建议问题</Text>
        <View className="chips" style={{ marginTop: 12 }}>
          {SUGGESTED.map((s) => (
            <View key={s} className="chip" onClick={() => onAsk(s)}>{s}</View>
          ))}
        </View>
      </View>

      {askState === "loading" && <View className="state">分析中……</View>}
      {askState === "blocked" && (
        <View className="state">服务暂未开放。AI 问答依赖 AI 服务（当前环境未接入），开放后可直接提问。</View>
      )}
      {askState === "error" && <View className="state state-error">暂时无法回答，请稍后重试。</View>}
      {askState === "ready" && result && (
        <View className="card">
          <Text style={{ fontSize: 28 }}>{result.answer}</Text>
          {result.citations.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text className="muted">引用的事件：</Text>
              {result.citations.map((c, i) => (
                <View className="tl-item" key={i}>
                  <View className="tl-body">{c}</View>
                </View>
              ))}
            </View>
          )}
          {!result.sufficient && <View className="muted" style={{ marginTop: 8 }}>当前记录不足以完整回答该问题。</View>}
          <View className="muted" style={{ marginTop: 12 }}>
            {result.disclaimer || "助手不做医疗诊断；风险判断以独立规则引擎为准。"}
          </View>
        </View>
      )}
    </View>
  );
}
