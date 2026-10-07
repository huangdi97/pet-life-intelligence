import { useCallback, useEffect, useState } from "react";
import { View, Text, Button } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api, type NotificationItem } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { PetContextGate } from "../../components/feedback/Feedback";
import { fmtTime } from "../../utils/format";

type NotificationFilter = "all" | "attention" | "health" | "care" | "other";

const FILTERS: Array<{ id: NotificationFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "attention", label: "需要处理" },
  { id: "health", label: "健康与用药" },
  { id: "care", label: "照护与任务" },
  { id: "other", label: "其他" },
];

function notificationTypeLabel(type: string): string {
  if (type.includes("EMERGENCY")) return "紧急提醒";
  if (type === "TASK_CONFLICT") return "任务冲突";
  if (type.includes("MEDICATION")) return "用药提醒";
  if (type.includes("HEALTH") || type.includes("TRIAGE")) return "健康提醒";
  if (type.includes("GRANT") || type.includes("HANDOFF") || type.includes("PERMISSION") || type.includes("CARE")) return "照护权限";
  if (type.includes("TASK")) return "照护任务";
  if (type.includes("MONITOR")) return "在家与设备";
  return "生活提醒";
}

function notificationCategory(type: string): Exclude<NotificationFilter, "all" | "attention"> {
  if (type.includes("HEALTH") || type.includes("TRIAGE") || type.includes("EMERGENCY") || type.includes("MEDICATION")) return "health";
  if (type.includes("TASK") || type.includes("GRANT") || type.includes("HANDOFF") || type.includes("PERMISSION") || type.includes("CARE")) return "care";
  return "other";
}

export default function Notifications() {
  const { pets, state: petContextState, refresh: refreshPets } = usePets();
  const [rows, setRows] = useState<NotificationItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback((hhId: string) => {
    setState("loading");
    api
      .get<NotificationItem[]>(`/households/${hhId}/notifications`)
      .then((rows) => {
        setRows(rows);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    if (!householdId && pets && pets.length > 0) setHouseholdId(pets[0].household_id);
  }, [pets, householdId]);

  useEffect(() => {
    if (householdId) load(householdId);
  }, [householdId, load]);

  if (petContextState !== "ready" || !pets?.length) {
    return (
      <View className="page">
        <View className="h1">通知</View>
        <PetContextGate state={petContextState} hasPet={Boolean(pets?.length)} onRetry={refreshPets} />
      </View>
    );
  }

  const unread = rows.filter((row) => !row.read_at).length;
  const visibleRows = rows.filter((row) => {
    if (filter === "all") return true;
    if (filter === "attention") return !row.read_at;
    return notificationCategory(row.type) === filter;
  });

  async function markRead(id: string) {
    if (busyId) return;
    setBusyId(id);
    try {
      const result = await api.post<{ notification_id: string; read_at: string | null }>(`/notifications/${id}/read`, {});
      const readAt = result.read_at ?? new Date().toISOString();
      setRows((items) => items.map((item) => item.id === id ? { ...item, read_at: readAt } : item));
    } catch {
      Taro.showToast({ title: "暂时无法更新，请稍后重试", icon: "none" });
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    if (!householdId || busyId || unread === 0) return;
    setBusyId("all");
    try {
      const result = await api.post<{ marked: number; read_at: string | null }>(
        `/households/${householdId}/notifications/read-all`,
        {},
      );
      const readAt = result.read_at ?? new Date().toISOString();
      setRows((items) => items.map((item) => item.read_at ? item : { ...item, read_at: readAt }));
    } catch {
      Taro.showToast({ title: "暂时无法更新，请稍后重试", icon: "none" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View className="page">
      <View className="h1">通知</View>
      <View className="sub">任务、健康、权限与用药提醒集中在这里</View>

      {state === "ready" && rows.length > 0 ? (
        <View className="open-section">
          <View className="life-row">
            <View className="life-row-body">
              <View className="life-row-head">
                <Text className="life-row-type">{unread > 0 ? `${unread} 条未读` : "已查看全部"}</Text>
                {unread > 0 ? (
                  <Text className="section-caption" onClick={() => void markAllRead()}>
                    {busyId === "all" ? "处理中…" : "全部标为已读"}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
          <View className="chips">
            {FILTERS.map((item) => (
              <View
                key={item.id}
                className={`chip${filter === item.id ? " chip-active" : ""}`}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {state === "loading" && <View className="state">加载中……</View>}
      {state === "error" && (
        <View className="state state-error">
          出错了
          <Button className="btn" onClick={() => householdId && load(householdId)}>重试</Button>
        </View>
      )}
      {state === "ready" && rows.length === 0 && <View className="state">暂时没有新通知。</View>}
      {state === "ready" && rows.length > 0 && visibleRows.length === 0 ? (
        <View className="state">当前筛选下没有通知。</View>
      ) : null}
      {visibleRows.map((n) => (
        <View className="open-section" key={n.id}>
          <View className="life-row">
            <View className="life-row-body">
              <View className="life-row-head">
                <Text className="life-row-type">{n.title}</Text>
                <Text className="badge">{notificationTypeLabel(n.type)}</Text>
              </View>
              {n.body ? <View className="life-row-detail">{n.body}</View> : null}
              <View className="life-row-source">{fmtTime(n.created_at)}{n.read_at ? " · 已读" : " · 未读"}</View>
              {!n.read_at ? (
                <Button className="btn" size="mini" disabled={busyId !== null} onClick={() => void markRead(n.id)}>
                  {busyId === n.id ? "处理中…" : "标为已读"}
                </Button>
              ) : null}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}