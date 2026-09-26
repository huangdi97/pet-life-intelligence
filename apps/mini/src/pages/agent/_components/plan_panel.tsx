import { Button, Text, View } from "@tarojs/components";
import type { Task } from "../../../services/api";
import { fmtTime } from "../../../utils/format";

/**
 * PlanPanel — 计划 (Stage R.2 §51): current open tasks with one-tap complete.
 * 计划生成服务暂未开放时如实提示，不伪装 AI 计划。
 */
export function PlanPanel({ tasks, onComplete }: { tasks: Task[] | null; onComplete: (id: string) => void }) {
  return (
    <View>
      <View className="card">
        <Text className="v4-sec-title">今日计划（进行中任务）</Text>
        {tasks === null && (
          <View className="muted" style={{ marginTop: 12 }}>
            加载中……
          </View>
        )}
        {tasks !== null && tasks.length === 0 && (
          <View className="muted" style={{ marginTop: 12 }}>
            今天没有进行中任务。
          </View>
        )}
        {tasks?.slice(0, 5).map((t) => (
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
      </View>
      <Text className="life-empty-note" style={{ marginTop: 12 }}>
        计划生成服务暂未开放，可在任务页手动添加。
      </Text>
    </View>
  );
}
