import { Button, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import type { Task } from "../../../services/api";
import { fmtTime } from "../../../utils/format";

export function TasksCard({ tasks, onComplete }: { tasks: Task[] | null; onComplete: (id: string) => void }) {
  return (
    <View className="card">
      <Text>今日任务</Text>
      {tasks && tasks.length === 0 && <View className="muted" style={{ marginTop: 12 }}>没有待办任务。</View>}
      {tasks?.slice(0, 3).map((t) => (
        <View className="tl-item" key={t.id}>
          <View className="tl-head">
            <Text className="tl-type">{t.title}</Text>
            <Button className="btn" size="mini" onClick={() => onComplete(t.id)}>
              完成
            </Button>
          </View>
          <View className="muted">{t.due_at ? `截止 ${fmtTime(t.due_at)}` : "无截止"}</View>
        </View>
      ))}
      <View className="btn" style={{ marginTop: 8 }} onClick={() => Taro.navigateTo({ url: "/pages/tasks/index" })}>
        管理任务 ›
      </View>
    </View>
  );
}
