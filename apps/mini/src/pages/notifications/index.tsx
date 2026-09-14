import { useCallback, useEffect, useState } from "react";
import { View, Text, Button } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api, type NotificationItem } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { fmtTime } from "../../utils/format";

export default function Notifications() {
  const { pets } = usePets();
  const [rows, setRows] = useState<NotificationItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [householdId, setHouseholdId] = useState<string | null>(null);

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

  return (
    <View className="page">
      <View className="h1">通知</View>
      <View className="sub">任务、用药、异常、照护、健康</View>

      {state === "loading" && <View className="state">加载中……</View>}
      {state === "error" && (
        <View className="state state-error">
          出错了
          <Button className="btn" onClick={() => householdId && load(householdId)}>重试</Button>
        </View>
      )}
      {state === "ready" && rows.length === 0 && <View className="state">暂时没有新通知。</View>}
      {rows.map((n) => (
        <View className="card" key={n.id}>
          <View className="row" style={{ justifyContent: "space-between" }}>
            <Text style={{ fontWeight: 600 }}>{n.title}</Text>
            <Text className="badge">{n.type}</Text>
          </View>
          <View style={{ marginTop: 6 }}>{n.body}</View>
          <View className="muted" style={{ marginTop: 6 }}>{fmtTime(n.created_at)}</View>
        </View>
      ))}
    </View>
  );
}