import { useState } from "react";
import { View, Text, Input, Button } from "@tarojs/components";
import { api } from "../../services/api";
import { usePets } from "../../utils/usePets";

interface AnswerResult {
  answer: string;
  citations: string[];
  sufficient: boolean;
  disclaimer: string;
}

export default function Agent() {
  const { petId } = usePets();
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [result, setResult] = useState<AnswerResult | null>(null);

  async function ask() {
    if (!question.trim() || !petId) return;
    setState("loading");
    try {
      const r = await api.post<AnswerResult>(`/pets/${petId}/ask`, { question: question.trim() });
      setResult(r);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  return (
    <View className="page">
      <View className="h1">宠物助手</View>
      <View className="sub">回答必须引用真实事件、显示时间与来源</View>

      <View className="card">
        <View className="field">
          <Text>想了解什么？</Text>
          <Input
            className="input"
            value={question}
            onInput={(e) => setQuestion(e.detail.value)}
            placeholder="例如：最近 30 天体重有什么变化？"
          />
        </View>
        <Button className="btn btn-primary" onClick={ask} disabled={state === "loading" || !question.trim()}>
          {state === "loading" ? "分析中…" : "提问"}
        </Button>
      </View>

      {state === "error" && <View className="state state-error">暂时无法回答，请稍后重试。</View>}
      {state === "ready" && result && (
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
          <View className="muted" style={{ marginTop: 12 }}>{result.disclaimer ?? "助手不做医疗诊断；风险判断以独立规则引擎为准。"}</View>
        </View>
      )}
    </View>
  );
}