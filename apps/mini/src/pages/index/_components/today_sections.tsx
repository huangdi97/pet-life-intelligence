import { Icon, Text, View } from "@tarojs/components";
import type { Task } from "../../../services/api";
import { LifeStream, type LifeStreamDay } from "../../../components/timeline/LifeStream";

/** Today — 今天任务 (open-section list, one-tap complete). */
export function TodayTasks({ tasks, onComplete }: { tasks: Task[]; onComplete: (id: string) => void }) {
  return (
    <View className="open-section">
      <View className="section-title">
        今天任务
        <Text className="section-caption">{tasks.filter((t) => t.status === "OPEN").length} 项待办</Text>
      </View>
      {tasks.slice(0, 3).map((t) => (
        <View className="life-row" key={t.id}>
          <View className="life-dot" />
          <View className="life-row-body">
            <View className="life-row-head">
              <Text className="life-row-type">{t.title}</Text>
              <Text className="life-row-time" onClick={() => onComplete(t.id)}>
                <Icon type="success" size={16} color="#4E7A5A" /> 完成
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Today — 最近生命轨迹 preview (compact life stream or honest empty note). */
export function TodayMemory({ days, count }: { days: LifeStreamDay[]; count: number }) {
  return (
    <View className="open-section">
      <View className="section-title">
        最近
        {count > 0 ? <Text className="section-caption">今天 · {count} 条</Text> : null}
      </View>
      {days.length ? (
        <LifeStream days={days} />
      ) : (
        <Text className="life-empty-note">豆豆的时间线还很安静，第一次喂食、散步或健康记录会从这里开始。</Text>
      )}
    </View>
  );
}
