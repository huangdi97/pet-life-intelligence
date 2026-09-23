import { Button, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import type { Task } from "../../../services/api";
import { fmtTime } from "../../../utils/format";

export function PlanPanel({ tasks, onComplete }: { tasks: Task[] | null; onComplete: (id: string) => void }) {
  return (
    <View>
      <View className="card">
        <Text>今日计划（进行中任务）</Text>
        {tasks === null && <View className="muted" style={{ marginTop: 12 }}>加载中……</View>}
        {tasks !== null && tasks.length === 0 && (
          <View className="muted" style={{ marginTop: 12 }}>今天没有进行中任务。</View>
        )}
        {tasks?.slice(0, 5).map((t) => (
          <View className="tl-item" key={t.id}>
            <View className="tl-head">
              <Text className="tl-type">{t.title}</Text>
              <Button className="btn" size="mini" onClick={() => onComplete(t.id)}>完成</Button>
            </View>
            <View className="muted">{t.due_at ? `截止 ${fmtTime(t.due_at)}` : "无截止"}</View>
          </View>
        ))}
        <View className="muted" style={{ marginTop: 12 }}>
          AI 生成计划服务暂未开放（当前环境未接入 AI）；可在任务页手动添加。
        </View>
        <View className="btn" style={{ marginTop: 8 }} onClick={() => Taro.navigateTo({ url: "/pages/tasks/index" })}>
          管理任务 ›
        </View>
      </View>
    </View>
  );
}
